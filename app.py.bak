import streamlit as st
import time
import random
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta

from human_ai import HumanAI
from biology import PlantEcosystem, FaunaEcosystem, HumanEcosystem, GESTATION_DAYS
from wildlife import spawn_wildlife
from environment import WeatherSystem, DisasterSystem, get_season
from terrain import TerrainMap
from relationship import Relationship
from body import Body
from physics_engine import WorldPhysics
from fire_system import FireSystem, Campfire

st.set_page_config(layout="wide", page_title="🧬 Pangea Simulation")

# ─────────────────────────────────────────────
# TIMEZONE & TIME UTILS
# ─────────────────────────────────────────────
TZ_THAI = timezone(timedelta(hours=7))
# 1 นาทีจริง = 30 นาที sim
# ดังนั้น 1 วัน sim (24 ชม sim) = 48 นาทีจริง = 2880 วินาที
REAL_SECONDS_PER_SIM_DAY = 48 * 60

def now_thai() -> datetime:
    return datetime.now(TZ_THAI)

def thai_time_str() -> str:
    return now_thai().strftime("%d %b %Y  %H:%M:%S")

def elapsed_sim_days(start_ts: float) -> int:
    """คำนวณวัน sim ที่ควรจะเป็น จากเวลาจริงที่ผ่านไป"""
    elapsed = time.time() - start_ts
    return int(elapsed / REAL_SECONDS_PER_SIM_DAY)

# ─────────────────────────────────────────────
# DAY / NIGHT SYSTEM
# ─────────────────────────────────────────────
def get_hour_thai() -> int:
    """ชั่วโมงปัจจุบันในโซน UTC+7 (0–23)"""
    return now_thai().hour

def get_day_phase() -> dict:
    """คืนข้อมูล phase กลางวัน/กลางคืน จากเวลาไทยจริง"""
    h = get_hour_thai()
    if 6 <= h < 8:
        return {"phase": "dawn",    "label": "🌅 รุ่งอรุณ",    "brightness": 0.65, "temp_mod": -1.0}
    elif 8 <= h < 17:
        return {"phase": "day",     "label": "☀️ กลางวัน",     "brightness": 1.0,  "temp_mod":  0.0}
    elif 17 <= h < 19:
        return {"phase": "dusk",    "label": "🌇 โพล้เย็น",    "brightness": 0.65, "temp_mod": -0.5}
    elif 19 <= h < 22:
        return {"phase": "evening", "label": "🌃 หัวค่ำ",       "brightness": 0.35, "temp_mod": -1.5}
    else:
        return {"phase": "night",   "label": "🌙 กลางคืน",     "brightness": 0.15, "temp_mod": -3.0}

def apply_night_overlay(img: "np.ndarray", brightness: float) -> "np.ndarray":
    """หรี่แสง map ตาม brightness (0.0–1.0) — เพิ่ม blue tint กลางคืน"""
    result = img.astype(np.float32) * brightness
    if brightness < 0.5:  # กลางคืน — เพิ่ม blue tint
        result[:, :, 2] = np.clip(result[:, :, 2] + (1 - brightness) * 30, 0, 255)
    return np.clip(result, 0, 255).astype(np.uint8)

# ─────────────────────────────────────────────
# INIT
# ─────────────────────────────────────────────
if "initialized" not in st.session_state:
    st.session_state.terrain  = TerrainMap(seed=42)
    st.session_state.weather   = WeatherSystem()
    st.session_state.disasters = DisasterSystem(map_size=50)
    st.session_state.plants   = PlantEcosystem()
    st.session_state.fauna    = FaunaEcosystem()
    st.session_state.humansys = HumanEcosystem()

    adam = HumanAI("Adam", 170, 70, "Eve")
    eve  = HumanAI("Eve",  160, 55, "Adam")
    base_items = ["หินเหล็กไฟ", "กิ่งไม้แห้ง", "ใบไม้ใหญ่", "เถาวัลย์"]
    adam.inventory = random.sample(base_items, 3)
    eve.inventory  = random.sample(base_items, 3)
    st.session_state.humans = [adam, eve]

    st.session_state.animals      = spawn_wildlife()
    st.session_state.relationship = Relationship('Adam', 'Eve')
    # Body objects ถูกสร้างภายใน HumanAI แล้ว — เข้าถึงผ่าน h.body
    st.session_state.world_physics = WorldPhysics()
    st.session_state.physics_log   = []   # เก็บ daily physics snapshot
    st.session_state.fire_system   = FireSystem()
    st.session_state.cooked_foods  = []   # อาหารที่ปรุงแล้วรอกิน

    st.session_state.history          = []
    st.session_state.pop_history      = []
    st.session_state.human_pop_history = []
    st.session_state.day              = 0
    st.session_state.start_ts          = time.time()   # timestamp เริ่ม sim
    st.session_state.last_sim_day      = 0             # วัน sim ล่าสุดที่ update แล้ว
    st.session_state.initialized      = True


