# 🧬 Pangea Simulation

**Pangea** คือ simulation โลกยุคดึกดำบรรพ์ที่ **Adam** และ **Eve** ใช้ชีวิตอย่างอิสระ เรียนรู้จากความเจ็บปวดและความสุข โดยไม่มีใครบอกว่าต้องทำอะไร

> *"สัญชาตญาณเดียวที่ขับเคลื่อนพวกเขาคือ ความหิว ความเจ็บปวด ความกลัว และความรัก"*

---

## 🌍 Demo

Deploy บน **Render** — [pangea-world.onrender.com](https://pangea-world.onrender.com)

---

## ✨ Features

### 🧠 Pure Autonomous AI
Adam และ Eve ตัดสินใจเองทุกอย่างผ่าน **Pain/Pleasure signals** ไม่มี script ไม่มี hardcoded behavior

```
ร่างกายหิว → pain signal → brain boost seek_food
กินแล้วอิ่ม → pleasure signal → จำว่าที่นี่มีอาหาร
เห็นเสือ → fear signal → วิ่งหนี + จำตำแหน่งอันตราย
```

### 👁 Vision + Memory
- **Vision** — scan รัศมีรอบตัว เห็นอาหาร/น้ำ/ไฟ/สัตว์/partner
- **Long-term Memory** — จำสถานที่ เหตุการณ์ ความรู้สะสม
- **Episodic Memory** — "วันที่ 5 กินอาหารสุกที่ [12,8] → มีความสุข"
- **Spatial Memory** — แผนที่ในหัว จำตำแหน่ง food/water/fire/danger

### 🧬 ชีววิทยาจริง
- **ร่างกายต่างกัน** ชาย/หญิง — BMR, กล้ามเนื้อ, ไขมัน, ฮอร์โมน
- **รอบเดือน Eve** — ไข่ตกวันที่ 14 ±3 วัน, โอกาสตั้งครรภ์ 25%
- **ตั้งครรภ์ 280 วัน** — drain energy ทุกวัน
- **โรคภัย** — cortisol สูง → เสี่ยงป่วย, oxytocin → ฟื้นเร็ว

### ⚛️ Physics & Chemistry
- **Thermodynamics** — `dU = dQ - dW`, Entropy สะสม
- **Photosynthesis** — Farquhar model: CO₂ + H₂O + แสง → Glucose
- **ATP Metabolism** — aerobic 36 ATP / anaerobic 2 ATP
- **Greenhouse Effect** — CO₂/CH₄ tracking → อุณหภูมิโลกเปลี่ยน
- **Fire Chemistry** — combustion, Maillard reaction, heat transfer

### 🌿 Ecosystem
- **Grid-based Biomass** — แต่ละ cell มีอาหารของตัวเอง
- **Food Chain** — แสง → พืช → Herbivore → Carnivore → มนุษย์
- **Wildlife สมจริง** — สัตว์มี drives (หิว/กลัว/ง่วง/libido) เดินอย่างชาญฉลาด
- **ไม่เพิ่มอัตโนมัติ** — ต้องสืบพันธุ์จริงถึงเพิ่มได้

### 🌍 Environment
- **4 ฤดูกาล** — ใบไม้ผลิ, ร้อน, ใบไม้ร่วง, หนาว
- **5 ภัยธรรมชาติ** — น้ำท่วม, ภูเขาไฟ, แผ่นดินไหว, โรคระบาด, ภัยแล้ง
- **กลางวัน/กลางคืน** — แสง, อุณหภูมิ, พฤติกรรมสัตว์เปลี่ยน
- **เวลาไทย UTC+7** — 1 ชั่วโมงจริง = 1 วัน sim

### 💑 Relationship
- **7 ระยะ** — คนแปลกหน้า → คู่ชีวิต
- **Bond, Trust, Conflict** — เปลี่ยนตามพฤติกรรม
- **Emotional Memory** — จำเหตุการณ์ดี/แย่ร่วมกัน

---

## 🏗 Architecture

```
pangea-world/
├── server.py           ← FastAPI + WebSocket + Simulation Thread
├── static/
│   ├── index.html      ← UI (HTML/CSS)
│   └── main.js         ← WebSocket client + Canvas renderer
│
├── brain.py            ← Pure Autonomous AI (Pain/Pleasure/Memory)
├── senses.py           ← Vision + Sound + Long-term Memory
├── body.py             ← ร่างกายแยกเพศ (ชีววิทยาจริง)
├── human_ai.py         ← Adam & Eve (instinct + inventory)
├── relationship.py     ← ความสัมพันธ์ระหว่าง Adam & Eve
│
├── biology.py          ← Plant/Fauna/Human Ecosystem
├── wildlife.py         ← สัตว์ป่าสมจริง (drives + smart movement)
├── terrain.py          ← แผนที่ 50×50 procedural (8 biomes)
├── environment.py      ← Weather + ฤดูกาล + ภัยธรรมชาติ
├── physics_engine.py   ← Thermodynamics / Chemistry / ATP / Atmosphere
├── fire_system.py      ← ไฟ (combustion + cooking + warmth)
│
├── requirements.txt
└── render.yaml
```

### Backend Flow
```
SimThread (background, ทุก 150 วิ = 1 ชม sim)
  └── _step_world()
        ├── Weather → Disasters → Plants (grid)
        ├── Fauna step
        ├── Human loop:
        │     ├── Vision.scan() → VisualObject[]
        │     ├── Sound.listen() → SoundEvent[]
        │     ├── Brain.step(perception) → action
        │     ├── Execute action
        │     ├── LTM.store_episode()
        │     └── Body.step_day()
        └── Wildlife loop:
              ├── drives.step()
              ├── move_smart()
              ├── eat/drink/mate
              └── birth/death events

WebSocket → JSON snapshot → Browser (ทุก 2.5 วิ)
```

---

## 🤖 Brain Architecture

```
Perception (Vision + Sound + Body state)
         ↓
   Drive System (hunger, thirst, tired, fear, cold, libido, bored)
         ↓
   Pain/Pleasure Signals
         ↓
   Weight Table (เรียนรู้ได้ — RL แบบง่าย)
   + Memory Recall (episodic + spatial)
   + Emotion Multiplier
         ↓
   Softmax Sampling (temperature ∝ curiosity)
         ↓
   Action → Execute → Outcome
         ↓
   Learn (weight update + LTM store)
```

**ไม่มี hardcoded behavior** — ทุกอย่างมาจาก pain/pleasure signal เท่านั้น

---

## 🚀 Run Locally

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/pangea-world.git
cd pangea-world

# Install
pip install -r requirements.txt

# Set API key (optional — สำหรับ Groq AI naming inventions)
export GROQ_API_KEY="your_key_here"

# Run
uvicorn server:app --host 0.0.0.0 --port 8000

# เปิด browser
open http://localhost:8000
```

---

## ☁️ Deploy on Render

1. Push repo ขึ้น GitHub
2. ไปที่ [render.com](https://render.com) → New Web Service
3. Connect GitHub repo
4. ตั้งค่า:
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variable: `GROQ_API_KEY`
6. Deploy ✅

---

## ⏱ Time Scale

| Real Time | Sim Time |
|-----------|---------|
| 150 วินาที | 1 ชั่วโมง sim |
| 1 ชั่วโมง | 1 วัน sim |
| 24 ชั่วโมง | 24 วัน sim |

---

## 🗺 Biomes

| Biome | สี | ลักษณะ |
|-------|-----|--------|
| 🌊 ทะเลสาบ | น้ำเงินเข้ม | ไม่มีอาหาร แต่มีน้ำดื่ม |
| 🏖 ริมน้ำ | น้ำเงินอ่อน | อาหารน้อย มีน้ำ สมุนไพร |
| 🏝 ชายหาด | เหลืองทราย | อาหารน้อยมาก |
| 🌿 ทุ่งหญ้า | เขียวสด | อาหารปานกลาง |
| 🌴 เขตร้อนชื้น | เขียวเข้ม | อาหารมากที่สุด |
| 🌳 ป่าทึบ | เขียวเข้มมาก | อาหารมาก สมุนไพร |
| ⛰ ภูเขา | น้ำตาล | อาหารน้อย |
| 🏔 ยอดเขา | ขาว | อาหารน้อยมาก อันตราย |

---

## 📊 Level System

```
🟢 Level 1 — Basic Human (เอาตัวรอด + สืบพันธุ์)  ✅ Done
  • กิน ดื่ม นอน ขับถ่าย ล่าสัตว์ จุดไฟ สืบพันธุ์
  • ตายได้จากหิว/บาดเจ็บ/อายุมาก

🟡 Level 2 — Social Human (เริ่มมีสังคม)          🔄 In Progress
  • ลูกหลานเป็น NPC จริง
  • ถ่ายทอดความรู้ให้ลูก
  • ภาษา/สัญลักษณ์เริ่มต้น
  • แบ่งงานกัน (Adam ล่า Eve ดูแลไฟ)

🔴 Level 3 — Emergent Human (มี invention + culture) 📋 Planned
  • สร้างเครื่องมือ/ที่พัก
  • วัฒนธรรม ความเชื่อ พิธีกรรม
  • ส่งต่อความรู้ข้ามรุ่น
```

---

## 🔬 Science References

- **Thermodynamics**: First & Second Law, Gibbs Free Energy
- **Photosynthesis**: Farquhar-von Caemmerer-Berry Model
- **Metabolism**: Kleiber's Law (BMR ∝ mass^0.75), Q10 Rule
- **ATP**: Cellular Respiration (aerobic 36 ATP, anaerobic 2 ATP)
- **Body**: Mifflin-St Jeor BMR, Human Reproduction Biology
- **Memory**: Ebbinghaus Forgetting Curve, Episodic Memory Theory
- **AI**: Reinforcement Learning (Hebbian), Softmax Action Selection

---

## 👨‍💻 Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python + FastAPI |
| Realtime | WebSocket |
| Frontend | HTML + CSS + Canvas API |
| Simulation | Pure Python (no ML libs) |
| Deploy | Render |

---

*สร้างด้วย ❤️ และ Claude*
