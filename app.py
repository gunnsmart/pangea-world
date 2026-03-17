import streamlit as st
import time
import random
from datetime import datetime
from groq import Groq
from terrain import TerrainMap
from human_ai import HumanAI

st.set_page_config(page_title="Pangea 16K: Dashboard", layout="wide") # ปรับเป็น wide เพื่อโชว์สองฝั่ง

# --- CSS สำหรับความสวยงาม ---
st.markdown("""
<style>
    .status-box { padding: 20px; border-radius: 10px; border: 1px solid #333; background-color: #0e1117; }
    .log-card { background: #111; color: #eee; padding: 12px; border-radius: 10px; margin-bottom: 8px; border-left: 5px solid #444; }
    .adam-text { color: #00d2ff; font-weight: bold; }
    .eve-text { color: #ff9a9e; font-weight: bold; }
    .metric-label { color: #888; font-size: 0.8em; }
</style>
""", unsafe_allow_html=True)

# --- Initialize Session State ---
if 'world' not in st.session_state:
    st.session_state.world = TerrainMap()
    st.session_state.adam = HumanAI("Adam", 1.80, 75, "Eve")
    st.session_state.eve = HumanAI("Eve", 1.65, 55, "Adam")
    st.session_state.history = []
    st.session_state.last_speaker = None

client = Groq(api_key=st.secrets["GROQ_API_KEY"])
world, adam, eve = st.session_state.world, st.session_state.adam, st.session_state.eve

st.title("🌍 Pangea 16K: มหาทวีปและมนุษย์คู่แรก")
st.write(f"📡 สัญญาณเชื่อมต่อเวลาจริง: `{datetime.now().strftime('%H:%M:%S')}`")

# --- ENGINE LOOP (1:1) ---
time.sleep(1.0)
for p in [adam, eve]:
    info = world.get_info(p.pos[0], p.pos[1])
    p.update_physics(info['elevation'])

# --- 📊 STATUS DASHBOARD ---
col1, col2 = st.columns(2)

with col1:
    st.markdown(f'<div class="status-box">', unsafe_allow_html=True)
    st.subheader("👨 Adam")
    st.metric("อายุ (ปี)", f"{adam.age:.7f}")
    st.metric("BMI", f"{adam.bmi:.2f}")
    st.progress(max(0, min(adam.u_energy/1000, 1.0)), text=f"⚡ พลังงาน: {adam.u_energy:.1f}")
    st.progress(max(0, min(adam.toxin/100, 1.0)), text=f"💩 ของเสีย: {adam.toxin:.1f}")
    st.caption(f"📍 พิกัด: {world.get_info(adam.pos[0], adam.pos[1])['type']}")
    st.markdown('</div>', unsafe_allow_html=True)

with col2:
    st.markdown(f'<div class="status-box">', unsafe_allow_html=True)
    st.subheader("👩 Eve")
    st.metric("อายุ (ปี)", f"{eve.age:.7f}")
    st.metric("BMI", f"{eve.bmi:.2f}")
    st.progress(max(0, min(eve.u_energy/1000, 1.0)), text=f"⚡ พลังงาน: {eve.u_energy:.1f}")
    st.progress(max(0, min(eve.toxin/100, 1.0)), text=f"💩 ของเสีย: {eve.toxin:.1f}")
    st.caption(f"📍 พิกัด: {world.get_info(eve.pos[0], eve.pos[1])['type']}")
    st.markdown('</div>', unsafe_allow_html=True)

st.divider()

# --- 🗨️ DIALOGUE LOG (Turn-based) ---
if random.random() < 0.15: # เพิ่มโอกาสคุยขึ้นนิดหน่อย
    # สลับคนพูด
    if st.session_state.last_speaker == "Eve": speaker = adam
    elif st.session_state.last_speaker == "Adam": speaker = eve
    else: speaker = random.choice([adam, eve])
    
    st.session_state.last_speaker = speaker.name
    partner = eve if speaker.name == "Adam" else adam
    
    # ส่งข้อมูลความรู้สึกดิบให้ Groq AI ชงประโยค
    feeling = speaker.get_feeling()
    prompt = f"คุณคือ {speaker.name} อายุ 25 อยู่ในป่ามหาทวีปกับ {partner.name}. " \
             f"ความรู้สึกตอนนี้: {feeling}. พูดภาษาไทยสั้นๆ 1 ประโยคแบบธรรมชาติคนคุยกัน (มี 'นะ','ว่ะ','แฮะ')"
    
    try:
        chat = client.chat.completions.create(messages=[{"role":"user","content":prompt}], model="llama-3.1-8b-instant")
        msg = chat.choices[0].message.content
        st.session_state.history.append((speaker.name, msg, datetime.now().strftime("%H:%M:%S")))
    except:
        pass # ป้องกัน App ล่มถ้า API ติดขัด

# แสดงประวัติการคุย
st.write("### 📜 บันทึกบทสนทนา")
for name, msg, ts in reversed(st.session_state.history[-10:]):
    name_cls = "adam-text" if name == "Adam" else "eve-text"
    st.markdown(f'<div class="log-card"><span style="color:#666">[{ts}]</span> <span class="{name_cls}">{name}:</span> {msg}</div>', unsafe_allow_html=True)

st.rerun()
