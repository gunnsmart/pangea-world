# PANGEA_OS: Neural Command & Biosphere Control

Pangea_OS คือระบบจำลองนิเวศวิทยาและพฤติกรรมมนุษย์ขั้นสูง (Adam & Eve) ที่ถูกขับเคลื่อนด้วยกฎทางฟิสิกส์ เคมี และชีววิทยา พร้อมระบบ **Spiking Neural Network (SNN)** และ **Semantic Knowledge Retrieval** ในรูปแบบ Command Center ที่ล้ำสมัย

ปัจจุบันระบบจำลองถูกตั้งค่าให้เป็น **"Christmas Island Sector"** ซึ่งเป็นเกาะร้างขนาดเล็กกลางมหาสมุทร เพื่อศึกษาการเอาชีวิตรอดในพื้นที่จำกัด

## Project Status
**Server-side Persistent Simulation: DEPLOYED (Experimental)**  
**Multiplayer Observation: ENABLED (Real-time sync)**  
**Truth-Based UI Audit: COMPLETE**

## 🏝️ Environment & Geography (Christmas Island)

*   **Map Size:** 50x50 Grid (2,500 ช่อง) จำลองสภาพเกาะขนาดเล็กกะทัดรัด
*   **Terrain Generation:** สร้างภูมิประเทศด้วยระบบ Procedural Noise และ Island Mask ทำให้เกิดเป็นเกาะที่มีแผ่นดินนูนตรงกลางและล้อมรอบด้วยทะเลลึก
*   **Water Sources:** มีทะเลสาบ (Lake) น้ำจืดขนาดเล็กบริเวณกลางเกาะ และมีแม่น้ำ (River) 1 สายไหลพาดผ่าน
*   **Biomes:** มีความหลากหลายทางชีวภาพในพื้นที่จำกัด ทั้งชายหาด (Beach), ทุ่งหญ้า (Grassland), ป่าดิบชื้น (Tropical Forest), ภูเขา (Mountain) และหนองน้ำ (Swamp)

## 🦀 Ecosystem & Fauna

ระบบนิเวศบนเกาะถูกปรับให้สมจริงตามหลักชีวภูมิศาสตร์ของเกาะ (Island Biogeography) โดยตัดสัตว์บกขนาดใหญ่และนักล่าบนแผ่นดินใหญ่ออกทั้งหมด (เช่น ช้าง, เสือ, หมี, หมาป่า) และแทนที่ด้วยสัตว์ประจำถิ่น:

*   **Red Crab (ปูแดง):** สัตว์ประจำถิ่นที่มีประชากรหนาแน่นที่สุด เป็นสัญลักษณ์ของเกาะ
*   **Seagull (นกนางนวล):** นกทะเลที่พบได้ทั่วไปตามชายฝั่ง
*   **Reptilian Predators:** มังกรโคโมโด (Komodo Dragon) และ งู (Snake) เป็นนักล่าหลักบนเกาะ
*   **Small Mammals:** หนู (Rat) และ กระต่าย (Rabbit) ที่อาจติดมากับเศษไม้
*   **Avian Predators:** นกฮูก (Owl) นักล่าในเวลากลางคืน
*   **Insects & Amphibians:** แมลงปอ (Dragonfly), ผึ้ง (Honey Bee), ผีเสื้อ (Butterfly), แมลงหวี่ (Fruit Fly), หอยทาก (Snail), และกบ (Frog)
*   **Aquatic Life:** ปลาการ์ตูน (Clownfish), เต่าทะเล (Sea Turtle), จระเข้น้ำเค็ม (Saltwater Crocodile), โลมา (Dolphin), และนาก (Otter) อาศัยอยู่ในทะเลสาบและชายฝั่งรอบเกาะ
*   **Population:** จำกัดจำนวนสัตว์เริ่มต้นที่ 60 ตัว แบ่งเป็นสัตว์บกและสัตว์น้ำ เพื่อรักษาสมดุลของเกาะขนาดเล็ก

## 🕒 Time Scale & Temporal Logic (Universal 1:2 Scale)

ระบบจำลองนี้ใช้มาตราส่วนเวลาที่ยึดตาม **"โลกจริง"** เพื่อความสมจริงสูงสุดและการเก็บข้อมูลเชิงลึกระยะยาว:

*   **Universal Ratio:** **1 วินาทีจริง = 2 วินาทีจำลอง** (เร็วกว่าโลกจริง 2 เท่า)
*   **Biological Constants (อิงตามโลกจริง):**
    *   **Aging:** มนุษย์และสัตว์อายุเพิ่มขึ้น 1 ปี เมื่อผ่านไป 1 ปีจำลอง (ใช้เวลาจริง 182.5 วัน)
    *   **Pregnancy (Eve):** ตั้งครรภ์นาน 9 เดือนจำลอง หรือ 270 วัน (ใช้เวลาจริง 135 วันในการคลอด)
    *   **Metabolism:** ระบบเผาผลาญ (หิว, เหนื่อย) ถูกปรับให้สัมพันธ์กับเวลาจริง x2 (เช่น นอน 8 ชม. จำลอง = 4 ชม. จริง)
*   **Ecological Sync:** พืชและสภาพอากาศเติบโตและเปลี่ยนแปลงในจังหวะเดียวกันทั้งระบบ เพื่อความเสถียรของข้อมูลและความสมจริงของนิเวศวิทยา

## 🧠 Narrative Knowledge System (Adam & Eve Wisdom)

ระบบจำลองนี้บรรจุฐานข้อมูลความรู้และภูมิปัญญาดั้งเดิม (Narrative Knowledge) กว่า **2,366 รายการ** ที่สกัดจากบันทึกประสบการณ์ชีวิตของ Adam และ Eve:

*   **NeuralKnowledgeService (Unified Engine):** ระบบจัดการความรู้แบบรวมศูนย์ที่ใช้เทคโนโลยี Neural Embeddings (128D) ในการดึงข้อมูล (Retrieval) แทนที่ระบบเก่า (KnowledgeService/Retriever) ทำให้การค้นหาความรู้มีความสมบูรณ์และรวดเร็วยิ่งขึ้น
*   **Semantic & Context-Aware Retrieval:** ระบบใช้ Cosine Similarity ในการคำนวณหาความรู้ที่สอดคล้องกับสถานการณ์ที่ Agent กำลังเผชิญมากที่สุด (เช่น สภาวะอารมณ์, ความต้องการพื้นฐาน, วัตถุดิบในมือ)
*   **Neural-Narrative Integration:** ความรู้ที่ดึงมาได้จะส่งผลต่อการตัดสินใจของ Neural Network โดยตรง (เช่น เพิ่มความมั่นใจในการคราฟต์เมื่อมี Resonance กับความรู้เรื่องการถักทอ)
*   **Wisdom UI/UX:**
    *   **Knowledge Tab (Logos):** แสดงรายการความรู้ทั้งหมด แยกตาม Agent (Adam/Eve) พร้อมระบบค้นหาแบบ Semantic Search
    *   **Neural Thought Stream:** HUD บนหน้าจอ Agent แสดง "กระแสความคิด" ที่ถูกดึงมาจากระบบ Neural Knowledge แบบ Real-time
    *   **Wisdom Logs:** ระบบดึงภูมิปัญญา (Random Wisdom) มาแสดงผลใน World Log ทุกๆ 5 วินาที เพื่อจำลองการสะท้อนถึงประสบการณ์ที่ผ่านมา

## 🧬 Key Features

### 1. Emergent Crafting & Neural Learning
*   **Modular Spiking Neural Network:** สมอง AI ถูกยกระดับสู่สถาปัตยกรรมแบบแยกโมดูล (Modular Architecture) เพื่อการประมวลผลที่ซับซ้อนและมีประสิทธิภาพสูงขึ้น:
    *   **Sensory Module:** ทำการประมวลผลข้อมูลสิ่งแวดล้อม (Encoding) และองค์ความรู้ (Knowledge Latent)
    *   **Homeostasis Module:** จัดการสมดุลภายในร่างกายและแรงขับพื้นฐาน (Needs/Drives) ควบคู่กับระบบฮอร์โมน
    *   **Motivation Module:** ผลึกกำลังข้อมูลจากภายนอกและภายในเพื่อสร้าง "เจตจำนง" (Intent/Motivation)
    *   **Motor Module:** แปลงเจตจำนงและบุคลิกภาพ (Personality) สู่การกระทำจริงในโลกจำลอง
