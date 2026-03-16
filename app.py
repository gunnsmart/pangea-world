import streamlit as st
import time
import random
from environment import WeatherSystem
from biology import PlantEcosystem, FaunaEcosystem, HumanEcosystem

st.set_page_config(page_title="Pangea 16K: Migration Era", layout="wide")

if 'env' not in st.session_state:
    st.session_state.env = WeatherSystem()
    st.session_state.bio_plant = PlantEcosystem()
    st.session_state.bio_fauna = FaunaEcosystem()
    st.session_state.bio_human = HumanEcosystem()

env = st.session_state.env
plants = st.session_state.bio_plant
fauna = st.session_state.bio_fauna
humans = st.session_state.bio_human

# --- 🛰️ ระบบแผนที่อัจฉริยะ (Migration Logic) ---
def generate_advanced_map(biomass, f, h):
    grid_size = 10
    world_map = [["🟫" for _ in range(grid_size)] for _ in range(grid_size)]
    
    # 1. กำหนดพื้นที่สีเขียว (Green Zones)
    green_slots = int(biomass)
    all_coords = [(r, c) for r in range(grid_size) for c in range(grid_size)]
    random.shuffle(all_coords)
    
    green_coords = []
    for i in range(min(green_slots, 100)):
        r, c = all_coords[i]
        world_map[r][c] = "🟩"
        green_coords.append((r, c))

    # 2. ฟังก์ชันการอพยพ (สัตว์จะพยายามหาที่เขียวๆ อยู่)
    def place_with_migration(emoji, count, divisor):
        actual_icons = min(count // divisor, 8) # จำกัดจำนวนไอคอนไม่ให้รกเกินไป
        for _ in range(actual_icons):
            # โอกาส 80% ที่จะไปลงที่เขียว (🟩), 20% หลงไปที่น้ำตาล (🟫)
            if green_coords and random.random() < 0.8:
                r, c = random.choice(green_coords)
            else:
                r, c = random.randint(0, 9), random.randint(0, 9)
            world_map[r][c] = emoji

    # 3. วางสัตว์ตามลำดับความสำคัญ
    place_with_migration("🐘", fauna.elephant_pop, 2)
    place_with_migration("🦌", fauna.deer_pop, 15)
    place_with_migration("🐇", fauna.rabbit_pop, 60)
    place_with_migration("🐅", fauna.tiger_pop, 2)
    place_with_migration("🦅", fauna.eagle_pop, 2)
    
    # มนุษย์จะชอบอยู่ใกล้กัน (สร้างกลุ่มก้อน/หมู่บ้าน)
    if h.human_pop > 0:
        base_r, base_c = (random.choice(green_coords) if green_coords else (5,5))
        for _ in range(min(h.human_pop, 5)):
            r = max(0, min(9, base_r + random.randint(-1, 1)))
            c = max(0, min(9, base_c + random.randint(-1, 1)))
            world_map[r][c] = "👥"
            
    return world_map

# --- 🖥️ ส่วนการแสดงผล ---
st.title("🌍 Pangea 16K: Migration & Clusters")
st.subheader(f"วันที่ (Day): {env.day} | สภาพอากาศ: {env.current_state}")

col_map, col_stat = st.columns([2, 1])

with col_map:
    st.write("### 🗺️ แผนที่การเคลื่อนย้ายถิ่นฐาน")
    current_map = generate_advanced_map(plants.global_biomass, fauna, humans)
    for row in current_map:
        st.text(" ".join(row))
    st.caption("สัตว์จะไปรวมตัวกันในพื้นที่สีเขียว (🟩) มนุษย์ (👥) จะเริ่มเกาะกลุ่มเป็นหมู่บ้าน")

with col_stat:
    st.write("### 🐾 ประชากรทั้งหมด")
    st.write(f"🐘 ช้าง: {fauna.elephant_pop} | 🐅 เสือ: {fauna.tiger_pop}")
    st.write(f"🦌 กวาง: {fauna.deer_pop} | 🦅 อินทรี: {fauna.eagle_pop}")
    st.write(f"🐇 กระต่าย: {fauna.rabbit_pop}")
    st.divider()
    st.metric("👥 มนุษย์", f"{humans.human_pop} คน")
    st.metric("🌱 ความสดใหม่ของป่า", f"{plants.global_biomass:.1f}%")

# --- ⚙️ Engine ---
time.sleep(1.2)
env.step_day()
plants.step_day(env.global_moisture, env.global_temperature)
consumed = fauna.step_day(plants.global_biomass)
plants.global_biomass -= consumed
hunted = humans.step_day(plants.global_biomass, fauna.deer_pop)
fauna.deer_pop -= hunted

st.rerun()