# ─────────────────────────────────────────────
# WORLD UPDATE
# ─────────────────────────────────────────────
def update_world():
    terrain  = st.session_state.terrain
    weather  = st.session_state.weather
    plants   = st.session_state.plants
    fauna    = st.session_state.fauna
    humansys = st.session_state.humansys
    humans   = st.session_state.humans
    SIZE     = terrain.size


    w_events = weather.step_day()
    for ev in w_events:
        st.session_state.history.append(f'Day {st.session_state.day}: {ev}')

    # ── ภัยธรรมชาติ ──────────────────────────────────────────
    disasters = st.session_state.disasters
    dis_events, dis_fx = disasters.step_day(weather)
    for ev in dis_events:
        st.session_state.history.append(f'Day {st.session_state.day}: {ev}')

    # ปรับ weather ตามภัย
    weather.global_moisture    = max(20, min(90, weather.global_moisture    + dis_fx['moisture_mod']))
    weather.global_temperature = max(15, min(42, weather.global_temperature + dis_fx['temp_mod']))

    biomass = plants.step_day(weather.global_moisture, weather.global_temperature)

    # ── Physics Engine — คำนวณทุก law ──────────────────────────────
    wp      = st.session_state.world_physics
    hour    = get_hour_thai()
    cloud   = 0.8 if weather.current_state in ('ฝนตก','พายุเข้า') else 0.3
    px      = wp.daily_update(
        hour=hour, temp_c=weather.global_temperature,
        moisture=weather.global_moisture, cloud_cover=cloud,
        biomass=biomass, animal_count=len(st.session_state.animals),
    )
    # greenhouse warming → อุณหภูมิเพิ่ม
    weather.global_temperature = min(42, weather.global_temperature + px['temp_delta'])
    # nutrient → biomass growth bonus
    plants.global_biomass = min(100, plants.global_biomass + px['biomass_growth'])
    # บันทึก snapshot
    if 'physics_log' not in st.session_state:
        st.session_state.physics_log = []
    st.session_state.physics_log.append(px)
    if len(st.session_state.physics_log) > 365:
        st.session_state.physics_log.pop(0)

    # ── Fire System ──────────────────────────────────────────────
    fs = st.session_state.fire_system
    fire_events, fire_heat = fs.step_hour(weather.global_temperature)
    for ev in fire_events:
        st.session_state.history.append(f'Day {st.session_state.day}: {ev}')
    # CO2 จากไฟ → atmosphere
    total_fire_co2 = sum(f.co2_released for f in fs.active_fires)
    wp.atmo.co2_ppm = min(2000, wp.atmo.co2_ppm + total_fire_co2 * 0.001)

    # ปรับ biomass ตามภัย
    if dis_fx['biomass_mod'] != 0:
        plants.global_biomass = max(10, plants.global_biomass * (1 + dis_fx['biomass_mod']))
    terrain.regrow()
    fauna.step_day(biomass)

    # สัตว์ตายจากภัย
    if dis_fx['animal_deaths'] > 0:
        kill = dis_fx['animal_deaths']
        fauna.rabbit_pop = max(0, fauna.rabbit_pop - kill * 3)
        fauna.deer_pop   = max(0, fauna.deer_pop   - kill)
        if dis_fx['animal_flee']:
            for a in st.session_state.animals:
                a.pos[0] = random.randint(0, 49)
                a.pos[1] = random.randint(0, 49)
            st.session_state.history.append(f'🐾 Day {st.session_state.day}: สัตว์ป่าอพยพหนีภัย!')

    hunted = humansys.step_day(biomass, fauna.deer_pop)
    fauna.deer_pop = max(0, fauna.deer_pop - hunted)

    prev_pop = st.session_state.human_pop_history[-1] if st.session_state.human_pop_history else 2
    if humansys.human_pop > prev_pop:
        st.session_state.history.append(f"👶 Day {st.session_state.day}: ประชากรเพิ่มเป็น {humansys.human_pop}")
    elif humansys.human_pop < prev_pop:
        st.session_state.history.append(f"💀 Day {st.session_state.day}: ประชากรลดเหลือ {humansys.human_pop}")

    # ── Pure Autonomous Brain Loop ─────────────────────────────────
    hour       = get_hour_thai()
    adam_h     = humans[0]
    eve_h      = humans[1]
    partners   = {adam_h: eve_h, eve_h: adam_h}
    has_cooked = len(st.session_state.get("cooked_foods", [])) > 0

    if not st.session_state.get("game_over"):
        for h in humans:
            if not h.body.alive:
                continue
            partner = partners[h]
            h.brain.day = st.session_state.day

            # ── Perception ──────────────────────────────────────────────
            info_now  = terrain.get_info(h.pos[0], h.pos[1])
            near_fire = fs.nearby_fire(h.pos, radius=3)
            has_danger = any(
                a.a_type == "Carnivore" and not a.sleeping and
                abs(a.pos[0]-h.pos[0]) + abs(a.pos[1]-h.pos[1]) <= 4
                for a in st.session_state.animals
            )
            perc = {
                "temp_c":          weather.global_temperature,
                "hour":            hour,
                "partner_dist":    abs(h.pos[0]-partner.pos[0]) + abs(h.pos[1]-partner.pos[1]),
                "partner_sleeping":partner.sleeping,
                "danger":          has_danger,
                "has_food":        info_now["food_level"] > 20 or fauna.deer_pop > 5,
                "has_water":       info_now.get("is_water", False),
                "has_fire":        near_fire is not None,
                "has_cooked_food": has_cooked,
                "biome_food":      info_now["food_level"],
                "is_night":        hour >= 21 or hour < 6,
                "inventory":       h.inventory,
                "has_child_nearby":False,
            }

            # ── Brain decides ───────────────────────────────────────────
            action = h.brain.step(perc)
            h.current_action = f"🧠 {action}"

            # ── Execute + Pain/Pleasure signals ────────────────────────

            if action == "sleep":
                h.sleeping = True
                h.brain.drives.relieve("tired", 12)
                h.brain.receive_pleasure("rest", 0.3)

            elif action in ("eat_raw", "seek_food") and not h.sleeping:
                ate = False
                # ลองล่า wildlife ก่อน
                for a in list(st.session_state.animals):
                    if a.a_type == "Herbivore" and not a.sleeping:
                        if abs(a.pos[0]-h.pos[0]) + abs(a.pos[1]-h.pos[1]) <= 2:
                            hunt_chance = 0.3 + h.brain.skill.get("hunt", 0) / 200
                            if random.random() < hunt_chance:
                                meat_kcal = {"🐰": 120, "🦌": 400, "🐗": 300}.get(a.icon, 150)
                                st.session_state.cooked_foods.append(
                                    {"name": f"เนื้อ{a.species}", "kcal": meat_kcal * 0.7, "who": h.name})
                                fauna.deer_pop   = max(0, fauna.deer_pop   - (1 if a.icon == "🦌" else 0))
                                fauna.rabbit_pop = max(0, fauna.rabbit_pop - (1 if a.icon == "🐰" else 0))
                                if a in st.session_state.animals:
                                    st.session_state.animals.remove(a)
                                h.brain.drives.relieve("hunger", 20)
                                h.brain.receive_pleasure("hunt_success", 0.7)
                                h.brain.skill["hunt"] = min(100, h.brain.skill.get("hunt", 0) + 3)
                                st.session_state.history.append(
                                    f"🏹 Day {st.session_state.day}: {h.name} ล่า {a.species} สำเร็จ!")
                                ate = True
                            else:
                                h.brain.receive_pain("hunt_fail", 0.15)
                            break
                # กินจาก terrain ถ้าล่าไม่ได้
                if not ate and info_now["food_level"] > 10:
                    terrain.vegetation[h.pos[0]][h.pos[1]] = max(0, info_now["food_level"] - 10)
                    h.u_energy = min(2000, h.u_energy + 150)
                    h.brain.drives.relieve("hunger", 25)
                    h.brain.receive_pleasure("food", 0.4)
                    st.session_state.history.append(f"🥩 Day {st.session_state.day}: {h.name} กินอาหารดิบ")
                    ate = True
                if not ate:
                    h.brain.receive_pain("hunger", 0.3)
                    best = [0, 0]
                    best_food = -1
                    for dr in range(-5, 6):
                        for dc in range(-5, 6):
                            r2 = max(0, min(SIZE-1, h.pos[0]+dr))
                            c2 = max(0, min(SIZE-1, h.pos[1]+dc))
                            fl = terrain.vegetation[r2][c2]
                            if fl > best_food:
                                best_food, best = fl, [r2, c2]
                    dr = max(-2, min(2, best[0]-h.pos[0]))
                    dc = max(-2, min(2, best[1]-h.pos[1]))
                    h.pos[0] = max(0, min(SIZE-1, h.pos[0]+dr))
                    h.pos[1] = max(0, min(SIZE-1, h.pos[1]+dc))

            elif action == "eat_cooked" and has_cooked and not h.sleeping:
                food = st.session_state.cooked_foods.pop(0)
                h.u_energy = min(2000, h.u_energy + food["kcal"])
                h.brain.drives.relieve("hunger", 70)
                h.brain.receive_pleasure("food", 1.0)
                h.brain.emotion.update("ate_well", 0.2)
                st.session_state.history.append(
                    f"🍖 Day {st.session_state.day}: {h.name} กินอาหารสุก ({food['kcal']:.0f} kcal)")

            elif action in ("drink", "seek_water") and not h.sleeping:
                if info_now.get("is_water"):
                    h.brain.drives.relieve("thirst", 60)
                    h.brain.drives.relieve("bladder", -15)
                    h.brain.receive_pleasure("water", 0.5)
                    st.session_state.history.append(f"💧 Day {st.session_state.day}: {h.name} ดื่มน้ำ")
                else:
                    best_water = [0, 0]
                    for dr in range(-8, 9):
                        for dc in range(-8, 9):
                            r2 = max(0, min(SIZE-1, h.pos[0]+dr))
                            c2 = max(0, min(SIZE-1, h.pos[1]+dc))
                            if terrain.template[r2][c2] in [0, 1]:
                                best_water = [r2, c2]; break
                        else: continue; break
                    dr = max(-2, min(2, best_water[0]-h.pos[0]))
                    dc = max(-2, min(2, best_water[1]-h.pos[1]))
                    h.pos[0] = max(0, min(SIZE-1, h.pos[0]+dr))
                    h.pos[1] = max(0, min(SIZE-1, h.pos[1]+dc))

            elif action == "toilet" and not h.sleeping:
                h.brain.drives.relieve("bladder", 80)
                h.brain.receive_pleasure("relief", 0.4)

            elif action == "start_fire" and not h.sleeping:
                if "หินเหล็กไฟ" in h.inventory and "กิ่งไม้แห้ง" in h.inventory:
                    campfire = fs.start_fire(h.pos[:], fuel_kg=3.0)
                    ok, msg  = campfire.ignite(weather.global_moisture/100, True)
                    st.session_state.history.append(f"Day {st.session_state.day}: {h.name} — {msg}")
                    if ok:
                        h.brain.drives.relieve("cold", 40)
                        h.brain.receive_pleasure("warmth", 1.0)
                        h.brain.emotion.update("fire_lit", 0.3)
                    else:
                        h.brain.receive_pain("failure", 0.2)
                else:
                    h.brain.receive_pain("no_tool", 0.1)

            elif action in ("cook", "tend_fire") and not h.sleeping:
                near = fs.nearby_fire(h.pos, radius=2)
                if near and near.active:
                    if action == "cook":
                        food_choice = random.choice(["เนื้อกวาง", "เนื้อกระต่าย", "ปลา"])
                        cooked, msg = fs.cook_food(food_choice, near)
                        st.session_state.history.append(f"Day {st.session_state.day}: 🍖 {h.name} — {msg}")
                        if cooked:
                            st.session_state.cooked_foods.append(
                                {"name": cooked.name, "kcal": cooked.kcal, "who": h.name})
                            h.brain.receive_pleasure("cooked_food", 0.8)
                    else:
                        if "กิ่งไม้แห้ง" in h.inventory:
                            near.fuel_kg += 2.0
                            h.brain.receive_pleasure("warmth", 0.3)
                else:
                    for f2 in fs.active_fires:
                        dr = max(-2, min(2, f2.pos[0]-h.pos[0]))
                        dc = max(-2, min(2, f2.pos[1]-h.pos[1]))
                        h.pos[0] = max(0, min(SIZE-1, h.pos[0]+dr))
                        h.pos[1] = max(0, min(SIZE-1, h.pos[1]+dc))
                        break

            elif action == "gather" and not h.sleeping:
                pool = ["กิ่งไม้แห้ง", "ใบไม้ใหญ่", "เถาวัลย์", "หินคม"]
                if info_now.get("has_herb"):
                    pool.append("หินเหล็กไฟ")
                new_item = random.choice(pool)
                if new_item not in h.inventory:
                    h.inventory.append(new_item)
                    h.brain.receive_pleasure("discovery", 0.4)
                    st.session_state.history.append(f"🌿 Day {st.session_state.day}: {h.name} เก็บ {new_item}")
                else:
                    h.brain.receive_pain("redundant", 0.05)

            elif action == "craft" and not h.sleeping:
                items, stats, invention = h.experiment()
                if items and invention:
                    inv_name = invention.get("name", f"{items[0]}+{items[1]}")
                    h.brain.receive_pleasure("invention", 0.9)
                    st.session_state.history.append(f"💡 Day {st.session_state.day}: {h.name} สร้าง '{inv_name}'")
                else:
                    h.brain.receive_pain("failure", 0.1)

            elif action == "mate" and not h.sleeping:
                if perc["partner_dist"] <= 3 and not partner.sleeping:
                    h.brain.drives.relieve("lonely", 50)
                    h.brain.drives.relieve("bored", 20)
                    h.brain.receive_pleasure("connection", 1.0)
                    h.brain.emotion.update("mated", 0.3)
                    st.session_state.history.append(
                        f"💕 Day {st.session_state.day}: {h.name} ใกล้ชิด {partner.name}")
                    # ✅ try_conceive จริง
                    if h.sex == "M" and partner.sex == "F" and not partner.body.pregnant:
                        if partner.body.try_conceive():
                            st.session_state.history.append(
                                f"🤰 Day {st.session_state.day}: {partner.name} ตั้งครรภ์!")
                            h.brain.receive_pleasure("reproduce", 2.0)
                            partner.brain.receive_pleasure("reproduce", 2.0)

            elif action == "seek_partner" and not h.sleeping:
                dr = max(-3, min(3, partner.pos[0]-h.pos[0]))
                dc = max(-3, min(3, partner.pos[1]-h.pos[1]))
                h.pos[0] = max(0, min(SIZE-1, h.pos[0]+dr))
                h.pos[1] = max(0, min(SIZE-1, h.pos[1]+dc))

            elif action == "flee" and not h.sleeping:
                h.pos[0] = max(0, min(SIZE-1, h.pos[0] + random.choice([-3,-2,2,3])))
                h.pos[1] = max(0, min(SIZE-1, h.pos[1] + random.choice([-3,-2,2,3])))
                h.brain.drives.relieve("fear", 10)

            elif action in ("explore", "rest") and not h.sleeping:
                if action == "explore":
                    dr, dc = random.randint(-3, 3), random.randint(-3, 3)
                    nr, nc = max(0,min(SIZE-1,h.pos[0]+dr)), max(0,min(SIZE-1,h.pos[1]+dc))
                    if not terrain.get_info(nr, nc).get("is_water"):
                        h.pos[0], h.pos[1] = nr, nc
                    h.brain.drives.relieve("bored", 5)
                    h.brain.drives.relieve("curious", 3)
                else:
                    h.brain.drives.relieve("tired", 5)

            # ── ตื่นนอน ─────────────────────────────────────────────────
            if h.sleeping and 6 <= hour < 21 and h.brain.drives.tired < 30:
                h.sleeping = False
                h.brain.receive_pleasure("rest", 0.5)
                st.session_state.history.append(f"🌅 Day {st.session_state.day}: {h.name} ตื่นนอน")

            # ── ภัยธรรมชาติ ─────────────────────────────────────────────
            if dis_fx["human_injury"] > 0 and random.random() < 0.5:
                h.health = max(0, h.health - dis_fx["human_injury"])
                h.body.health = h.health
                h.brain.receive_pain("injury", dis_fx["human_injury"] / 50)
            if dis_fx["plague_active"] and random.random() < dis_fx["plague_severity"] * 0.05:
                if "🦠 โรคระบาด" not in h.body.diseases:
                    h.body.diseases.append("🦠 โรคระบาด")
                    h.body.health = max(0, h.body.health - 15)
                    h.brain.receive_pain("disease", 0.5)
                    st.session_state.history.append(f"🦠 Day {st.session_state.day}: {h.name} ติดโรค!")

            # ── Physics ─────────────────────────────────────────────────
            h_px = wp.human_daily_physics(
                mass_kg=h.mass, height_cm=h.height, sex=h.sex,
                activity=1.0 if h.sleeping else 1.4,
                temp_c=weather.global_temperature,
                elevation=info_now["elevation"],
            )
            warmth = fs.human_warmth_effect(h.pos, h.mass, weather.global_temperature)
            h.u_energy = max(0, h.u_energy + h_px["du_kj"]
                             + warmth["heat_gained_kj"] - warmth["cold_penalty_kj"])
            h.body.u_energy = h.u_energy
            if warmth["near_fire"]:
                h.body.hormone.cortisol = max(5, h.body.hormone.cortisol - 2)
                h.brain.drives.relieve("cold", 3)

            # ── Body step ────────────────────────────────────────────────
            dist_pair = abs(h.pos[0]-partner.pos[0]) + abs(h.pos[1]-partner.pos[1])
            body_events = h.body.step_day(
                calories_in=800 if h.brain.drives.hunger < 60 else 200,
                is_active=not h.sleeping,
                stressed=(h.brain.drives.hunger >= 85),
                bonded=(dist_pair <= 3),
            )
            for ev in body_events:
                st.session_state.history.append(f"Day {st.session_state.day}: {ev}")

            # ── ✅ Death check ───────────────────────────────────────────
            h.health = h.body.health
            if not h.body.alive and h.name not in st.session_state.get("dead", set()):
                if "dead" not in st.session_state:
                    st.session_state.dead = set()
                st.session_state.dead.add(h.name)
                st.session_state.history.append(
                    f"💀 Day {st.session_state.day}: {h.name} เสียชีวิต (อายุ {h.body.age_years:.1f} ปี)")
                if len(st.session_state.dead) >= 2:
                    st.session_state.game_over = True
                    st.session_state.history.append(
                        f"🌑 Day {st.session_state.day}: สายพันธุ์มนุษย์สูญพันธุ์")

    # ── ความสัมพันธ์ Adam & Eve ──────────────────────────────────
    rel   = st.session_state.relationship
    adam_h = humans[0]
    eve_h  = humans[1]
    dist   = abs(adam_h.pos[0]-eve_h.pos[0]) + abs(adam_h.pos[1]-eve_h.pos[1])
    mated  = ('💕' in adam_h.current_action)
    rel_events = rel.step_day(
        dist=dist,
        mated_today=mated,
        a_hungry=(adam_h.needs.hunger >= 85),
        b_hungry=(eve_h.needs.hunger  >= 85),
    )
    for ev in rel_events:
        st.session_state.history.append(f'Day {st.session_state.day}: {ev}')

    # wildlife move + hunt
    hour    = get_hour_thai()
    animals = st.session_state.animals
    for a in animals:
        info      = terrain.get_info(a.pos[0], a.pos[1])
        elevation = info["elevation"]
        a.update_life(elevation, hour)   # ✅ ส่ง hour
        a.move(size=SIZE)                # ✅ ส่ง size, จะไม่ขยับถ้า sleeping

        # หลีกเลี่ยงน้ำ (เฉพาะ Herbivore ที่ตื่น)
        if not a.sleeping and a.a_type == "Herbivore" and info["is_water"]:
            a.move(size=SIZE)

        # ล่า — เฉพาะ Carnivore ที่ตื่น
        if not a.sleeping and a.a_type == "Carnivore" and a.energy < 400:
            for prey in animals:
                if not prey.sleeping and prey.a_type == "Herbivore" and prey.pos == a.pos:
                    a.energy = min(a.energy + a.energy_gain, 1000.0)
                    prey.energy -= 200
                    st.session_state.history.append(
                        f"🩸 Day {st.session_state.day}: {a.species} ล่า {prey.species}"
                    )
                    break

        if a.energy <= 0:
            st.session_state.history.append(f"💀 Day {st.session_state.day}: {a.species} ตายแล้ว")

    st.session_state.animals = [a for a in animals if a.energy > 0]

    # 🌙 Night events — เกิดเฉพาะช่วง 22:00–05:00
    phase = get_day_phase()
    if phase["phase"] == "night":
        # อุณหภูมิลดพิเศษตอนกลางคืน
        weather.global_temperature = max(20.0, weather.global_temperature + phase["temp_mod"])
        # Carnivore ได้เปรียบตอนกลางคืน — โอกาสล่าเพิ่มขึ้น
        for a in st.session_state.animals:
            if a.a_type == "Carnivore" and random.random() < 0.25:
                for prey in st.session_state.animals:
                    if prey.a_type == "Herbivore" and abs(a.pos[0]-prey.pos[0]) <= 2 and abs(a.pos[1]-prey.pos[1]) <= 2:
                        a.energy = min(a.energy + a.energy_gain * 0.5, 1000.0)
                        prey.energy -= 150
                        st.session_state.history.append(
                            f"🌙 Day {st.session_state.day}: {a.species} ล่ากลางคืน {prey.species}"
                        )
                        break
        # ฝนคืน — เพิ่มความชื้น
        if random.random() < 0.3:
            weather.global_moisture = min(90.0, weather.global_moisture + 2.0)
            st.session_state.history.append(f"🌧 Day {st.session_state.day}: ฝนตกกลางคืน")

    st.session_state.pop_history.append(fauna.rabbit_pop)
    st.session_state.human_pop_history.append(humansys.human_pop)