*   **Sensory Upgrade (Input Encoding):** เพิ่มความละเอียดของช่องสัญญาณขาเข้าประสาทสัมผัส (Input Neurons) จากเดิมเป็น 202 มิติ (74 Base + 128 Knowledge) เพื่อให้ Agent รับรู้สภาพอากาศ (Climate), อุณหภูมิ, ความชื้น, ทิศทางลม และฤดูกาลได้อย่างละเอียดแม่นยำ
*   **Spiking Neural Network (SNN):** สมอง AI ทำงานด้วยโมเดล Leaky Integrate-and-Fire (LIF) ที่เลียนแบบการทำงานของระบบประสาทจริง มีการสะสมแรงดันไฟฟ้า (Membrane Potential) และการยิงสัญญาณ (Spiking) เมื่อถึงเกณฑ์ (Threshold)
*   **Neuro-Hormonal Coupling:** ผสานระบบฮอร์โมน (Dopamine, Serotonin, Cortisol, Oxytocin) เข้าสู่ลูปการเรียนรู้โดยตรง ส่งผลต่อความเร็วในการปรับน้ำหนักเส้นประสาท (Learning Rate) และลำดับความสำคัญของแรงผลักดัน (Motivation)
*   **Instinct SNN for Animals:** สัตว์ทุกตัวบนเกาะถูกขับเคลื่อนโดย Instinct Spiking Neural Network (32-dimensional input) ที่ช่วยในการตัดสินใจพฤติกรรมตามสัญชาตญาณ (Instincts) และการตอบสนองต่อสิ่งเร้า (Reflexes)
*   **Hebbian Plasticity (Synaptic Scaling):** ระบบ "Neurons that fire together, wire together" ช่วยให้ Agent เรียนรู้ความสัมพันธ์เชิงลบและบวกของสิ่งต่างๆ ในโลกได้โดยตรงผ่านปฏิสัมพันธ์ (Associative Learning)
*   **Dream Consolidation (Memory Phase):** ในช่วงเวลาที่ Agent หลับ ระบบจะทำการเรียบเรียงประสบการณ์ (Consolidation) และปรับจูนน้ำหนักสัญญาณประสาท (Reprocessing) เพื่อย้ายความจำจากระยะสั้นสู่ความฉลาดระยะยาว
*   **Active Inference & HRL:** การตัดสินใจอิงตามทฤษฎี Active Inference เพื่อลดความแปลกใจ (Surprise) และเพิ่มมูลค่าของรางวัลในลำดับชั้น (Hierarchical Reinforcement Learning) ทำให้พฤติกรรมมีความซับซ้อนและมีเป้าหมาย
*   **Self-Learning (Backpropagation):** เมื่อ Agent ทำการคราฟต์หรือมีเหตุการณ์สำคัญ ผลลัพธ์จะถูกส่งกลับไปฝึกฝนผ่าน Backpropagation คู่ขนานไปกับระบบ Plasticity

### 2. Subject Monitoring & Neural Visualization
*   **Neural Network Visualizer:** แสดงผลการทำงานของ SNN แบบเจาะลึก:
    *   **Sensory Input Thresholds:** แถบแสดงระดับการกระตุ้นของประสาทสัมผัสแต่ละส่วน
    *   **Motor Desires (Activations):** แถบแสดงความน่าจะเป็นของการกระทำที่ Agent ต้องการทำ (Action Probabilities)
    *   **Neural Logic Stream:** แสดงค่าดิบของ Activation ในโครงข่ายเพื่อความโปร่งใสของ AI

