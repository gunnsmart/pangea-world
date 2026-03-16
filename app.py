import streamlit as st
import time
import random
from environment import WeatherSystem
from biology import PlantEcosystem, FaunaEcosystem, HumanEcosystem

st.set_page_config(page_title="Pangea 16K: All Species", layout="wide")

if 'env' not in st.session_state:
    st.session_state.env = WeatherSystem()
    st.session_state.bio_plant = PlantEcosystem()
    st.session_state.bio_fauna = FaunaEcosystem()
    st.session_state.bio_human = HumanEcosystem()

env = st.session_state.env
plants = st.session_state.bio_plant
fauna = st.session_state.bio_fauna
humans = st.session_state.bio_human

def generate_map(biomass, f, h):
    grid_size = 10
    world_map = [["🟫" for _ in range(grid_size)] for _ in range(grid_size)]
    
    # ลงพื้นเขียว
    all_coords = [(r, c) for r in range(grid_size) for c in range(grid_size)]
    random.shuffle(all_coords)
    for i in range(min(int(biomass), 100)):
        r, c = all_coords[i]
        world_map[r][c] = "🟩"

    # ฟังก์ชันสุ่มวางสัตว์
    def place_emoji(emoji, count, divisor):
        for _ in range(min(count // divisor, 5)):
            r, c = random.randint(0, 9), random.randint(0, 9)
            world_map[r][c] = emoji

    place_emoji("🐘", fauna.elephant_pop, 2)
    place_emoji("🦌", fauna.deer_pop, 10)
    place_emoji("🐇", fauna.rabbit_pop, 50)
    place_emoji("🐅", fauna.tiger_pop, 2)
    place_emoji("🦅", fauna.eagle_pop, 2)
    place_emoji("👥", h.human_pop, 1)
    
    return world_map

# --- แสดงผล ---
st.title("🌍 Pangea 16K: Great Wilderness")
st.subheader(f"วันที่ (Day): {env.day} | อากาศ: {env.current_state}")

col_map, col_stat = st.columns([2, 1])

with col_map:
    current_map = generate_map(plants.global_biomass, fauna, humans)
    for row in current_map: st.text(" ".join(row))

with col_stat:
    st.write("### 🐾 สถิติสัตว์พ้นภัย")
    st.write(f"🐇 กระต่าย: {fauna.rabbit_pop}")
    st.write(f"🦌 กวาง: {fauna.deer_pop}")
    st.write(f"🐘 ช้าง: {fauna.elephant_pop}")
    st.write(f"🐅 เสือ: {fauna.tiger_pop}")
    st.write(f"🦅 อินทรี: {fauna.eagle_pop}")
    st.metric("👥 ประชากรมนุษย์", f"{humans.human_pop}")

# --- Engine ---
time.sleep(1.2)
env.step_day()
plants.step_day(env.global_moisture, env.global_temperature)
consumed = fauna.step_day(plants.global_biomass)
plants.global_biomass -= consumed
hunted_deer = humans.step_day(plants.global_biomass, fauna.deer_pop)
fauna.deer_pop -= hunted_deer

st.rerun()
