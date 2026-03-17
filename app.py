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