### 3. Physics, Chemistry & Biology Engine
*   **Thermodynamics:** ระบบคำนวณอุณหภูมิร่างกายและสภาพแวดล้อมตามกฎฟิสิกส์
*   **Biochemistry & Digestion:** ระบบเผาผลาญพลังงาน (Metabolism) ที่ผันแปรตามกิจกรรม (ใช้สูตร Mifflin-St Jeor) พร้อมระบบย่อยอาหารที่ค่อยๆ เปลี่ยนอาหารในกระเพาะเป็นพลังงาน และระบบขับถ่ายของเสีย
*   **Biological Cycles & Reproduction:** ระบบรอบเดือนสมจริง (28 วัน) ช่วงไข่ตก (Fertile Window) และกลไกป้องกันการตั้งครรภ์เมื่อร่างกายวิกฤต (Amenorrhea) โดยจำกัดประชากรไว้ที่ 2 คน (Adam & Eve)
*   **Genetic Individualization:** ระบบพันธุกรรมที่สุ่มค่าเริ่มต้นของร่างกายอย่างละเอียด (Metabolism Rate, Strength, Intelligence, Longevity) และคุณสมบัติพื้นฐานที่ไม่ซ้ำกันในแต่ละคน เพื่อป้องกันพฤติกรรมที่ก๊อปปี้กันและสร้างความเป็นปัจเจกสูงสุด
*   **Dynamic Decision Intervals:** ระบบ "ความเหลื่อมล้ำของเวลา" ที่ทำให้มนุษย์แต่ละคนตัดสินใจ AI ในช่วงเวลาที่ต่างกันเล็กน้อย (Jitter) เพื่อลดการทำงานหนักของ CPU ในเฟรมเดียวและสร้างจังหวะชีวิตที่ดูเป็นธรรมชาติ
*   **Worker-Safe Signal Architecture:** สถาปัตยกรรมที่แยก Logic การส่งสัญญาณ UI ออกจาก Core Simulation อย่างสมบูรณ์ ทำให้ Engine สามารถรันใน Web Worker ได้โดยไม่มีข้อจำกัดเรื่อง "window/DOM" และมีความเสถียรสูง
*   **Dynamic BPM Logic:** ระบบอัตราการเต้นของหัวใจที่ตอบสนองต่อทุกกิจกรรม (IDLE, HUNT, FLEE) รวมถึงแปรผันตามค่าความเครียด (Stress) และระดับฮอร์โมน Cortisol แบบ Real-time
*   **Enhanced Metabolism Engine:** การเผาผลาญพลังงานที่คำนวณจาก BMR ผสมผสานกับอัตราทางพันธุกรรมเฉพาะบุคคล และมีการสุ่ม Noise ในระดับโมเลกุลเพื่อให้ความต้องการพื้นฐาน (Hunger/Thirst) ของแต่ละคนคืบหน้าไปในทังหวะที่ต่างกัน
*   **Environmental Hazards:** ภัยธรรมชาติที่ส่งผลต่อร่างกาย เช่น ปลิงในหนองน้ำ, หินบาดบนยอดเขา, หรือแมงป่องในทะเลทราย

### 4. Cognitive & Memory System
*   **Spatial Memory (Mental Map):** ระบบจดจำพิกัดแหล่งน้ำและแหล่งอาหาร เมื่อหิวหรือกระหาย Agent จะค้นหาความจำและเดินตรงไปยังแหล่งทรัพยากรที่ใกล้ที่สุดแทนการเดินสุ่ม และสามารถ "ลืม" ได้หากทรัพยากรนั้นหมดไป
*   **Trauma Memory (PTSD):** ระบบจดจำสถานที่ที่เคยได้รับบาดเจ็บ (Danger Zones) หากเดินเข้าใกล้พื้นที่นั้�### 📊 Status Report: 2026-04-27

**โครงการ:** PANGEA_OS (Neural Command & Biosphere Control)  
**สถานะ:** Modular Brain & Sensory Upgrade DEPLOYED  
**เซกเตอร์:** Christmas Island

### 🛠 ประเด็นสำคัญและอัปเดต (Current Progress)
1.  **สถาปัตยกรรมสมอง (Brain Architecture):**
    *   **Modular Evolution:** สมองถูกแยกออกเป็น 4 โมดูลหลัก (Sensory, Homeostasis, Motivation, Motor) ทำให้การประมวลผลแรงขับภายใน (Internal Drives) และสิ่งเร้าภายนอก (External Stimuli) มีความชัดเจนและยืดหยุ่นขึ้น
    *   **Sensory Expansion:** ปรับปรุง Input Encoding สู่ระดับ 202 มิติ รองรับข้อมูล Climate Data (Temp, Humidity, Wind, Rain, Seasons) แบบละเอียด
