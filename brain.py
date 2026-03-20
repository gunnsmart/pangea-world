"""
brain.py — Pure Autonomous Brain
══════════════════════════════════════════════════════════════════
ไม่มี script ไม่มี if/elif priority ไม่มีใครบอกว่าต้องทำอะไร

กลไกเดียวที่ขับเคลื่อนทุกอย่าง:
  Pain   → signal ลบ → action ที่ทำให้เจ็บปวดถูกหลีกเลี่ยง
  Pleasure → signal บวก → action ที่ให้ความพึงพอใจถูกทำซ้ำ

Architecture:
  1. Drive        — ความต้องการดิบ (hunger, pain, fear, curiosity...)
  2. Signal       — Pain/Pleasure ที่ร่างกายส่งมาทุกวัน
  3. Weight Table — ตารางความน่าจะเป็นของแต่ละ action (เรียนรู้ได้)
  4. Context      — สถานการณ์ปัจจุบัน (กลางคืน, หิว, เห็นไฟ...)
  5. Softmax      — เลือก action จาก weighted probability
  6. Outcome      — ผลลัพธ์จริง → อัปเดต weight (Hebbian learning)
  7. Inheritance  — ลูกได้รับ weight เฉลี่ยจากพ่อแม่
  8. Emotion      — อารมณ์ปัจจุบัน กระทบ signal ทุกอย่าง
"""

import math
import random
from dataclasses import dataclass, field
from typing import Optional

# ── Actions ทั้งหมดที่เป็นไปได้ ───────────────────────────────────────────
ACTIONS = [
    "eat_raw",       # กินดิบ — ได้พลังงาน แต่อาจท้องเสีย
    "eat_cooked",    # กินสุก — ได้พลังงานมาก ปลอดภัย
    "drink",         # ดื่มน้ำ
    "toilet",        # ขับถ่าย
    "sleep",         # นอนหลับ
    "seek_food",     # เดินหาอาหาร
    "seek_water",    # เดินหาน้ำ
    "seek_partner",  # เดินหาคู่
    "seek_fire",     # เดินหาไฟ
    "mate",          # สืบพันธุ์
    "start_fire",    # จุดไฟ
    "cook",          # ปรุงอาหาร
    "tend_fire",     # ดูแลไฟ
    "gather",        # เก็บวัตถุดิบ
    "craft",         # ทดลองสร้างของ
    "rest",          # พักผ่อนไม่นอน
    "explore",       # สำรวจที่ใหม่
    "flee",          # หนีอันตราย
    "teach",         # สอนลูก (ถ้ามีลูกอยู่ใกล้)
]

# ── Pain/Pleasure signals ──────────────────────────────────────────────────
# แต่ละ drive เมื่อสูงจะส่ง pain signal → กด weight ของ action ที่แก้ไขได้
DRIVE_TO_RELIEF = {
    # drive_name : [actions ที่ช่วยบรรเทา]
    "hunger":    ["eat_raw", "eat_cooked", "seek_food", "cook"],
    "thirst":    ["drink", "seek_water"],
    "bladder":   ["toilet"],
    "tired":     ["sleep", "rest"],
    "lonely":    ["seek_partner", "mate"],
    "cold":      ["seek_fire", "start_fire", "tend_fire"],
    "fear":      ["flee", "seek_fire"],
    "bored":     ["explore", "gather", "craft"],
    "curious":   ["explore", "craft", "gather"],
}

# Learning rate
LR          = 0.15
DECAY       = 0.001   # weight decay ต่อวัน — ลืมสิ่งที่ไม่ได้ทำนานๆ
MIN_WEIGHT  = 0.05
MAX_WEIGHT  = 10.0


