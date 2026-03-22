"""
server.py — FastAPI + WebSocket backend
════════════════════════════════════════
- Simulation รันใน background thread แยกจาก UI
- WebSocket ส่ง state ทุก 2 วินาที
- REST API สำหรับ pause/resume/step
"""

import asyncio
import threading
import time
import json
import traceback
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# ── import simulation modules ──────────────────────────────────────────────
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from brain import Brain
from body import Body
from human_ai import HumanAI
from biology import PlantEcosystem, FaunaEcosystem, HumanEcosystem, GESTATION_DAYS
from wildlife import spawn_wildlife
from environment import WeatherSystem, DisasterSystem, get_season
from terrain import TerrainMap
from relationship import Relationship
from physics_engine import WorldPhysics
from fire_system import FireSystem
from database import (save_snapshot, load_latest_snapshot, init_db,
                      load_human_memory, record_timeseries, event_buffer)
import random
import numpy as np

# Simple mapping from biome ID to a rough elevation in meters
BIOME_ELEVATION_M = {
    0: 0.0,   # DEEP_WATER
    1: 0.1,   # SHALLOW
    2: 0.5,   # BEACH
    3: 1.0,   # GRASSLAND
    4: 2.0,   # FOREST
    5: 3.0,   # TROPICAL
    6: 5.0,   # MOUNTAIN
    7: 10.0,  # PEAK
}

# ══════════════════════════════════════════════════════════════════════════════
# SIMULATION STATE — shared between sim thread and WebSocket handlers
# ══════════════════════════════════════════════════════════════════════════════
TZ_THAI = timezone(timedelta(hours=7))
# ─# ── Time Scale ────────────────────────────────────────────────────────
# 1 วินาทีจริง = 1 ชั่วโมง sim
# 1 วัน sim = 24 ชั่วโมง sim → step ทุก 1 วินาที = 1 ชั่วโมง sim
# ดังนั้น 1 วัน sim ใช้เวลาจริง 24 วินาที
SIM_STEP_INTERVAL = 1.0   # วินาทีจริงต่อ 1 ชั่วโมง sim

# ── สรุป scale ──────────────────────────────────────────────────────────────
# 1 วิ = 1 ชม sim
# 24 วิ (real) = 24 ชม sim = 1 วัน sim ✅
# นั่งดู 24 วินาที เห็น Adam/Eve ใช้ชีวิต 1 วันเต็ม