2.  **ประสิทธิภาพและเสถียรภาพ (Performance):**
    *   **Multi-Worker Brain:** แต่ละโมดูลสมองสามารถรันแยก Worker กันได้ (Experimental) เพื่อลดคอขวดในการประมวลผลโครงข่ายขนาดใหญ่
    *   **Binary Integrity:** ระบบ NPY Loading และ Knowledge Embeddings มีความเสถียรสูง รองรับฐานข้อมูลภูมิปัญญากว่า 2,300 รายการ
3.  **นิเวศวิทยาและฟิสิกส์ (Ecology & Physics):**
    *   **Local Climate Sensing:** Agent สามารถรับรู้และตอบสนองต่ออุณหภูมิที่แตกต่างกันในแต่ละ Biome (เช่น หาที่ร่มในทะเลทราย หรือหาความอบอุ่นในป่าดิบชื้นตอนฝนตก)

### 🧠 วิเคราะห์พฤติกรรม (Agent Insights)
*   **Adam:** การแยกโมดูล Motor ทำให้จังหวะการเดินและการคราฟต์ดูมีความมั่นใจขึ้น (High Precision Activation)
*   **Eve:** แสดงการตอบสนองต่อสภาพอากาศอย่างเห็นได้ชัดผ่านโมดูล Homeostasis โดยมีการปรับระดับ Cortisol ตามความเย็นของฝน

### 🚀 แผนการดำเนินงานถัดไป (Immediate Roadmap)
*   **Reinforcement Optimization:** ปรับจูนการฝึกฝน Motor Module ผ่านรางวัลที่ซับซ้อนขึ้น (Social Collaboration Rewards)
*   **Advanced Agriculture:** เริ่มต้นระบบการเพาะปลูกที่อิงตามรอบฤดูกาลที่ Agent รับรู้ผ่าน Sensory Upgrade
เปลี่ยนตามความสัมพันธ์ (Cooperation vs. Rivalry)
*   **Emergent Labels:** ระบบป้ายกำกับสถานะ (Partner, Rival, Friend, Stranger) ที่อัปเดตตามธรรมชาติของปฏิสัมพันธ์

## 📱 Cross-Platform Responsive Interface
เดิมถูกออกแบบมาสำหรับ Desktop เท่านั้น แต่ปัจจุบัน PANGEA_OS รองรับการแสดงผลบนทุกอุปกรณ์:
*   **Adaptive Navigation:** ระบบ Sidebar สำหรับจอขนาดใหญ่ และ Bottom Navigation สำหรับมือถือ/แท็บเล็ต
*   **Telemetry Dashboard:** การแสดงผลกราฟและข้อมูล Biometric แบบ Real-time ที่ปรับขนาดตามหน้าจอ
*   **Touch Optimization:** ปุ่มและส่วนปฏิสัมพันธ์ถูกปรับให้รองรับการสัมผัส (Touch targets 44px+)
*   **Dynamic Canvas:** ระบบแผนที่ Tactical Map ปรับความละเอียดตามความหนาแน่นของพิกเซลหน้าจอ

## ⚡ Performance Optimizations
*   **Spatial Hash Grid:** ระบบแบ่งส่วนพื้นที่เพื่อการค้นหาเพื่อนบ้าน (Neighbor Discovery) ที่รวดเร็วระดับ $O(1)$ แทนการวนลูปแบบเดิม
*   **Neural Pool (Worker Offloading):** แยกการคำนวณสมอง AI (Neural Network) ออกไปรันบน Web Workers หลายตัวพร้อมกัน เพื่อประสิทธิภาพสูงสุดและไม่รบกวน Main Thread
*   **Batch Training:** ระบบฝึกฝนสมอง AI แบบกลุ่มในช่วงเริ่มต้น เพื่อความรวดเร็วในการสร้างบุคลิกภาพให้ Agent

## 💾 Database & Persistence
*   **Hybrid Storage:** ระบบบันทึกข้อมูลแบบคู่ขนานระหว่าง **LocalStorage** (Offline-first) และ **Supabase** (Cloud Persistence)
*   **Timeline History:** บันทึกทุกเหตุการณ์สำคัญลงในฐานข้อมูลเพื่อให้สามารถติดตามวิวัฒนาการย้อนหลังได้

