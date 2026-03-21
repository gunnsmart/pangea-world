import random
import os
import json
import requests
from datetime import datetime
from body import Body
from brain import Brain
from senses import VisionSystem, SoundSystem, LongTermMemory
from language import ProtoLanguage

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# ── ค่าคงที่สัญชาติญาณ ──────────────────────────────────────────────────────
HUNGER_MAX      = 100.0   # หิวเต็มที่ → ต้องกิน
BLADDER_MAX     = 100.0   # ปัสสาวะเต็ม → ต้องขับ
SLEEP_MAX       = 100.0   # ง่วงเต็ม → ต้องนอน
LIBIDO_MAX      = 100.0   # ความต้องการทางเพศ

HUNGER_RATE     = 4.0     # หิวเพิ่ม/วัน
BLADDER_RATE    = 6.0     # ปัสสาวะสะสม/วัน (กินน้ำ/กินอาหาร)
SLEEP_RATE      = 5.0     # ง่วงสะสม/วัน
LIBIDO_RATE     = 2.0     # ความต้องการสะสม/วัน

SLEEP_HOURS     = (21, 6) # นอน 21:00–06:00 ตามธรรมชาติ


class Needs:
    """ความต้องการพื้นฐาน 4 อย่างของมนุษย์"""
    def __init__(self):
        self.hunger  = 20.0   # 0=อิ่ม, 100=หิวมาก
        self.bladder = 10.0   # 0=ว่าง, 100=อั้นไม่ไหว
        self.sleepy  = 10.0   # 0=สดชื่น, 100=ง่วงมาก
        self.libido  = 5.0    # 0=ไม่สนใจ, 100=ต้องการ

    @property
    def urgent(self) -> str | None:
        """คืนความต้องการเร่งด่วนที่สุด"""
        if self.sleepy  >= 90: return "sleep"
        if self.hunger  >= 85: return "eat"
        if self.bladder >= 90: return "toilet"
        if self.libido  >= 80: return "mate"
        return None

    @property
    def status_emoji(self) -> str:
        u = self.urgent
        if u == "sleep":  return "😴 ง่วง"
        if u == "eat":    return "🍖 หิว"
        if u == "toilet": return "🚽 ปวด"
        if u == "mate":   return "💕 ต้องการ"
        return "😊 ปกติ"


