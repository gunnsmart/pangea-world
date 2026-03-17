import streamlit as st
import time, random
from groq import Groq
from human_ai import HumanAI
# ... (Import อื่นๆ เหมือนเดิม)

client = Groq(api_key=st.secrets["GROQ_API_KEY"])

# --- ENGINE LOOP ---
for p in [adam, eve]:
    # สุ่มการลองผิดลองถูก
    if random.random() < 0.05: # โอกาส 5% ในการลองผสมของ
        items, stats = p.experiment()
        if items:
            # ให้ AI (สมองของมนุษย์) เป็นคนตัดสินว่าสิ่งที่ได้คืออะไร
            prompt = f"""
            คุณคือ {p.name} มนุษย์ยุคแรก คุณเพิ่งลองเอา '{items[0]}' มาประกอบกับ '{items[1]}'
            ผลที่ได้ในมือคุณมีคุณสมบัติดังนี้: {stats}
            จงตั้งชื่อสิ่งนี้เป็นภาษาไทยง่ายๆ และพูดออกมา 1 ประโยค (นะ, ว่ะ, แฮะ) 
            ห้ามใช้ศัพท์สมัยใหม่! ห้ามใช้คำว่า 'หอก' หรือ 'ไฟ' ถ้าค่าพลังไม่ถึงเกณฑ์ที่น่าจะเป็นสิ่งนั้น
            """
            
            try:
                res = client.chat.completions.create(messages=[{"role":"user","content":prompt}], model="llama-3.1-8b-instant")
                discovery_text = res.choices[0].message.content
                # บันทึกลงความรู้ (Knowledge)
                p.knowledge[tuple(sorted(items))] = discovery_text
                st.session_state.history.append(("💡 การค้นพบ", discovery_text, ""))
            except: pass

# --- DASHBOARD ---
st.title("🧬 Pangea 16K: มหาทวีปแห่งวิวัฒนาการอิสระ")
# แสดง Knowledge ที่เขาเรียนรู้เอง
st.write("### 🧠 ภูมิปัญญาที่สั่งสมเอง")
for p in [adam, eve]:
    with st.expander(f"สิ่งที่ {p.name} เรียนรู้"):
        for items, result in p.knowledge.items():
            st.write(f"🧪 {items[0]} + {items[1]} → *{result}*")