# ════════════════════════════════════════════════════════
# EMOTION — อารมณ์กระทบ signal
# ════════════════════════════════════════════════════════
@dataclass
class Emotion:
    """
    อารมณ์ 4 มิติ — เปลี่ยนตามเหตุการณ์
    ส่งผล multiplier ต่อ pain/pleasure signal
    """
    valence:  float = 0.0   # -1=เศร้า/กลัว, +1=สุขใจ
    arousal:  float = 0.3   # 0=เฉื่อย, 1=ตื่นตัว
    trust:    float = 0.5   # 0=ไม่ไว้วางใจ, 1=ไว้วางใจ
    dominance:float = 0.5   # 0=รู้สึกด้อย, 1=มั่นใจ

    def update(self, event: str, magnitude: float = 0.1):
        if event == "ate_well":
            self.valence  = min(1, self.valence  + magnitude)
            self.arousal  = min(1, self.arousal  + magnitude * 0.5)
        elif event == "hungry_bad":
            self.valence  = max(-1, self.valence - magnitude)
            self.arousal  = max(0,  self.arousal - magnitude * 0.3)
        elif event == "danger":
            self.valence  = max(-1, self.valence - magnitude * 2)
            self.arousal  = min(1,  self.arousal + magnitude * 2)
            self.dominance= max(0,  self.dominance - magnitude)
        elif event == "fire_lit":
            self.valence  = min(1,  self.valence  + magnitude * 1.5)
            self.dominance= min(1,  self.dominance+ magnitude)
        elif event == "mated":
            self.valence  = min(1,  self.valence  + magnitude * 2)
            self.trust    = min(1,  self.trust    + magnitude)
        elif event == "partner_near":
            self.valence  = min(1,  self.valence  + magnitude * 0.5)
            self.trust    = min(1,  self.trust    + magnitude * 0.3)
        elif event == "alone":
            self.valence  = max(-1, self.valence  - magnitude * 0.3)
        elif event == "disaster":
            self.valence  = max(-1, self.valence  - magnitude * 3)
            self.arousal  = min(1,  self.arousal  + magnitude * 2)

        # decay toward neutral
        self.valence   *= 0.98
        self.arousal    = 0.3 + (self.arousal - 0.3) * 0.97
        self.trust     *= 0.999
        self.dominance  = 0.5 + (self.dominance - 0.5) * 0.99

    @property
    def pleasure_multiplier(self) -> float:
        """อารมณ์ดี → pleasure รู้สึกมากขึ้น"""
        return 1.0 + self.valence * 0.3

    @property
    def pain_multiplier(self) -> float:
        """กลัว/เศร้า → pain รู้สึกหนักขึ้น"""
        return 1.0 + (-self.valence) * 0.3 + self.arousal * 0.2

    @property
    def label(self) -> str:
        if self.valence > 0.5:   return "😊 มีความสุข"
        if self.valence > 0.2:   return "🙂 สบายดี"
        if self.valence > -0.2:  return "😐 เฉยๆ"
        if self.valence > -0.5:  return "😟 กังวล"
        return "😰 กลัว/เศร้า"


# ════════════════════════════════════════════════════════
# MEMORY — ความทรงจำแบบ episodic
# ════════════════════════════════════════════════════════
@dataclass
class Episode:
    """เหตุการณ์ที่จำได้ 1 ครั้ง"""
    day:      int
    action:   str
    context:  str     # สถานการณ์ตอนนั้น (เช่น "night+hungry")
    outcome:  float   # pain(-) หรือ pleasure(+)
    learned:  bool = False


class EpisodicMemory:
    """
    ความทรงจำแบบ episodic — จำเหตุการณ์และผลลัพธ์
    ใช้ context matching เพื่อดึง memory ที่เกี่ยวข้อง
    """
    def __init__(self, capacity: int = 100):
        self.episodes: list[Episode] = []
        self.capacity = capacity

    def store(self, day: int, action: str, context: str, outcome: float):
        ep = Episode(day, action, context, outcome)
        self.episodes.append(ep)
        if len(self.episodes) > self.capacity:
            self.episodes.pop(0)

    def recall(self, context: str, action: str) -> float:
        """
        ดึง average outcome ของ action นี้ใน context คล้ายกัน
        คืน 0.0 ถ้าไม่มี memory
        """
        relevant = [
            e.outcome for e in self.episodes
            if e.action == action and self._context_match(e.context, context)
        ]
        if not relevant:
            return 0.0
        # ให้น้ำหนัก memory ใหม่มากกว่า (recency bias)
        weights = [1.0 + i * 0.1 for i in range(len(relevant))]
        return sum(o*w for o,w in zip(relevant, weights)) / sum(weights)

    def _context_match(self, stored: str, current: str) -> bool:
        """context ตรงกันถ้ามี keyword ร่วมกัน ≥ 1"""
        s_keys = set(stored.split("+"))
        c_keys = set(current.split("+"))
        return len(s_keys & c_keys) >= 1

    @property
    def size(self) -> int:
        return len(self.episodes)


