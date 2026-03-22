"""
brain.py — Pure Autonomous Brain (Optimized for High Speed)
══════════════════════════════════════════════════════════════════
ไม่มี script, ไม่มี hardcoded priority
ทุกการตัดสินใจมาจาก: Pain signals + Memory + Emotion

ปรับปรุง:
- รองรับ time_scale (1 = 1 ชม/วินาที)
- Memory decay ตามเวลา
- Learning rate ปรับตาม time_scale
- Social learning (สังเกต partner)
- Exploration bias จากอารมณ์
- Performance optimization (precomputed mapping)
"""

import math
import random
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Tuple, Set

# ── Actions ทั้งหมด ───────────────────────────────────────────────────────────
ACTIONS = [
    "eat_raw", "eat_cooked", "drink", "toilet", "sleep", "seek_food",
    "seek_water", "seek_partner", "seek_fire", "mate", "start_fire", "cook",
    "tend_fire", "gather", "craft", "rest", "explore", "flee", "teach"
]

# ── Mapping: drive → actions ที่บรรเทา ─────────────────────────────────────────
DRIVE_TO_RELIEF = {
    "hunger":   ["eat_raw", "eat_cooked", "seek_food", "cook"],
    "thirst":   ["drink", "seek_water"],
    "bladder":  ["toilet"],
    "tired":    ["sleep", "rest"],
    "lonely":   ["seek_partner", "mate"],
    "cold":     ["seek_fire", "start_fire", "tend_fire"],
    "fear":     ["flee", "seek_fire"],
    "bored":    ["explore", "gather", "craft"],
    "curious":  ["explore", "craft", "gather"],
}

# Learning params
LR         = 0.15
DECAY      = 0.001   # per hour (scaled by time_scale)
MIN_WEIGHT = 0.05
MAX_WEIGHT = 10.0


# ═══════════════════════════════════════════════════════════════════════════════
# EMOTION
# ═══════════════════════════════════════════════════════════════════════════════
@dataclass
class Emotion:
    """อารมณ์ 4 มิติ ส่งผลต่อการเรียนรู้และการเลือก action"""
    valence:   float = 0.0   # -1 = negative, +1 = positive
    arousal:   float = 0.3   # 0 = calm, 1 = excited
    trust:     float = 0.5
    dominance: float = 0.5

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

        # decay สู่ neutral
        self.valence   *= 0.98
        self.arousal    = 0.3 + (self.arousal - 0.3) * 0.97
        self.trust     *= 0.999
        self.dominance  = 0.5 + (self.dominance - 0.5) * 0.99

    @property
    def pleasure_multiplier(self) -> float:
        return 1.0 + self.valence * 0.3

    @property
    def pain_multiplier(self) -> float:
        return 1.0 + (-self.valence) * 0.3 + self.arousal * 0.2

    @property
    def exploration_bias(self) -> float:
        """อารมณ์ดี → ชอบสำรวจมากขึ้น"""
        return 1.0 + self.valence * 0.5

    @property
    def label(self) -> str:
        if self.valence > 0.5:   return "😊 มีความสุข"
        if self.valence > 0.2:   return "🙂 สบายดี"
        if self.valence > -0.2:  return "😐 เฉยๆ"
        if self.valence > -0.5:  return "😟 กังวล"
        return "😰 กลัว/เศร้า"


# ═══════════════════════════════════════════════════════════════════════════════
# EPISODIC MEMORY
# ═══════════════════════════════════════════════════════════════════════════════
@dataclass
class Episode:
    day:      int
    action:   str
    context:  str
    outcome:  float
    learned:  bool = False