class HumanAI:
    def __init__(self, name, height, mass, partner_name):
        self.name         = name
        self.partner_name = partner_name
        self.height       = height
        self.mass         = mass
        self.birth_time   = datetime.now()
        self.sex          = "M" if name == "Adam" else "F"

        # 🧬 ร่างกาย
        self.body = Body(name, self.sex, mass, height)

        # 🧠 สมอง
        self.brain = Brain(name)

        # 👁 ประสาทสัมผัส
        self.vision  = VisionSystem()
        self.hearing = SoundSystem()
        self.ltm     = LongTermMemory(capacity=500)   # long-term memory
        self.visible : list = []   # สิ่งที่เห็นตอนนี้
        self.sounds  : list = []   # เสียงที่ได้ยินตอนนี้

        # 💬 ภาษา
        self.lang    = ProtoLanguage(name)
        self.last_utterance = None   # การพูดล่าสุด

        # Stats
        self.age      = 25.0
        self.health   = 100.0
        self.u_energy = 850.0
        self.pos      = [25, 25]   # กลางแผนที่ 50×50
        self.bond     = 10.0
        self.sleeping = False

        # 🧠 สัญชาติญาณพื้นฐาน
        self.needs = Needs()

        # ประวัติการกระทำ (ใช้แสดงใน UI)
        self.current_action = "🚶 เดินสำรวจ"

        # inventory & knowledge
        self.inventory = []
        self.knowledge = {}

        # วัตถุดิบ
        self.materials_attr = {
            "หินเหล็กไฟ": {"sharp": 15, "hard": 60, "heat": 40, "weight": 20},
            "กิ่งไม้แห้ง": {"sharp": 5,  "hard": 15, "heat": 20, "length": 50},
            "ใบไม้ใหญ่":  {"sharp": 0,  "hard": 2,  "insulation": 40, "soft": 30},
            "เถาวัลย์":   {"sharp": 0,  "hard": 10, "binding": 60, "length": 30},
            "หินคม":      {"sharp": 40, "hard": 50, "heat": 10, "weight": 15},
        }

    # ────────────────────────────────────────────────────────────────
    # 🧬 สัญชาติญาณ — อัปเดตทุกวัน
    # ────────────────────────────────────────────────────────────────
    def update_needs(self, hour: int, partner: "HumanAI | None" = None,
                     has_food: bool = True) -> list[str]:
        """
        อัปเดตความต้องการตามเวลา คืน list ของ event strings
        """
        events = []
        n = self.needs

        # ── สะสมความต้องการตามธรรมชาติ ──
        n.hunger  = min(HUNGER_MAX,  n.hunger  + HUNGER_RATE)
        n.bladder = min(BLADDER_MAX, n.bladder + BLADDER_RATE)
        n.sleepy  = min(SLEEP_MAX,   n.sleepy  + SLEEP_RATE)
        n.libido  = min(LIBIDO_MAX,  n.libido  + LIBIDO_RATE)

        # ── ตรวจเวลานอน (21:00–06:00) ──
        is_sleep_time = hour >= 21 or hour < 6
        if is_sleep_time and n.sleepy >= 60:
            self._do_sleep(events)
        elif not is_sleep_time and self.sleeping:
            self._wake_up(events)

        if self.sleeping:
            return events   # หลับอยู่ → ไม่ทำอย่างอื่น

        # ── ตัดสินใจตามสัญชาติญาณ (priority) ──
        urgent = n.urgent
        if urgent == "eat":
            self._do_eat(has_food, events)
        elif urgent == "toilet":
            self._do_toilet(events)
        elif urgent == "mate" and partner is not None:
            self._do_mate(partner, events)
        else:
            self.current_action = "🚶 เดินสำรวจ"

        # ── สุขภาพเสื่อมถ้าหิวนาน ──
        if n.hunger >= HUNGER_MAX:
            self.health = max(0, self.health - 5.0)
            events.append(f"⚠️ {self.name} หิวโหยมาก สุขภาพลด!")

        return events

    # ── กิน ─────────────────────────────────────────────────────────
    def _do_eat(self, has_food: bool, events: list):
        if has_food:
            self.needs.hunger  = max(0, self.needs.hunger  - 60)
            self.needs.bladder = min(BLADDER_MAX, self.needs.bladder + 15)  # กินแล้วปวดปัสสาวะ
            self.u_energy      = min(1000, self.u_energy + 120)
            self.current_action = "🍖 กำลังกิน"
            events.append(f"🍖 {self.name} กินอาหารแล้ว")
        else:
            self.current_action = "😰 หาอาหารไม่ได้"
            events.append(f"😰 {self.name} หาอาหารไม่ได้!")

    # ── ขับถ่าย ──────────────────────────────────────────────────────
    def _do_toilet(self, events: list):
        self.needs.bladder  = max(0, self.needs.bladder - 80)
        self.current_action = "🚽 ขับถ่าย"
        events.append(f"🚽 {self.name} ขับถ่าย")

    # ── นอน ──────────────────────────────────────────────────────────
    def _do_sleep(self, events: list):
        if not self.sleeping:
            self.sleeping       = True
            self.current_action = "😴 กำลังนอนหลับ"
            events.append(f"😴 {self.name} เข้านอน")
        # ฟื้นฟูขณะหลับ
        self.needs.sleepy  = max(0, self.needs.sleepy - 12)
        self.needs.hunger  = min(HUNGER_MAX, self.needs.hunger + 1.5)   # หิวช้าขึ้นขณะหลับ
        self.u_energy      = min(1000, self.u_energy + 30)

    def _wake_up(self, events: list):
        self.sleeping       = False
        self.needs.sleepy   = max(0, self.needs.sleepy - 40)  # ตื่นมาสดชื่น
        self.current_action = "🌅 ตื่นนอน"
        events.append(f"🌅 {self.name} ตื่นนอน")

    # ── สืบพันธุ์ ────────────────────────────────────────────────────
    def _do_mate(self, partner: "HumanAI", events: list):
        dist = abs(self.pos[0] - partner.pos[0]) + abs(self.pos[1] - partner.pos[1])
        if dist > 3:
            # ต้องอยู่ใกล้กัน — เดินหาก่อน
            self.current_action = f"💕 เดินหา {partner.name}"
            return

        if partner.needs.libido >= 50 and not partner.sleeping:
            # ทั้งคู่พร้อม
            self.needs.libido   = max(0, self.needs.libido   - 70)
            partner.needs.libido = max(0, partner.needs.libido - 70)
            self.bond           = min(100, self.bond + 5)
            partner.bond        = min(100, partner.bond + 5)
            self.current_action = f"💕 อยู่กับ {partner.name}"
            events.append(f"💕 {self.name} และ {partner.name} อยู่ด้วยกัน (bond +5)")
        else:
            self.current_action = f"💭 รอ {partner.name}"

    # ────────────────────────────────────────────────────────────────
    # 🤖 Groq API
    # ────────────────────────────────────────────────────────────────
    def _ask_groq(self, item1: str, item2: str, stats: dict) -> dict:
        if not GROQ_API_KEY:
            return {"name": f"{item1}+{item2}", "use": "ไม่ทราบ"}
        stats_text = ", ".join(f"{k}: {v}" for k, v in stats.items() if v > 0)
        prompt = (
            f"มนุษย์ยุคหินชื่อ {self.name} นำ '{item1}' และ '{item2}' มาทดลองรวมกัน\n"
            f"คุณสมบัติที่ได้: {stats_text}\n\n"
            f"จงตอบเป็น JSON เท่านั้น:\n"
            f'{{ "name": "ชื่อสิ่งประดิษฐ์ภาษาไทย (1-3 คำ)", "use": "ประโยชน์หลักสั้นๆ ภาษาไทย" }}'
        )
        try:
            resp = requests.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": "llama3-8b-8192", "messages": [{"role": "user", "content": prompt}],
                      "temperature": 0.7, "max_tokens": 80},
                timeout=5,
            )
            resp.raise_for_status()
            txt = resp.json()["choices"][0]["message"]["content"].strip()
            txt = txt.replace("```json", "").replace("```", "").strip()
            result = json.loads(txt)
            if "name" in result and "use" in result:
                return result
        except Exception:
            pass
        return {"name": f"{item1}+{item2}", "use": "ไม่ทราบ"}

    # ────────────────────────────────────────────────────────────────
    # 🧪 ทดลองผสมวัตถุดิบ (เฉพาะเมื่อตื่น & ไม่เร่งด่วน)
    # ────────────────────────────────────────────────────────────────
    def experiment(self):
        if self.sleeping or self.needs.urgent in ("eat", "toilet"):
            return None, None, None
        if len(self.inventory) < 2:
            return None, None, None

        items = random.sample(self.inventory, 2)
        attr1 = self.materials_attr.get(items[0], {"hard": 1})
        attr2 = self.materials_attr.get(items[1], {"hard": 1})
        stats = {
            "ความคม":        attr1.get("sharp", 0)      + attr2.get("sharp", 0),
            "ความแข็ง":      attr1.get("hard", 0)       + attr2.get("hard", 0),
            "ความร้อน":      attr1.get("heat", 0)       + attr2.get("heat", 0),
            "ความยาว/ระยะ":  attr1.get("length", 0)     + attr2.get("length", 0),
            "การกันหนาว":    attr1.get("insulation", 0) + attr2.get("insulation", 0),
            "การยึดเหนี่ยว": attr1.get("binding", 0)    + attr2.get("binding", 0),
        }
        invention = self._ask_groq(items[0], items[1], stats)
        key = tuple(sorted(items))
        self.knowledge[key] = invention
        return items, stats, invention

    # ────────────────────────────────────────────────────────────────
    # ⚙️ Physics update
    # ────────────────────────────────────────────────────────────────
    def update_physics(self, elevation: int, partner_pos: list):
        days = (datetime.now() - self.birth_time).total_seconds() / 86400
        self.age = 25.0 + (days / 365.25)
        if not self.sleeping:
            work = 0.005 * (self.mass / 70.0) * (elevation + 1.2)
            self.u_energy -= work
        dist = abs(self.pos[0] - partner_pos[0]) + abs(self.pos[1] - partner_pos[1])
        if dist == 0:
            self.bond = min(100, self.bond + 0.03)

    # ────────────────────────────────────────────────────────────────
    # 📊 สรุปสถานะ
    # ────────────────────────────────────────────────────────────────
    @property
    def status_bar(self) -> str:
        n = self.needs
        return (f"{'😴' if self.sleeping else '🧍'} {self.name} | "
                f"🍖{n.hunger:.0f} 🚽{n.bladder:.0f} "
                f"💤{n.sleepy:.0f} 💕{n.libido:.0f} | "
                f"{self.current_action}")
