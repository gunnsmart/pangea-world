import streamlit as st
import time
from datetime import datetime
from terrain import TerrainMap
from human_ai import HumanAI

st.set_page_config(page_title="Pangea: The First Logs", layout="centered")

# CSS สำหรับหน้าจอ Log แบบย้อนยุคแต่ดูแพง
st.markdown("""
<style>
    .log-container { background-color: #000; color: #0f0; font-family: 'Courier New', Courier, monospace; 
                    padding: 20px; border-radius: 10px; height: 500px; overflow-y: auto; }
    .adam-log { color: #5bc0de; margin-bottom: 10px; }
    .eve-log { color: #f0ad4e; margin-bottom: 10px; }
    .system-log { color: #777; font-size: 0.8em; }
</style>
""", unsafe_allow_html=True)

if 'world' not in st.session_state:
    st.session_state.world = TerrainMap()
    st.session_state.adam = HumanAI("Adam", "Eve")
    st.session_state.eve = HumanAI("Eve", "Adam")
    st.session_state.logs = []

adam = st.session_state.adam
eve = st.session_state.eve
world = st.session_state.world

st.title("🛰️ Pangea Live Signal")
st.write(f"### ⏱️ {datetime.now().strftime('%H:%M:%S')} (Real-time Observation)")

# --- LOG DISPLAY ---
log_html = '<div class="log-container">'
for log in st.session_state.logs[-15:]: # โชว์ 15 บรรทัดล่าสุด
    log_html += f'<div class="log-entry">{log}</div>'
log_html += '</div>'
st.markdown(log_html, unsafe_allow_html=True)

# --- ENGINE (1 Second Tick) ---
time.sleep(1.0)

current_time = datetime.now().strftime("[%H:%M:%S]")

for p in [adam, eve]:
    info = world.get_info(p.pos[0], p.pos[1])
    p.update_physics(info['elevation'])
    
    # สุ่มโอกาสการสร้าง Log (ไม่ให้รกเกินไป)
    if time.time() % 3 < 1.0:
        thought = p.get_thought()
        style = "adam-log" if p.name == "Adam" else "eve-log"
        st.session_state.logs.append(f'<span class="system-log">{current_time}</span> <span class="{style}">{thought}</span>')
    
    if time.time() % 5 < 1.0:
        action = p.perform_action(info['type'])
        st.session_state.logs.append(f'<span class="system-log">{current_time} ⚙️ {action}</span>')

st.rerun()
