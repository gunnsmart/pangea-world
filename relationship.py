"""
relationship.py — ระบบความสัมพันธ์ระหว่าง Adam และ Eve
────────────────────────────────────────────────────────
ติดตาม:
  • bond       — ความผูกพัน (0–100)
  • trust      — ความไว้วางใจ (0–100)
  • conflict   — ความตึงเครียด (0–100)
  • memories   — เหตุการณ์สำคัญที่จำได้
  • stage      — ระยะความสัมพันธ์ปัจจุบัน
"""

import random
from dataclasses import dataclass, field
from typing import Optional

# ── ระยะความสัมพันธ์ ──────────────────────────────────────────────
STAGES = [
    (0,  10,  "🤝 คนแปลกหน้า"),
    (10, 25,  "👀 รู้จักกัน"),
    (25, 45,  "🙂 คุ้นเคย"),
    (45, 60,  "😊 เพื่อนสนิท"),
    (60, 75,  "💛 ชอบพอ"),
    (75, 88,  "❤️ รักกัน"),
    (88, 100, "💍 คู่ชีวิต"),
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
    sentiment: float   # +1.0 = ดี, -1.0 = แย่


class Relationship:
    """
    ความสัมพันธ์ระหว่างสองคน (Adam ↔ Eve)
    เรียก .step_day() ทุกวันจาก update_world()
    """

    def __init__(self, name_a: str, name_b: str):
        self.name_a = name_a
        self.name_b = name_b

        self.bond     = 10.0    # ความผูกพัน
        self.trust    = 20.0    # ความไว้วางใจ
        self.conflict = 0.0     # ความขัดแย้งสะสม

        self.days_together   = 0    # วันที่อยู่ใกล้กัน (≤3 ช่อง)
        self.days_apart      = 0    # วันที่อยู่ห่างกัน
        self.total_mate      = 0    # จำนวนครั้งที่ mate
        self.day             = 0

        self.memories: list[Memory] = []
        self._last_conflict_day = -999

    # ── ระยะปัจจุบัน ───────────────────────────────────────────────
    @property
    def stage(self) -> str:
        return get_stage(self.bond)

    # ── เพิ่ม memory ───────────────────────────────────────────────
    def remember(self, event: str, sentiment: float):
        self.memories.append(Memory(self.day, event, sentiment))
        if len(self.memories) > 30:   # เก็บแค่ 30 ความทรงจำล่าสุด
            self.memories.pop(0)

    # ── step ทีละวัน ───────────────────────────────────────────────
    def step_day(self, dist: int, mated_today: bool,
                 a_hungry: bool, b_hungry: bool) -> list[str]:
        """
        dist          — ระยะห่างระหว่างสองคน (manhattan)
        mated_today   — mate กันวันนี้ไหม
        a_hungry / b_hungry — คนใดคนหนึ่งหิวมากไหม
        คืน list ของ event string
        """
        self.day += 1
        events = []

        # ── อยู่ใกล้กัน (≤3) → bond เพิ่ม ─────────────────────────
        if dist <= 3:
            self.days_together += 1
            self.days_apart     = 0
            self.bond  = min(100, self.bond  + 0.3)
            self.trust = min(100, self.trust + 0.2)

            # milestone ทุก 10 วันที่อยู่ด้วยกัน
            if self.days_together % 10 == 0:
                msg = f"💛 {self.name_a} และ {self.name_b} อยู่ด้วยกันมา {self.days_together} วัน"
                events.append(msg)
                self.remember(msg, +0.5)

        else:
            # อยู่ห่างกัน → bond ค่อยๆ ลด
            self.days_apart    += 1
            self.days_together  = 0
            self.bond  = max(0, self.bond  - 0.1 * min(self.days_apart / 10, 1))
            self.trust = max(0, self.trust - 0.05)

            if self.days_apart == 5:
                msg = f"😟 {self.name_a} และ {self.name_b} ห่างกันมา 5 วันแล้ว"
                events.append(msg)
                self.remember(msg, -0.3)

        # ── mate → bond พุ่ง ────────────────────────────────────────
        if mated_today:
            self.total_mate += 1
            self.bond     = min(100, self.bond  + 5.0)
            self.trust    = min(100, self.trust + 3.0)
            self.conflict = max(0,   self.conflict - 10)
            msg = f"💕 {self.name_a} และ {self.name_b} ใกล้ชิดกัน (ครั้งที่ {self.total_mate})"
            events.append(msg)
            self.remember(msg, +1.0)

        # ── ความขัดแย้ง (ทั้งคู่หิวพร้อมกัน) ──────────────────────
        if a_hungry and b_hungry and (self.day - self._last_conflict_day) > 3:
            self.conflict = min(100, self.conflict + 15)
            self.bond     = max(0,   self.bond     - 3)
            self._last_conflict_day = self.day
            msg = f"⚔️ {self.name_a} และ {self.name_b} ทะเลาะเรื่องอาหาร!"
            events.append(msg)
            self.remember(msg, -1.0)

        # ── conflict ค่อยๆ คลาย ────────────────────────────────────
        self.conflict = max(0, self.conflict - 2)

        # ── milestone bond ──────────────────────────────────────────
        for threshold, label in [(25, "🙂 คุ้นเคย"), (50, "😊 เพื่อนสนิท"),
                                  (75, "❤️ รักกัน"), (90, "💍 คู่ชีวิต")]:
            if self.bond >= threshold and self.trust >= threshold * 0.8:
                key = f"milestone_{threshold}"
                if not any(key in m.event for m in self.memories):
                    msg = f"🎉 {self.name_a} & {self.name_b} ถึงขั้น '{label}'!"
                    events.append(msg)
                    self.remember(key + ": " + msg, +1.0)
                break

        return events

    # ── สรุปสำหรับแสดงใน UI ────────────────────────────────────────
    @property
    def summary(self) -> dict:
        return {
            "stage":    self.stage,
            "bond":     round(self.bond, 1),
            "trust":    round(self.trust, 1),
            "conflict": round(self.conflict, 1),
            "together": self.days_together,
            "apart":    self.days_apart,
            "mate":     self.total_mate,
        }

    @property
    def recent_memories(self) -> list[Memory]:
        return list(reversed(self.memories[-5:]))
