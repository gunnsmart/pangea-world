# systems/brain.py
import math
import random
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Set, Optional
from crafting import combine_items, generate_item_name
from item import Item

ACTIONS = [
    "eat_raw", "eat_cooked", "drink", "toilet", "sleep", "seek_food",
    "seek_water", "seek_partner", "seek_fire", "mate", "start_fire", "cook",
    "tend_fire", "gather", "craft", "rest", "explore", "flee", "teach", "rub", "share_food",
    "comfort", "build_shelter"
]

DRIVE_TO_RELIEF = {
    "hunger": ["eat_raw", "eat_cooked", "seek_food", "cook"],
    "thirst": ["drink", "seek_water"],
    "bladder": ["toilet"],
    "tired": ["sleep", "rest"],
    "lonely": ["seek_partner", "mate", "comfort"],
    "cold": ["seek_fire", "start_fire", "tend_fire", "rub", "build_shelter"],
    "fear": ["flee", "seek_fire", "comfort"],
    "bored": ["explore", "gather", "craft"],
    "curious": ["explore", "craft", "gather"],
}

LR = 0.15
DECAY = 0.001
MIN_WEIGHT = 0.05
MAX_WEIGHT = 10.0

@dataclass
class Emotion:
    valence: float = 0.0
    arousal: float = 0.3
    trust: float = 0.5
    dominance: float = 0.5

    def update(self, event: str, magnitude: float = 0.1):
        if event == "ate_well":
            self.valence = min(1, self.valence + magnitude)
            self.arousal = min(1, self.arousal + magnitude * 0.5)
        elif event == "hungry_bad":
            self.valence = max(-1, self.valence - magnitude)
            self.arousal = max(0, self.arousal - magnitude * 0.3)
        elif event == "danger":
            self.valence = max(-1, self.valence - magnitude * 2)
            self.arousal = min(1, self.arousal + magnitude * 2)
            self.dominance = max(0, self.dominance - magnitude)
        elif event == "fire_lit":
            self.valence = min(1, self.valence + magnitude * 1.5)
            self.dominance = min(1, self.dominance + magnitude)
        elif event == "mated":
            self.valence = min(1, self.valence + magnitude * 2)
            self.trust = min(1, self.trust + magnitude)
        elif event == "partner_near":
            self.valence = min(1, self.valence + magnitude * 0.5)
            self.trust = min(1, self.trust + magnitude * 0.3)
        elif event == "alone":
            self.valence = max(-1, self.valence - magnitude * 0.3)
        elif event == "disaster":
            self.valence = max(-1, self.valence - magnitude * 3)
            self.arousal = min(1, self.arousal + magnitude * 2)

        self.valence *= 0.98
        self.arousal = 0.3 + (self.arousal - 0.3) * 0.97
        self.trust *= 0.999
        self.dominance = 0.5 + (self.dominance - 0.5) * 0.99

    @property
    def pleasure_multiplier(self) -> float:
        return 1.0 + self.valence * 0.3

    @property
    def pain_multiplier(self) -> float:
        return 1.0 + (-self.valence) * 0.3 + self.arousal * 0.2

    @property
    def exploration_bias(self) -> float:
        return 1.0 + self.valence * 0.5

    @property
    def label(self) -> str:
        if self.valence > 0.5: return "😊 มีความสุข"
        if self.valence > 0.2: return "🙂 สบายดี"
        if self.valence > -0.2: return "😐 เฉยๆ"
        if self.valence > -0.5: return "😟 กังวล"
        return "😰 กลัว/เศร้า"

@dataclass
class Episode:
    day: int
    action: str
    context: str
    outcome: float
    learned: bool = False

class EpisodicMemory:
    def __init__(self, capacity: int = 200, max_age_days: int = 30):
        self.episodes: List[Episode] = []
        self.capacity = capacity
        self.max_age_days = max_age_days

    def store(self, day: int, action: str, context: str, outcome: float):
        self.episodes.append(Episode(day, action, context, outcome))
        if len(self.episodes) > self.capacity:
            self.episodes.sort(key=lambda e: e.outcome, reverse=True)
            self.episodes = self.episodes[:self.capacity]

    def decay(self, current_day: int):
        self.episodes = [e for e in self.episodes if current_day - e.day < self.max_age_days]

    def recall(self, context: str, action: str) -> float:
        relevant = [e.outcome for e in self.episodes if e.action == action and self._context_match(e.context, context)]
        if not relevant:
            return 0.0
        weights = [1.0 + i*0.05 for i in range(len(relevant))]
        return sum(o*w for o,w in zip(relevant, weights)) / sum(weights)

    def _context_match(self, stored: str, current: str) -> bool:
        s_keys = set(stored.split("+"))
        c_keys = set(current.split("+"))
        return len(s_keys & c_keys) >= 1