# ════════════════════════════════════════════════════════
# DRIVE — ความต้องการดิบ (ไม่ใช่ Needs จาก human_ai)
# ════════════════════════════════════════════════════════
class DriveSystem:
    """
    ความต้องการดิบที่ร่างกายส่งมา
    แต่ละ drive สร้าง pain signal เมื่อสูง
    signal จะไป boost weight ของ action ที่แก้ได้
    """
    def __init__(self):
        self.hunger   : float = 20.0
        self.thirst   : float = 15.0
        self.bladder  : float = 10.0
        self.tired    : float = 10.0
        self.lonely   : float = 5.0
        self.cold     : float = 0.0
        self.fear     : float = 0.0
        self.bored    : float = 30.0   # เบื่อเริ่มต้นสูง → อยากสำรวจ
        self.curious  : float = 50.0   # ความอยากรู้สูงแต่แรก

    def step(self, temp_c: float, hour: int,
             partner_dist: int, danger: bool) -> dict[str, float]:
        """
        อัปเดต drive ทุกวัน คืน pain_signals
        """
        # สะสมตามธรรมชาติ
        self.hunger  = min(100, self.hunger  + 4.0)
        self.thirst  = min(100, self.thirst  + 5.0)
        self.bladder = min(100, self.bladder + 5.0)
        self.tired   = min(100, self.tired   + 4.0 if (hour>=6 and hour<21) else self.tired + 6.0)
        self.bored   = min(100, self.bored   + 1.0)
        self.curious = min(100, self.curious + 0.5)

        # cold จากอุณหภูมิ
        if temp_c < 20:
            self.cold = min(100, self.cold + (20 - temp_c) * 0.5)
        else:
            self.cold = max(0, self.cold - 3)

        # lonely จากระยะห่าง partner
        if partner_dist > 10:
            self.lonely = min(100, self.lonely + 2.0)
        else:
            self.lonely = max(0, self.lonely - 1.0)

        # fear จากอันตราย
        if danger:
            self.fear = min(100, self.fear + 30)
        else:
            self.fear = max(0, self.fear - 5)

        # คำนวณ pain signals (0–1 scale)
        return {
            "hunger":  self.hunger  / 100,
            "thirst":  self.thirst  / 100,
            "bladder": self.bladder / 100,
            "tired":   self.tired   / 100,
            "lonely":  self.lonely  / 100,
            "cold":    self.cold    / 100,
            "fear":    self.fear    / 100,
            "bored":   self.bored   / 100,
            "curious": self.curious / 100,
        }

    def urgency(self) -> float:
        """ระดับความเร่งด่วนรวม — สูง = ต้องทำอะไรทันที"""
        return max(self.hunger, self.thirst, self.bladder,
                   self.tired, self.cold, self.fear) / 100

    def relieve(self, drive: str, amount: float):
        """บรรเทา drive หลัง action สำเร็จ"""
        current = getattr(self, drive, 0)
        setattr(self, drive, max(0, current - amount))

    @property
    def dominant_pain(self) -> tuple[str, float]:
        """drive ที่เจ็บปวดมากที่สุดตอนนี้"""
        drives = {
            "hunger": self.hunger, "thirst": self.thirst,
            "bladder": self.bladder, "tired": self.tired,
            "cold": self.cold, "fear": self.fear,
            "lonely": self.lonely,
        }
        worst = max(drives, key=drives.get)
        return worst, drives[worst]