## 🧠 Digital Life Philosophy
Adam และ Eve ไม่ใช่แค่ตัวละครในเกม แต่คือ **"Digital Embryos"** ที่มี:
*   **Autonomous Agency:** ตัดสินใจผ่านสมอง AI ของตัวเอง ไม่ใช่การเขียนคำสั่งตายตัว
*   **Biological Integrity:** มีระบบฮอร์โมน (Cortisol, Oxytocin) และการสืบพันธุ์ที่ส่งต่อพันธุกรรม (Genetics)
*   **Emergent Behavior:** พฤติกรรมที่เกิดขึ้นจากการเรียนรู้และประสบการณ์ในโลก Pangea

## 🗺️ Roadmap

**[View Detailed Architecture Review & 18-Month Plan](./docs/ARCHITECTURE_REVIEW.md)**

### Phase 1: Engine Foundation & Biological Depth (Short-term)
*   [x] **Flora & Fauna Integration:** นำเข้าฐานข้อมูลพืชและสัตว์ระดับวิทยาศาสตร์ (50+ สายพันธุ์)
*   [x] **Island Ecosystem:** ปรับขนาดโลกเป็น 50x50 Grid และสร้างระบบนิเวศแบบเกาะร้าง (Christmas Island)
*   [x] **Cognitive Memory System:** ระบบความทรงจำเชิงพื้นที่ (Spatial) และความทรงจำฝังใจ (Trauma)
*   [x] **Social & Relationship Dynamics:** ระบบความสัมพันธ์แบบ Multi-dimensional และ AI Integration
*   [x] **Biological Individualization:** ระบบพันธุกรรม (Genetics) และชีวมาตร (Biometrics/BPM) ที่แตกต่างกันในแต่ละบุคคล
*   [x] **Worker-Thread Optimization:** สถาปัตยกรรมแยกส่วนการคำนวณฟิสิกส์และ AI ออกไปรันบน Web Workers
*   [x] **Symbolic Communication:** การสื่อสารด้วยรหัสสัญญาณ (Signal Tokens) เพื่อให้ AI พัฒนาภาษาของตัวเองโดยไม่ใช้ LLM
*   [x] **Emergent Crafting System:** ระบบการคราฟต์ที่ใช้โครงข่ายประสาทเทียมและคุณสมบัติวัสดุ (Neural Backpropagation)
*   [x] **Tool Progression:** การพัฒนาเครื่องมือที่ซับซ้อนขึ้นตามระดับความรู้ (Knowledge Level) และการเพิ่มประโยชน์เชิงกล

### Phase 2: Social Evolution (Mid-term)
*   [x] **Modular Brain Architecture:** Split brain into Sensory, Homeostasis, Motivation, and Motor modules for complex agency.
*   [x] **Sensory Resolution Upgrade:** Expanded input neurons to 202D for precise climate and environmental awareness.
*   [x] **Tribe System:** The formation of tribes with shared identity, home bases, and collective knowledge.
*   [x] **Cultural Transmission:** Agents share domain knowledge with tribe members, enabling cumulative culture.
*   [x] **Social & Neural Visualization:** Advanced Social Matrix for relationships and real-time SNN spiking visualization.
*   [x] **Domesticated Animals:** Foundation for animal domestication through social interaction.
*   [x] **Advanced Agriculture:** Complex farming systems with growth stages (Seed to Mature), soil moisture absorption, and manual harvesting/planting actions.
*   [x] **Genetic Inheritance & Environmental Adaptation:** Physical and cognitive traits are passed down with mutation. Cold/Heat resistance affects resource consumption.
*   [x] **Cultural Rituals:** Community activities around campfires that boost oxytocin, reduce stress, and accelerate language learning.
*   [x] **Centralized Naming Policy:** Integrated `NamingSystem` with configurable policies (Adam/Eve vs Alpha/Beta).
*   [x] **CI/Lint Gate:** Enforced code quality with `npm run lint` integrated into the build process.

### Phase 3: Persistent World (Long-term)
*   [x] **24/7 Server-side Simulation:** Engine moved to persistent server loop (server.ts).
*   [x] **Multiplayer Observation:** Clients now observe shared global state by default.
*   [ ] **WebGPU Optimization:** (Planned) Hardware acceleration for massive neural populations.