# ─────────────────────────────────────────────
# RENDER MAP  (50×50, scale=10px)
# ─────────────────────────────────────────────
def render_map():
    st.subheader(f"🌍 World Map — Day {st.session_state.day}  |  🕐 {thai_time_str()}")

    terrain = st.session_state.terrain
    SIZE    = terrain.size
    scale   = 10

    img = np.zeros((SIZE, SIZE, 3), dtype=np.uint8)

    # biome colors
    for r in range(SIZE):
        for c in range(SIZE):
            img[r, c] = terrain.get_color(r, c)

    # 🔥 แสดงกองไฟบน map
    if 'fire_system' in st.session_state:
        for f in st.session_state.fire_system.active_fires:
            fr, fc = max(0,min(SIZE-1,f.pos[0])), max(0,min(SIZE-1,f.pos[1]))
            img[fr, fc] = [255, 140, 0]   # สีส้ม = กองไฟ
            # glow รัศมี 1
            for dr in [-1,0,1]:
                for dc in [-1,0,1]:
                    gr,gc = max(0,min(SIZE-1,fr+dr)), max(0,min(SIZE-1,fc+dc))
                    img[gr,gc] = np.clip(img[gr,gc].astype(int)+[30,15,0], 0, 255).astype(np.uint8)

    # humans (white)
    for h in st.session_state.humans:
        r, c = max(0, min(SIZE-1, h.pos[0])), max(0, min(SIZE-1, h.pos[1]))
        img[r, c] = [255, 255, 255]

    # animals — สีต่างกันระหว่าง active/sleeping
    for a in st.session_state.animals:
        r, c = max(0, min(SIZE-1, a.pos[0])), max(0, min(SIZE-1, a.pos[1]))
        if a.sleeping:
            img[r, c] = [100, 100, 120]   # เทา = กำลังหลับ
        elif a.a_type == "Carnivore":
            img[r, c] = [255, 50, 50]     # แดง = Carnivore ตื่น
        else:
            img[r, c] = [255, 220, 50]    # เหลือง = Herbivore ตื่น

    # 🌊 Flood overlay — ทับสีน้ำเงินบนเซลล์ที่น้ำท่วม
    if 'disasters' in st.session_state:
        for d in st.session_state.disasters.active_disasters:
            if d.kind == 'flood':
                radius = int(d.severity * 6)
                for dr in range(-radius, radius+1):
                    for dc in range(-radius, radius+1):
                        fr = max(0, min(SIZE-1, d.center[0]+dr))
                        fc = max(0, min(SIZE-1, d.center[1]+dc))
                        img[fr, fc] = [30, 100, 220]
            elif d.kind == 'volcano':
                fr, fc = max(0,min(SIZE-1,d.center[0])), max(0,min(SIZE-1,d.center[1]))
                for dr in range(-2,3):
                    for dc in range(-2,3):
                        vr=max(0,min(SIZE-1,fr+dr)); vc=max(0,min(SIZE-1,fc+dc))
                        img[vr,vc]=[255,80,0]

    # 🌙 Night overlay
    phase = get_day_phase()
    img_big = np.kron(img, np.ones((scale, scale, 1))).astype(np.uint8)
    img_big = apply_night_overlay(img_big, phase["brightness"])
    st.image(img_big, width='stretch')

    # phase + legend
    st.caption(f"{phase['label']}  |  ⬜ มนุษย์  🟠 ไฟ  🟡 Herbivore(ตื่น)  🔴 Carnivore(ตื่น)  🔘 หลับ  🔵 น้ำ  🟢 ป่า  🟤 ภูเขา")