class DriveSystem:
    def __init__(self, time_scale: float = 1.0):
        self.time_scale = time_scale
        self.hunger = 20.0
        self.thirst = 15.0
        self.bladder = 10.0
        self.tired = 10.0
        self.lonely = 5.0
        self.cold = 0.0
        self.fear = 0.0
        self.bored = 30.0
        self.curious = 50.0

    def step(self, temp_c: float, hour: int, partner_dist: int, danger: bool, has_shelter: bool = False) -> Dict[str, float]:
        # อัตราการเพิ่มความต้องการพื้นฐาน (ปรับสมดุล)
        self.hunger = min(100, self.hunger + 2.5 * self.time_scale)
        self.thirst = min(100, self.thirst + 3.5 * self.time_scale)
        self.bladder = min(100, self.bladder + 4.0 * self.time_scale)
        
        # ความเหนื่อยเพิ่มขึ้นตามเวลา (กลางคืนเพิ่มเร็วขึ้น)
        tired_inc = 3.0 if (6 <= hour < 21) else 6.0
        self.tired = min(100, self.tired + tired_inc * self.time_scale)
        
        self.bored = min(100, self.bored + 0.5 * self.time_scale)
        self.curious = min(100, self.curious + 0.3 * self.time_scale)

        # การคำนวณความหนาว (Cold) - ที่พักช่วยลดอัตราการเพิ่มได้ 50%
        if temp_c < 20:
            cold_inc = (20 - temp_c) * 0.4 * self.time_scale
            if has_shelter:
                cold_inc *= 0.5
            self.cold = min(100, self.cold + cold_inc)
        else:
            self.cold = max(0, self.cold - 6.0 * self.time_scale)

        # ความเหงา (Lonely)
        if partner_dist > 8:
            self.lonely = min(100, self.lonely + 1.2 * self.time_scale)
        else:
            self.lonely = max(0, self.lonely - 2.0 * self.time_scale)

        # ความกลัว (Fear)
        if danger:
            self.fear = min(100, self.fear + 25.0 * self.time_scale)
        else:
            self.fear = max(0, self.fear - 8.0 * self.time_scale)

        return {
            "hunger": self.hunger/100,
            "thirst": self.thirst/100,
            "bladder": self.bladder/100,
            "tired": self.tired/100,
            "lonely": self.lonely/100,
            "cold": self.cold/100,
            "fear": self.fear/100,
            "bored": self.bored/100,
            "curious": self.curious/100,
        }

    def relieve(self, drive: str, amount: float):
        current = getattr(self, drive, 0)
        setattr(self, drive, max(0, current - amount * self.time_scale))

    @property
    def dominant_pain(self) -> Tuple[str, float]:
        drives = {"hunger":self.hunger, "thirst":self.thirst,
                  "bladder":self.bladder, "tired":self.tired,
                  "cold":self.cold, "fear":self.fear, "lonely":self.lonely}
        worst = max(drives, key=drives.get)
        return worst, drives[worst]

