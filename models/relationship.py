# models/relationship.py
from dataclasses import dataclass
from typing import List

STAGES = [
    (0,10,"🤝 คนแปลกหน้า"),
    (10,25,"👀 รู้จักกัน"),
    (25,45,"🙂 คุ้นเคย"),
    (45,60,"😊 เพื่อนสนิท"),
    (60,75,"💛 ชอบพอ"),
    (75,88,"❤️ รักกัน"),
    (88,100,"💍 คู่ชีวิต"),
]

def get_stage(bond: float) -> str:
    for lo, hi, label in STAGES:
        if lo <= bond < hi:
            return label
    return "💍 คู่ชีวิต"

@dataclass
class Memory:
    day: int
    event: str
    sentiment: float

class Relationship:
    def __init__(self, name_a: str, name_b: str):
        self.name_a = name_a
        self.name_b = name_b
        self.bond = 10.0
        self.trust = 20.0
        self.conflict = 0.0
        self.days_together = 0
        self.days_apart = 0
        self.total_mate = 0
        self.day = 0
        self.memories: List[Memory] = []
        self._last_conflict_day = -999

    @property
    def stage(self) -> str:
        return get_stage(self.bond)

    def step_day(self, dist: int, mated_today: bool,
                 a_hungry: bool, b_hungry: bool) -> List[str]:
        self.day += 1
        events = []
        if dist <= 3:
            self.days_together += 1
            self.days_apart = 0
            self.bond = min(100, self.bond + 0.3)
            self.trust = min(100, self.trust + 0.2)
            if self.days_together % 10 == 0:
                msg = f"💛 {self.name_a} และ {self.name_b} อยู่ด้วยกันมา {self.days_together} วัน"
                events.append(msg)
                self.remember(msg, +0.5)
        else:
            self.days_apart += 1
            self.days_together = 0
            self.bond = max(0, self.bond - 0.1 * min(self.days_apart/10,1))
            self.trust = max(0, self.trust - 0.05)
            if self.days_apart == 5:
                msg = f"😟 {self.name_a} และ {self.name_b} ห่างกันมา 5 วันแล้ว"
                events.append(msg)
                self.remember(msg, -0.3)
        if mated_today:
            self.total_mate += 1
            self.bond = min(100, self.bond + 5.0)
            self.trust = min(100, self.trust + 3.0)
            self.conflict = max(0, self.conflict - 10)
            msg = f"💕 {self.name_a} และ {self.name_b} ใกล้ชิดกัน (ครั้งที่ {self.total_mate})"
            events.append(msg)
            self.remember(msg, +1.0)
        if a_hungry and b_hungry and (self.day - self._last_conflict_day) > 3:
            self.conflict = min(100, self.conflict + 15)
            self.bond = max(0, self.bond - 3)
            self._last_conflict_day = self.day
            msg = f"⚔️ {self.name_a} และ {self.name_b} ทะเลาะเรื่องอาหาร!"
            events.append(msg)
            self.remember(msg, -1.0)
        self.conflict = max(0, self.conflict - 2)

        for threshold, label in [(25,"🙂 คุ้นเคย"), (50,"😊 เพื่อนสนิท"),
                                  (75,"❤️ รักกัน"), (90,"💍 คู่ชีวิต")]:
            if self.bond >= threshold and self.trust >= threshold * 0.8:
                key = f"milestone_{threshold}"
                if not any(key in m.event for m in self.memories):
                    msg = f"🎉 {self.name_a} & {self.name_b} ถึงขั้น '{label}'!"
                    events.append(msg)
                    self.remember(key+": "+msg, +1.0)
                    break
        return events

    def remember(self, event: str, sentiment: float):
        self.memories.append(Memory(self.day, event, sentiment))
        if len(self.memories) > 30:
            self.memories.pop(0)

    @property
    def summary(self) -> dict:
        return {
            "stage": self.stage,
            "bond": round(self.bond, 1),
            "trust": round(self.trust, 1),
            "conflict": round(self.conflict, 1),
            "together": self.days_together,
            "apart": self.days_apart,
            "mate": self.total_mate,
        }