# ─────────────────────────────────────────────
# STATS
# ─────────────────────────────────────────────
def render_stats():
    fauna    = st.session_state.fauna
    weather  = st.session_state.weather
    humansys = st.session_state.humansys

    st.subheader("📊 Stats")
    c1, c2 = st.columns(2)
    c1.metric("🐰 Rabbits",  fauna.rabbit_pop)
    c1.metric("🦌 Deer",     fauna.deer_pop)
    c1.metric("👥 Humans",   humansys.human_pop)
    c2.metric("🐯 Tigers",   fauna.tiger_pop)
    c2.metric("🦅 Eagles",   fauna.eagle_pop)
    # แสดงรายละเอียดประชากรมนุษย์
    st.caption(humansys.summary)
    if humansys.pregnant_count > 0:
        days_left = GESTATION_DAYS - max(
            (p.days_pregnant for p in humansys.pregnancies if p.pregnant), default=0
        )
        st.caption(f"🤰 คาดคลอดใน ~{days_left} วัน")
    _phase = get_day_phase()
    c2.metric("🌡 Temp", f"{weather.global_temperature + _phase['temp_mod']:.1f}°C",
              delta=f"{_phase['temp_mod']:+.1f}°C" if _phase['temp_mod'] != 0 else None)
    st.write("🌦", weather.current_state)
    st.write(f"💧 Moisture: {weather.global_moisture:.1f}")


