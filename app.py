import streamlit as st
import time
import random
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta

from human_ai import HumanAI
from biology import PlantEcosystem, FaunaEcosystem, HumanEcosystem, GESTATION_DAYS
from wildlife import spawn_wildlife
from environment import WeatherSystem
from terrain import TerrainMap

st.set_page_config(layout="wide", page_title="🧬 Pangea Simulation")

# ─────────────────────────────────────────────
# TIMEZONE & TIME UTILS
# ─────────────────────────────────────────────
TZ_THAI = timezone(timedelta(hours=7))
REAL_SECONDS_PER_SIM_DAY = 86400  # 1 วันจริง = 1 วัน sim

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
    st.session_state.weather  = WeatherSystem()
    st.session_state.plants   = PlantEcosystem()
    st.session_state.fauna    = FaunaEcosystem()
    st.session_state.humansys = HumanEcosystem()

    adam = HumanAI("Adam", 170, 70, "Eve")
    eve  = HumanAI("Eve",  160, 55, "Adam")
    base_items = ["หินเหล็กไฟ", "กิ่งไม้แห้ง", "ใบไม้ใหญ่", "เถาวัลย์"]
    adam.inventory = random.sample(base_items, 3)
    eve.inventory  = random.sample(base_items, 3)
    st.session_state.humans = [adam, eve]

    st.session_state.animals = spawn_wildlife()

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


    weather.step_day()
    biomass = plants.step_day(weather.global_moisture, weather.global_temperature)
    terrain.regrow()
    fauna.step_day(biomass)

    hunted = humansys.step_day(biomass, fauna.deer_pop)
    fauna.deer_pop = max(0, fauna.deer_pop - hunted)

    prev_pop = st.session_state.human_pop_history[-1] if st.session_state.human_pop_history else 2
    if humansys.human_pop > prev_pop:
        st.session_state.history.append(f"👶 Day {st.session_state.day}: ประชากรเพิ่มเป็น {humansys.human_pop}")
    elif humansys.human_pop < prev_pop:
        st.session_state.history.append(f"💀 Day {st.session_state.day}: ประชากรลดเหลือ {humansys.human_pop}")

    # humans move + experiment
    for h in humans:
        h.pos[0] = max(0, min(SIZE - 1, h.pos[0] + random.randint(-2, 2)))
        h.pos[1] = max(0, min(SIZE - 1, h.pos[1] + random.randint(-2, 2)))

        # หลีกเลี่ยงน้ำ
        info = terrain.get_info(h.pos[0], h.pos[1])
        if info["is_water"]:
            h.pos[0] = max(0, min(SIZE - 1, h.pos[0] + random.choice([-1, 1])))
            h.pos[1] = max(0, min(SIZE - 1, h.pos[1] + random.choice([-1, 1])))

        if random.random() < 0.1 and len(h.inventory) >= 2:
            items, stats, invention = h.experiment()
            if items and invention:
                inv_name = invention.get("name", f"{items[0]}+{items[1]}")
                inv_use  = invention.get("use", "")
                st.session_state.history.append(
                    f"💡 Day {st.session_state.day}: {h.name} สร้าง '{inv_name}' — {inv_use}"
                )

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

    # 🌙 Night overlay
    phase = get_day_phase()
    img_big = np.kron(img, np.ones((scale, scale, 1))).astype(np.uint8)
    img_big = apply_night_overlay(img_big, phase["brightness"])
    st.image(img_big, use_container_width=True)

    # phase + legend
    st.caption(f"{phase['label']}  |  ⬜ มนุษย์  🟡 Herbivore(ตื่น)  🔴 Carnivore(ตื่น)  🔘 หลับ  🔵 น้ำ  🟢 ป่า  🟤 ภูเขา")


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
        with st.expander(h.name):
            if not h.knowledge:
                st.write("ยังไม่มีการค้นพบ")
            for items, invention in h.knowledge.items():
                name = invention.get("name", "?") if isinstance(invention, dict) else invention
                use  = invention.get("use", "")   if isinstance(invention, dict) else ""
                st.write(f"**{name}** — {items[0]} + {items[1]}")
                if use:
                    st.caption(f"🔧 {use}")


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
# MAIN UI
# ─────────────────────────────────────────────
st.title("🧬 Pangea Simulation")

# ── Clock display ──
clock_col, mode_col, step_col = st.columns([2, 1, 1])
with clock_col:
    _ph = get_day_phase()
    st.info(f"🇹🇭 เวลาไทย: **{thai_time_str()}**  |  🌍 Sim Day: **{st.session_state.day}**  |  {_ph['label']}")
with mode_col:
    run_mode = st.radio("โหมด", ["⏸ Pause", "⏱ Real-time", "⚡ Manual"], horizontal=True)
with step_col:
    step_btn = st.button("⏭ +1 Day", disabled=(run_mode != "⚡ Manual"))

# ── Layout ──
col_map, col_info = st.columns([3, 1])

with col_map:
    render_map()

with col_info:
    render_stats()
    render_knowledge()

render_chart()
render_log()

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
    # rerun ทุก 60 วินาที เพื่ออัปเดต clock (ไม่ต้องบ่อยเพราะ 1 วัน = 1 วัน)
    time.sleep(60)
    st.rerun()

elif run_mode == "⚡ Manual":
    if step_btn:
        update_world()
        st.session_state.day += 1
        st.session_state.last_sim_day += 1
        st.rerun()
    # rerun ทุก 60 วิ เพื่ออัปเดต clock เท่านั้น (ไม่ step sim)
    time.sleep(60)
    st.rerun()

else:  # Pause — อัปเดต clock อย่างเดียว
    time.sleep(60)
    st.rerun()