import streamlit as st
import time
import random
from wildlife import spawn_wildlife
# (Import อื่นๆ เหมือนเดิม)

if 'animals' not in st.session_state:
    st.session_state.animals = spawn_wildlife()

animals = st.session_state.animals
world = st.session_state.world

# --- ENGINE LOOP 1:1 ---
world.regrow() # พืชงอก
for a in animals:
    tile = world.get_info(a.pos[0], a.pos[1])
    a.update_life(tile['elevation'])
    
    # ห่วงโซ่อาหาร (Food Chain)
    if a.status == "หิว":
        if a.a_type == "Herbivore" and tile['food_level'] > 20:
            world.vegetation[a.pos[0]][a.pos[1]] -= 20
            a.energy += a.energy_gain
            a.status = "อิ่มแล้ว"
        elif a.a_type == "Carnivore":
            # ล่าสัตว์ตัวอื่นที่อยู่ในช่องเดียวกัน
            for prey in animals:
                if prey.a_type == "Herbivore" and prey.pos == a.pos:
                    animals.remove(prey) # โดนกิน!
                    a.energy += a.energy_gain
                    st.session_state.history.append(("ระบบ", f"⚠️ {a.species} ล่า {prey.species} สำเร็จ!", ""))
                    break
    a.move()

# --- แสดงผลหน้าจอ ---
# (Dashboard Adam/Eve เหมือนเดิม)
st.divider()
st.subheader("🐾 สถานะระบบนิเวศ (Wildlife Monitor)")
cols = st.columns(len(animals))
for i, a in enumerate(animals):
    with cols[i]:
        st.write(f"{a.icon} {a.species}")
        st.caption(f"E: {a.energy:.0f} | {a.status}")

# บทสนทนา AI (ให้ Adam/Eve พูดถึงสัตว์ที่เห็น)
# (ปรับ Prompt ให้ AI รับรู้ตำแหน่งสัตว์ป่ารอบตัว)
# --- ใน Loop ของ app.py ---

for p in [adam, eve]:
    # 1. ให้เขาสุ่มเก็บของเองตามพื้นที่ที่ยืนอยู่
    p.collect_material(p.current_view)
    
    # 2. ถ้าเจออันตราย (เช่น มีสัตว์ดุร้ายในช่องเดียวกัน) หรือหิวจัด 
    # ให้เขาลอง Experiment เอง
    if p.u_energy < 400 or any(a.a_type == "Carnivore" and a.pos == p.pos for a in animals):
        discovery_msg = p.experiment()
        if discovery_msg:
            st.session_state.history.append(("ระบบ", f"💡 {p.name}: {discovery_msg}", ""))

# --- ปรับ AI Prompt ให้คุยเรื่องการค้นพบ ---
if random.random() < 0.15:
    # (ระบบเลือกคนพูดเหมือนเดิม)
    ctx = speaker.get_feeling_context()
    knw = ", ".join(speaker.knowledge.values())
    
    prompt = f"""
    บริบท: ยุค Pangea (ห้ามใช้ศัพท์สมัยใหม่)
    คุณคือ {speaker.name} สิ่งที่คุณรู้วิธีทำตอนนี้: {knw if knw else 'ยังไม่รู้อะไรเลย'}
    สถานะร่างกายและความจำ: {ctx}
    
    จงพูด 1 ประโยคสั้นๆ ที่แสดงถึงการ 'พยายามเรียนรู้' หรือ 'สงสัย' ในวัสดุรอบตัว
    เช่น 'ลองเอาหินมาถูกับไม้ดูไหม?' หรือ 'ของพวกนี้มันเอามาทำอะไรได้นะ?'
    ห้ามให้ใครสอน คุณต้องคิดเอง! (นะ, ว่ะ, แฮะ)
    """
    # (ส่งหา Groq ต่อ)
# --- ภายใน Engine Loop ของ app.py ---

for p in [adam, eve]:
    p.update_physics(world.get_info(p.pos[0], p.pos[1])['elevation'], 
                     eve.pos if p.name == "Adam" else adam.pos)
    
    # ตรวจสอบการปะทะกับสัตว์ในพิกัดเดียวกัน
    for animal in animals:
        if animal.pos == p.pos:
            if animal.a_type == "Carnivore" or (p.u_energy < 300):
                # เกิดการต่อสู้ (สัญชาตญาณป้องกันตัว หรือ ความหิว)
                result = p.process_encounter(animal)
                
                if result == "WIN":
                    st.session_state.history.append(("ระบบ", f"⚔️ {p.name} ล่า {animal.species} ได้สำเร็จ! ได้รับพลังงานมหาศาล", ""))
                    if animal in animals: animals.remove(animal) # สัตว์โดนกิน
                else:
                    st.session_state.history.append(("ระบบ", f"⚠️ {p.name} ถูก {animal.species} ทำร้าย! บาดเจ็บสาหัส", ""))
            
    # ระบบสุ่มลองผิดลองถูก (Experiment)
    if random.random() < 0.05: # โอกาส 5% ที่จะลองผสมของในมือ
        discovery = p.experiment()
        if discovery:
            st.session_state.history.append(("ระบบ", f"💡 {p.name}: {discovery}", ""))

# --- แสดงสถานะสุขภาพใน Dashboard ---
# เพิ่ม st.error หรือ st.warning ถ้า Health ต่ำ

# --- ใน Dashboard ของ app.py ---
for i, p in enumerate([adam, eve]):
    with [c1, c2][i]:
        st.markdown(f'<div class="status-card">', unsafe_allow_html=True)
        # เพิ่มแถบ Health (สีแดง)
        health_color = "🔴" if p.health < 50 else "🟢"
        st.write(f"{health_color} พลังชีวิต: **{p.health:.1f}/100**")
        st.progress(max(0.0, min(p.health/100, 1.0)))
        
        # ... (Stats พลังงาน/ความผูกพันเดิม) ...

# --- ใน Engine Loop ---
for p in [adam, eve]:
    info = world.get_info(p.pos[0], p.pos[1])
    p.collect_material(info)
    
    # ถ้าบาดเจ็บ ให้ลองรักษาตัวเอง
    heal_msg = p.self_heal()
    if heal_msg:
        st.session_state.history.append(("ระบบ", f"⚕️ {p.name}: {heal_msg}", ""))

# --- ปรับ Prompt ให้ AI พูดถึงอาการบาดเจ็บ ---
if random.random() < 0.15:
    # ... (สลับคนพูดเหมือนเดิม) ...
    prompt = f"""
    บริบท: ยุค Pangea (ห้ามใช้ศัพท์สมัยใหม่)
    คุณคือ {speaker.name} สถานะสุขภาพ: {speaker.health}/100
    ความรู้เรื่องยา: {speaker.knowledge.get('ใบไม้ปริศนา', 'ไม่รู้อะไรเลย')}
    
    จงพูด 1 ประโยคสั้นๆ ที่แสดงความเจ็บปวด หรือความดีใจหลังเจอวิธีรักษา
    ห้ามคนสอน คุณต้องเรียนรู้จากความเจ็บปวดเอง! (นะ, ว่ะ, แฮะ)
    """