def render_knowledge():
    st.subheader("🧠 Knowledge")
    for h in st.session_state.humans:
        with st.expander(f"{h.name} — {h.needs.status_emoji}"):
            # status bar
            st.caption(h.status_bar)
            n = h.needs
            cols = st.columns(4)
            cols[0].metric("🍖 หิว",  f"{n.hunger:.0f}")
            cols[1].metric("🚽 ปวด",  f"{n.bladder:.0f}")
            cols[2].metric("💤 ง่วง", f"{n.sleepy:.0f}")
            cols[3].metric("💕 ใจ",   f"{n.libido:.0f}")
            st.divider()
            if not h.knowledge:
                st.write("ยังไม่มีการค้นพบ")
            for items, invention in h.knowledge.items():
                name = invention.get("name", "?") if isinstance(invention, dict) else invention
                use  = invention.get("use", "")   if isinstance(invention, dict) else ""
                st.write(f"**{name}** — {items[0]} + {items[1]}")
                if use:
                    st.caption(f"🔧 {use}")


def render_environment():
    st.subheader("🌍 สิ่งแวดล้อม")
    weather   = st.session_state.weather
    disasters = st.session_state.disasters
    season    = get_season(weather.day)

    # ฤดูกาล + สภาพอากาศ
    c1, c2, c3 = st.columns(3)
    c1.metric("🌏 ฤดูกาล",  season["label"])
    c2.metric("🌡 อุณหภูมิ", f"{weather.global_temperature:.1f}°C")
    c3.metric("💧 ความชื้น", f"{weather.global_moisture:.1f}")
    st.caption(f"🌦 สภาพอากาศ: {weather.current_state}")

    # ภัยธรรมชาติที่กำลัง active
    active = disasters.active_summary
    if active:
        st.error(f"⚠️ ภัยธรรมชาติที่กำลังเกิด: {len(active)} รายการ")
        for d in active:
            st.write(f"{d['label']} — ความรุนแรง {d['severity']:.0%} | เหลือ {d['days_left']} วัน")
    else:
        st.success("✅ ไม่มีภัยธรรมชาติในขณะนี้")

    # ประวัติภัย
    if disasters.history:
        with st.expander(f"📜 ประวัติภัย ({len(disasters.history)} ครั้ง)"):
            for d in reversed(disasters.history[-5:]):
                st.caption(f"Day {d.day_start}: {d.label} (ความรุนแรง {d.severity:.0%})")


