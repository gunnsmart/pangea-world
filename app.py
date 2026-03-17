import streamlit as st
import time
import random
from datetime import datetime
from groq import Groq
from terrain import TerrainMap
from human_ai import HumanAI

st.set_page_config(page_title="Pangea: The First Pair", layout="centered")

# CSS
st.markdown("""
<style>
    .log-card { background: #111; color: #eee; padding: 15px; border-radius: 10px; margin-bottom: 10px; border-left: 5px solid #00ff41; }
    .adam { color: #00d2ff; font-weight: bold; }
    .eve { color: #ff9a9e; font-weight: bold; }
</style>
""", unsafe_allow_html=True)

# Initialize
if 'world' not in st.session_state:
    st.session_state.world = TerrainMap()
    st.session_state.adam = HumanAI("Adam", 1.80, 75, "Eve")
    st.session_state.eve = HumanAI("Eve", 1.65, 55, "Adam")
    st.session_state.history = []

client = Groq(api_key=st.secrets["GROQ_API_KEY"])
world, adam, eve = st.session_state.world, st.session_state.adam, st.session_state.eve

st.title("🌍 Pangea 16K: มนุษย์คู่แรก")
st.write(f"⏱️ เวลาจริง: {datetime.now().strftime('%H:%M:%S')} | 📅 อายุ: {adam.age:.6f} ปี")

# Engine 1:1
time.sleep(1.0)
for p in [adam, eve]:
    info = world.get_info(p.pos[0], p.pos[1])
    p.update_physics(info['elevation'])

# Dialogue (AI ชงประโยคภาษาไทย)
if random.random() < 0.1: # ทุก ~10 วิจะมีการพูดคุย
    speaker = random.choice([adam, eve])
    partner = eve if speaker.name == "Adam" else adam
    
    prompt = f"คุณคือ {speaker.name} อายุ 25 อยู่ในป่ากับ {partner.name}. " \
             f"ความรู้สึก: {speaker.get_feeling()}. พูดภาษาไทยสั้นๆ 1 ประโยคแบบธรรมชาติ (ใช้ 'นะ','ว่ะ','แฮะ')"
    
    chat = client.chat.completions.create(messages=[{"role":"user","content":prompt}], model="llama-3.1-8b-instant")
    msg = chat.choices[0].message.content
    st.session_state.history.append((speaker.name, msg, datetime.now().strftime("%H:%M:%S")))

# Display Logs
for name, msg, ts in reversed(st.session_state.history[-10:]):
    cls = "adam" if name == "Adam" else "eve"
    st.markdown(f'<div class="log-card"><span style="color:#666">[{ts}]</span> <span class="{cls}">{name}:</span> {msg}</div>', unsafe_allow_html=True)

st.rerun()
