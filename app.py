import streamlit as st
import time, random
from datetime import datetime
from groq import Groq
from terrain import TerrainMap
from human_ai import HumanAI
from wildlife import spawn_wildlife

st.set_page_config(page_title="Pangea 16K", layout="wide")

# Initialize
if 'world' not in st.session_state: st.session_state.world = TerrainMap()
if 'adam' not in st.session_state: st.session_state.adam = HumanAI("Adam", 1.80, 75, "Eve")
if 'eve' not in st.session_state: st.session_state.eve = HumanAI("Eve", 1.65, 55, "Adam")
if 'animals' not in st.session_state: st.session_state.animals = spawn_wildlife()
if 'history' not in st.session_state: st.session_state.history = []
if 'last_speaker' not in st.session_state: st.session_state.last_speaker = None

client = Groq(api_key=st.secrets["GROQ_API_KEY"])
world, adam, eve, animals = st.session_state.world, st.session_state.adam, st.session_state.eve, st.session_state.animals

# --- ENGINE ---
time.sleep(1.0)
for p in [adam, eve]:
    info = world.get_info(p.pos[0], p.pos[1])
    p.update_physics(info['elevation'], (eve.pos if p.name=="Adam" else adam.pos))
    
    # สุ่มลองยา/ลองผสมของ
    msg = p.self_heal() or p.experiment()
    if msg: st.session_state.history.append(("ระบบ", f"💡 {p.name}: {msg}", ""))

# --- DASHBOARD ---
st.title("🌋 Pangea 16K: มหาทวีปแห่งการเรียนรู้")
c1, c2 = st.columns(2)
for i, p in enumerate([adam, eve]):
    with [c1, c2][i]:
        st.subheader(f"{p.name}")
        st.write(f"❤️ Health: {p.health:.1f} | ⚡ Energy: {p.u_energy:.1f}")
        st.progress(max(0.0, min(p.health/100, 1.0)))
        if p.has_fire: st.write("🔥 มีทักษะการใช้ไฟแล้ว")

# --- AI Chat ---
if random.random() < 0.1:
    speaker = adam if st.session_state.last_speaker == "Eve" else eve
    st.session_state.last_speaker = speaker.name
    prompt = f"คุณคือ {speaker.name} อยู่ในป่ามหาทวีป รู้เรื่อง {list(speaker.knowledge.values())}. พูดไทยสั้นๆ 1 ประโยคแบบคนป่า"
    chat = client.chat.completions.create(messages=[{"role":"user","content":prompt}], model="llama-3.1-8b-instant")
    st.session_state.history.append((speaker.name, chat.choices[0].message.content, datetime.now().strftime("%H:%M:%S")))

st.write("### 📜 บันทึกเหตุการณ์")
for name, msg, ts in reversed(st.session_state.history[-10:]):
    st.write(f"**{name}**: {msg}")

st.rerun()