def render_body():
    st.subheader("🧬 ร่างกาย")
    for h in st.session_state.humans:
        s = h.body.summary
        with st.expander(f"{'♂' if h.sex == 'M' else '♀'} {h.name} — อายุ {s['age']} ปี {'💀' if not h.body.alive else ''}"):
            c1, c2, c3 = st.columns(3)
            c1.metric("❤️ สุขภาพ",   s["health"])
            c2.metric("💪 แรง",       s["strength"])
            c3.metric("🏃 ความอึด",  s["stamina"])

            c4, c5, c6 = st.columns(3)
            c4.metric("⚖️ BMI",       s["bmi"])
            c5.metric("🔥 ไขมัน(kcal)", s["fat_kcal"])
            c6.metric("😰 ความเครียด", s["cortisol"])

            if h.sex == "F":
                st.divider()
                preg_text = f"🤰 ตั้งครรภ์วันที่ {s['days_preg']}/280" if s["pregnant"] else (
                    "🚫 หมดรอบเดือนแล้ว" if s["menopause"] else
                    f"🥚 วันที่ {s['cycle_day']}/28 {'(ไข่ตก ✨)' if s['fertile'] else ''}"
                )
                st.caption(preg_text)
                cf, ce = st.columns(2)
                cf.metric("💊 Estrogen",  s["estrogen"])
                ce.metric("💊 Oxytocin",  s["oxytocin"])
            else:
                ct, co = st.columns(2)
                ct.metric("💊 Testosterone", s["testosterone"])
                co.metric("💊 Oxytocin",     s["oxytocin"])

            if s["diseases"]:
                st.error(f"🤒 โรค: {', '.join(s['diseases'])}")


def render_relationship():
    st.subheader("💑 ความสัมพันธ์")
    rel = st.session_state.relationship
    s   = rel.summary

    st.markdown(f"### {s['stage']}")
    c1, c2, c3 = st.columns(3)
    c1.metric("❤️ Bond",     s["bond"],     delta=None)
    c2.metric("🤝 Trust",    s["trust"],    delta=None)
    c3.metric("⚔️ Conflict", s["conflict"], delta=None)

    col_a, col_b = st.columns(2)
    col_a.caption(f"📅 อยู่ด้วยกัน {s['together']} วัน")
    col_b.caption(f"💕 ใกล้ชิด {s['mate']} ครั้ง")

    if rel.recent_memories:
        st.caption("🧠 ความทรงจำล่าสุด")
        for m in rel.recent_memories:
            icon = "💚" if m.sentiment > 0 else "🔴"
            st.write(f"{icon} Day {m.day}: {m.event}")


def render_log():
    st.subheader("📜 Events")
    for e in reversed(st.session_state.history[-15:]):
        st.write(e)


def render_chart():
    st.subheader("📈 Population Trend")
    if not st.session_state.pop_history:
        st.info("กด Step หรือ Run เพื่อเริ่ม simulation")
        return
    n = len(st.session_state.pop_history)
    m = len(st.session_state.human_pop_history)
    df = pd.DataFrame({
        "🐰 Rabbits": st.session_state.pop_history,
        "🧑 Humans":  st.session_state.human_pop_history + [None] * (n - m),
    })
    st.line_chart(df)


# ─────────────────────────────────────────────
# MAIN UI — Dashboard
# ─────────────────────────────────────────────
st.title("🧬 Pangea Simulation")

# ── Game Over / Status banner ──
if st.session_state.get("game_over"):
    st.error("🌑 **EXTINCTION** — Adam และ Eve สูญพันธุ์แล้ว  |  กด Reset เพื่อเริ่มใหม่")
elif st.session_state.get("dead"):
    dead_list = ", ".join(st.session_state.dead)
    alive = [h.name for h in st.session_state.humans if h.name not in st.session_state.get("dead",set())]
    st.warning(f"💀 {dead_list} เสียชีวิตแล้ว | {'🧬 ' + alive[0] + ' ยังมีชีวิต' if alive else ''}")

# ── Header bar: clock + controls ──────────────
_ph = get_day_phase()
season_now = get_season(st.session_state.weather.day) if "weather" in st.session_state else {"label": ""}
dis_active = st.session_state.disasters.active_summary if "disasters" in st.session_state else []
dis_alert  = f"  ⚠️ **{dis_active[0]['label']}**" if dis_active else ""

st.info(
    f"🇹🇭 **{thai_time_str()}**  |  "
    f"🌍 Day **{st.session_state.day}**  |  "
    f"{_ph['label']}  |  "
    f"{season_now.get('label','')}  "
    f"{dis_alert}"
)

ctrl1, ctrl2, ctrl3 = st.columns([1, 1, 2])
with ctrl1:
    run_mode = st.radio("โหมด", ["⏸ Pause", "⏱ Real-time", "⚡ Manual"], horizontal=True)
with ctrl2:
    step_btn = st.button("⏭ +1 Day", disabled=(run_mode != "⚡ Manual"))
with ctrl3:
    st.caption("⚡ Manual = กดทีละวัน  |  ⏱ Real-time = 1 วันจริง = 1 วัน sim")

st.divider()

# ── Tabs ──────────────────────────────────────
tab_world, tab_humans, tab_eco, tab_rel, tab_chart, tab_log = st.tabs([
    "🌍 World",
    "🧑 Humans",
    "🌿 Ecosystem",
    "💑 Relationship",
    "📈 Charts",
    "📜 Log",
])