class EpisodicMemory:
    """ความทรงจำแบบ episodic มีอายุและขีดจำกัด"""
    def __init__(self, capacity: int = 200, max_age_days: int = 30):
        self.episodes: List[Episode] = []
        self.capacity = capacity
        self.max_age_days = max_age_days

    def store(self, day: int, action: str, context: str, outcome: float):
        self.episodes.append(Episode(day, action, context, outcome))
        if len(self.episodes) > self.capacity:
            # keep best outcomes
            self.episodes.sort(key=lambda e: e.outcome, reverse=True)
            self.episodes = self.episodes[:self.capacity]

    def decay(self, current_day: int):
        """ลบ episode ที่เก่าเกินไป"""
        self.episodes = [e for e in self.episodes
                         if current_day - e.day < self.max_age_days]

    def recall(self, context: str, action: str) -> float:
        """คืนค่า average outcome ของ action นี้ใน context คล้ายกัน"""
        relevant = [e.outcome for e in self.episodes
                    if e.action == action and self._context_match(e.context, context)]
        if not relevant:
            return 0.0
        # recency bias: episodes ใหม่มีน้ำหนักมากกว่า
        weights = [1.0 + i * 0.05 for i in range(len(relevant))]
        return sum(o * w for o, w in zip(relevant, weights)) / sum(weights)

    def _context_match(self, stored: str, current: str) -> bool:
        s_keys = set(stored.split("+"))
        c_keys = set(current.split("+"))
        return len(s_keys & c_keys) >= 1

    @property
    def size(self) -> int:
        return len(self.episodes)


# ═══════════════════════════════════════════════════════════════════════════════
# DRIVE SYSTEM (ปรับ scale ตาม time_scale)
# ═══════════════════════════════════════════════════════════════════════════════
class DriveSystem:
    """ความต้องการดิบของร่างกาย ปรับตาม time_scale"""
    def __init__(self, time_scale: float = 1.0):
        self.time_scale = time_scale
        self.hunger   = 20.0
        self.thirst   = 15.0
        self.bladder  = 10.0
        self.tired    = 10.0
        self.lonely   = 5.0
        self.cold     = 0.0
        self.fear     = 0.0
        self.bored    = 30.0
        self.curious  = 50.0

    def step(self, temp_c: float, hour: int, partner_dist: int, danger: bool) -> Dict[str, float]:
        """อัปเดต drive 1 ชั่วโมง (scaled)"""
        # สะสมตามธรรมชาติ (scaled)
        self.hunger  = min(100, self.hunger  + 4.0 * self.time_scale)
        self.thirst  = min(100, self.thirst  + 5.0 * self.time_scale)
        self.bladder = min(100, self.bladder + 5.0 * self.time_scale)
        tired_inc = 4.0 if (6 <= hour < 21) else 6.0
        self.tired   = min(100, self.tired   + tired_inc * self.time_scale)
        self.bored   = min(100, self.bored   + 1.0 * self.time_scale)
        self.curious = min(100, self.curious + 0.5 * self.time_scale)

        # อุณหภูมิ
        if temp_c < 20:
            self.cold = min(100, self.cold + (20 - temp_c) * 0.5 * self.time_scale)
        else:
            self.cold = max(0, self.cold - 3.0 * self.time_scale)

        # ความเหงา
        if partner_dist > 10:
            self.lonely = min(100, self.lonely + 2.0 * self.time_scale)
        else:
            self.lonely = max(0, self.lonely - 1.0 * self.time_scale)

        # ความกลัว
        if danger:
            self.fear = min(100, self.fear + 30.0 * self.time_scale)
        else:
            self.fear = max(0, self.fear - 5.0 * self.time_scale)

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

    def relieve(self, drive: str, amount: float):
        """บรรเทา drive หลัง action สำเร็จ (scaled)"""
        current = getattr(self, drive, 0)
        setattr(self, drive, max(0, current - amount * self.time_scale))

    @property
    def dominant_pain(self) -> Tuple[str, float]:
        drives = {
            "hunger": self.hunger, "thirst": self.thirst,
            "bladder": self.bladder, "tired": self.tired,
            "cold": self.cold, "fear": self.fear, "lonely": self.lonely,
        }
        worst = max(drives, key=drives.get)
        return worst, drives[worst]