class SpatialGrid:
    """
    Grid-based spatial partitioning
    แบ่งแผนที่เป็น grid ย่อย cell_size×cell_size
    query_radius() เร็วกว่า O(n) scan ~10x
    """
    def __init__(self, map_size: int = 100, cell_size: int = 10):
        self.cell_size = cell_size
        self.grid_size = map_size // cell_size
        self._cells: dict[tuple, list] = {}

    def clear(self):
        self._cells.clear()

    def insert(self, obj, pos: list):
        key = (pos[0]//self.cell_size, pos[1]//self.cell_size)
        if key not in self._cells:
            self._cells[key] = []
        self._cells[key].append(obj)

    def query_radius(self, pos: list, radius: int) -> list:
        """คืน objects ทั้งหมดในรัศมี — เช็คแค่ grid cells ที่เกี่ยวข้อง"""
        results = []
        r1 = max(0, (pos[0]-radius)//self.cell_size)
        r2 = min(self.grid_size-1, (pos[0]+radius)//self.cell_size)
        c1 = max(0, (pos[1]-radius)//self.cell_size)
        c2 = min(self.grid_size-1, (pos[1]+radius)//self.cell_size)
        for gr in range(r1, r2+1):
            for gc in range(c1, c2+1):
                results.extend(self._cells.get((gr,gc), []))
        return results

    def query_nearest(self, pos: list, radius: int,
                      filter_fn=None) -> object:
        """หา object ที่ใกล้ที่สุดในรัศมี"""
        candidates = self.query_radius(pos, radius)
        if filter_fn:
            candidates = [o for o in candidates if filter_fn(o)]
        if not candidates:
            return None
        return min(candidates,
                   key=lambda o: abs(o.pos[0]-pos[0])+abs(o.pos[1]-pos[1]))


class SimState:
    def __init__(self):
        self.lock = threading.Lock()
        self.running = True
        self.day = 0
        self.hour = 12   # เริ่มต้นเวลา 12:00 น. (ใช้ภายใน sim)
        self.history: list[str] = []
        self.lock = threading.Lock()
        self.cooked_foods = []
        self.cooked_foods: list[dict] = []
        self.dead: set = set()
        self.game_over = False
        self.pop_history: list[int] = []
        self.human_pop_history: list[int] = []
        self.biomass_history: list[float] = []
        self.SIZE = self.terrain.size   # ปกติมีอยู่แล้ว
        # ── Cache layer ──────────────────────────────────────────
        self._map_cache      = None    # numpy array (SIZE,SIZE,3)
        self._map_dirty      = True    # ต้อง re-render ไหม
        self._snapshot_cache = None    # dict snapshot ล่าสุด
        self._snapshot_dirty = True
        self._prev_map_np    = None    # map ก่อนหน้าสำหรับ delta
        self._color_table    = None    # numpy biome color lookup

        self._init_world()

    def _init_world(self):
        self.terrain   = TerrainMap(seed=42)
        self.weather   = WeatherSystem()
        self.plants    = PlantEcosystem(terrain=self.terrain)   # ✅ grid-based
        self.fauna     = FaunaEcosystem()
        self.humansys  = HumanEcosystem()
        self.disasters = DisasterSystem(map_size=50)
        self.wp        = WorldPhysics()
        self.fs        = FireSystem()
        self.rel       = Relationship("Adam", "Eve")

        adam = HumanAI("Adam", 170, 70, "Eve")
        eve  = HumanAI("Eve",  160, 55, "Adam")
        # Initialize human positions using body.position
        adam.body.position = np.array([50.0, 50.0, 0.0])
        eve.body.position  = np.array([50.0, 52.0, 0.0])
        # The h.pos property in HumanAI will now derive from body.position
        base = ["หินเหล็กไฟ", "กิ่งไม้แห้ง", "ใบไม้ใหญ่", "เถาวัลย์"]
        adam.inventory = random.sample(base, 3)
        eve.inventory  = random.sample(base, 3)
        self.humans    = [adam, eve]
        self.animals   = spawn_wildlife()
        # ปรับ pos สัตว์ให้ไม่อยู่บนน้ำ
        for a in self.animals:
            for _ in range(20):
                if self.terrain.template[a.pos[0]][a.pos[1]] not in [0,1]:
                    break
                a.pos = [random.randint(20,79), random.randint(20,79)]
        self.SIZE      = self.terrain.size   # 100×100
        self._spatial  = SpatialGrid(self.SIZE, cell_size=10)  # spatial index

    def invalidate(self):
        """เรียกหลัง step_world() — mark ว่าต้อง re-render"""
        self._map_dirty      = True
        self._snapshot_dirty = True

    def _get_color_table(self):
        """สร้าง numpy color lookup table ครั้งเดียว"""
        if self._color_table is None:
            from terrain import BIOME_COLOR
            table = np.zeros((8, 3), dtype=np.uint8)
            for biome_id, color in BIOME_COLOR.items():
                table[biome_id] = color
            self._color_table = table
        return self._color_table

    def get_snapshot(self) -> dict:
        """ส่ง cached snapshot — เร็วมาก ไม่คำนวณซ้ำ"""
        with self.lock:
            if not self._snapshot_dirty and self._snapshot_cache is not None:
                return self._snapshot_cache
            # force rebuild
            now_thai = datetime.now(TZ_THAI)
            season   = get_season(self.weather.day)
            phase    = self._day_phase(self.hour)   # ใช้ self.hour แทน now_thai.hour

            # map pixels (50x50 RGB)
            img = self._build_map()

            humans_data = []
            for h in self.humans:
                b  = h.brain
                bd = h.body
                humans_data.append({
                    "name":    h.name,
                    "sex":     h.sex,
                    "pos":     h.body.position.tolist(), # Send float position for sub-grid movement
                    "alive":   bd.alive,
                    "health":  round(bd.health, 1),
                    "age":     round(bd.age_years, 1),
                    "action":  h.current_action,
                    "sleeping":h.sleeping,
                    "emotion": b.emotion.label if hasattr(b, 'emotion') else "😐",
                    "drives": {
                        "hunger":  round(b.drives.hunger,  1),
                        "tired":   round(b.drives.tired,   1),
                        "cold":    round(b.drives.cold,    1),
                        "fear":    round(b.drives.fear,    1),
                        "lonely":  round(b.drives.lonely,  1),
                        "bored":   round(b.drives.bored,   1),
                    },
                    "knows":   list(b.knows),
                    "skills": {
                        "hunt":   round(b.skill.get("hunt",  0), 1),
                        "fire":   round(b.skill.get("fire",  0), 1),
                        "cook":   round(b.skill.get("cook",  0), 1),
                        "craft":  round(b.skill.get("craft", 0), 1),
                    },
                    "pregnant":  bd.pregnant if h.sex == "F" else False,
                    "days_preg": bd.days_pregnant if h.sex == "F" else 0,
                    "inventory": h.inventory,
                    "top_actions": [(a, round(w,2)) for a,w in b.top_weights[:5]],
                "language": h.lang.summary,
                "last_speech": " ".join(h.last_utterance.words) if h.last_utterance else "",
                })

            rel_s = self.rel.summary

            # Collect recent dialogue/speech events
            dialogue_events = []
            for h in self.humans:
                if h.last_utterance:
                    dialogue_events.append({
                        "speaker": h.name,
                        "words": " ".join(h.last_utterance.words),
                        "meaning": h.last_utterance.meaning,
                        "day": self.day,
                        "hour": self.hour,
                        "timestamp": now_thai.isoformat(),
                    })

            result = {
                "day":     self.day,
                "time":    now_thai.strftime("%H:%M:%S"),
                "date":    now_thai.strftime("%d %b %Y"),
                "phase":   phase,
                "season":  season["label"],
                "weather": self.weather.current_state,
                "temp":    round(self.weather.global_temperature, 1),
                "moisture":round(self.weather.global_moisture, 1),
                "map":     img,
                "humans":  humans_data,
                "fauna": {
                    "rabbit": self.fauna.rabbit_pop,
                    "deer":   self.fauna.deer_pop,
                    "tiger":  self.fauna.tiger_pop,
                    "eagle":  self.fauna.eagle_pop,
                    "elephant": self.fauna.elephant_pop,
                },
                "atmosphere": self.wp.atmo.summary,
                "disasters":  self.disasters.active_summary,
                "relationship": {
                    "stage":    rel_s["stage"],
                    "bond":     rel_s["bond"],
                    "trust":    rel_s["trust"],
                    "conflict": rel_s["conflict"],
                },
                "history":  self.history[-30:],
                "dialogue": dialogue_events,  # Recent speech events from Adam/Eve
                "pop_history": self.pop_history[-100:],
                "biomass":  round(self.plants.global_biomass, 1),
                "game_over":self.game_over,
                "running":  self.running,
                "animals": [
                    {"species": a.species, "type": a.a_type,
                     "pos": a.pos, # Animals still use integer positions for now "icon": a.icon,
                     "sleeping": a.sleeping, "status": a.status}
                    for a in self.animals
                ],
            }
            # ── เพิ่ม fire_spots ───────────────────────────────────
            result["fire_spots"] = [
                {"x": f.pos[0], "y": f.pos[1], "intensity": f.intensity}
                for f in self.fs.active_fires
            ]
            # ตรวจสอบว่า dialogue มีอยู่แล้ว (แน่ใจ)
            if "dialogue" not in result:
                result["dialogue"] = []
            # disasters มีอยู่แล้ว (self.disasters.active_summary)
            self._snapshot_cache = result
            self._snapshot_dirty = False
            return result

    def _build_map(self) -> list:
        """สร้าง map เป็น list ของ [r,g,b] สำหรับ canvas
        100×100 = 10,000 pixels — compress โดย sample ทุก pixel ปกติ"""
        SIZE = self.SIZE
        img  = []
        for r in range(SIZE):
            row = []
            for c in range(SIZE):
                color = list(self.terrain.get_color(r, c))
                row.append(color)
            img.append(row)

        # flood overlay
        for d in self.disasters.active_disasters:
            if d.kind == "flood" and d.active:
                radius = int(d.severity * 6)
                for dr in range(-radius, radius+1):
                    for dc in range(-radius, radius+1):
                        fr = max(0, min(self.SIZE-1, d.center[0]+dr))
                        fc = max(0, min(self.SIZE-1, d.center[1]+dc))
                        img[fr][fc] = [30, 100, 220]

        # fires
        for f in self.fs.active_fires:
            fr, fc = max(0,min(SIZE-1,f.pos[0])), max(0,min(SIZE-1,f.pos[1]))
            img[fr][fc] = [255, 140, 0]

        # animals
        for a in self.animals:
            ar, ac = max(0,min(SIZE-1,a.pos[0])), max(0,min(SIZE-1,a.pos[1]))
            if a.sleeping:
                img[ar][ac] = [100, 100, 120]
            elif a.a_type == "Carnivore":
                img[ar][ac] = [255, 50, 50]
            else:
                img[ar][ac] = [255, 220, 50]

        # humans
        for h in self.humans:
            hr, hc = max(0,min(SIZE-1,h.pos[0])), max(0,min(SIZE-1,h.pos[1]))
            img[hr][hc] = [255, 255, 255]

        # night overlay
        brightness = self._brightness(self.hour)   # ใช้ self.hour
        if brightness < 1.0:
            for r in range(SIZE):
                for c in range(SIZE):
                    px = img[r][c]
                    img[r][c] = [
                        int(px[0]*brightness),
                        int(px[1]*brightness),
                        min(255, int(px[2]*brightness + (1-brightness)*20))
                    ]
        return img

    def _brightness(self, hour: int) -> float:
        if 6 <= hour < 8:   return 0.65
        if 8 <= hour < 17:  return 1.0
        if 17 <= hour < 19: return 0.65
        if 19 <= hour < 22: return 0.35
        return 0.15

    def _day_phase(self, hour: int) -> str:
        if 6 <= hour < 8:   return "🌅 รุ่งอรุณ"
        if 8 <= hour < 17:  return "☀️ กลางวัน"
        if 17 <= hour < 19: return "🌇 โพล้เย็น"
        if 19 <= hour < 22: return "🌃 หัวค่ำ"
        return "🌙 กลางคืน"


# ── Singleton state ────────────────────────────────────────────────────────
sim = SimState()


# ══════════════════════════════════════════════════════════════════════════════
# SIMULATION THREAD
# ══════════════════════════════════════════════════════════════════════════════
def run_simulation():
    """
    Timestamp-based simulation loop
    ─────────────────────────────────
    แทนที่จะรอ sleep แล้ว step — ใช้ timestamp จริง
    เพื่อให้ catch-up ได้ถ้า server busy หรือ process พัก

    1 step = 1 ชั่วโมง sim
    SIM_STEP_INTERVAL = วินาทีจริงต่อ 1 ชั่วโมง sim
    """
    last_step_time = time.monotonic()
    accumulated    = 0.0             # เวลาที่สะสมค้างอยู่ (วินาที)
    MAX_CATCHUP    = 24              # catch-up สูงสุด 24 steps ต่อรอบ (= 1 วัน sim)
    steps_since_save = 0             # นับเก็บ step ตั้งแต่ครั้งบันทึกครั้งล่าสุด

    while True:
        now     = time.monotonic()
        elapsed = now - last_step_time
        last_step_time = now

        if sim.running and not sim.game_over:
            accumulated += elapsed

            # นับว่าต้อง step กี่ครั้ง
            steps_due = int(accumulated / SIM_STEP_INTERVAL)
            steps_due = min(steps_due, MAX_CATCHUP)   # cap ป้องกัน freeze

            if steps_due > 0:
                accumulated -= steps_due * SIM_STEP_INTERVAL
                try:
                    with sim.lock:
                        for _ in range(steps_due):
                            _step_world()
                            steps_since_save += 1
                            
                            # Auto-save every SAVE_INTERVAL_STEPS
                            if steps_since_save >= SAVE_INTERVAL_STEPS:
                                try:
                                    snapshot = sim.get_snapshot()
                                    state_dict = {
                                        "day": sim.day,
                                        "weather_day": sim.weather.day,
                                        "temp": sim.weather.global_temperature,
                                        "moisture": sim.weather.global_moisture,
                                        "biomass": sim.plants.global_biomass,
                                        "rabbit": sim.fauna.rabbit_pop,
                                        "deer": sim.fauna.deer_pop,
                                        "tiger": sim.fauna.tiger_pop,
                                    }
                                    save_snapshot(sim.day, state_dict, sim.humans)
                                    _log(f"💾 Snapshot saved at Day {sim.day}")
                                    steps_since_save = 0
                                except Exception as e:
                                    print(f"[SAVE ERROR] {e}")
                            
                            if sim.game_over:
                                break
                except Exception as e:
                    print(f"[SIM ERROR] {e}")
                    traceback.print_exc()
        else:
            # ไม่ running — reset accumulated ป้องกัน burst เมื่อ resume
            accumulated = 0.0

        # sleep สั้นๆ ป้องกัน CPU 100%
        time.sleep(10.0)   # check ทุก 10 วิ — ประหยัด CPU


# (ส่วนที่เหลือของไฟล์จะอยู่ใน Part 2)
# ── ต่อจาก Part 1 ──

# ตัวแปร SAVE_INTERVAL_STEPS กำหนดไว้ที่ส่วนท้าย (ต้องมีก่อนใช้)
SAVE_INTERVAL_STEPS = 1   # save ทุก 1 step = ทุก 1 ชั่วโมง sim (ทุก 1 วินาทีจริง)

def _step_world():
    """Step โลก 1 ชั่วโมง sim (เรียกภายใน lock)"""
    # ใช้ self.hour แทน datetime.now
    sim.hour = (sim.hour + 1) % 24
    hour = sim.hour

    SIZE = sim.SIZE

    sim.day  += 1

    # ── Weather ──────────────────────────────────────────────────────
    w_events = sim.weather.step_day()
    for ev in w_events:
        _log(ev)

    # ── Disasters ────────────────────────────────────────────────────
    dis_events, dis_fx = sim.disasters.step_day(sim.weather)
    for ev in dis_events:
        _log(ev)
    sim.weather.global_moisture    = max(20, min(90, sim.weather.global_moisture    + dis_fx["moisture_mod"]))
    sim.weather.global_temperature = max(15, min(42, sim.weather.global_temperature + dis_fx["temp_mod"]))

    # ── Plants + Physics ─────────────────────────────────────────────
    biomass = sim.plants.step_day(sim.weather.global_moisture, sim.weather.global_temperature)
    sim.terrain.regrow()
    cloud   = 0.8 if sim.weather.current_state in ("ฝนตก","พายุเข้า") else 0.3
    px      = sim.wp.daily_update(
        hour=hour, temp_c=sim.weather.global_temperature,
        moisture=sim.weather.global_moisture, cloud_cover=cloud,
        biomass=biomass, animal_count=len(sim.animals),
    )
    sim.weather.global_temperature = min(42, sim.weather.global_temperature + px["temp_delta"])
    sim.plants.global_biomass = min(100, sim.plants.global_biomass + px["biomass_growth"])
    if dis_fx["biomass_mod"] != 0:
        sim.plants.global_biomass = max(10, sim.plants.global_biomass * (1 + dis_fx["biomass_mod"]))

    sim.fauna.step_day(biomass)   # ยังใช้ global fauna สำหรับ ecosystem balance
    if dis_fx["animal_deaths"] > 0:
        sim.fauna.rabbit_pop = max(0, sim.fauna.rabbit_pop - dis_fx["animal_deaths"]*3)
        sim.fauna.deer_pop   = max(0, sim.fauna.deer_pop   - dis_fx["animal_deaths"])
    if dis_fx["animal_flee"]:
        for a in sim.animals:
            a.pos = [random.randint(0,49), random.randint(0,49)]

    hunted = sim.humansys.step_day(biomass, sim.fauna.deer_pop)
    sim.fauna.deer_pop = max(0, sim.fauna.deer_pop - hunted)

    # ── Fire ─────────────────────────────────────────────────────────
    fire_events, _ = sim.fs.step_hour(sim.weather.global_temperature)
    for ev in fire_events:
        _log(ev)

    # ── Humans (Pure Brain) ───────────────────────────────────────────
    has_cooked = len(sim.cooked_foods) > 0
    adam_h = sim.humans[0]
    eve_h  = sim.humans[1]
    partners = {adam_h: eve_h, eve_h: adam_h}

    for h in sim.humans:
        if not h.body.alive:
            continue
        partner = partners[h]
        h.brain.day = sim.day

        info_now   = sim.terrain.get_info(h.pos[0], h.pos[1])
        near_fire  = sim.fs.nearby_fire(h.pos, radius=3)
        has_danger = any(
            a.a_type=="Carnivore" and not a.sleeping and
            abs(a.pos[0]-h.pos[0])+abs(a.pos[1]-h.pos[1]) <= 4
            for a in sim.animals
        )

        # ── Vision scan using spatial grid ─────────────────────────
        nearby_objects = sim._spatial.query_radius(h.pos, 2)
        nearby_animals = [o for o in nearby_objects if hasattr(o, 'a_type')]

        h.visible = h.vision.scan(
            pos=h.pos, hour=hour, terrain=sim.terrain,
            animals=nearby_animals,
            partner=partner,
            fire_system=sim.fs,
            near_fire=(near_fire is not None),
        )
        vision_perc = h.vision.to_perception_dict(
            h.visible, h.ltm, h.pos, sim.day
        )

        # ── Sound scan ─────────────────────────────────────────────
        h.sounds = h.hearing.listen(
            h.pos, sim.animals, sim.weather.current_state,
            sim.fs, sim.disasters.active_summary
        )
        sound_perc = h.hearing.to_perception(h.sounds)

        # Build perception dict
        perc = {
            "temp_c":           sim.weather.global_temperature,
            "hour":             hour,
            "partner_dist":     abs(h.pos[0]-partner.pos[0])+abs(h.pos[1]-partner.pos[1]),
            "partner_sleeping": partner.sleeping,
            "partner_hungry":   partner.brain.drives.hunger > 70,
            "danger":           has_danger,
            "has_food":         info_now["food_level"]>20 or sim.fauna.deer_pop>5,
            "has_water":        info_now.get("is_water", False),
            "has_fire":         near_fire is not None,
            "has_cooked_food":  has_cooked,
            "biome_food":       info_now["food_level"],
            "is_night":         hour>=21 or hour<6,
            "inventory":        h.inventory,
            "has_child_nearby": False,
        }
        perc.update(vision_perc)
        perc.update(sound_perc)

        # override ด้วยสิ่งที่เห็นจริง
        perc["has_food"]  = vision_perc["sees_food"]  or (vision_perc["mem_food_pos"]  is not None)
        perc["has_water"] = vision_perc["sees_water"] or (vision_perc["mem_water_pos"] is not None)
        perc["has_fire"]  = vision_perc["sees_fire"]  or (vision_perc["mem_fire_pos"]  is not None)
        perc["danger"]    = vision_perc["sees_predator"] or sound_perc["hears_danger"]

        action = h.brain.step(perc)
        h.current_action = action

        # ── Language ───────────────────────────────────────────────
        dominant, level = h.brain.drives.dominant_pain
        if level > 50 and not h.sleeping:
            context_str = "+".join([v.kind for v in h.visible[:3]])
            utterance = h.lang.speak(
                intent=dominant,
                context=context_str,
                day=sim.day,
                partner_dist=perc["partner_dist"],
            )
            if utterance:
                h.last_utterance = utterance
                utterance.heard_by = partner.name
                if perc["partner_dist"] <= 10:
                    learned = partner.lang.hear(utterance, context_str)
                    if learned:
                        _log(f"💬 {partner.name} เรียนรู้คำ: {', '.join(learned)}")
                _log(f"💬 {h.name}: [{' '.join(utterance.words)}] ({dominant})")

        # Execute action
        _execute_action(h, partner, action, perc, info_now, near_fire,
                        has_cooked, hour, dis_fx, SIZE)

        # Log detailed action
        if action not in ["rest", "sleep"]:
            hunger_level = "หิวมาก" if h.brain.drives.hunger >= 85 else ("หิวปกติ" if h.brain.drives.hunger >= 50 else "อิ่ม")
            temp_status = "หนาวสั่น" if sim.weather.global_temperature < 15 else ("ร้อน" if sim.weather.global_temperature > 35 else "ปกติ")
            _log(f"✅ {h.name} {action} | {hunger_level} | อุณหภูมิ {sim.weather.global_temperature:.1f}°C ({temp_status})")
        elif action == "sleep":
            _log(f"😴 {h.name} เข้านอน (ความเหนื่อย {h.brain.drives.tired:.0f}%)")
        elif action == "rest":
            _log(f"🧘 {h.name} พักผ่อน | พลังงาน {h.u_energy:.0f}/2000")

        # ── Physics update (elevation, energy) ─────────────────────
        current_grid_r, current_grid_c = h.pos[0], h.pos[1]
        biome_id = sim.terrain.template[current_grid_r][current_grid_c]
        terrain_elevation_m = BIOME_ELEVATION_M.get(biome_id, 0.0)
        h.body.physics_step(terrain_elevation_m)
        h.pos = [int(h.body.position[0]), int(h.body.position[1])]

        h_px = sim.wp.human_daily_physics(
            h.mass, h.height, h.sex,
            1.0 if h.sleeping else 1.4,
            sim.weather.global_temperature,
            terrain_elevation_m,
        )
        warmth = sim.fs.human_warmth_effect(h.pos, h.mass, sim.weather.global_temperature)
        h.u_energy = max(0, h.u_energy + h_px["du_kj"] + warmth["heat_gained_kj"] - warmth["cold_penalty_kj"])
        h.body.u_energy = h.u_energy
        if warmth["near_fire"]:
            h.body.hormone.cortisol = max(5, h.body.hormone.cortisol-2)
            h.brain.drives.relieve("cold", 3)

        dist_pair = abs(h.pos[0]-partner.pos[0]) + abs(h.pos[1]-partner.pos[1])
        body_events = h.body.step_day(
            calories_in=800 if h.brain.drives.hunger < 60 else 200,
            is_active=not h.sleeping,
            stressed=(h.brain.drives.hunger >= 85),
            bonded=(dist_pair <= 3),
        )
        for ev in body_events:
            _log(ev)

        # ── Send pain/pleasure from body to brain ──────────────────
        if h.body.health < 50:
            h.brain.receive_pain("injury", (50 - h.body.health) / 100)
        if h.body.u_energy < 500:
            h.brain.receive_pain("hunger", (500 - h.body.u_energy) / 500)
        if h.brain.drives.cold > 60:
            h.brain.receive_pain("cold", (h.brain.drives.cold - 60) / 80)
        if h.brain.drives.tired > 90 and not h.sleeping:
            h.brain.receive_pain("tired", 0.3)
        if h.brain.drives.hunger < 30:
            h.brain.receive_pleasure("food", 0.5)
        if sim.fs.nearby_fire(h.pos, radius=3) is not None:
            h.brain.receive_pleasure("warmth", 0.3)

        # ── Memory update ───────────────────────────────────────────
        for vo in h.visible[:5]:
            if vo.kind == "food"  and vo.distance <= 3:
                h.ltm.remember_place("food_rich", vo.pos, sim.day)
            elif vo.kind == "water":
                h.ltm.remember_place("water", vo.pos, sim.day)
            elif vo.kind == "fire":
                h.ltm.remember_place("fire_spot", vo.pos, sim.day)
            elif vo.kind == "animal_pred" and vo.distance <= 5:
                h.ltm.remember_place("danger", vo.pos, sim.day)

        last_outcome = h.brain.memory.episodes[-1].outcome if h.brain.memory.episodes else 0
        context_str  = "+".join([v.kind for v in h.visible[:3]] + [s.kind for s in h.sounds[:2]]) or "normal"
        h.ltm.store_episode(
            day=sim.day, hour=hour, pos=h.pos[:],
            action=action, outcome=last_outcome,
            emotion=h.brain.emotion.label,
            context=context_str,
            importance=min(1.0, abs(last_outcome) + 0.2),
        )

        if action == "start_fire" and last_outcome > 0:
            h.ltm.learn_fact("fire=warm", 1.0)
        if action == "eat_cooked" and last_outcome > 0.5:
            h.ltm.learn_fact("cooked_food=better", 1.0)
        if "sees_predator" in perc and perc["sees_predator"]:
            h.ltm.learn_fact("predator=danger", 1.0)

        if sim.day % 10 == 0:
            h.ltm.decay(sim.day)

        # ตื่นนอน
        if h.sleeping and 6 <= hour < 21 and h.brain.drives.tired < 30:
            h.sleeping = False
            h.brain.receive_pleasure("rest", 0.5)
            _log(f"🌅 {h.name} ตื่นนอน")

        # Death check
        h.health = h.body.health
        if not h.body.alive and h.name not in sim.dead:
            sim.dead.add(h.name)
            _log(f"💀 {h.name} เสียชีวิต (อายุ {h.body.age_years:.1f} ปี)")
            if len(sim.dead) >= 2:
                sim.game_over = True
                _log("🌑 สายพันธุ์มนุษย์สูญพันธุ์")

    # ── Relationship ──────────────────────────────────────────────────
    dist_ab = abs(adam_h.pos[0]-eve_h.pos[0]) + abs(adam_h.pos[1]-eve_h.pos[1])
    mated   = "mate" in adam_h.current_action
    rel_events = sim.rel.step_day(
        dist=dist_ab, mated_today=mated,
        a_hungry=(adam_h.brain.drives.hunger>=85),
        b_hungry=(eve_h.brain.drives.hunger>=85),
    )
    for ev in rel_events:
        _log(ev)

    # ── Wildlife — Pure behavior ──────────────────────────────────────
    new_animals = []
    dead_animals= []

    for a in list(sim.animals):
        if not a.alive:
            continue

        events = a.update(hour, sim.terrain, sim.weather.global_temperature)
        for ev_type, ev_data in events:
            if ev_type == "birth":
                new_animals.append(ev_data)
                _log(f"🐣 {a.species} (Gen{a.generation}) คลอดลูก!")
            elif ev_type == "death":
                dead_animals.append(a)
                _log(f"💀 {a.species} เสียชีวิต (อายุ {a.age_years:.1f} ปี)")

        if not a.alive:
            continue

        a.move_smart(sim.terrain, SIZE)

        if a.a_type == "Herbivore" and not a.sleeping:
            if a.drives.hunger > 40:
                a.eat_vegetation(sim.terrain)
            if a.drives.thirst > 50:
                a.drink_water(sim.terrain)

        if a.a_type == "Carnivore" and not a.sleeping and a.drives.hunger > 50:
            for prey in sim.animals:
                if (prey.alive and not prey.sleeping
                        and prey.a_type == "Herbivore"
                        and abs(prey.pos[0]-a.pos[0]) + abs(prey.pos[1]-a.pos[1]) <= 1):
                    a.energy = min(1000, a.energy + a.energy_gain)
                    a.drives.hunger = max(0, a.drives.hunger - 60)
                    prey.health -= 80
                    if prey.health <= 0:
                        prey.alive = False
                        _log(f"🩸 {a.species} ล่า {prey.species} สำเร็จ")
                    prey.drives.fear = min(100, prey.drives.fear + 50)
                    prey.known_danger_pos.append(a.pos[:])
                    a.known_food_pos.append(prey.pos[:])
                    break

        if a.drives.libido > 70 and not a.sleeping and not a.pregnant:
            for other in sim.animals:
                if (other.alive and other.species == a.species
                        and other.sex != a.sex
                        and abs(other.pos[0]-a.pos[0]) + abs(other.pos[1]-a.pos[1]) <= 2):
                    if a.try_mate(other):
                        _log(f"💕 {a.species} สืบพันธุ์ (Gen{a.generation})")
                    break

    sim.animals = [a for a in sim.animals if a.alive]
    sim.animals.extend(new_animals)

    MAX_ANIMALS = 60
    if len(sim.animals) > MAX_ANIMALS:
        sim.animals.sort(key=lambda x: x.age, reverse=True)
        removed = sim.animals[MAX_ANIMALS:]
        sim.animals = sim.animals[:MAX_ANIMALS]
        for r in removed:
            _log(f"🌿 {r.species} (Gen{r.generation}) ล้นพื้นที่")

    sim.fauna.rabbit_pop = sum(1 for a in sim.animals if a.species=="กระต่ายป่า")
    sim.fauna.deer_pop   = sum(1 for a in sim.animals if a.species=="กวางเรนเดียร์")
    sim.fauna.tiger_pop  = sum(1 for a in sim.animals if a.species=="เสือเขี้ยวดาบ")
    sim.fauna.eagle_pop  = sum(1 for a in sim.animals if a.icon=="🦅")

    # ── Rebuild spatial grid ───────────────────────────────────
    sim._spatial.clear()
    for a in sim.animals:
        sim._spatial.insert(a, a.pos)
    for h in sim.humans:
        sim._spatial.insert(h, h.pos)

    sim.invalidate()

    sim.pop_history.append(sim.fauna.rabbit_pop)
    sim.human_pop_history.append(sim.humansys.human_pop)
    sim.biomass_history.append(sim.plants.global_biomass)
    if len(sim.history) > 500:
        sim.history = sim.history[-500:]

    try:
        record_timeseries(
            sim.day, sim.fauna,
            sim.plants.global_biomass,
            sim.wp.atmo.co2_ppm,
            sim.weather.global_temperature,
            sim.humansys.human_pop,
        )
        event_buffer.flush()
        if sim.day % SAVE_INTERVAL_STEPS == 0:
            state_dict = {
                "day":         sim.day,
                "weather_day": sim.weather.day,
                "temp":        sim.weather.global_temperature,
                "moisture":    sim.weather.global_moisture,
                "biomass":     sim.plants.global_biomass,
                "rabbit":      sim.fauna.rabbit_pop,
                "deer":        sim.fauna.deer_pop,
                "tiger":       sim.fauna.tiger_pop,
                "human_pop":   sim.humansys.human_pop,
            }
            save_snapshot(sim.day, state_dict, sim.humans)
            for h in sim.humans:
                save_human_memory(h.name, sim.day, h.ltm)
            print(f"[DB] 💾 Saved snapshot Day {sim.day}")
    except Exception as e:
        print(f"[DB] persistence error: {e}")


def _execute_action(h, partner, action, perc, info_now, near_fire,
                    has_cooked, hour, dis_fx, SIZE):
    if action == "sleep":
        h.sleeping = True
        h.brain.drives.relieve("tired", 12)
        tired_level = h.brain.drives.tired / 100
        h.brain.receive_pleasure("rest", 0.3 + tired_level * 0.7)

    elif action in ("eat_raw","seek_food") and not h.sleeping:
        ate = False
        for a in list(sim.animals):
            if a.a_type=="Herbivore" and not a.sleeping:
                if abs(a.pos[0]-h.pos[0])+abs(a.pos[1]-h.pos[1]) <= 2:
                    if random.random() < 0.3 + h.brain.skill.get("hunt",0)/200:
                        kcal = {"🐰":120,"🦌":400,"🐗":300}.get(a.icon,150)
                        sim.cooked_foods.append({"name":f"เนื้อ{a.species}","kcal":kcal*0.7,"who":h.name})
                        sim.fauna.deer_pop   = max(0, sim.fauna.deer_pop-(1 if a.icon=="🦌" else 0))
                        sim.fauna.rabbit_pop = max(0, sim.fauna.rabbit_pop-(1 if a.icon=="🐰" else 0))
                        if a in sim.animals: sim.animals.remove(a)
                        h.brain.drives.relieve("hunger", 20)
                        h.brain.receive_pleasure("hunt_success", 0.7)
                        h.brain.skill["hunt"] = min(100, h.brain.skill.get("hunt",0)+3)
                        _log(f"🏹 {h.name} ล่า {a.species} สำเร็จ!")
                        ate = True
                    break
        if not ate and info_now["food_level"] > 10:
            eaten = sim.plants.consume_at(h.pos[0], h.pos[1], 15)
            if eaten > 0:
                h.u_energy = min(2000, h.u_energy + eaten * 10)
                h.brain.drives.relieve("hunger", eaten * 1.5)
                h.brain.receive_pleasure("food", 0.4 * (eaten/15))
                ate = True
        if not ate:
            h.brain.receive_pain("hunger", 0.3)
            best, best_food = h.pos[:], -1
            for dr in range(-5,6):
                for dc in range(-5,6):
                    r2=max(0,min(SIZE-1,h.pos[0]+dr)); c2=max(0,min(SIZE-1,h.pos[1]+dc))
                    fl=sim.terrain.vegetation[r2][c2]
                    if fl>best_food: best_food,best=fl,[r2,c2]
            direction = np.array([float(best[0]) - h.body.position[0], float(best[1]) - h.body.position[1], 0.0])
            if np.linalg.norm(direction) > 0.1:
                direction = direction / np.linalg.norm(direction)
            h.apply_movement_impulse(direction, speed=1.0)

    elif action=="eat_cooked" and has_cooked and not h.sleeping:
        food = sim.cooked_foods.pop(0)
        h.u_energy = min(2000, h.u_energy+food["kcal"])
        h.brain.drives.relieve("hunger", 70)
        h.brain.receive_pleasure("food", 1.0)
        _log(f"🍖 {h.name} กินอาหารสุก ({food['kcal']:.0f} kcal)")

    elif action in ("drink","seek_water") and not h.sleeping:
        if info_now.get("is_water"):
            h.brain.drives.relieve("thirst", 60)
            h.brain.receive_pleasure("water", 0.5)
        else:
            for dr in range(-8,9):
                for dc in range(-8,9):
                    r2=max(0,min(SIZE-1,h.pos[0]+dr)); c2=max(0,min(SIZE-1,h.pos[1]+dc))
                    if sim.terrain.template[r2][c2] in [0,1]:
                        direction = np.array([float(r2) - h.body.position[0], float(c2) - h.body.position[1], 0.0])
                        if np.linalg.norm(direction) > 0.1:
                            direction = direction / np.linalg.norm(direction)
                        h.apply_movement_impulse(direction, speed=1.0)
                        break
                else: continue; break

    elif action=="toilet" and not h.sleeping:
        h.brain.drives.relieve("bladder", 80)
        h.brain.receive_pleasure("relief", 0.4)

    elif action=="start_fire" and not h.sleeping:
        if "หินเหล็กไฟ" in h.inventory and "กิ่งไม้แห้ง" in h.inventory:
            campfire = sim.fs.start_fire(h.pos[:], fuel_kg=3.0)
            ok, msg  = campfire.ignite(sim.weather.global_moisture/100, True)
            _log(f"🔥 {h.name}: {msg}")
            if ok:
                h.brain.drives.relieve("cold", 40)
                h.brain.receive_pleasure("warmth", 1.0)
            else:
                h.brain.receive_pain("failure", 0.2)

    elif action in ("cook","tend_fire") and not h.sleeping:
        near = sim.fs.nearby_fire(h.pos, radius=2)
        if near and near.active:
            if action=="cook":
                food_choice=random.choice(["เนื้อกวาง","เนื้อกระต่าย","ปลา"])
                cooked, msg = sim.fs.cook_food(food_choice, near)
                if cooked:
                    sim.cooked_foods.append({"name":cooked.name,"kcal":cooked.kcal,"who":h.name})
                    h.brain.receive_pleasure("cooked_food", 0.8)
                    _log(f"🍖 {h.name} ปรุง{food_choice}สำเร็จ")
            else:
                if "กิ่งไม้แห้ง" in h.inventory:
                    near.fuel_kg += 2.0

    elif action=="gather" and not h.sleeping:
        pool=["กิ่งไม้แห้ง","ใบไม้ใหญ่","เถาวัลย์","หินคม"]
        if info_now.get("has_herb"): pool.append("หินเหล็กไฟ")
        new_item=random.choice(pool)
        if new_item not in h.inventory:
            h.inventory.append(new_item)
            h.brain.receive_pleasure("discovery", 0.4)
            _log(f"🌿 {h.name} เก็บ {new_item}")

    elif action=="craft" and not h.sleeping:
        items,stats,inv=h.experiment()
        if items and inv:
            inv_name=inv.get("name",f"{items[0]}+{items[1]}")
            h.brain.receive_pleasure("invention", 0.9)
            _log(f"💡 {h.name} สร้าง '{inv_name}'")

    elif action=="mate" and not h.sleeping:
        if perc["partner_dist"]<=3 and not partner.sleeping:
            h.brain.drives.relieve("lonely", 50)
            h.brain.receive_pleasure("connection", 1.0)
            _log(f"💕 {h.name} ใกล้ชิด {partner.name}")
            if h.sex=="M" and partner.sex=="F" and not partner.body.pregnant:
                if partner.body.try_conceive():
                    _log(f"🤰 {partner.name} ตั้งครรภ์!")
                    h.brain.receive_pleasure("reproduce", 2.0)
                    partner.brain.receive_pleasure("reproduce", 2.0)

    elif action in ("seek_partner","seek_fire","seek_food","seek_water") and not h.sleeping:
        if action == "seek_partner":
            target = partner.pos
        elif action == "seek_fire":
            fire_vo = next((v for v in h.visible if v.kind=="fire"), None)
            if fire_vo:
                target = fire_vo.pos
            else:
                mem = h.ltm.find_nearest("fire_spot", h.pos)
                target = mem.pos if mem else (sim.fs.active_fires[0].pos if sim.fs.active_fires else h.pos)
        elif action == "seek_food":
            food_vo = next((v for v in h.visible if v.kind=="food"), None)
            if food_vo:
                target = food_vo.pos
            else:
                mem = h.ltm.find_nearest("food_rich", h.pos)
                target = mem.pos if mem else h.pos
        elif action == "seek_water":
            water_vo = next((v for v in h.visible if v.kind=="water"), None)
            if water_vo:
                target = water_vo.pos
            else:
                mem = h.ltm.find_nearest("water", h.pos)
                target = mem.pos if mem else h.pos
        else:
            target = h.pos
        direction = np.array([float(target[0]) - h.body.position[0], float(target[1]) - h.body.position[1], 0.0])
        if np.linalg.norm(direction) > 0.1:
            direction = direction / np.linalg.norm(direction)
        h.apply_movement_impulse(direction, speed=1.0)

    elif action=="flee" and not h.sleeping:
        flee_direction = np.array([random.choice([-1.0, 1.0]), random.choice([-1.0, 1.0]), 0.0])
        h.apply_movement_impulse(flee_direction, speed=2.0)
        h.brain.drives.relieve("fear",10)

    elif action in ("explore","rest") and not h.sleeping:
        if action=="explore":
            explore_direction = np.array([random.uniform(-1.0, 1.0), random.uniform(-1.0, 1.0), 0.0])
            if np.linalg.norm(explore_direction) > 0.1:
                explore_direction = explore_direction / np.linalg.norm(explore_direction)
            h.apply_movement_impulse(explore_direction, speed=0.5)
            h.brain.drives.relieve("bored",5)
        else:
            h.brain.drives.relieve("tired",5)

    if dis_fx["human_injury"]>0 and random.random()<0.5:
        h.health=max(0,h.health-dis_fx["human_injury"])
        h.body.health=h.health
        h.brain.receive_pain("injury",dis_fx["human_injury"]/50)
    if dis_fx["plague_active"] and random.random()<dis_fx["plague_severity"]*0.05:
        if "🦠 โรคระบาด" not in h.body.diseases:
            h.body.diseases.append("🦠 โรคระบาด")
            h.body.health=max(0,h.body.health-15)
            h.brain.receive_pain("disease",0.5)
            _log(f"🦠 {h.name} ติดโรค!")


def _log(msg: str, event_type: str = "general"):
    hour = sim.hour   # ใช้ hour ภายใน
    minute = datetime.now(TZ_THAI).minute
    second = datetime.now(TZ_THAI).second
    text = f"[Day {sim.day} | {hour:02d}:{minute:02d}:{second:02d}] {msg}"
    sim.history.append(text)
    event_buffer.add(sim.day, msg, event_type, sim.hour)


# ══════════════════════════════════════════════════════════════════════════════
# FASTAPI APP
# ══════════════════════════════════════════════════════════════════════════════
app = FastAPI(title="Pangea Simulation")

# WebSocket connections
connections: Set[WebSocket] = set()


SAVE_INTERVAL_STEPS = 1   # save ทุก 1 step = ทุก 1 ชั่วโมง sim (ทุก 1 วินาทีจริง)

@app.on_event("startup")
async def startup():
    # ── Init DB (optional) ───────────────────────────────────────
    try:
        db_ok = init_db()
        if db_ok:
            snapshot = load_latest_snapshot()
            if snapshot:
                _restore_from_snapshot(snapshot)
    except Exception as e:
        print(f"[DB] Skipping database: {e}")

    t = threading.Thread(target=run_simulation, daemon=True)
    t.start()
    print("🌍 Simulation thread started")


def _restore_from_snapshot(snapshot: dict):
    """restore sim state จาก DB snapshot"""
    try:
        s = snapshot["state"]
        with sim.lock:
            sim.day                  = s.get("day", 0)
            sim.weather.day          = s.get("weather_day", 0)
            sim.weather.global_temperature = s.get("temp", 28)
            sim.weather.global_moisture    = s.get("moisture", 60)
            sim.plants.global_biomass      = s.get("biomass", 60)
            sim.fauna.rabbit_pop     = s.get("rabbit", 100)
            sim.fauna.deer_pop       = s.get("deer", 50)
            sim.fauna.tiger_pop      = s.get("tiger", 5)

            if snapshot.get("humans"):
                sim.humans = snapshot["humans"]
            else:
                for h in sim.humans:
                    load_human_memory(h.name, h.ltm)

            print(f"[RESUME] Day {sim.day} restored ✅")
    except Exception as e:
        print(f"[RESUME] Error: {e} — starting fresh")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connections.add(websocket)
    try:
        await websocket.send_text(json.dumps(sim.get_snapshot()))
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=2.5)
                msg  = json.loads(data)
                _handle_command(msg)
            except asyncio.TimeoutError:
                pass
            await websocket.send_text(json.dumps(sim.get_snapshot()))
    except WebSocketDisconnect:
        connections.discard(websocket)
    except Exception as e:
        print(f"WS error: {e}")
        connections.discard(websocket)


def _handle_command(msg: dict):
    cmd = msg.get("cmd")
    with sim.lock:
        if cmd == "reset":
            sim.__init__()
            sim.running = True
            sim.game_over = False
            sim.dead.clear()


@app.get("/api/state")
def get_state():
    snap = sim.get_snapshot()
    if snap is None:
        sim._snapshot_dirty = True
        return sim.get_snapshot()
    return snap

@app.get("/api/state/delta")
def get_state_delta(last_day: int = -1):
    snap = sim.get_snapshot()
    if snap is None:
        return {"type": "full", "data": {}}
    current_day = snap["day"]

    if last_day == -1 or last_day != current_day:
        return {"type": "full", "data": snap}

    return {
        "type": "partial",
        "data": {
            "day":      snap["day"],
            "time":     snap["time"],
            "phase":    snap["phase"],
            "running":  snap["running"],
            "humans":   snap["humans"],
            "animals":  snap["animals"],
            "fauna":    snap["fauna"],
            "history":  snap["history"][-5:],
            "dialogue": snap.get("dialogue", []),
            "fire_spots": snap.get("fire_spots", []),
            "disasters": snap.get("disasters", []),
            "atmosphere": snap.get("atmosphere", {}),
        }
    }

@app.get("/api/history")
def api_history(from_day: int = 0, limit: int = 200, event_type: str = None):
    """Event log ย้อนหลัง จาก DB"""
    return get_event_log(from_day=from_day, limit=limit, event_type=event_type)

@app.get("/api/timeseries")
def api_timeseries(from_day: int = 0, limit: int = 500):
    """Time series สำหรับ graph"""
    return get_timeseries(from_day=from_day, limit=limit)

@app.get("/api/memory/{name}")
def api_memory(name: str, limit: int = 20):
    """ความทรงจำของ Adam หรือ Eve จาก DB"""
    from database import get_conn
    import psycopg2.extras
    conn = get_conn()
    if not conn:
        return []
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("""
                SELECT mem_type, data_json, sim_day
                FROM human_memory WHERE human_name = %s
                ORDER BY sim_day DESC LIMIT 3
            """, (name,))
            return [dict(r) for r in cur.fetchall()]
    except:
        return []

@app.post("/api/command/{cmd}")
def command(cmd: str):
    _handle_command({"cmd": cmd})
    return {"ok": True, "cmd": cmd}

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def index():
    return FileResponse("static/index.html")
```

---