## 🎨 Modern UI & Neural Visualization Roadmap (V3.0)

เพื่อรองรับระบบสมอง SNN และ Active Inference ที่ซับซ้อน เราจึงมีแผนอัปเกรดส่วนแสดงผลตาม Roadmap ต่อไปนี้:

### Phase 6: Neural Command & Performance - [COMPLETED]
*อัปเกรด UI สู่รูปแบบ Command Center และการจัดการข้อมูล Vector ระดับสูง*
*   [x] **Responsive UI Redesign:** ระบบ Interface แบบ Adaptive รองรับ Mobile/Tablet/Desktop
*   [x] **NPY Binary Optimization:** แก้ไขปัญหาไฟล์ NPY เสียหาย (Binary Corruption) และปรับปรุงการโหลดไฟล์ความรู้ (Embeddings 128D) ให้มีความเสถียร
*   [x] **Canvas 2D Migration (WorldMap):** เปลี่ยนระบบการวาดแผนที่จาก 2,500 DIV nodes เป็น **Single Canvas Component** ลดภาระ CPU ลง 90%
*   [x] **Neural Insight Streaming:** ระบบแสดงผลแนวคิดของ AI (Cognitive Stream) แบบ Real-time

### Phase 7: The Embodied Mind (Week 2) - [COMPLETED]
*ทำให้ผู้คน "เห็น" สิ่งที่ AI "คิด" และ "รู้สึก" ได้อย่างชัดเจน*
*   [x] **Action Queue Inspector:** แสดงลำดับความคิด (Priority Queue) พร้อมแถบ Progress และเหตุผลที่การกระทำถูกแทรกแซง (Interrupt Logic)
*   [x] **Advanced Biometric HUD:** เพิ่มกราฟ **Hormone Trend (Cortisol/Oxytocin)** เพื่อแสดงความเครียดสะสมและสายสัมพันธ์
*   [x] **SNN Brain Visualizer:** กู้คืนและปรับจูนระบบวาดนิวรอน (D3.js) ให้รองรับการทำงานของ Spiking Neural Network แบบ Real-time

### Phase 8: Emergent Systems & Social (Week 3) - [COMPLETED]
*เปิดหน้าจอสำหรับระบบที่ซับซ้อน (Crafting, Social, Nutrition)*
*   [x] **Crafting Lab Overlay:** UI สำหรับการคราฟต์ที่แสดง **Radar Chart Properties** (36 มิติ) และแถบความมั่นใจของ NN
*   [x] **Social Relationship Matrix:** ตารางความสัมพันธ์มิติสูง (Trust, Affinity, Conflict) และระบบ **Family Tree** (Force Graph)
*   [x] **Food Property Inspector:** ระบบ Hover ดูค่าสารอาหาร ความสด (Freshness) และความเป็นพิษ (Toxicity) อย่างละเอียด

### Phase 9: Legacy & History (Week 4) - [COMPLETED]
*การย้อนเวลาและบันทึกประวัติศาสตร์*
*   [x] **Timeline History Scrubber:** แถบเลื่อนเวลาสำหรับเรียกดูเหตุการณ์สำคัญในประวัติศาสตร์ (บูรณาการใน Historical Archive)
*   [x] **Memory Map Overlay:** แสดงเลเยอร์ "แผนที่ในใจ" (Spatial Memory) และจุดที่เป็น Trauma (Danger Zones) บนแผนที่โลก
*   [x] **Inter-tribal Diplomacy:** ระบบความสัมพันธ์ระหว่างเผ่า (Trust, Hostility, Alliance) และการบันทึกเหตุการณ์ทางการทูต
*   [x] **Knowledge System Consolidation:** รวมระบบความรู้ Adam & Eve เข้าสู่ NeuralKnowledgeService แบบรวมศูนย์ เพื่อประสิทธิภาพและความฉลาดสูงสุด

---

## 🚀 Recent Updates (PANGEA_OS v3.1)
*   **Knowledge Consolidation:** ลบบริการความรู้ที่ซ้ำซ้อน (KnowledgeService/Retriever) และย้ายข้อมูลทั้งหมดสู่ Neural Engine 128D
*   **Agent Logic Refinement:** ปรับปรุงสมองของ Adam และ Eve ให้ทำงานร่วมกับระบบ Spatial Mapping ได้แม่นยำยิ่งขึ้น
*   **Performance:** ปรับลดภาระการคำนวณใน Main Thread โดยการใช้ Web Workers และ Spatial Hashing ในระดับที่ลึกขึ้น