# ════════════════════════════════════════════
# TAB 1 — World (Map + Quick Stats)
# ════════════════════════════════════════════
with tab_world:
    col_map, col_stat = st.columns([3, 1])
    with col_map:
        render_map()
    with col_stat:
        # ── Quick stats ──
        fauna    = st.session_state.fauna
        weather  = st.session_state.weather
        humansys = st.session_state.humansys
        disasters= st.session_state.disasters

        st.subheader("📊 Quick Stats")
        ca, cb = st.columns(2)
        ca.metric("👥 มนุษย์",   humansys.human_pop)
        cb.metric("🐰 กระต่าย", fauna.rabbit_pop)
        ca.metric("🦌 กวาง",    fauna.deer_pop)
        cb.metric("🐯 เสือ",    fauna.tiger_pop)
        ca.metric("🦅 นกอินทรี",fauna.eagle_pop)
        cb.metric("🌡 อุณหภูมิ",f"{weather.global_temperature:.1f}°C")

        st.caption(humansys.summary)
        if humansys.pregnant_count > 0:
            days_left = GESTATION_DAYS - max(
                (p.days_pregnant for p in humansys.pregnancies if p.pregnant), default=0
            )
            st.caption(f"🤰 คาดคลอดใน ~{days_left} วัน")

        # ── ภัยธรรมชาติ ──
        if dis_active:
            st.error("⚠️ ภัยธรรมชาติ!")
            for d in dis_active:
                st.write(f"{d['label']} เหลือ {d['days_left']} วัน")
        else:
            st.success("✅ ปลอดภัย")

        # ── สัตว์ป่าบน map ──
        st.subheader("🐾 Wildlife")
        for a in st.session_state.animals:
            icon = "😴" if a.sleeping else ("🔴" if a.a_type=="Carnivore" else "🟡")
            st.caption(f"{icon} {a.species} | {a.status} | E:{a.energy:.0f}")

# ════════════════════════════════════════════
# TAB 2 — Humans (instinct + body + knowledge)
# ════════════════════════════════════════════
with tab_humans:
    h_col1, h_col2 = st.columns(2)
    humans = st.session_state.humans

    for i, h in enumerate(humans):
        col = h_col1 if i == 0 else h_col2
        with col:
            sex_icon = "♂️" if h.sex == "M" else "♀️"
            alive_icon = "💀" if not h.body.alive else "🧍"
            st.subheader(f"{alive_icon} {sex_icon} {h.name}")

            # ── Instinct meters ──
            st.caption("**🧬 สัญชาติญาณ**")
            n = h.needs
            ni1, ni2 = st.columns(2)
            ni1.metric("🍖 หิว",   f"{n.hunger:.0f}/100")
            ni2.metric("🚽 ปวด",   f"{n.bladder:.0f}/100")
            ni3, ni4 = st.columns(2)
            ni3.metric("💤 ง่วง",  f"{n.sleepy:.0f}/100")
            ni4.metric("💕 ความต้องการ", f"{n.libido:.0f}/100")
            st.caption(f"▶ {h.current_action}")
            st.divider()

            # ── Body stats ──
            st.caption("**🫀 ร่างกาย**")
            s = h.body.summary
            b1, b2, b3 = st.columns(3)
            b1.metric("❤️ สุขภาพ",  s["health"])
            b2.metric("💪 แรง",      s["strength"])
            b3.metric("🏃 ความอึด", s["stamina"])
            b4, b5 = st.columns(2)
            b4.metric("⚖️ BMI",  s["bmi"])
            b5.metric("🔥 ไขมัน(kcal)", s["fat_kcal"])

            if h.sex == "F":
                st.divider()
                st.caption("**🌸 ระบบสืบพันธุ์**")
                preg_text = (
                    f"🤰 ตั้งครรภ์วันที่ {s['days_preg']}/280" if s["pregnant"] else
                    "🚫 หมดรอบเดือน" if s["menopause"] else
                    f"🌸 รอบที่ {s['cycle_day']}/28 {'✨ ไข่ตก' if s['fertile'] else ''}"
                )
                st.caption(preg_text)
                fe1, fe2 = st.columns(2)
                fe1.metric("💊 Estrogen",  s["estrogen"])
                fe2.metric("💊 Oxytocin",  s["oxytocin"])
            else:
                ht1, ht2 = st.columns(2)
                ht1.metric("💊 Testosterone", s["testosterone"])
                ht2.metric("💊 Cortisol",      s["cortisol"])

            if s["diseases"]:
                st.error(f"🤒 โรค: {', '.join(s['diseases'])}")

            # ── Physics ──
            st.divider()
            st.caption("**⚛️ Thermodynamics**")
            if st.session_state.physics_log and 'world_physics' in st.session_state:
                _wp = st.session_state.world_physics
                h_px2 = _wp.human_daily_physics(
                    h.mass, h.height, h.sex,
                    1.0 if h.sleeping else 1.4,
                    st.session_state.weather.global_temperature,
                    st.session_state.terrain.get_info(h.pos[0],h.pos[1])['elevation']
                )
                ph1,ph2,ph3 = st.columns(3)
                ph1.metric("🔥 BMR",      f"{h_px2['bmr_kcal']:.0f} kcal")
                ph2.metric("⚡ ATP",      f"{h_px2['atp_mol']:.3f} mol")
                ph3.metric("dU=dQ-dW",   f"{h_px2['du_kj']:.1f} kJ")
                ph4,ph5 = st.columns(2)
                ph4.metric("🫁 pO₂",     f"{h_px2['po2_kpa']:.1f} kPa")
                ph5.metric("⚙️ Pathway", h_px2['pathway'])

            # ── Brain ──
            st.divider()
            st.caption("**🧠 Brain & Autonomous Learning**")
            br = h.brain.summary
            # emotion
            st.markdown(f"**อารมณ์:** {br['emotion']}")
            em1,em2 = st.columns(2)
            em1.metric("😊 Valence",  br['valence'], help="บวก=มีความสุข ลบ=เศร้า/กลัว")
            em2.metric("⚡ Arousal",  br['arousal'], help="สูง=ตื่นตัว ต่ำ=เฉื่อย")
            # drives
            st.caption("**🔴 Drive (Pain signals)**")
            d = h.brain.drives
            dc1,dc2,dc3 = st.columns(3)
            dc1.metric("🍖 หิว",    f"{d.hunger:.0f}")
            dc2.metric("💧 กระหาย", f"{d.thirst:.0f}")
            dc3.metric("💤 ง่วง",   f"{d.tired:.0f}")
            dc4,dc5,dc6 = st.columns(3)
            dc4.metric("🚽 ปวด",    f"{d.bladder:.0f}")
            dc5.metric("❄️ หนาว",   f"{d.cold:.0f}")
            dc6.metric("😱 กลัว",   f"{d.fear:.0f}")
            st.caption(f"🎯 กำลัง: **{br['action']}** | 🧠 Memory: {br['memories']} episodes")
            # knowledge
            if br['knows']:
                st.caption("✅ ค้นพบแล้ว: " + ", ".join(br['knows']))
            # top weights
            st.caption("📈 Top learned actions:")
            for a,w in br['top_weights']:
                st.caption(f"  {a}: {w:.2f}")
            with st.expander("📜 Brain Log"):
                for log in reversed(br['recent_log']):
                    st.caption(log)

            # ── Knowledge ──
            st.divider()
            st.caption("**💡 สิ่งประดิษฐ์**")
            if not h.knowledge:
                st.caption("ยังไม่มีการค้นพบ")
            for items, invention in h.knowledge.items():
                inv_name = invention.get("name","?") if isinstance(invention,dict) else invention
                inv_use  = invention.get("use","")   if isinstance(invention,dict) else ""
                st.write(f"**{inv_name}** — {items[0]} + {items[1]}")
                if inv_use: st.caption(f"🔧 {inv_use}")

