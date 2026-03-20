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
import random
import numpy as np

# ══════════════════════════════════════════════════════════════════════════════
# SIMULATION STATE — shared between sim thread and WebSocket handlers
# ══════════════════════════════════════════════════════════════════════════════
TZ_THAI = timezone(timedelta(hours=7))
# ── Time Scale ────────────────────────────────────────────────────────────
# 1 ชั่วโมงจริง = 1 วัน sim
# 1 วัน sim = 24 ชั่วโมง sim → step ทุก 150 วินาที = 1 ชั่วโมง sim
SIM_STEP_INTERVAL = 150.0   # วินาทีจริงต่อ 1 ชั่วโมง sim (3600/24 = 150)

# ── สรุป scale ──────────────────────────────────────────────────────────────
# 150 วิ = 1 ชม sim
# 3600 วิ (1 ชม real) = 24 ชม sim = 1 วัน sim ✅
# นั่งดู 1 ชม เห็น Adam/Eve ใช้ชีวิต 1 วันเต็ม

class SimState:
    def __init__(self):
        self.lock = threading.Lock()
        self.running = False
        self.day = 0
        self.hour = 12
        self.history: list[str] = []
        self.cooked_foods: list[dict] = []
        self.dead: set = set()
        self.game_over = False
        self.pop_history: list[int] = []
        self.human_pop_history: list[int] = []
        self.biomass_history: list[float] = []
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
        base = ["หินเหล็กไฟ", "กิ่งไม้แห้ง", "ใบไม้ใหญ่", "เถาวัลย์"]
        adam.inventory = random.sample(base, 3)
        eve.inventory  = random.sample(base, 3)
        self.humans    = [adam, eve]
        self.animals   = spawn_wildlife()
        self.SIZE      = self.terrain.size

    def get_snapshot(self) -> dict:
        """สร้าง JSON snapshot สำหรับส่งไป frontend"""
        with self.lock:
            now_thai = datetime.now(TZ_THAI)
            season   = get_season(self.weather.day)
            phase    = self._day_phase(now_thai.hour)

            # map pixels (50x50 RGB)
            img = self._build_map()

            humans_data = []
            for h in self.humans:
                b  = h.brain
                bd = h.body
                humans_data.append({
                    "name":    h.name,
                    "sex":     h.sex,
                    "pos":     h.pos,
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
                })

            rel_s = self.rel.summary

            return {
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
                "pop_history": self.pop_history[-100:],
                "biomass":  round(self.plants.global_biomass, 1),
                "game_over":self.game_over,
                "running":  self.running,
                "animals": [
                    {"species": a.species, "type": a.a_type,
                     "pos": a.pos, "icon": a.icon,
                     "sleeping": a.sleeping, "status": a.status}
                    for a in self.animals
                ],
            }

    def _build_map(self) -> list:
        """สร้าง map เป็น flat list ของ [r,g,b] สำหรับ canvas"""
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
                        fr = max(0, min(SIZE-1, d.center[0]+dr))
                        fc = max(0, min(SIZE-1, d.center[1]+dc))
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
        brightness = self._brightness(datetime.now(TZ_THAI).hour)
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


