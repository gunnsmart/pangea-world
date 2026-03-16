import streamlit as st
import time
from environment import WeatherSystem
from biology import PlantEcosystem, AnimalEcosystem, CarnivoreEcosystem

st.set_page_config(page_title="Pangea 16K: Full Ecosystem", layout="wide")

if 'env' not in st.session_state:
    st.session_state.env = WeatherSystem()
    st.session_state.bio_plant = PlantEcosystem()
    st.session_state.bio_animal = AnimalEcosystem()
    st.session_state.bio_carnivore = CarnivoreEcosystem()
    st.session_state.history = []

env = st.session_state.env
plants = st.session_state.bio_plant
herbivores = st.session_state.bio_animal
carnivores = st.session_state.bio_carnivore

st.title("🌍 Pangea 16K: The Food Chain")
st.subheader(f"วันที่ (Day): {env.day}")

# --- เลเยอร์ 1: สภาพอากาศ ---
weather_emoji = {"แดดจ้า": "☀️", "เมฆครึ้ม": "☁️", "ฝนตก": "🌧️", "พายุเข้า": "⛈️"}
st.info(f"**สภาพอากาศ:** {weather_emoji[env.current_state]} {env.current_state} | 🌡️ {env.global_temperature:.1f} °C | 💧 ความชื้น {env.global_moisture:.1f}%")

# --- เลเยอร์ 2: ห่วงโซ่อาหาร 3 ระดับ ---
col1, col2, col3 = st.columns(3)

with col1:
    st.subheader("🌱 พืช (ผู้ผลิต)")
    if plants.global_biomass < 15: st.error("ป่าเสื่อมโทรม!")
    st.progress(plants.global_biomass / 100.0, text=f"Biomass: {plants.global_biomass:.1f}%")

with col2:
    st.subheader("🦌 กวาง (ผู้บริโภคพืช)")
    if herbivores.herbivore_pop == 0: st.error("สูญพันธุ์! (Extinct)")
    elif herbivores.herbivore_pop < 10: st.warning("ใกล้สูญพันธุ์!")
    st.metric(label="ประชากรกวาง", value=f"{herbivores.herbivore_pop} ตัว")

with col3:
    st.subheader("🐅 เสือ (ผู้ล่าสูงสุด)")
    if carnivores.carnivore_pop == 0: st.error("สูญพันธุ์! (Extinct)")
    elif carnivores.carnivore_pop > (herbivores.herbivore_pop / 2): st.warning("ผู้ล่าล้นระบบ!")
    st.metric(label="ประชากรเสือ", value=f"{carnivores.carnivore_pop} ตัว")

st.divider()

# --- เลเยอร์ 3: บันทึกประวัติศาสตร์การเอาตัวรอด ---
log = f"Day {env.day:03d} | ☀️ {env.current_state} | 🌱 {plants.global_biomass:.1f}% | 🦌 {herbivores.herbivore_pop} ตัว | 🐅 {carnivores.carnivore_pop} ตัว"
st.session_state.history.insert(0, log)
if len(st.session_state.history) > 10:
    st.session_state.history.pop()

st.write("📜 **บันทึกระบบนิเวศ (Live Log):**")
for h in st.session_state.history:
    st.text(h)

# --- ระบบฟันเฟืองจักรวาล (The Engine) ---
time.sleep(2)

# 1. ธรรมชาติเปลี่ยนแปลง
env.step_day() 
# 2. พืชโตตามธรรมชาติ
plants.step_day(env.global_moisture, env.global_temperature) 
# 3. กวางกินพืช
consumed_plants = herbivores.step_day(plants.global_biomass) 
plants.global_biomass -= consumed_plants 
plants.global_biomass = max(0.0, plants.global_biomass)
# 4. เสือล่ากวาง (The Hunt)
consumed_deer = carnivores.step_day(herbivores.herbivore_pop)
herbivores.herbivore_pop -= consumed_deer
herbivores.herbivore_pop = max(0, herbivores.herbivore_pop)

st.rerun()