# ═══════════════════════════════════════════════════════════════════════════════
# BRAIN
# ═══════════════════════════════════════════════════════════════════════════════
class Brain:
    """Pure autonomous brain ที่เรียนรู้จาก pain/pleasure เท่านั้น"""
    def __init__(self, name: str, time_scale: float = 1.0,
                 inherited_weights: Optional[Dict[str, float]] = None):
        self.name = name
        self.time_scale = time_scale
        self.day = 0

        # Weight table
        if inherited_weights:
            self.weights = {
                a: max(MIN_WEIGHT, min(MAX_WEIGHT,
                       inherited_weights.get(a, 1.0) + random.gauss(0, 0.1)))
                for a in ACTIONS
            }
        else:
            self.weights = {a: 1.0 for a in ACTIONS}

        self.drives   = DriveSystem(time_scale)
        self.emotion  = Emotion()
        self.memory   = EpisodicMemory(capacity=200, max_age_days=30)

        self.current_action = "explore"
        self.current_context = ""
        self.last_pain = 0.0
        self.action_log: List[str] = []
        self.skill: Dict[str, float] = {
            "fire": 0.0, "cook": 0.0, "craft": 0.0, "hunt": 0.0, "gather": 0.0
        }
        self.knows: Set[str] = set()

        # Precompute mapping for speed
        self._drive_to_actions = DRIVE_TO_RELIEF

    # ── Main step ──────────────────────────────────────────────────────────────
    def step(self, perception: Dict) -> str:
        self.day += 1

        # 1. Update drives
        pain = self.drives.step(
            temp_c=perception.get("temp_c", 28),
            hour=perception.get("hour", 12),
            partner_dist=perception.get("partner_dist", 99),
            danger=perception.get("danger", False),
        )

        # 2. Update emotion
        if perception.get("partner_dist", 99) <= 3:
            self.emotion.update("partner_near", 0.05)
        elif perception.get("partner_dist", 99) > 15:
            self.emotion.update("alone", 0.02)
        if perception.get("danger"):
            self.emotion.update("danger", 0.2)

        # 3. Build context string
        ctx = []
        if pain["hunger"] > 0.5: ctx.append("hungry")
        if pain["tired"]  > 0.6: ctx.append("tired")
        if pain["cold"]   > 0.3: ctx.append("cold")
        if pain["fear"]   > 0.2: ctx.append("danger")
        if perception.get("is_night"): ctx.append("night")
        if perception.get("has_fire"): ctx.append("fire_near")
        if perception.get("has_food"): ctx.append("food_near")
        self.current_context = "+".join(ctx) if ctx else "normal"

        # 4. Compute action scores
        scores = self._compute_scores(pain, perception)

        # 5. Sample action
        action = self._softmax_sample(scores)
        self.current_action = action

        # 6. Weight decay (for actions not chosen)
        for a in ACTIONS:
            if a != action:
                self.weights[a] = max(MIN_WEIGHT,
                                      self.weights[a] - DECAY * self.time_scale)

        return action

    def _compute_scores(self, pain: Dict, perc: Dict) -> Dict[str, float]:
        scores = {}
        inv = perc.get("inventory", [])
        partner_hungry = perc.get("partner_hungry", False)
        partner_dist   = perc.get("partner_dist", 99)

        for action in ACTIONS:
            w = self.weights[action]

            # Pain boost from drives
            pain_boost = 0.0
            for drive, actions in self._drive_to_actions.items():
                if action in actions:
                    pain_boost += pain.get(drive, 0) ** 2 * 3.0
            pain_boost *= self.emotion.pain_multiplier

            # Memory recall
            mem_score = self.memory.recall(self.current_context, action)
            mem_bonus = mem_score * self.emotion.pleasure_multiplier

            # Cooperation signals
            if partner_hungry and partner_dist <= 5 and action in ("eat_raw", "seek_food"):
                w *= 0.7
            if partner_hungry and partner_dist > 5 and action == "seek_partner":
                w *= 1.5

            # Feasibility check
            if not self._is_feasible(action, perc, inv, pain):
                scores[action] = 0.001
                continue

            scores[action] = max(0.001, w + pain_boost + mem_bonus)

        return scores

    def _softmax_sample(self, scores: Dict[str, float]) -> str:
        # Temperature: base + curiosity + emotion bias
        temp_base = 1.2
        curiosity_factor = self.drives.curious * 0.01          # 0..1
        emotion_factor = self.emotion.exploration_bias         # 0.5..1.5
        temperature = temp_base + curiosity_factor + (emotion_factor - 1) * 0.5
        temperature = max(0.5, min(2.5, temperature))

        vals = list(scores.values())
        keys = list(scores.keys())
        exp_v = [math.exp(v / temperature) for v in vals]
        total = sum(exp_v)
        if total == 0:
            return random.choice(keys)

        probs = [e / total for e in exp_v]
        r = random.random()
        cum = 0.0
        for action, prob in zip(keys, probs):
            cum += prob
            if r <= cum:
                return action
        return keys[-1]

    def _is_feasible(self, action: str, perc: Dict, inv: List, pain: Dict) -> bool:
        if action == "sleep":
            return pain.get("tired", 0) > 0.3 or perc.get("is_night", False)
        if action == "eat_raw":
            return perc.get("has_food", False) or perc.get("biome_food", 0) > 20
        if action == "eat_cooked":
            return perc.get("has_cooked_food", False)
        if action == "drink":
            return perc.get("has_water", False)
        if action == "start_fire":
            return ("หินเหล็กไฟ" in inv and "กิ่งไม้แห้ง" in inv and
                    not perc.get("has_fire", False))
        if action == "cook":
            return perc.get("has_fire", False)
        if action == "tend_fire":
            return perc.get("has_fire", False) and "กิ่งไม้แห้ง" in inv
        if action == "craft":
            return len(inv) >= 2
        if action == "mate":
            return (perc.get("partner_dist", 99) <= 3 and
                    not perc.get("partner_sleeping", True))
        if action == "seek_partner":
            return perc.get("partner_dist", 0) > 3
        if action == "flee":
            return perc.get("danger", False)
        if action == "teach":
            return perc.get("has_child_nearby", False) and len(self.knows) > 0
        return True   # explore, gather, rest, seek_*

    # ── Learning from outcome ──────────────────────────────────────────────────
    def learn(self, action: str, outcome: float, detail: str = ""):
        # Adjust learning rate based on time scale (slower if faster sim)
        effective_lr = LR / max(1.0, self.time_scale)

        self.weights[action] = max(MIN_WEIGHT, min(MAX_WEIGHT,
            self.weights[action] + effective_lr * outcome * self.emotion.pain_multiplier))

        self.memory.store(self.day, action, self.current_context, outcome)

        # Emotion update
        if outcome > 0.5:
            self.emotion.update("ate_well" if "eat" in action else "fire_lit", outcome * 0.1)
        elif outcome < -0.3:
            self.emotion.update("hungry_bad", abs(outcome) * 0.1)

        # Skill progression
        skill_map = {
            "start_fire": "fire", "tend_fire": "fire", "cook": "cook",
            "craft": "craft", "seek_food": "hunt", "gather": "gather",
        }
        if action in skill_map and outcome > 0:
            sk = skill_map[action]
            self.skill[sk] = min(100, self.skill[sk] + outcome * 2)

        # Knowledge discovery
        if action == "start_fire" and outcome > 0: self.knows.add("fire")
        if action == "cook" and outcome > 0: self.knows.add("cooking")
        if action == "craft" and outcome > 0: self.knows.add("crafting")
        if action == "eat_cooked" and outcome > 0: self.knows.add("cooked_is_better")

        # Log
        icon = "✅" if outcome > 0 else ("❌" if outcome < 0 else "➡️")
        entry = f"Day {self.day}: {icon} {action}({outcome:+.1f}) [{self.current_context}]"
        self.action_log.append(entry)
        if len(self.action_log) > 30:
            self.action_log.pop(0)

    # ── Pain/Pleasure signals ──────────────────────────────────────────────────
    def receive_pain(self, source: str, intensity: float):
        self.learn(self.current_action, -intensity, f"pain:{source}")
        # Direct drive impact (scaled)
        if source == "hunger":
            self.drives.hunger = min(100, self.drives.hunger + intensity * 15 * self.time_scale)
            self.emotion.update("hungry_bad", intensity * 0.2)
        elif source == "cold":
            self.drives.cold = min(100, self.drives.cold + intensity * 20 * self.time_scale)
        elif source in ("injury", "disease"):
            self.drives.fear = min(100, self.drives.fear + intensity * 25 * self.time_scale)
            self.emotion.update("danger", intensity * 0.3)
        elif source == "hunt_fail":
            self.drives.hunger = min(100, self.drives.hunger + intensity * 5 * self.time_scale)
        elif source == "no_tool":
            self.drives.bored = min(100, self.drives.bored + intensity * 10 * self.time_scale)
        elif source == "failure":
            self.emotion.update("hungry_bad", intensity * 0.1)
        self.last_pain = max(self.last_pain, intensity)

    def receive_pleasure(self, source: str, intensity: float):
        self.learn(self.current_action, +intensity, f"pleasure:{source}")
        drive_map = {"food": "hunger", "water": "thirst", "warmth": "cold", "rest": "tired"}
        if source in drive_map:
            self.drives.relieve(drive_map[source], intensity * 30)
        # Reduce boredom and curiosity when satisfied
        self.drives.bored = max(0, self.drives.bored - intensity * 10 * self.time_scale)
        self.drives.curious = max(0, self.drives.curious - intensity * 5 * self.time_scale)

    # ── Social learning ────────────────────────────────────────────────────────
    def observe_partner(self, partner_action: str, outcome: float):
        """เรียนรู้จากการสังเกต partner"""
        if outcome > 0.5:
            self.weights[partner_action] = min(MAX_WEIGHT,
                self.weights[partner_action] + LR * 0.3 * outcome)
            # store as indirect memory
            self.memory.store(self.day, partner_action,
                              "observed+" + self.current_context, outcome * 0.5)

    # ── Inheritance ────────────────────────────────────────────────────────────
    def get_heritable_weights(self) -> Dict[str, float]:
        return dict(self.weights)

    def teach_child(self, child_brain: "Brain", topic: str = None):
        """ถ่ายทอดความรู้ให้ลูก"""
        child_brain.knows.update(self.knows)
        for action, w in self.weights.items():
            if w > 2.0:
                child_brain.weights[action] = max(child_brain.weights[action], w * 0.6)
        for ep in self.memory.episodes[-20:]:
            if ep.outcome > 0.5:
                child_brain.memory.store(child_brain.day, ep.action,
                                         ep.context, ep.outcome * 0.7)
        child_brain.emotion.update("partner_near", 0.1)

    # ── Utilities ──────────────────────────────────────────────────────────────
    @property
    def top_weights(self) -> List[Tuple[str, float]]:
        return sorted(self.weights.items(), key=lambda x: x[1], reverse=True)[:5]

    @property
    def summary(self) -> Dict:
        dominant, level = self.drives.dominant_pain
        return {
            "action": self.current_action,
            "emotion": self.emotion.label,
            "dominant_pain": f"{dominant}({level:.0f})",
            "knows": list(self.knows),
            "skill_fire": round(self.skill["fire"], 1),
            "skill_cook": round(self.skill["cook"], 1),
            "skill_craft": round(self.skill["craft"], 1),
            "top_weights": self.top_weights,
            "memories": self.memory.size,
            "recent_log": self.action_log[-5:],
            "valence": round(self.emotion.valence, 2),
            "arousal": round(self.emotion.arousal, 2),
        }
