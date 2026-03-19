import streamlit as st
import time
import random
import numpy as np
import pandas as pd

from human_ai import HumanAI
from biology import PlantEcosystem, FaunaEcosystem, HumanEcosystem
from wildlife import spawn_wildlife
from environment import WeatherSystem
from terrain import TerrainMap

st.set_page_config(layout="wide", page_title="🧬 Pangea Simulation")

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

    st.session_state.day += 1

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
    animals = st.session_state.animals
    for a in animals:
        info = terrain.get_info(a.pos[0], a.pos[1])
        elevation = info["elevation"]
        a.update_life(elevation)
        a.move()

        # หลีกเลี่ยงน้ำ (สำหรับ herbivore)
        if a.a_type == "Herbivore" and info["is_water"]:
            a.move()

        if a.a_type == "Carnivore" and a.energy < 400:
            for prey in animals:
                if prey.a_type == "Herbivore" and prey.pos == a.pos:
                    a.energy = min(a.energy + a.energy_gain, 1000.0)
                    prey.energy -= 200
                    st.session_state.history.append(
                        f"🩸 Day {st.session_state.day}: {a.species} ล่า {prey.species}"
                    )
                    break

        if a.energy <= 0:
            st.session_state.history.append(f"💀 Day {st.session_state.day}: {a.species} ตายแล้ว")

    st.session_state.animals = [a for a in animals if a.energy > 0]

    st.session_state.pop_history.append(fauna.rabbit_pop)
    st.session_state.human_pop_history.append(humansys.human_pop)


# ─────────────────────────────────────────────
# RENDER MAP  (50×50, scale=10px)
# ─────────────────────────────────────────────
def render_map():
    st.subheader(f"🌍 World Map — Day {st.session_state.day}")

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

    # animals
    for a in st.session_state.animals:
        r, c = max(0, min(SIZE-1, a.pos[0])), max(0, min(SIZE-1, a.pos[1]))
        img[r, c] = [255, 50, 50] if a.a_type == "Carnivore" else [255, 220, 50]

    img_big = np.kron(img, np.ones((scale, scale, 1))).astype(np.uint8)
    st.image(img_big, use_container_width=True)

    # legend
    st.caption("⬜ มนุษย์  🟡 Herbivore  🔴 Carnivore  🔵 น้ำ  🟢 ป่า/ทุ่งหญ้า  🟤 ภูเขา")


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
    c1.metric("🧑 Humans",   humansys.human_pop)
    c2.metric("🐯 Tigers",   fauna.tiger_pop)
    c2.metric("🦅 Eagles",   fauna.eagle_pop)
    c2.metric("🌡 Temp",     f"{weather.global_temperature:.1f}°C")
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

# ── Simulation controls ──
ctrl1, ctrl2, ctrl3 = st.columns([1, 1, 2])
with ctrl1:
    run = st.toggle("▶️ Auto Run")
with ctrl2:
    step_btn = st.button("⏭ Step +1 Day")
with ctrl3:
    speed = st.slider("⏱ Auto speed (วิ/step)", 0.3, 3.0, 1.0, step=0.1)

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
# LOOP
# ─────────────────────────────────────────────
if step_btn:
    update_world()
    st.rerun()

if run:
    update_world()
    time.sleep(speed)
    st.rerun()