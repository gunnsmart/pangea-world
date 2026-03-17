import streamlit as st
import time
from datetime import datetime
from terrain import TerrainMap
from human_ai import HumanAI

st.set_page_config(page_title="Pangea: The First Couple", layout="centered")

st.markdown("""
<style>
    .main { background-color: #0a0a0a; }
    .log-box { background-color: #111; color: #d1d1d1; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
               padding: 25px; border-left: 5px solid #00ff41; border-radius: 5px; height: 500px; overflow-y: auto; }
    .timestamp { color: #555; font-size: 0.8em; margin-right: 10px; }
    .interaction { color: #f8f9fa; background-color: #222; padding: 5px 10px; border-radius: 5px; display: block; margin: 5px 0; border: 1px solid #444; }
</style>
""", unsafe_allow_html=True)

if 'world' not in st.session_state:
    st.session_state.world = TerrainMap()
    st.session_state.adam = HumanAI("Adam", "Eve")
    st.session_state.eve = HumanAI("Eve", "Adam")
    st.session_state.history = []

adam, eve = st.session_state.adam, st.session_state.eve
world = st.session_state.world

st.title("👨‍👩‍👦 Pangea Life: The Bond")
st.write(f"📡 **Real-time Sync:** {datetime.now().strftime('%H:%M:%S')}")

# --- Engine 1:1 Second ---
time.sleep(1.0)
now_str = datetime.now().strftime("[%H:%M:%S]")

# ประมวลผล Adam
info_adam = world.get_info(adam.pos[0], adam.pos[1])
adam.process_life(info_adam['elevation'], eve.pos)

# ประมวลผล Eve
info_eve = world.get_info(eve.pos[0], eve.pos[1])
eve.process_life(info_eve['elevation'], adam.pos)

# สร้าง Log ปฏิสัมพันธ์ถ้าอยู่ด้วยกัน
dist = abs(adam.pos[0] - eve.pos[0]) + abs(adam.pos[1] - eve.pos[1])
if dist == 0 and random.random() < 0.4:
    interact_logs = [
        "Adam และ Eve กำลังแบ่งปันความร้อนในร่างกาย",
        "ทักษะการเอาตัวรอดถูกถ่ายทอดผ่านสายตาของกันและกัน",
        "พวกเขากำลังทำความสะอาดร่างกายให้กันเพื่อลดเอนโทรปีสะสม",
        "Adam ยื่นผลไม้ป่าที่หามาได้ให้ Eve"
    ]
    st.session_state.history.append(f'<span class="timestamp">{now_str}</span> <span class="interaction">✨ {random.choice(interact_logs)}</span>')
else:
    # Log ความคิดส่วนตัว
    for p in [adam, eve]:
        if random.random() < 0.2:
            target_pos = eve.pos if p.name == "Adam" else adam.pos
            thought = p.get_realtime_thought(target_pos)
            color = "#00d2ff" if p.name == "Adam" else "#ff9a9e"
            st.session_state.history.append(f'<span class="timestamp">{now_str}</span> <b style="color:{color}">{thought}</b>')

# แสดง Log
log_html = "".join(st.session_state.history[-15:])
st.markdown(f'<div class="log-box">{log_html}</div>', unsafe_allow_html=True)

st.rerun()
