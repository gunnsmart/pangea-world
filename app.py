import streamlit as st
from groq import Groq
import time
import random
import numpy as np

# ===== IMPORT MODULES =====
from human_ai import HumanAI
from biology import PlantEcosystem, FaunaEcosystem, HumanEcosystem
from wildlife import spawn_wildlife
from environment import WeatherSystem

# ===== SAFE INIT =====
st.set_page_config(layout="wide")

# ===== INIT STATE =====
if "initialized" not in st.session_state:

    # 🌍 Systems
    st.session_state.weather = WeatherSystem()
    st.session_state.plants = PlantEcosystem()
    st.session_state.fauna = FaunaEcosystem()
    st.session_state.humansys = HumanEcosystem()

    # 🧠 Humans
    adam = HumanAI("Adam", 170, 70, "Eve")
    eve = HumanAI("Eve", 160, 55, "Adam")

    # ให้ของเริ่มต้น
    base_items = ["หินเหล็กไฟ", "กิ่งไม้แห้ง", "ใบไม้ใหญ่", "เถาวัลย์"]
    adam.inventory = random.sample(base_items, 3)
    eve.inventory = random.sample(base_items, 3)

    st.session_state.humans = [adam, eve]

    # 🐾 Wildlife
    st.session_state.animals = spawn_wildlife()

    # 🗺 Map (ง่ายๆก่อน)
    st.session_state.map_size = 15
    st.session_state.vegetation = np.random.randint(50, 100, (15, 15))

    # 📜 Log
    st.session_state.history = []

    # 📊 History
    st.session_state.pop_history = []

    st.session_state.initialized = True


# ===== FUNCTIONS =====

def update_world():
    weather = st.session_state.weather
    plants = st.session_state.plants
    fauna = st.session_state.fauna
    humans = st.session_state.humans

    # 🌦 Weather
    weather.step_day()

    # 🌱 Plants
    biomass = plants.step_day(weather.global_moisture, weather.global_temperature)

    # 🐾 Animals
    fauna.step_day(biomass)

    # 🧠 Humans
    for h in humans:
        # random move
        h.pos[0] = max(0, min(14, h.pos[0] + random.randint(-1, 1)))
        h.pos[1] = max(0, min(14, h.pos[1] + random.randint(-1, 1)))

        # experiment (AI discovery)
        if random.random() < 0.1 and len(h.inventory) >= 2:
            items, stats = h.experiment()
            if items:
                name = f"{items[0]}+{items[1]}"
                h.knowledge[tuple(items)] = name

                st.session_state.history.append(
                    f"💡 {h.name} ค้นพบ {name}"
                )

    # 📊 save history
    st.session_state.pop_history.append(fauna.rabbit_pop)


def render_map():
    st.subheader("🌍 World Map")

    grid = st.session_state.vegetation
    st.write("🌱 Food Density")
    st.heatmap(grid)

    display = [["·" for _ in range(15)] for _ in range(15)]

    for h in st.session_state.humans:
        r, c = h.pos
        display[r][c] = "🧑"

    for a in st.session_state.animals:
        r, c = a.pos
        display[r][c] = a.icon

    st.write("🧭 Entities")
    for row in display:
        st.write(" ".join(row))


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


# ===== UI =====

st.title("🧬 Pangea Simulation (Live)")

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