def _step_world():
    """Step โลก 1 ชั่วโมง sim (เรียกภายใน lock)"""
    hour = datetime.now(TZ_THAI).hour
    SIZE = sim.SIZE

    sim.day  += 1
    sim.hour  = hour

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

    # ── Fauna — กินอาหารจาก grid ─────────────────────────────────────
    # Herbivore กิน vegetation ที่ตำแหน่งของตัวเอง
    for a in sim.animals:
        if a.a_type == "Herbivore" and not a.sleeping:
            eaten = sim.plants.consume_at(a.pos[0], a.pos[1], 5)
            if eaten > 0:
                a.energy = min(a.energy + eaten * a.energy_gain * 0.1, 1000)
    sim.fauna.step_day(biomass)
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

        perc = {
            "temp_c":           sim.weather.global_temperature,
            "hour":             hour,
            "partner_dist":     abs(h.pos[0]-partner.pos[0])+abs(h.pos[1]-partner.pos[1]),
            "partner_sleeping": partner.sleeping,
            "partner_hungry":   partner.brain.drives.hunger > 70,   # ✅ รู้ว่า partner หิวไหม
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

        action = h.brain.step(perc)
        h.current_action = action

        # Execute
        _execute_action(h, partner, action, perc, info_now, near_fire,
                        has_cooked, hour, dis_fx, SIZE)

        # Physics
        h_px = sim.wp.human_daily_physics(
            h.mass, h.height, h.sex,
            1.0 if h.sleeping else 1.4,
            sim.weather.global_temperature,
            info_now["elevation"],
        )
        warmth = sim.fs.human_warmth_effect(h.pos, h.mass, sim.weather.global_temperature)
        h.u_energy = max(0, h.u_energy + h_px["du_kj"]
                         + warmth["heat_gained_kj"] - warmth["cold_penalty_kj"])
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

        # ── Pain จาก body state จริง → ส่งไป brain ──────────────────
        # ร่างกายหิวมาก → brain รู้สึกเจ็บจริง
        if h.brain.drives.hunger >= 85:
            h.brain.receive_pain("hunger", (h.brain.drives.hunger - 85) / 50)
        # หนาวมาก → brain รู้สึกเจ็บ
        if h.brain.drives.cold >= 60:
            h.brain.receive_pain("cold", (h.brain.drives.cold - 60) / 80)
        # กลัวมาก (Carnivore ใกล้) → รู้สึกเจ็บ
        if h.brain.drives.fear >= 50:
            h.brain.receive_pain("injury", (h.brain.drives.fear - 50) / 100)
        # สุขภาพต่ำ → pain ต่อเนื่อง
        if h.body.health < 50:
            h.brain.receive_pain("injury", (50 - h.body.health) / 100)
        # ง่วงมาก แต่ยังไม่นอน → เจ็บ
        if h.brain.drives.tired >= 90 and not h.sleeping:
            h.brain.receive_pain("tired", 0.3)

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

    # ── Wildlife ──────────────────────────────────────────────────────
    for a in list(sim.animals):
        info = sim.terrain.get_info(a.pos[0], a.pos[1])
        a.update_life(info["elevation"], hour)
        a.move(size=SIZE)
        if not a.sleeping and a.a_type=="Carnivore" and a.energy<400:
            for prey in sim.animals:
                if prey.a_type=="Herbivore" and not prey.sleeping and prey.pos==a.pos:
                    a.energy = min(a.energy+a.energy_gain, 1000)
                    prey.energy -= 200
                    _log(f"🩸 {a.species} ล่า {prey.species}")
                    break
        if a.energy <= 0:
            _log(f"💀 {a.species} ตาย")
    sim.animals = [a for a in sim.animals if a.energy > 0]

    # ── History records ───────────────────────────────────────────────
    sim.pop_history.append(sim.fauna.rabbit_pop)
    sim.human_pop_history.append(sim.humansys.human_pop)
    sim.biomass_history.append(sim.plants.global_biomass)
    if len(sim.history) > 500:
        sim.history = sim.history[-500:]


def _execute_action(h, partner, action, perc, info_now, near_fire,
                    has_cooked, hour, dis_fx, SIZE):
    if action == "sleep":
        h.sleeping = True
        h.brain.drives.relieve("tired", 12)
        # pleasure ตามระดับที่ต้องการ — ยิ่งง่วงมาก ยิ่งสุขเมื่อได้นอน
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
            eaten = sim.plants.consume_at(h.pos[0], h.pos[1], 15)  # ✅ grid consume
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
            h.pos[0]=max(0,min(SIZE-1,h.pos[0]+max(-2,min(2,best[0]-h.pos[0]))))
            h.pos[1]=max(0,min(SIZE-1,h.pos[1]+max(-2,min(2,best[1]-h.pos[1]))))

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
                        h.pos[0]=max(0,min(SIZE-1,h.pos[0]+max(-2,min(2,r2-h.pos[0]))))
                        h.pos[1]=max(0,min(SIZE-1,h.pos[1]+max(-2,min(2,c2-h.pos[1]))))
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
        if action=="seek_partner":
            target=partner.pos
        elif action=="seek_fire" and sim.fs.active_fires:
            target=sim.fs.active_fires[0].pos
        else:
            target=h.pos
        dr=max(-2,min(2,target[0]-h.pos[0])); dc=max(-2,min(2,target[1]-h.pos[1]))
        h.pos[0]=max(0,min(SIZE-1,h.pos[0]+dr)); h.pos[1]=max(0,min(SIZE-1,h.pos[1]+dc))

    elif action=="flee" and not h.sleeping:
        h.pos[0]=max(0,min(SIZE-1,h.pos[0]+random.choice([-3,-2,2,3])))
        h.pos[1]=max(0,min(SIZE-1,h.pos[1]+random.choice([-3,-2,2,3])))
        h.brain.drives.relieve("fear",10)

    elif action in ("explore","rest") and not h.sleeping:
        if action=="explore":
            dr,dc=random.randint(-3,3),random.randint(-3,3)
            nr,nc=max(0,min(SIZE-1,h.pos[0]+dr)),max(0,min(SIZE-1,h.pos[1]+dc))
            if not sim.terrain.get_info(nr,nc).get("is_water"):
                h.pos[0],h.pos[1]=nr,nc
            h.brain.drives.relieve("bored",5)
        else:
            h.brain.drives.relieve("tired",5)

    # ภัยธรรมชาติ
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


def _log(msg: str):
    sim.history.append(f"Day {sim.day}: {msg}")


# ══════════════════════════════════════════════════════════════════════════════
# FASTAPI APP
# ══════════════════════════════════════════════════════════════════════════════
app = FastAPI(title="Pangea Simulation")

# WebSocket connections
connections: Set[WebSocket] = set()


@app.on_event("startup")
async def startup():
    t = threading.Thread(target=run_simulation, daemon=True)
    t.start()
    print("🌍 Simulation thread started")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connections.add(websocket)
    try:
        # ส่ง snapshot แรกทันที
        await websocket.send_text(json.dumps(sim.get_snapshot()))
        while True:
            # รอ message จาก client (ping หรือ command)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=2.5)
                msg  = json.loads(data)
                _handle_command(msg)
            except asyncio.TimeoutError:
                pass
            # ส่ง snapshot ทุก 2.5 วินาที
            await websocket.send_text(json.dumps(sim.get_snapshot()))
    except WebSocketDisconnect:
        connections.discard(websocket)
    except Exception as e:
        print(f"WS error: {e}")
        connections.discard(websocket)


def _handle_command(msg: dict):
    cmd = msg.get("cmd")
    with sim.lock:
        if cmd == "start":   sim.running = True
        elif cmd == "pause": sim.running = False
        elif cmd == "step":
            sim.running = False
            _step_world()
        elif cmd == "reset":
            sim.__init__()


# REST fallback
@app.get("/api/state")
def get_state():
    return sim.get_snapshot()

@app.post("/api/command/{cmd}")
def command(cmd: str):
    _handle_command({"cmd": cmd})
    return {"ok": True, "cmd": cmd}

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def index():
    return FileResponse("static/index.html")
