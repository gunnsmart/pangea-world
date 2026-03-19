"""
brain.py — ระบบสมองและการเรียนรู้ของ Adam/Eve
════════════════════════════════════════════════
Architecture:
  1. Perception  — รับรู้สิ่งแวดล้อมรอบตัว
  2. Needs       — ประเมินความต้องการเร่งด่วน
  3. Memory      — จดจำสิ่งที่เคยทำแล้วได้ผล
  4. Decision    — เลือก action ที่ดีที่สุด (utility-based)
  5. Learning    — เพิ่ม weight ของ action ที่ได้ผล (reinforcement)
  6. Execute     — ส่งคำสั่งกลับไปให้ app.py

ไม่ใช้ ML library — ใช้ utility function + memory weight ล้วนๆ
"""

import random
import math
from dataclasses import dataclass, field
from typing import Optional

# ── Action ที่ทำได้ทั้งหมด ─────────────────────────────────────────────────
ACTIONS = [
    "eat_raw",        # กินดิบ
    "eat_cooked",     # กินสุก (ถ้ามี)
    "drink",          # ดื่มน้ำ (ลด bladder)
    "toilet",         # ขับถ่าย
    "sleep",          # นอน
    "find_food",      # หาอาหาร (เดินหา biome ที่มีอาหาร)
    "find_water",     # หาน้ำ (เดินหา SHALLOW/DEEP_WATER)
    "start_fire",     # จุดไฟ
    "cook",           # ปรุงอาหาร
    "gather",         # เก็บวัตถุดิบ
    "craft",          # ทดลองสร้างของ
    "seek_partner",   # หาคู่ (ไปหา partner)
    "mate",           # สืบพันธุ์
    "rest",           # พักผ่อน (ไม่นอน แค่หยุด)
    "explore",        # สำรวจ (เดินสุ่ม)
    "tend_fire",      # ดูแลไฟ (เพิ่มเชื้อ)
]

# ── Perception ────────────────────────────────────────────────────────────
@dataclass
class Perception:
    """สิ่งที่มนุษย์รับรู้ได้รอบตัวในรัศมี vision"""
    has_food_nearby:    bool  = False
    has_water_nearby:   bool  = False
    has_fire_nearby:    bool  = False
    partner_dist:       int   = 99
    partner_sleeping:   bool  = False
    partner_needs_mate: bool  = False
    biome_has_herb:     bool  = False
    biome_food_level:   float = 50.0
    env_temp_c:         float = 28.0
    hour:               int   = 12
    is_night:           bool  = False
    danger_nearby:      bool  = False   # Carnivore ใกล้


# ── Memory entry ─────────────────────────────────────────────────────────
@dataclass
class MemoryEntry:
    action:   str
    outcome:  float   # +1 = ดี, -1 = แย่, 0 = กลาง
    context:  str     # สรุป context ตอนที่ทำ
    day:      int