class Brain:
    def __init__(self, name: str, time_scale: float = 1.0,
                 inherited_weights: Optional[Dict[str, float]] = None,
                 common_sense: Optional[Dict] = None):
        self.name = name
        self.time_scale = time_scale
        self.day = 0
        if inherited_weights:
            self.weights = {a: max(MIN_WEIGHT, min(MAX_WEIGHT,
                               inherited_weights.get(a,1.0)+random.gauss(0,0.1)))
                            for a in ACTIONS}
        else:
            self.weights = {a: 1.0 for a in ACTIONS}
        
        self.common_sense = common_sense if common_sense else {}
        self._init_common_sense_weights()   # สร้าง base_weights จาก common_sense

        self.drives = DriveSystem(time_scale)
        self.emotion = Emotion()
        self.memory = EpisodicMemory()
        self.craft_recipes = {}   # key: (material1_name, material2_name, binder_name) -> Item
        self.craft_outcomes = {}  # key: (m1,m2,binder) -> efficiency
        self.current_action = "explore"
        self.current_context = ""
        self.last_pain = 0.0
        self.action_log: List[str] = []
        self.skill: Dict[str, float] = {"fire":0,"cook":0,"craft":0,"hunt":0,"gather":0}
        self.knows: Set[str] = set()
        self._drive_to_actions = DRIVE_TO_RELIEF

    def _init_common_sense_weights(self):
        """แปลง common_sense dictionary ให้เป็น base_weights"""
        self.base_weights = {a: 1.0 for a in ACTIONS} # เริ่มต้นที่ 1.0 แทน 0.0
        for context, actions in self.common_sense.items():
            for action, value in actions.items():
                if action in self.base_weights:
                    self.base_weights[action] += value
        
        # Normalization ให้สมดุลขึ้น
        if self.base_weights:
            max_w = max(self.base_weights.values())
            min_w = min(self.base_weights.values())
            range_w = max_w - min_w if max_w != min_w else 1
            for a in self.base_weights:
                # ปรับให้อยู่ในช่วง 0.5 - 5.0
                self.base_weights[a] = 0.5 + (self.base_weights[a] - min_w) / range_w * 4.5

    def step(self, perception: Dict) -> str:
        self.day += 1
        pain = self.drives.step(
            temp_c=perception.get("temp_c",28),
            hour=perception.get("hour",12),
            partner_dist=perception.get("partner_dist",99),
            danger=perception.get("danger",False),
        )
        if perception.get("partner_dist",99) <= 3:
            self.emotion.update("partner_near", 0.08)
            if perception.get("partner_sleeping"):
                self.emotion.update("ate_well", 0.02) # Feeling safe
        elif perception.get("partner_dist",99) > 20:
            self.emotion.update("alone", 0.05)
            
        if perception.get("danger"):
            self.emotion.update("danger", 0.3)
            
        if perception.get("has_shelter") and perception.get("is_night"):
            self.emotion.update("ate_well", 0.05) # Shelter comfort

        ctx = []
        if pain["hunger"]>0.5: ctx.append("hungry")
        if pain["tired"]>0.6: ctx.append("tired")
        if pain["cold"]>0.3: ctx.append("cold")
        if pain["fear"]>0.2: ctx.append("danger")
        if perception.get("is_night"): ctx.append("night")
        if perception.get("has_fire"): ctx.append("fire_near")
        if perception.get("has_food"): ctx.append("food_near")
        self.current_context = "+".join(ctx) if ctx else "normal"

        scores = self._compute_scores(pain, perception)
        action = self._softmax_sample(scores)
        self.current_action = action

        for a in ACTIONS:
            if a != action:
                self.weights[a] = max(MIN_WEIGHT, self.weights[a] - DECAY * self.time_scale)

        return action

    def _compute_scores(self, pain: Dict, perc: Dict) -> Dict[str, float]:
        scores = {}
        inv = perc.get("inventory", [])
        partner_hungry = perc.get("partner_hungry", False)
        partner_dist = perc.get("partner_dist", 99)

        # คำนวณ panic factor จาก drives
        panic_factor = 0.0
        for drive in ["hunger", "thirst", "cold", "fear"]:
            panic_factor += pain.get(drive, 0) ** 2   # ยิ่ง drive สูง ยิ่ง panic
        panic_factor = min(1.0, panic_factor / 4)     # normalize ให้ max = 1

        for action in ACTIONS:
            # base weight จาก common sense
            base_w = self.base_weights.get(action, 0.0)
            # learned weight (ปรับตามประสบการณ์)
            learned_w = self.weights[action]

            # น้ำหนักสุดท้าย: panic factor สูง -> ลดอิทธิพลของ common sense ลง
            w = learned_w + base_w * (1 - panic_factor)

            pain_boost = 0.0
            for drive, actions in self._drive_to_actions.items():
                if action in actions:
                    pain_boost += pain.get(drive,0)**2 * 3.0
            pain_boost *= self.emotion.pain_multiplier

            mem_score = self.memory.recall(self.current_context, action)
            mem_bonus = mem_score * self.emotion.pleasure_multiplier

            if partner_hungry and partner_dist <=5 and action in ("eat_raw","seek_food"):
                w *= 0.7
            if partner_hungry and partner_dist >5 and action == "seek_partner":
                w *= 1.5

            if not self._is_feasible(action, perc, inv, pain):
                scores[action] = 0.001
                continue

            scores[action] = max(0.001, w + pain_boost + mem_bonus)

        return scores

    def _softmax_sample(self, scores: Dict[str, float]) -> str:
        temp_base = 1.2
        curiosity_factor = self.drives.curious * 0.01
        emotion_factor = self.emotion.exploration_bias
        temperature = max(0.5, min(2.5, temp_base + curiosity_factor + (emotion_factor-1)*0.5))
        vals = list(scores.values())
        keys = list(scores.keys())
        exp_v = [math.exp(v/temperature) for v in vals]
        total = sum(exp_v)
        if total == 0:
            return random.choice(keys)
        probs = [e/total for e in exp_v]
        r = random.random()
        cum = 0.0
        for action, prob in zip(keys, probs):
            cum += prob
            if r <= cum:
                return action
        return keys[-1]

    def try_craft(self, item_a: Item, item_b: Item, binder: Item = None) -> Item:
        """พยายามคราฟต์ ตรวจสอบความทรงจำก่อน ถ้าไม่มีให้ทดลอง"""
        key = (item_a.material.template.name,
               item_b.material.template.name,
               binder.material.template.name if binder else None)
        if key in self.craft_recipes:
            # เคยคราฟต์สำเร็จแล้ว ใช้เลย
            return self.craft_recipes[key]

        # ทดลองสุ่มผสม
        new_item = combine_items(item_a, item_b, binder)
        # ประเมินประสิทธิภาพ
        efficiency = self.test_item(new_item)

        if efficiency > 0.3:
            self.craft_recipes[key] = new_item
            self.craft_outcomes[key] = efficiency
            self.memory.store(self.day, "craft", f"{item_a}+{item_b}", efficiency)
            self.receive_pleasure("invention", efficiency)
            # ตั้งชื่อให้วัตถุใหม่ (ใช้การสุ่มตามคุณสมบัติ)
            name = generate_item_name(new_item.attrs)
            # เก็บชื่อไว้ในแอตทริบิวต์ (optional)
            new_item.name = name
        else:
            self.memory.store(self.day, "craft_fail", f"{item_a}+{item_b}", -efficiency)
            self.receive_pain("failure", 0.2)

        return new_item

    def test_item(self, item: Item) -> float:
        """ประเมินประสิทธิภาพของเครื่องมือเทียบกับมือเปล่า"""
        # สมมติมือเปล่า damage = 1.0
        base_damage = 1.0
        item_damage = item.attrs.get("damage", 1.0)
        # คลิปให้ไม่เกิน 1.0
        efficiency = min(1.0, item_damage / (base_damage * 2))
        return efficiency

    def observe_craft(self, recipe_key, outcome):
        """เรียนรู้จากการสังเกตคู่ครองคราฟต์สำเร็จ"""
        if outcome > 0.5 and recipe_key not in self.craft_recipes:
            self.craft_recipes[recipe_key] = outcome  # จำว่าสูตรนี้ดี
            self.memory.store(self.day, "learn_craft", str(recipe_key), outcome)

    def select_items_for_craft(self, inventory):
        """เลือกไอเทมสองชิ้น (และอาจมีตัวมัด) จาก inventory เพื่อนำมาคราฟต์"""
        # ตัวอย่าง: เลือกสุ่ม แต่สามารถปรับให้เลือกตามความต้องการ (เช่น อยากได้ความคม)
        if len(inventory) < 2:
            return None, None, None
        # เลือกแบบสุ่ม (อาจเพิ่ม bias ตามคุณสมบัติในอนาคต)
        items = random.sample(inventory, 2)
        # ถ้ามีเถาวัลย์หรือวัสดุที่มี sticky > 5 ใน inventory ให้ใช้เป็น binder
        binders = [i for i in inventory if hasattr(i, 'attrs') and i.attrs.get("sticky", 0) > 5 and i not in items]
        binder = random.choice(binders) if binders else None
        return items[0], items[1], binder

    def _is_feasible(self, action: str, perc: Dict, inv: List, pain: Dict) -> bool:
        if action == "rub":
            # ต้องมีของสองชิ้นที่มีความแข็ง > 5 (หินหรือกระดูก)
            items = [i for i in inv if hasattr(i, 'attrs') and i.attrs.get("hardness", 0) > 5]
            return len(items) >= 2
        if action == "sleep":
            return pain.get("tired",0) > 0.3 or perc.get("is_night",False)
        if action == "eat_raw":
            return perc.get("has_food", False) or perc.get("biome_food",0) > 20
        if action == "eat_cooked":
            return perc.get("has_cooked_food", False)
        if action == "drink":
            return perc.get("has_water", False)
        if action == "start_fire":
            return ("หินเหล็กไฟ" in inv and "กิ่งไม้แห้ง" in inv and not perc.get("has_fire",False))
        if action == "cook":
            return perc.get("has_fire", False)
        if action == "tend_fire":
            return perc.get("has_fire", False) and "กิ่งไม้แห้ง" in inv
        if action == "craft":
            return len(inv) >= 2
        if action == "mate":
            return perc.get("partner_dist",99) <= 3 and not perc.get("partner_sleeping",True)
        if action == "seek_partner":
            return perc.get("partner_dist",0) > 3
        if action == "flee":
            return perc.get("danger", False)
        if action == "teach":
            return perc.get("has_child_nearby", False) and len(self.knows) > 0
        if action == "share_food":
            # ต้องมีอาหารในตัวและคู่หูอยู่ใกล้
            has_food = any(hasattr(i, 'attrs') and i.attrs.get("flammable", 0) > 0 for i in inv) # simplified check for food
            return has_food and perc.get("partner_dist", 99) <= 3
        if action == "comfort":
            # คู่หูต้องอยู่ใกล้และมีความกลัวหรือความเหงาสูง
            return perc.get("partner_dist", 99) <= 3 and (perc.get("partner_fear", 0) > 0.3 or perc.get("partner_lonely", 0) > 0.3)
        if action == "build_shelter":
            # ต้องมีทรัพยากร (กิ่งไม้และใบไม้)
            has_wood = any(hasattr(i, 'attrs') and i.material.template.name == "wood" for i in inv)
            has_leaf = any(hasattr(i, 'attrs') and i.material.template.name == "leaf" for i in inv)
            return has_wood and has_leaf and not perc.get("has_shelter", False)
        return True

    def learn(self, action: str, outcome: float, detail: str = ""):
        effective_lr = LR / max(1.0, self.time_scale)
        self.weights[action] = max(MIN_WEIGHT, min(MAX_WEIGHT,
            self.weights[action] + effective_lr * outcome * self.emotion.pain_multiplier))
        self.memory.store(self.day, action, self.current_context, outcome)
        if outcome > 0.5:
            self.emotion.update("ate_well" if "eat" in action else "fire_lit", outcome*0.1)
        elif outcome < -0.3:
            self.emotion.update("hungry_bad", abs(outcome)*0.1)

        skill_map = {"start_fire":"fire","tend_fire":"fire","cook":"cook",
                     "craft":"craft","seek_food":"hunt","gather":"gather"}
        if action in skill_map and outcome > 0:
            sk = skill_map[action]
            self.skill[sk] = min(100, self.skill[sk] + outcome*2)

        if action == "start_fire" and outcome > 0: self.knows.add("fire")
        if action == "cook" and outcome > 0: self.knows.add("cooking")
        if action == "craft" and outcome > 0: self.knows.add("crafting")
        if action == "eat_cooked" and outcome > 0: self.knows.add("cooked_is_better")

        icon = "✅" if outcome > 0 else ("❌" if outcome < 0 else "➡️")
        entry = f"Day {self.day}: {icon} {action}({outcome:+.1f}) [{self.current_context}]"
        self.action_log.append(entry)
        if len(self.action_log) > 30:
            self.action_log.pop(0)

    def receive_pain(self, source: str, intensity: float):
        self.learn(self.current_action, -intensity, f"pain:{source}")
        if source == "hunger":
            self.drives.hunger = min(100, self.drives.hunger + intensity*15*self.time_scale)
            self.emotion.update("hungry_bad", intensity*0.2)
        elif source == "cold":
            self.drives.cold = min(100, self.drives.cold + intensity*20*self.time_scale)
        elif source in ("injury","disease"):
            self.drives.fear = min(100, self.drives.fear + intensity*25*self.time_scale)
            self.emotion.update("danger", intensity*0.3)
        elif source == "hunt_fail":
            self.drives.hunger = min(100, self.drives.hunger + intensity*5*self.time_scale)
        elif source == "no_tool":
            self.drives.bored = min(100, self.drives.bored + intensity*10*self.time_scale)
        elif source == "failure":
            self.emotion.update("hungry_bad", intensity*0.1)
        self.last_pain = max(self.last_pain, intensity)

    def receive_pleasure(self, source: str, intensity: float):
        self.learn(self.current_action, +intensity, f"pleasure:{source}")
        drive_map = {"food":"hunger","water":"thirst","warmth":"cold","rest":"tired"}
        if source in drive_map:
            self.drives.relieve(drive_map[source], intensity*30)
        self.drives.bored = max(0, self.drives.bored - intensity*10*self.time_scale)
        self.drives.curious = max(0, self.drives.curious - intensity*5*self.time_scale)

    def observe_partner(self, partner_action: str, outcome: float):
        if outcome > 0.5:
            self.weights[partner_action] = min(MAX_WEIGHT,
                self.weights[partner_action] + LR * 0.3 * outcome)
            self.memory.store(self.day, partner_action,
                              "observed+"+self.current_context, outcome*0.5)

    def get_heritable_weights(self) -> Dict[str, float]:
        return dict(self.weights)

    @property
    def top_weights(self) -> List[Tuple[str, float]]:
        return sorted(self.weights.items(), key=lambda x: x[1], reverse=True)[:5]