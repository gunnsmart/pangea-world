import streamlit as st
import time
import random
from datetime import datetime
from groq import Groq
from terrain import TerrainMap
from human_ai import HumanAI

st.set_page_config(page_title="Pangea 16K: Genesis", layout="wide")

# UI Styling
st.markdown("""
<style>
    .stProgress > div > div > div > div { background-image: linear-gradient(to right, #4facfe 0%, #00f2fe 100%); }
    .status-card { background: #0e1117; padding: 15px; border-radius: 12px; border: 1px solid #262730; }
    .log-entry { background: #1e1e1e; padding: 10px; border-radius: 8px; margin-bottom: 5px; border-left: 4px solid #444; }
    .adam-label { color: #00d2ff; font-weight: bold; }
    .eve-label { color: #ff9a9e; font-weight: bold; }
</style>
""", unsafe_allow_html=True)

# Initialization
if 'world' not in st.session_state: st.session_state.world = TerrainMap()
if 'adam' not in st.session_state: st.session_state.adam = HumanAI("Adam", 1.80, 75, "Eve")
if 'eve' not in st.session_state: st.session_state.eve = HumanAI("Eve", 1.65, 55, "Adam")
if 'history' not in st.session_state: st.session_state.history = []
if 'last_speaker' not in st.session_state: st.session_state.last_speaker = None

client = Groq(api_key=st.secrets["GROQ_API_KEY"])
world, adam, eve = st.session_state.world, st.session_state.adam, st.session_state.eve

st.title("🌍 Pangea 16K: The First Conscious Humans")
st.write(f"📡 สัญญาณเวลาจริง: `{datetime.now().strftime('%H:%M:%S')}`")

# --- ENGINE LOOP (1:1) ---
time.sleep(1.0)
for p in [adam, eve]:
    info = world.get_info(p.pos[0], p.pos[1])
    p.update_physics(info['elevation'])
    p.observe(info) # บังคับให้มองเห็นก่อนแสดงผล

# --- DASHBOARD ---
c1, c2 = st.columns(2)
for i, p in enumerate([adam, eve]):
    with [c1, c2][i]:
        st.markdown(f'<div class="status-card">', unsafe_allow_html=True)
        st.subheader(f"{'👨' if p.name=='Adam' else '👩'} {p.name}")
        st.metric("อายุขัยปัจจุบัน (ปี)", f"{p.age:.8f}")
        st.metric("ดัชนีมวลกาย (BMI)", f"{p.bmi:.2f}")
        st.progress(max(0.0, min(p.u_energy/1000, 1.0)), text=f"⚡ พลังงาน (U): {p.u_energy:.1f}")
        st.progress(max(0.0, min(p.toxin/100, 1.0)), text=f"💩 ของเสียสะสม: {p.toxin:.1f}")
        st.caption(f"📍 กำลังเห็น: **{p.current_view}**")
        st.markdown('</div>', unsafe_allow_html=True)

st.divider()

# --- 🗨️ AI DIALOGUE (Grounded & Natural) ---
if random.random() < 0.15:
    # สลับคิวพูด
    speaker = adam if st.session_state.last_speaker == "Eve" else eve
    st.session_state.last_speaker = speaker.name
    partner = eve if speaker.name == "Adam" else adam
    
    ctx = speaker.get_feeling_context()
    prompt = f"""
    [กฎโลกดึกดำบรรพ์: ห้ามพูดถึงเทคโนโลยี, พิซซ่า, รถ, คอมพิวเตอร์]
    คุณคือ {speaker.name} (อายุ 25) อาศัยในป่ามหาทวีปกับ {partner.name}
    ข้อมูลดวงตาและความจำ: {ctx}
    
    จงพูดภาษาไทย 1 ประโยคสั้นๆ แบบธรรมชาติ (มีคำลงท้าย นะ, ว่ะ, แฮะ) 
    ที่เชื่อมโยงกับสิ่งที่เพิ่งเจอหรือความรู้สึกทางกายในวินาทีนี้
    """
    
    try:
        chat = client.chat.completions.create(messages=[{"role":"user","content":prompt}], model="llama-3.1-8b-instant")
        msg = chat.choices[0].message.content
        st.session_state.history.append((speaker.name, msg, datetime.now().strftime("%H:%M:%S")))
    except: pass

st.write("### 📜 บันทึกการรับรู้และบทสนทนา")
for name, msg, ts in reversed(st.session_state.history[-12:]):
    cls = "adam-label" if name == "Adam" else "eve-label"
    st.markdown(f'<div class="log-entry"><span style="color:#666">[{ts}]</span> <span class="{cls}">{name}:</span> {msg}</div>', unsafe_allow_html=True)

st.rerun()
