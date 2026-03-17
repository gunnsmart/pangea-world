import streamlit as st
import time
import random
import numpy as np

# ===== IMPORT MODULES =====
from human_ai import HumanAI
from biology import PlantEcosystem, FaunaEcosystem, HumanEcosystem
from wildlife import spawn_wildlife
from environment import WeatherSystem

# ===== PAGE CONFIG =====
st.set_page_config(layout="wide")

# ===== INIT STATE =====
if "initialized" not in st.session_state:

    st.session_state.weather = WeatherSystem()
    st.session_state.plants = PlantEcosystem()
    st.session_state.fauna = FaunaEcosystem()
    st.session_state.humansys = HumanEcosystem()

    # 🧠 Humans
    adam = HumanAI("Adam", 170, 70, "Eve")
    eve = HumanAI("Eve", 160, 55, "Adam")

    base_items = ["หินเหล็กไฟ", "กิ่งไม้แห้ง", "ใบไม้ใหญ่", "เถาวัลย์"]
    adam.inventory = random.sample(base_items, 3)
    eve.inventory = random.sample(base_items, 3)

    st.session_state.humans = [adam, eve]

    # 🐾 Wildlife
    st.session_state.animals = spawn_wildlife()

    # 🗺 Map
    size = 15
    st.session_state.map_size = size
    st.session_state.vegetation = np.random.randint(50, 100, (size, size))

    # 📜 Logs
    st.session_state.history = []
    st.session_state.pop_history = []

    st.session_state.initialized = True


# ===== LOGIC =====
def update_world():
    weather = st.session_state.weather
    plants = st.session_state.plants
    fauna = st.session_state.fauna
    humans = st.session_state.humans

    weather.step_day()
    biomass = plants.step_day(weather.global_moisture, weather.global_temperature)
    fauna.step_day(biomass)

    for h in humans:
        # move
        h.pos[0] = max(0, min(14, h.pos[0] + random.randint(-1, 1)))
        h.pos[1] = max(0, min(14, h.pos[1] + random.randint(-1, 1)))

        # discovery
        if random.random() < 0.1 and len(h.inventory) >= 2:
            items, stats = h.experiment()
            if items:
                name = f"{items[0]}+{items[1]}"
                h.knowledge[tuple(items)] = name

                st.session_state.history.append(
                    f"💡 {h.name} discovered {name}"
                )

    st.session_state.pop_history.append(fauna.rabbit_pop)


# ===== RENDER MAP =====
def render_map():
    st.subheader("🌍 World Map")

    size = st.session_state.map_size
    scale = 20
    veg = st.session_state.vegetation

    img = np.zeros((size, size, 3), dtype=np.uint8)

    # 🌱 Terrain
    for r in range(size):
        for c in range(size):
            v = veg[r][c]

            if v > 80:
                color = [34, 139, 34]   # forest
            elif v > 60:
                color = [50, 180, 50]   # grass
            else:
                color = [139, 119, 101] # dirt

            img[r, c] = color

    # 🧠 Humans
    for h in st.session_state.humans:
        r, c = h.pos
        r = max(0, min(size-1, r))
        c = max(0, min(size-1, c))
        img[r, c] = [255, 255, 255]

    # 🐾 Animals
    for a in st.session_state.animals:
        r, c = a.pos
        r = max(0, min(size-1, r))
        c = max(0, min(size-1, c))

        if a.a_type == "Carnivore":
            img[r, c] = [255, 50, 50]
        else:
            img[r, c] = [50, 150, 255]

    # 🔍 scale
    img_big = np.kron(img, np.ones((scale, scale, 1))).astype(np.uint8)

    # ✅ SHOW MAP (ตัวสำคัญ)
    st.image(img_big, use_container_width=True)

    # 🧭 text map
    display = [["·" for _ in range(size)] for _ in range(size)]

    for h in st.session_state.humans:
        display[h.pos[0]][h.pos[1]] = "🧑"

    for a in st.session_state.animals:
        display[a.pos[0]][a.pos[1]] = a.icon

    st.write("🧭 Entities")
    for row in display:
        st.write(" ".join(row))


# ===== UI =====
def render_stats():
    fauna = st.session_state.fauna
    weather = st.session_state.weather

    st.subheader("📊 Stats")

    col1, col2 = st.columns(2)

    col1.metric("🐰 Rabbits", fauna.rabbit_pop)
    col1.metric("🦌 Deer", fauna.deer_pop)

    col2.metric("🐯 Tigers", fauna.tiger_pop)
    col2.metric("🌡 Temp", weather.global_temperature)

    st.write("🌦", weather.current_state)


def render_knowledge():
    st.subheader("🧠 Knowledge")

    for h in st.session_state.humans:
        with st.expander(h.name):
            for items, result in h.knowledge.items():
                st.write(f"{items} → {result}")


def render_log():
    st.subheader("📜 Events")

    for e in reversed(st.session_state.history[-10:]):
        st.write(e)


def render_chart():
    st.subheader("📈 Population Trend")
    st.line_chart(st.session_state.pop_history)


# ===== MAIN UI =====
st.title("🧬 Pangea Simulation")

run = st.toggle("▶️ Run Simulation")
speed = st.slider("Speed", 0.1, 1.5, 0.5)

col1, col2 = st.columns([3, 1])

with col1:
    render_map()

with col2:
    render_stats()
    render_knowledge()

render_chart()
render_log()

# ===== LOOP =====
if run:
    update_world()
    time.sleep(speed)
    st.rerun()