# ── Brain ─────────────────────────────────────────────────────────────────
class Brain:
    """
    สมองของ HumanAI — ตัดสินใจและเรียนรู้
    """

    def __init__(self, name: str):
        self.name = name

        # ── ความทรงจำ ──────────────────────────────────────────
        self.memories: list[MemoryEntry] = []
        self.max_memory = 50

        # ── Action weights (reinforcement learning แบบง่าย) ───
        # เริ่มต้นเท่ากัน = 1.0, เพิ่ม/ลดตามประสบการณ์
        self.action_weights: dict[str, float] = {a: 1.0 for a in ACTIONS}

        # ── สิ่งที่รู้แล้วว่าใช้ได้ ─────────────────────────────
        self.knows_fire:    bool = False   # รู้จักวิธีจุดไฟ
        self.knows_cooking: bool = False   # รู้ว่าไฟปรุงอาหารได้
        self.knows_water:   bool = False   # รู้ตำแหน่งแหล่งน้ำ
        self.skill_fire:    float = 0.0    # ทักษะจุดไฟ 0–100
        self.skill_craft:   float = 0.0    # ทักษะสร้างของ 0–100
        self.skill_hunt:    float = 0.0    # ทักษะล่าสัตว์ 0–100

        # ── สถานะปัจจุบัน ────────────────────────────────────
        self.current_action: str   = "explore"
        self.action_log:     list  = []    # log การตัดสินใจ
        self.day:            int   = 0

    # ════════════════════════════════════════════════════════
    # 1. PERCEPTION — รับรู้สิ่งแวดล้อม
    # ════════════════════════════════════════════════════════
    def perceive(self, pos: list, terrain, fire_system,
                 partner, animals: list, hour: int,
                 env_temp: float) -> Perception:
        p = Perception()
        p.hour       = hour
        p.is_night   = hour >= 21 or hour < 6
        p.env_temp_c = env_temp

        # biome ที่ยืนอยู่
        info = terrain.get_info(pos[0], pos[1])
        p.biome_food_level = info["food_level"]
        p.biome_has_herb   = info.get("has_herb", False)
        p.has_water_nearby = info.get("is_water", False)

        # ค้นหาในรัศมี 5 ช่อง
        SIZE = terrain.size
        for dr in range(-5, 6):
            for dc in range(-5, 6):
                r = max(0, min(SIZE-1, pos[0]+dr))
                c = max(0, min(SIZE-1, pos[1]+dc))
                near_info = terrain.get_info(r, c)
                if near_info["food_level"] > 40:
                    p.has_food_nearby = True
                if near_info.get("is_water"):
                    p.has_water_nearby = True

        # ไฟใกล้ไหม
        p.has_fire_nearby = fire_system.nearby_fire(pos, radius=3) is not None

        # partner
        if partner:
            p.partner_dist       = abs(pos[0]-partner.pos[0]) + abs(pos[1]-partner.pos[1])
            p.partner_sleeping   = partner.sleeping
            p.partner_needs_mate = partner.needs.libido >= 70

        # Carnivore ใกล้
        for a in animals:
            if a.a_type == "Carnivore" and not a.sleeping:
                dist = abs(pos[0]-a.pos[0]) + abs(pos[1]-a.pos[1])
                if dist <= 4:
                    p.danger_nearby = True
                    break

        return p

    # ════════════════════════════════════════════════════════
    # 2. DECISION — คำนวณ utility และเลือก action
    # ════════════════════════════════════════════════════════
    def decide(self, needs, perc: Perception, inventory: list,
               has_cooked_food: bool) -> str:
        """
        คำนวณ utility ของแต่ละ action แล้วเลือกที่สูงสุด
        utility = base_score × need_weight × learned_weight × context_factor
        """
        scores: dict[str, float] = {}

        n = needs   # NeedsObject จาก human_ai.py

        # ── SURVIVAL (ลำดับแรกสุด) ───────────────────────────
        # หนีภัย
        if perc.danger_nearby:
            return "explore"   # วิ่งหนี (explore = เดินสุ่มออกไป)

        # ── SLEEP ─────────────────────────────────────────────
        sleep_score = 0
        if perc.is_night and n.sleepy >= 50:
            sleep_score = n.sleepy * 1.5
        elif n.sleepy >= 85:
            sleep_score = n.sleepy * 2.0   # ง่วงมากจนต้องนอนกลางวัน
        scores["sleep"] = sleep_score * self.action_weights["sleep"]

        # ── EAT ───────────────────────────────────────────────
        if n.hunger >= 60:
            if has_cooked_food and self.knows_cooking:
                scores["eat_cooked"] = n.hunger * 1.8 * self.action_weights["eat_cooked"]
            if perc.has_food_nearby or perc.biome_food_level > 30:
                scores["eat_raw"] = n.hunger * 0.9 * self.action_weights["eat_raw"]
            if not perc.has_food_nearby:
                scores["find_food"] = n.hunger * 1.2 * self.action_weights["find_food"]

        # ── DRINK / TOILET ────────────────────────────────────
        if n.bladder >= 70:
            scores["toilet"]    = n.bladder * 1.3 * self.action_weights["toilet"]
        if n.bladder >= 50:
            scores["drink"]     = n.bladder * 0.5 * self.action_weights["drink"]

        # ── FIRE ──────────────────────────────────────────────
        has_flint  = "หินเหล็กไฟ" in inventory
        has_wood   = "กิ่งไม้แห้ง" in inventory
        fire_need  = 0

        if perc.env_temp_c < 22 and not perc.has_fire_nearby:
            fire_need += (22 - perc.env_temp_c) * 3   # หนาว → จุดไฟ
        if n.hunger >= 50 and self.knows_cooking and not perc.has_fire_nearby:
            fire_need += 20   # อยากปรุงอาหาร

        if fire_need > 0 and has_flint and has_wood:
            scores["start_fire"] = fire_need * self.action_weights["start_fire"]
        elif perc.has_fire_nearby and n.hunger >= 40:
            scores["cook"]       = n.hunger * 1.5 * self.action_weights["cook"]
        if perc.has_fire_nearby:
            scores["tend_fire"]  = 5 * self.action_weights["tend_fire"]

        # ── GATHER / CRAFT ────────────────────────────────────
        # ทำเมื่อไม่เร่งด่วนอะไร
        if n.hunger < 60 and n.sleepy < 60:
            if perc.biome_has_herb or perc.biome_food_level > 40:
                scores["gather"] = 20 * self.action_weights["gather"]
            if len(inventory) >= 2:
                scores["craft"]  = 15 * self.action_weights["craft"]

        # ── MATE / SEEK PARTNER ───────────────────────────────
        if n.libido >= 70 and not perc.is_night and n.hunger < 70:
            if perc.partner_dist <= 3 and perc.partner_needs_mate:
                scores["mate"]         = n.libido * 1.6 * self.action_weights["mate"]
            elif perc.partner_dist > 3:
                scores["seek_partner"] = n.libido * 1.0 * self.action_weights["seek_partner"]

        # ── EXPLORE (default) ─────────────────────────────────
        scores["explore"] = 10 * self.action_weights["explore"]
        scores["rest"]    = 5  * self.action_weights["rest"]

        # ── เลือก action ที่ score สูงสุด ─────────────────────
        # เพิ่ม noise เล็กน้อยให้ดูเป็นธรรมชาติ
        best_action = max(scores, key=lambda a: scores[a] * random.uniform(0.9, 1.1))
        self.current_action = best_action
        return best_action

    # ════════════════════════════════════════════════════════
    # 3. LEARNING — เรียนรู้จากผลลัพธ์
    # ════════════════════════════════════════════════════════
    def learn(self, action: str, outcome: float, context: str = ""):
        """
        Reinforcement: action ที่ได้ผลดี → weight เพิ่ม
        outcome: +1.0 = ดีมาก, 0.0 = กลาง, -1.0 = แย่
        """
        # อัปเดต weight (learning rate = 0.1)
        lr = 0.1
        self.action_weights[action] = max(
            0.1,
            min(5.0, self.action_weights[action] + lr * outcome)
        )

        # บันทึก memory
        mem = MemoryEntry(action=action, outcome=outcome,
                          context=context, day=self.day)
        self.memories.append(mem)
        if len(self.memories) > self.max_memory:
            self.memories.pop(0)

        # unlock knowledge
        if action == "start_fire" and outcome > 0:
            self.knows_fire = True
            self.skill_fire = min(100, self.skill_fire + 5)
        if action == "cook" and outcome > 0:
            self.knows_cooking = True
            self.skill_fire    = min(100, self.skill_fire + 2)
        if action == "craft" and outcome > 0:
            self.skill_craft = min(100, self.skill_craft + 3)
        if action == "find_food" and outcome > 0:
            self.skill_hunt = min(100, self.skill_hunt + 2)

        # log
        icon = "✅" if outcome > 0 else ("❌" if outcome < 0 else "➡️")
        self.action_log.append(f"Day {self.day}: {icon} {action} → {outcome:+.1f}")
        if len(self.action_log) > 20:
            self.action_log.pop(0)

    # ════════════════════════════════════════════════════════
    # 4. EXECUTE — แปล action → คำสั่งที่ app.py ทำได้
    # ════════════════════════════════════════════════════════
    def execute(self, action: str, pos: list, partner_pos: list,
                terrain, fire_system, needs, inventory: list,
                has_cooked_food: bool) -> dict:
        """
        คืน dict คำสั่ง:
        {
          "move_to":    [r,c] หรือ None,
          "do":         str action,
          "message":    str log,
          "learn_from": (action, outcome, context)  ← ให้ Brain เรียนรู้
        }
        """
        SIZE   = terrain.size
        result = {"move_to": None, "do": action, "message": "", "learn_from": None}

        if action == "sleep":
            result["message"] = f"😴 {self.name} เข้านอน"

        elif action == "eat_raw":
            info = terrain.get_info(pos[0], pos[1])
            if info["food_level"] > 10:
                result["message"]    = f"🥩 {self.name} กินอาหารดิบ"
                result["learn_from"] = ("eat_raw", 0.3, "กินดิบ ไม่ค่อยอิ่ม")
            else:
                result["message"]    = f"😰 {self.name} หาอาหารไม่พบ"
                result["learn_from"] = ("eat_raw", -0.2, "ไม่มีอาหารตรงนี้")

        elif action == "eat_cooked":
            result["message"]    = f"🍖 {self.name} กินอาหารสุก (อร่อย!)"
            result["learn_from"] = ("eat_cooked", 1.0, "กินสุก อิ่มมาก")

        elif action == "toilet":
            result["message"]    = f"🚽 {self.name} ขับถ่าย"
            result["learn_from"] = ("toilet", 0.5, "สบายขึ้น")

        elif action == "drink":
            result["message"]    = f"💧 {self.name} ดื่มน้ำ"
            result["learn_from"] = ("drink", 0.4, "ดื่มน้ำ")

        elif action == "find_food":
            # เดินไปหา biome ที่มีอาหาร (GRASSLAND/TROPICAL/FOREST)
            target = self._find_biome_target(pos, terrain, [3, 4, 5], SIZE)
            result["move_to"] = target
            result["message"] = f"🔍 {self.name} ออกหาอาหาร → {target}"
            result["learn_from"] = ("find_food", 0.1, "เดินหาอาหาร")

        elif action == "find_water":
            target = self._find_biome_target(pos, terrain, [0, 1], SIZE)
            result["move_to"] = target
            result["message"] = f"💧 {self.name} เดินหาน้ำ → {target}"

        elif action == "start_fire":
            result["message"] = f"🔥 {self.name} พยายามจุดไฟ"
            result["do"]      = "start_fire"

        elif action == "cook":
            result["message"] = f"🍖 {self.name} ปรุงอาหารที่กองไฟ"
            result["do"]      = "cook"

        elif action == "tend_fire":
            result["message"] = f"🪵 {self.name} เพิ่มเชื้อไฟ"
            result["do"]      = "tend_fire"

        elif action == "gather":
            result["message"]    = f"🌿 {self.name} เก็บวัตถุดิบ"
            result["learn_from"] = ("gather", 0.3, "เก็บของ")

        elif action == "craft":
            result["message"] = f"🔨 {self.name} ทดลองสร้างของ"

        elif action == "seek_partner":
            result["move_to"] = partner_pos[:]
            result["message"] = f"💕 {self.name} เดินหา {self.name}'s partner"

        elif action == "mate":
            result["message"]    = f"💕 {self.name} ใกล้ชิดกับคู่"
            result["learn_from"] = ("mate", 1.0, "ใกล้ชิดคู่ดี")

        elif action == "explore":
            # เดินสุ่มแต่หลีกเลี่ยงน้ำ
            dr, dc  = random.randint(-3,3), random.randint(-3,3)
            nr, nc  = max(0,min(SIZE-1,pos[0]+dr)), max(0,min(SIZE-1,pos[1]+dc))
            info    = terrain.get_info(nr, nc)
            if info.get("is_water"):
                nr, nc = pos[0], pos[1]
            result["move_to"] = [nr, nc]
            result["message"] = f"🚶 {self.name} สำรวจ → [{nr},{nc}]"

        elif action == "rest":
            result["message"] = f"🧘 {self.name} พักผ่อน"

        return result

    # ── helper: หา biome target ที่ใกล้ที่สุด ──────────────────
    def _find_biome_target(self, pos: list, terrain, biome_ids: list,
                           size: int) -> list:
        best, best_dist = pos[:], 9999
        for r in range(0, size, 3):   # sample ทุก 3 ช่อง
            for c in range(0, size, 3):
                if terrain.template[r][c] in biome_ids:
                    d = abs(r-pos[0]) + abs(c-pos[1])
                    if d < best_dist:
                        best, best_dist = [r, c], d
        return best

    # ── สรุปสำหรับ UI ──────────────────────────────────────────
    @property
    def summary(self) -> dict:
        top_actions = sorted(
            self.action_weights.items(), key=lambda x: x[1], reverse=True
        )[:5]
        return {
            "action":      self.current_action,
            "knows_fire":  self.knows_fire,
            "knows_cook":  self.knows_cooking,
            "skill_fire":  round(self.skill_fire, 1),
            "skill_craft": round(self.skill_craft, 1),
            "skill_hunt":  round(self.skill_hunt, 1),
            "top_actions": top_actions,
            "memories":    len(self.memories),
            "recent_log":  self.action_log[-5:],
        }