# ════════════════════════════════════════════
# TAB 3 — Ecosystem (environment + biology)
# ════════════════════════════════════════════
with tab_eco:
    render_environment()
    st.divider()
    # Biology summary
    # ── Physics snapshot ────────────────────────────────────
    if 'world_physics' in st.session_state:
        wp_now = st.session_state.world_physics
        st.subheader("⚛️ Physics & Atmosphere")
        atmo = wp_now.atmo.summary
        pa1, pa2, pa3 = st.columns(3)
        pa1.metric("🌫 CO₂ (ppm)", atmo['CO2 (ppm)'],
                   delta=f"+{atmo['CO2 (ppm)']-280:.1f}" if atmo['CO2 (ppm)']>280 else None)
        pa2.metric("💨 O₂ (%)",    atmo['O2 (%)'])
        pa3.metric("🐄 CH₄ (ppb)", atmo['CH4 (ppb)'])
        pe1, pe2 = st.columns(2)
        pe1.metric("♻️ Entropy สะสม", f"{wp_now.entropy_total:.2f} kJ/K")
        if st.session_state.physics_log:
            last = st.session_state.physics_log[-1]
            pe2.metric("☀️ แสง (W/m²)",    last['light_wm2'])
            pb1, pb2, pb3 = st.columns(3)
            pb1.metric("🌱 Glucose/day",   f"{last['glucose_g']:.1f}g")
            pb2.metric("🌡 Greenhouse",    f"+{last['temp_forcing']:.3f}°C")
            pb3.metric("🧪 Nutrient×",     last['nutrient_factor'])
        st.divider()

    # ── Fire status ─────────────────────────────────────────
    if 'fire_system' in st.session_state:
        fs_now = st.session_state.fire_system
        st.subheader('🔥 กองไฟ')
        fires = fs_now.summary
        if fires:
            for f in fires:
                fc1,fc2,fc3,fc4 = st.columns(4)
                fc1.metric('📍 ตำแหน่ง', str(f['pos']))
                fc2.metric('🌡 อุณหภูมิ', f"{f['temp']:.0f}°C")
                fc3.metric('🪵 เชื้อเพลิง', f"{f['fuel']:.1f}kg")
                fc4.metric('🍖 ปรุงได้', '✅' if f['cook'] else '❌')
                st.caption(f"CO₂ ที่ปล่อย: {f['co2_kg']:.3f}kg | ลุกมา {f['hours']:.0f}h")
        else:
            st.info('ไม่มีกองไฟ — Adam/Eve จะจุดเองเมื่อมีหินเหล็กไฟ+กิ่งไม้แห้ง')
        # อาหารที่ปรุงแล้ว
        if st.session_state.get('cooked_foods'):
            st.caption('🍖 อาหารที่ปรุงล่าสุด:')
            for fd in st.session_state.cooked_foods[-3:]:
                st.write(f"  {fd['name']} ({fd['kcal']:.0f} kcal) — {fd['who']}")
        st.divider()

    st.subheader("🌱 Biology")
    fauna   = st.session_state.fauna
    plants  = st.session_state.plants
    ec1, ec2, ec3 = st.columns(3)
    ec1.metric("🌿 Biomass",    f"{plants.global_biomass:.1f}")
    ec2.metric("🐘 ช้าง",       fauna.elephant_pop)
    ec3.metric("💧 Moisture",   f"{st.session_state.weather.global_moisture:.1f}")

# ════════════════════════════════════════════
# TAB 4 — Relationship
# ════════════════════════════════════════════
with tab_rel:
    render_relationship()

# ════════════════════════════════════════════
# TAB 5 — Charts
# ════════════════════════════════════════════
with tab_chart:
    render_chart()

    # เพิ่ม biomass chart
    if st.session_state.pop_history:
        st.subheader("🌿 Biomass over time")
        if "biomass_history" not in st.session_state:
            st.session_state.biomass_history = []
        st.session_state.biomass_history.append(st.session_state.plants.global_biomass)
        st.line_chart(st.session_state.biomass_history)

# ════════════════════════════════════════════
# TAB 6 — Log
# ════════════════════════════════════════════
with tab_log:
    st.subheader("📜 Event Log")
    # filter
    filter_opts = ["ทั้งหมด", "👶 มนุษย์", "🐾 สัตว์", "🌍 สิ่งแวดล้อม", "💡 การค้นพบ", "⚠️ ภัย"]
    filt = st.selectbox("กรองตาม", filter_opts)
    filt_map = {
        "👶 มนุษย์":      ["👶","💀","🍖","😴","🌅","💕","🚽"],
        "🐾 สัตว์":       ["🩸","🐾","💀"],
        "🌍 สิ่งแวดล้อม": ["🌏","🌦","🌧","🌸","☀️","🍂","❄️"],
        "💡 การค้นพบ":    ["💡"],
        "⚠️ ภัย":         ["⚠️","🌊","🌋","🌍","🦠","🏜","✅"],
    }
    log = list(reversed(st.session_state.history))
    if filt != "ทั้งหมด":
        keywords = filt_map.get(filt, [])
        log = [e for e in log if any(k in e for k in keywords)]
    for e in log[:50]:
        st.write(e)

# ─────────────────────────────────────────────
# LOOP — Real-time clock driven
# ─────────────────────────────────────────────
if run_mode == "⏱ Real-time":
    # คำนวณว่าตอนนี้ควรจะเป็น sim day ที่เท่าไหร่
    target_day = elapsed_sim_days(st.session_state.start_ts)
    if target_day > st.session_state.last_sim_day:
        # ต้อง step ให้ทันกับเวลาจริง (อาจ catchup หลายวันถ้าเปิดทิ้งไว้)
        steps_needed = target_day - st.session_state.last_sim_day
        for _ in range(min(steps_needed, 24)):  # cap ที่ 24 steps/rerun ป้องกัน freeze
            update_world()
            st.session_state.day += 1
        st.session_state.last_sim_day = target_day
    # rerun ทุก 30 วิจริง (= 15 นาที sim)
    time.sleep(30)
    st.rerun()

elif run_mode == "⚡ Manual":
    if step_btn:
        update_world()
        st.session_state.day += 1
        st.session_state.last_sim_day += 1
        st.rerun()
    time.sleep(30)
    st.rerun()

else:  # Pause
    time.sleep(30)
    st.rerun()
