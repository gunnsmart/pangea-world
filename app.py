import streamlit as st
import time
import random
from environment import WeatherSystem
from biology import PlantEcosystem, AnimalEcosystem, HumanEcosystem

st.set_page_config(page_title="Pangea 16K: World Map", layout="wide")

# --- โหลดระบบ ---
if 'env' not in st.session_state:
    st.session_state.env = WeatherSystem()
    st.session_state.bio_plant = PlantEcosystem()
    st.session_state.bio_animal = AnimalEcosystem()
    st.session_state.bio_human = HumanEcosystem()

env = st.session_state.env
plants = st.session_state.bio_plant
herbivores = st.session_state.bio_animal
humans = st.session_state.bio_human

# --- ฟังก์ชันสร้างแผนที่ ---
def generate_map(biomass, deer_pop, human_pop):
    grid_size = 10
    world_map = [["🟫" for _ in range(grid_size)] for _ in range(grid_size)]
    
    # 1. ลงสีพื้นหญ้าตาม Biomass
    green_slots = int(biomass) # Biomass 0-100 จะแทนจำนวนช่องสีเขียว
    all_coords = [(r, c) for r in range(grid_size) for c in range(grid_size)]
    random.shuffle(all_coords)
    
    for i in range(min(green_slots, 100)):
        r, c = all_coords[i]
        world_map[r][c] = "🟩"
        
    # 2. สุ่มวางกวาง (1 ตัวแทนกลุ่มกวาง)
    for _ in range(min(deer_pop // 10, 20)): # ทุก 10 ตัวโชว์ 1 ไอคอน
        r, c = random.randint(0, 9), random.randint(0, 9)
        world_map[r][c] = "🦌"
        
    # 3. สุ่มวางมนุษย์
    for _ in range(min(human_pop, 10)):
        r, c = random.randint(0, 9), random.randint(0, 9)
        world_map[r][c] = "👥"
        
    return world_map

# --- UI ส่วนบน ---
st.title("🌍 Pangea 16K: Global Satellite")
st.subheader(f"วันที่ (Day): {env.day} | สภาพอากาศ: {env.current_state}")

col_left, col_right = st.columns([2, 1])

with col_left:
    st.write("### 🗺️ แผนที่ทวีปแพนเจีย")
    current_map = generate_map(plants.global_biomass, herbivores.herbivore_pop, humans.human_pop)
    for row in current_map:
        st.text(" ".join(row)) # แสดงผลแผนที่แบบ Grid

with col_right:
    st.write("### 📊 สถานะปัจจุบัน")
    st.metric("ความอุดมสมบูรณ์", f"{plants.global_biomass:.1f}%")
    st.metric("ประชากรกวาง", f"{herbivores.herbivore_pop} ตัว")
    st.metric("ประชากรมนุษย์", f"{humans.human_pop} คน")

st.divider()

# --- ระบบ Engine (ทำงานเบื้องหลัง) ---
time.sleep(1.2)
env.step_day() #
plants.step_day(env.global_moisture, env.global_temperature) #
hunted = humans.step_day(plants.global_biomass, herbivores.herbivore_pop) #
herbivores.herbivore_pop -= hunted
herbivores.step_day(plants.global_biomass) #

st.rerun()