## 🛠 Technical Stack
*   **Unified Core:** TypeScript 100% (Core Logic, Simulation, AI Training) เพื่อลดความซ้ำซ้อนในการรักษา Logic
*   **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, Motion
*   **Visualization:** D3.js (Neural Network & Knowledge Graph)
*   **Backend:** Express.js, Supabase (PostgreSQL)
*   **Processing:** Dynamic Worker Pool (Web Workers) สำหรับกระจายโหลดการคำนวณ Neural Network
*   **Optimization:** Spatial Hashing สำหรับการค้นหาวัตถุในระยะประชิด

## 🚀 Getting Started
1. ติดตั้ง dependencies: `npm install`
2. รันโปรเจกต์: `npm run dev`

---
*แรงบันดาลใจจาก: [Infinite by LAMM Lab, MIT](https://github.com/lamm-mit/Infinite)*

## 🧠 Neural Knowledge Graph Integration (Neural Retrieval)

ระบบจำลอง Pangea ได้รับการอัปเกรดฐานข้อมูลความรู้ครั้งใหญ่ เพื่อให้ Agent มีความฉลาดเชิงลึก (Deep Intelligence) ดังนี้:

*   **Neural Embeddings (128D):** ข้อมูลความรู้ทั้ง 2,366 รายการถูกแปลงเป็นเวกเตอร์ฝังตัว (Embeddings) ขนาด 128 มิติ เพื่อรองรับการค้นหาเชิงความหมาย (Semantic Search) ที่รวดเร็วและแม่นยำใน Browser
*   **Dimensionality Optimization:** มีการปรับลดมิติข้อมูลจาก 512D เหลือ 128D เพื่อลดปริมาณการใช้ RAM และเพิ่มความเร็วในการคำนวณ Cosine Similarity ระหว่างความคิดของ Agent กับฐานความรู้
*   **Neural Resonance Analysis:** ในหน้า **Crafting Lab** ตอนนี้มีการทำงานของระบบ Resonance ที่จะดึงความรู้ที่เกี่ยวข้องที่สุดจากสมองมาช่วยวิเคราะห์วัตถุดิบแบบ Real-time
*   **Semantic Knowledge Search:** ผู้ใช้สามารถค้นหาความรู้ในหน้า **Logos** โดยการพิมพ์ Keyword ภาษาอังกฤษ ระบบจะใช้ Neural Search เพื่อหาข้อมูลที่เกี่ยวข้องที่สุดแม้คำจะไม่ตรงกัน 100% (Contextual Awareness)
*   **Character Dual-Base:** แยกฐานความรู้ออกเป็น 2 ชุดหลักคือ Adam's Wisdom (เน้นการล่าและการสร้าง) และ Eve's Wisdom (เน้นพืชสมุนไพรและจิตวิญญาณ) ซึ่งโหลดแยกกันแบบ Dynamic เพื่อประหยัดทรัพยากร

---

*รายงานโดย: PANGEA_OS Command Center (AIS Build Agent)*

## 🖥️ Running in Terminal (PC)

หากคุณต้องการรันโปรเจคนี้ในรูปแบบ Terminal (CLI) บนเครื่อง PC สามารถทำได้ดังนี้:

1.  **Clone โปรเจค** ลงในเครื่องของคุณ
2.  เปิด Terminal ในโฟลเดอร์โปรเจค
3.  รันคำสั่งติดตั้ง (หากยังไม่ได้ทำ):
    ```bash
    npm install
    ```
4.  รันการจำลองในรูปแบบ Terminal:
    ```bash
    npm run terminal
    ```
ระบบจะทำการประมวลผล World Step และแสดงสถานะของประชากร, อากาศ, และเวลาในรูปแบบข้อความบน Terminal โดยอัตโนมัติ (Headless Mode) ซึ่งเหมาะสำหรับการทดสอบระบบจำลองในระยะยาวโดยไม่ต้องเปิด Browser

---