# ════════════════════════════════════════════════════════
# PURE AUTONOMOUS BRAIN
# ════════════════════════════════════════════════════════
class Brain:
    """
    Pure autonomous brain — ไม่มี script ไม่มี hardcoded priority
    ทุกการตัดสินใจมาจาก:
      pain_signal × memory_recall → weight → softmax → action
    """

    def __init__(self, name: str, inherited_weights: dict = None):
        self.name = name
        self.day  = 0

        # ── Weight table — เรียนรู้ได้ ──────────────────────────
        if inherited_weights:
            # รับมรดกจากพ่อแม่ + noise เล็กน้อย (genetic variation)
            self.weights = {
                a: max(MIN_WEIGHT, min(MAX_WEIGHT,
                       inherited_weights.get(a, 1.0) + random.gauss(0, 0.1)))
                for a in ACTIONS
            }
        else:
            # เริ่มต้นเท่ากันหมด — ไม่รู้อะไรเลย
            self.weights = {a: 1.0 for a in ACTIONS}

        # ── Systems ──────────────────────────────────────────────
        self.drives  = DriveSystem()
        self.emotion = Emotion()
        self.memory  = EpisodicMemory(capacity=200)

        # ── State ────────────────────────────────────────────────
        self.current_action  : str   = "explore"
        self.current_context : str   = ""
        self.last_pain       : float = 0.0
        self.action_log      : list  = []
        self.skill           : dict  = {
            "fire": 0.0, "cook": 0.0, "craft": 0.0,
            "hunt": 0.0, "gather": 0.0,
        }
        self.knows           : set   = set()  # สิ่งที่ค้นพบแล้ว

    # ════════════════════════════════════════════════════════
    # STEP — เรียกทุกวัน
    # ════════════════════════════════════════════════════════
    def step(self, perception: dict) -> str:
        """
        perception = dict จาก app.py:
          temp_c, hour, partner_dist, danger, has_food,
          has_water, has_fire, biome_food, is_night,
          has_cooked_food, inventory
        คืน action ที่เลือก
        """
        self.day += 1

        # ── 1. Drive step → pain signals ─────────────────────
        pain = self.drives.step(
            temp_c      = perception.get("temp_c", 28),
            hour        = perception.get("hour", 12),
            partner_dist= perception.get("partner_dist", 99),
            danger      = perception.get("danger", False),
        )

        # ── 2. Emotion update ────────────────────────────────
        if perception.get("partner_dist", 99) <= 3:
            self.emotion.update("partner_near", 0.05)
        elif perception.get("partner_dist", 99) > 15:
            self.emotion.update("alone", 0.02)
        if perception.get("danger"):
            self.emotion.update("danger", 0.2)

        # ── 3. Context string ────────────────────────────────
        ctx_parts = []
        if pain["hunger"] > 0.5:    ctx_parts.append("hungry")
        if pain["tired"]  > 0.6:    ctx_parts.append("tired")
        if pain["cold"]   > 0.3:    ctx_parts.append("cold")
        if pain["fear"]   > 0.2:    ctx_parts.append("danger")
        if perception.get("is_night"): ctx_parts.append("night")
        if perception.get("has_fire"): ctx_parts.append("fire_near")
        if perception.get("has_food"): ctx_parts.append("food_near")
        self.current_context = "+".join(ctx_parts) if ctx_parts else "normal"

        # ── 4. Compute action scores ──────────────────────────
        scores = self._compute_scores(pain, perception)

        # ── 5. Softmax → sample action ────────────────────────
        action = self._softmax_sample(scores)
        self.current_action = action

        # ── 6. Weight decay (ลืมสิ่งที่ไม่ได้ทำ) ──────────────
        for a in ACTIONS:
            if a != action:
                self.weights[a] = max(MIN_WEIGHT, self.weights[a] - DECAY)

        return action

    # ── คำนวณ score แต่ละ action ────────────────────────────
    def _compute_scores(self, pain: dict, perc: dict) -> dict[str, float]:
        scores = {}
        inv    = perc.get("inventory", [])

        partner_hungry = perc.get("partner_hungry", False)
        partner_dist   = perc.get("partner_dist", 99)

        for action in ACTIONS:
            # Base: weight ที่เรียนรู้มา
            w = self.weights[action]

            # Pain boost: drive สูง → boost action ที่ช่วยได้
            pain_boost = 0.0
            for drive, actions in DRIVE_TO_RELIEF.items():
                if action in actions:
                    pain_boost += pain.get(drive, 0) ** 2 * 3.0
            pain_boost *= self.emotion.pain_multiplier

            # Memory recall: เคยทำแล้วได้ผลแค่ไหน
            mem_score = self.memory.recall(self.current_context, action)
            mem_bonus = mem_score * self.emotion.pleasure_multiplier

            # ── Cooperation signal ──────────────────────────────
            # ถ้า partner หิวและอยู่ใกล้ → ลด score ของการ compete อาหาร
            # แทนที่จะแย่งกัน สมองเริ่มเรียนรู้ว่า "แบ่งกัน" ดีกว่า
            if partner_hungry and partner_dist <= 5 and action in ("eat_raw","seek_food"):
                # ลด 30% เพื่อให้ seek_partner / tend_fire / gather มีโอกาสชนะ
                w *= 0.7

            # ถ้า trust สูง (bond ดี) → boost seek_partner เมื่อ partner เป็นทุกข์
            if partner_hungry and partner_dist > 5 and action == "seek_partner":
                w *= 1.5

            # Feasibility: ทำได้ไหมตอนนี้
            feasible = self._is_feasible(action, perc, inv, pain)
            if not feasible:
                scores[action] = 0.001
                continue

            scores[action] = max(0.001, w + pain_boost + mem_bonus)

        return scores

    # ── Softmax sampling ──────────────────────────────────────
    def _softmax_sample(self, scores: dict, temperature: float = 1.2) -> str:
        """
        temperature สูง = สุ่มมากขึ้น (exploration)
        temperature ต่ำ = เลือก best (exploitation)
        ปรับ temperature ตาม curiosity drive
        """
        # ยิ่ง bored/curious มาก ยิ่ง explore มาก
        t = temperature + self.drives.curious * 0.01

        vals  = list(scores.values())
        keys  = list(scores.keys())
        exp_v = [math.exp(v / t) for v in vals]
        total = sum(exp_v)
        probs = [e / total for e in exp_v]

        # weighted random sample
        r = random.random()
        cumsum = 0
        for action, prob in zip(keys, probs):
            cumsum += prob
            if r <= cumsum:
                return action
        return keys[-1]

    # ── Feasibility check ────────────────────────────────────
    def _is_feasible(self, action: str, perc: dict,
                     inv: list, pain: dict) -> bool:
        """ทำ action นี้ได้ไหมตอนนี้"""
        if action == "sleep":
            return pain.get("tired", 0) > 0.3 or perc.get("is_night", False)
        if action == "eat_raw":
            return perc.get("has_food", False) or perc.get("biome_food", 0) > 20
        if action == "eat_cooked":
            return perc.get("has_cooked_food", False)
        if action == "drink":
            return perc.get("has_water", False)
        if action == "start_fire":
            return ("หินเหล็กไฟ" in inv and "กิ่งไม้แห้ง" in inv
                    and not perc.get("has_fire", False))
        if action == "cook":
            return perc.get("has_fire", False)
        if action == "tend_fire":
            return perc.get("has_fire", False) and "กิ่งไม้แห้ง" in inv
        if action == "craft":
            return len(inv) >= 2
        if action == "mate":
            return (perc.get("partner_dist", 99) <= 3
                    and not perc.get("partner_sleeping", True))
        if action == "seek_partner":
            return perc.get("partner_dist", 0) > 3
        if action == "flee":
            return perc.get("danger", False)
        if action == "teach":
            return perc.get("has_child_nearby", False) and len(self.knows) > 0
        return True  # explore, gather, rest, seek_food/water/fire

    # ════════════════════════════════════════════════════════
    # LEARN — เรียนรู้จาก outcome จริง
    # ════════════════════════════════════════════════════════
    def learn(self, action: str, outcome: float, detail: str = ""):
        """
        outcome: +บวก = ความพึงพอใจ, -ลบ = ความเจ็บปวด
        ไม่มี script ว่าอะไรดีอะไรแย่ — รู้จาก outcome จริงเท่านั้น
        """
        # อัปเดต weight
        self.weights[action] = max(MIN_WEIGHT, min(MAX_WEIGHT,
            self.weights[action] + LR * outcome * self.emotion.pain_multiplier
        ))

        # บันทึก memory
        self.memory.store(self.day, action, self.current_context, outcome)

        # อัปเดตอารมณ์
        if outcome > 0.5:
            self.emotion.update("ate_well" if "eat" in action else "fire_lit", outcome * 0.1)
        elif outcome < -0.3:
            self.emotion.update("hungry_bad", abs(outcome) * 0.1)

        # Skill growth จาก repetition
        skill_map = {
            "start_fire": "fire", "tend_fire": "fire", "cook": "cook",
            "craft": "craft", "seek_food": "hunt", "gather": "gather",
        }
        if action in skill_map and outcome > 0:
            sk = skill_map[action]
            self.skill[sk] = min(100, self.skill[sk] + outcome * 2)

        # Unlock knowledge
        if action == "start_fire"  and outcome > 0: self.knows.add("fire")
        if action == "cook"        and outcome > 0: self.knows.add("cooking")
        if action == "craft"       and outcome > 0: self.knows.add("crafting")
        if action == "eat_cooked"  and outcome > 0: self.knows.add("cooked_is_better")

        # Log
        icon = "✅" if outcome > 0 else ("❌" if outcome < 0 else "➡️")
        entry = f"Day {self.day}: {icon} {action}({outcome:+.1f}) [{self.current_context}]"
        self.action_log.append(entry)
        if len(self.action_log) > 30:
            self.action_log.pop(0)

    # ════════════════════════════════════════════════════════
    # PAIN / PLEASURE — ร่างกายส่ง signal มา
    # ════════════════════════════════════════════════════════
    def receive_pain(self, source: str, intensity: float):
        """
        ร่างกายส่ง pain signal — เจ็บจริง เรียนรู้จริง
        intensity: 0.1=เจ็บนิด, 1.0=เจ็บมาก, 2.0=เจ็บสุด
        """
        # บันทึก memory ว่า action นี้ทำให้เจ็บ
        self.learn(self.current_action, -intensity, f"pain:{source}")

        # pain ส่งผลต่อ drive โดยตรง — ไม่ใช่แค่ weight
        if source == "hunger":
            self.drives.hunger  = min(100, self.drives.hunger  + intensity * 15)
            self.emotion.update("hungry_bad", intensity * 0.2)
        elif source == "cold":
            self.drives.cold    = min(100, self.drives.cold    + intensity * 20)
        elif source in ("injury", "disease"):
            self.drives.fear    = min(100, self.drives.fear    + intensity * 25)
            self.emotion.update("danger", intensity * 0.3)
        elif source == "hunt_fail":
            self.drives.hunger  = min(100, self.drives.hunger  + intensity * 5)
        elif source == "no_tool":
            # ไม่มีเครื่องมือ → อยากไป gather
            self.drives.bored   = min(100, self.drives.bored   + intensity * 10)
        elif source == "failure":
            self.emotion.update("hungry_bad", intensity * 0.1)

        # pain สะสม → cortisol สูง → เครียด
        self.last_pain = max(self.last_pain, intensity)

    def receive_pleasure(self, source: str, intensity: float):
        """
        ร่างกายส่ง pleasure — สมองบันทึกว่า action ล่าสุดให้ผลดี
        """
        self.learn(self.current_action, +intensity, f"pleasure:{source}")
        drive_map = {
            "food": "hunger", "water": "thirst",
            "warmth": "cold", "rest": "tired",
        }
        if source in drive_map:
            self.drives.relieve(drive_map[source], intensity * 30)
        # bored/curious ลดเมื่อได้ทำอะไรสำเร็จ
        self.drives.bored   = max(0, self.drives.bored   - intensity * 10)
        self.drives.curious = max(0, self.drives.curious - intensity * 5)

    # ════════════════════════════════════════════════════════
    # INHERITANCE — ถ่ายทอดให้ลูก
    # ════════════════════════════════════════════════════════
    def get_heritable_weights(self) -> dict:
        """คืน weights สำหรับถ่ายทอดให้ลูก"""
        return dict(self.weights)

    def teach_child(self, child_brain: "Brain", topic: str = None):
        """
        สอนลูก — ถ่ายทอด knowledge และ boost weights ที่เกี่ยวข้อง
        ลูกเรียนรู้เร็วกว่าคนแปลกหน้า (social learning)
        """
        # ถ่ายทอด knows
        child_brain.knows.update(self.knows)

        # Boost weights ที่พ่อแม่รู้ดี
        for action, w in self.weights.items():
            if w > 2.0:   # action ที่พ่อแม่ชำนาญ
                child_brain.weights[action] = max(
                    child_brain.weights[action],
                    w * 0.6  # ลูกได้ 60% ของพ่อแม่
                )

        # ถ่าย memories บางส่วน (oral tradition)
        for ep in self.memory.episodes[-20:]:
            if ep.outcome > 0.5:   # ถ่ายเฉพาะ memory ดีๆ
                child_brain.memory.store(
                    child_brain.day, ep.action,
                    ep.context, ep.outcome * 0.7
                )

        child_brain.emotion.update("partner_near", 0.1)  # รู้สึกปลอดภัย

    # ════════════════════════════════════════════════════════
    # SUMMARY
    # ════════════════════════════════════════════════════════
    @property
    def top_weights(self) -> list[tuple[str, float]]:
        return sorted(self.weights.items(), key=lambda x: x[1], reverse=True)[:5]

    @property
    def summary(self) -> dict:
        dominant, level = self.drives.dominant_pain
        return {
            "action":      self.current_action,
            "emotion":     self.emotion.label,
            "dominant_pain": f"{dominant}({level:.0f})",
            "knows":       list(self.knows),
            "skill_fire":  round(self.skill["fire"],  1),
            "skill_cook":  round(self.skill["cook"],  1),
            "skill_craft": round(self.skill["craft"], 1),
            "top_weights": self.top_weights,
            "memories":    self.memory.size,
            "recent_log":  self.action_log[-5:],
            "valence":     round(self.emotion.valence,  2),
            "arousal":     round(self.emotion.arousal,  2),
        }
