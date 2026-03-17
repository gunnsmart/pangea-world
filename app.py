import streamlit as st
import time
import random
from datetime import datetime
from groq import Groq
from terrain import TerrainMap
from human_ai import HumanAI

st.set_page_config(page_title="Pangea 16K: Relationship", layout="wide")

# UI Styling
st.markdown("""
<style>
    .bond-meter { text-align: center; padding: 10px; background: #1a1a1a; border-radius: 20px; border: 1px solid #ff4b4b; margin: 10px 0; }
    .status-card { background: #0e1117; padding: 15px; border-radius: 12px; border: 1px solid #262730; }
    .log-entry { background: #1e1e1e; padding: 10px; border-radius: 8px; margin-bottom: 5px; }
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

st.title("💖 Pangea 16K: The First Relationship")

# --- 💖 RELATIONSHIP BAR (อยู่ตรงกลางหน้าจอ) ---
avg_bond = (adam.bond + eve.bond) / 2
st.markdown(f'<div class="bond-meter">💓 ระดับความผูกพันของมนุษย์คู่แรก: <b>{avg_bond:.1f}%</b></div>', unsafe_allow_html=True)

# --- ENGINE LOOP (1:1) ---
time.sleep(1.0)
for p in [adam, eve]:
    partner_pos = eve.pos if p.name == "Adam" else adam.pos
    info = world.get_info(p.pos[0], p.pos[1])
    p.update_physics(info['elevation'], partner_pos)
    p.observe(info)

# --- DASHBOARD (ซ้าย Adam / ขวา Eve) ---
c1, c2 = st.columns(2)
for i, p in enumerate([adam, eve]):
    with [c1, c2][i]:
        st.markdown(f'<div class="status-card">', unsafe_allow_html=True)
        st.subheader(f"{'👨' if p.name=='Adam' else '👩'} {p.name}")
        st.write(f"🧬 อายุ: `{p.age:.8f}` | BMI: `{p.bmi:.2f}`")
        st.progress(max(0.0, min(p.u_energy/1000, 1.0)), text=f"⚡ พลังงาน: {p.u_energy:.1f}")
        st.progress(max(0.0, min(p.bond/100, 1.0)), text=f"💖 ความผูกพัน: {p.bond:.1f}%")
        st.markdown('</div>', unsafe_allow_html=True)

# --- 🗨️ AI DIALOGUE (Emotional & Grounded) ---
if random.random() < 0.15:
    speaker = adam if st.session_state.last_speaker == "Eve" else eve
    st.session_state.last_speaker = speaker.name
    partner = eve if speaker.name == "Adam" else adam
    
    # กำหนดบุคลิกตามระดับความผูกพัน
    bond_tone = "ห่างเหินเหมือนคนเพิ่งรู้จัก" if speaker.bond < 30 else \
                "สนิทสนมเป็นเพื่อนร่วมทาง" if speaker.bond < 70 else \
                "ลึกซึ้ง รักและห่วงใยกันมาก"
    
    ctx = speaker.get_feeling_context()
    prompt = f"""
    บริบท: ยุคดึกดำบรรพ์ (ห้ามพูดเรื่องสมัยใหม่)
    คุณคือ {speaker.name} พูดกับ {partner.name}
    ความรู้สึกและสถานะ: {ctx}
    โทนการพูด: {bond_tone}
    
    จงพูดภาษาไทย 1 ประโยคสั้นๆ แบบธรรมชาติ 
    ใช้คำสรรพนามและคำลงท้าย (ว่ะ, แฮะ, นะ, จ๊ะ, ตัวเอง) ตามระดับความผูกพันที่กำหนด
    ห้ามพูดเรื่องพิซซ่าหรือเทคโนโลยี!
    """
    
    try:
        chat = client.chat.completions.create(messages=[{"role":"user","content":prompt}], model="llama-3.1-8b-instant")
        msg = chat.choices[0].message.content
        st.session_state.history.append((speaker.name, msg, datetime.now().strftime("%H:%M:%S")))
    except: pass

# แสดง Log
st.write("### 📜 บันทึกความสัมพันธ์")
for name, msg, ts in reversed(st.session_state.history[-10:]):
    color = "#00d2ff" if name == "Adam" else "#ff9a9e"
    st.markdown(f'<div class="log-entry"><b style="color:{color}">{name}:</b> {msg} <small style="color:#555">({ts})</small></div>', unsafe_allow_html=True)

st.rerun()
