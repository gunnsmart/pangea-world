import random
import os
import json
import requests
from datetime import datetime

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

class HumanAI:
    def __init__(self, name, height, mass, partner_name):
        self.name = name
        self.partner_name = partner_name
        self.height, self.mass = height, mass
        self.birth_time = datetime.now()

        # Stats พื้นฐาน (Thermodynamics)
        self.age = 25.0
        self.health = 100.0
        self.u_energy = 850.0
        self.pos = [7, 7]
        self.bond = 10.0

        # ระบบการเรียนรู้และกระเป๋าเก็บของ
        self.inventory = []
        self.knowledge = {}  # { (item1, item2): {"name": "...", "use": "..."} }

        # 🧪 นิยามคุณสมบัติวัตถุดิบ (Physics Attributes)
        self.materials_attr = {
            "หินเหล็กไฟ": {"sharp": 15, "hard": 60, "heat": 40, "weight": 20},
            "กิ่งไม้แห้ง": {"sharp": 5,  "hard": 15, "heat": 20, "length": 50},
            "ใบไม้ใหญ่":  {"sharp": 0,  "hard": 2,  "insulation": 40, "soft": 30},
            "เถาวัลย์":   {"sharp": 0,  "hard": 10, "binding": 60, "length": 30},
            "หินคม":      {"sharp": 40, "hard": 50, "heat": 10, "weight": 15},
        }

    # ─────────────────────────────────────────────
    # 🤖 เรียก Groq API เพื่อตั้งชื่อสิ่งประดิษฐ์
    # ─────────────────────────────────────────────
    def _ask_groq(self, item1: str, item2: str, stats: dict) -> dict:
        """ส่งข้อมูลวัตถุดิบ+คุณสมบัติให้ Groq ตั้งชื่อและอธิบายการใช้งาน
        คืน dict: {"name": "...", "use": "..."}
        ถ้า API ล้มเหลวจะ fallback เป็นชื่อแบบเดิม"""

        if not GROQ_API_KEY:
            return {"name": f"{item1}+{item2}", "use": "ไม่ทราบ"}

        # สร้าง prompt ภาษาไทย
        stats_text = ", ".join(
            f"{k}: {v}" for k, v in stats.items() if v > 0
        )
        prompt = (
            f"มนุษย์ยุคหินชื่อ {self.name} นำ '{item1}' และ '{item2}' มาทดลองรวมกัน\n"
            f"คุณสมบัติที่ได้: {stats_text}\n\n"
            f"จงตอบเป็น JSON เท่านั้น (ไม่ต้องมีข้อความอื่น) ดังนี้:\n"
            f'{{ "name": "ชื่อสิ่งประดิษฐ์ภาษาไทย (1-3 คำ)", "use": "ประโยชน์หลักสั้นๆ ภาษาไทย" }}'
        )

        try:
            resp = requests.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": 80,
                },
                timeout=5,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()

            # ลบ markdown code fence ถ้ามี
            content = content.replace("```json", "").replace("```", "").strip()
            result = json.loads(content)

            # ตรวจว่ามี key ครบ
            if "name" in result and "use" in result:
                return result

        except Exception:
            pass  # fallback ด้านล่าง

        return {"name": f"{item1}+{item2}", "use": "ไม่ทราบ"}

    # ─────────────────────────────────────────────
    # 🧪 ทดลองผสมวัตถุดิบ
    # ─────────────────────────────────────────────
    def experiment(self):
        """สุ่มหยิบของมาลองผสม คืน (items, stats, invention)"""
        if len(self.inventory) < 2:
            return None, None, None

        items = random.sample(self.inventory, 2)
        attr1 = self.materials_attr.get(items[0], {"hard": 1})
        attr2 = self.materials_attr.get(items[1], {"hard": 1})

        # ผลลัพธ์รวมคุณสมบัติ (Emergent Attributes)
        stats = {
            "ความคม":       attr1.get("sharp", 0)      + attr2.get("sharp", 0),
            "ความแข็ง":     attr1.get("hard", 0)       + attr2.get("hard", 0),
            "ความร้อน":     attr1.get("heat", 0)       + attr2.get("heat", 0),
            "ความยาว/ระยะ": attr1.get("length", 0)     + attr2.get("length", 0),
            "การกันหนาว":   attr1.get("insulation", 0) + attr2.get("insulation", 0),
            "การยึดเหนี่ยว":attr1.get("binding", 0)    + attr2.get("binding", 0),
        }

        # 🤖 ให้ Groq ตั้งชื่อและอธิบาย
        invention = self._ask_groq(items[0], items[1], stats)

        # บันทึกลง knowledge
        key = tuple(sorted(items))
        self.knowledge[key] = invention

        return items, stats, invention

    # ─────────────────────────────────────────────
    # ⚙️ Physics update
    # ─────────────────────────────────────────────
    def update_physics(self, elevation, partner_pos):
        days = (datetime.now() - self.birth_time).total_seconds() / 86400
        self.age = 25.0 + (days / 365.25)
        # dU = dQ - dW
        work = 0.005 * (self.mass / 70.0) * (elevation + 1.2)
        self.u_energy -= work

        dist = abs(self.pos[0] - partner_pos[0]) + abs(self.pos[1] - partner_pos[1])
        if dist == 0:
            self.bond = min(100, self.bond + 0.03)