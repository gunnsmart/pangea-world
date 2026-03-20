"""
senses.py — ระบบประสาทสัมผัส: Vision + Hearing + Memory
═══════════════════════════════════════════════════════════
Vision:
  • scan รัศมีรอบตัว — เห็นอาหาร, น้ำ, ไฟ, สัตว์, partner, ภัย
  • ความชัดเจนขึ้นกับแสง (กลางวัน/คืน) และสิ่งกีดขวาง
  • สิ่งที่เห็น → trigger emotion → บันทึก memory

Memory:
  • Episodic   — เหตุการณ์ที่เกิดขึ้น (เมื่อไหร่/ที่ไหน/ทำอะไร/รู้สึกอะไร)
  • Semantic   — ความรู้ทั่วไป (ที่นี่มีอาหาร, ไฟให้ความอุ่น)
  • Spatial    — แผนที่ในหัว (จำตำแหน่งสำคัญ)
  • Emotional  — ความทรงจำทางอารมณ์ (ที่นี่เคยเจ็บ)
"""

import math
import random
from dataclasses import dataclass, field
from typing import Optional

# ── Vision constants ──────────────────────────────────────────────────────
VISION_RADIUS_DAY   = 8    # cell — มองเห็นกลางวัน
VISION_RADIUS_NIGHT = 3    # cell — มืดมาก
VISION_RADIUS_FIRE  = 6    # cell — ใกล้ไฟเห็นชัดขึ้น


# ════════════════════════════════════════════════════════
# WHAT CAN BE SEEN
# ════════════════════════════════════════════════════════
@dataclass
class VisualObject:
    """สิ่งที่มองเห็นได้"""
    kind:     str      # "food","water","fire","animal_prey","animal_pred",
                       # "partner","human","danger","herb","shelter"
    pos:      list
    distance: float
    detail:   str = "" # รายละเอียดเพิ่มเติม (species, food_level, etc.)
    valence:  float = 0.0  # +บวก=น่าสนใจ, -ลบ=น่ากลัว


@dataclass
class SoundEvent:
    """เสียงที่ได้ยิน"""
    kind:      str     # "rustling","footstep","roar","fire_crackle","rain","thunder"
    source:    list    # [r,c]
    distance:  float
    intensity: float   # 0–1
    label:     str = ""


# ════════════════════════════════════════════════════════
# MEMORY SYSTEMS
# ════════════════════════════════════════════════════════
@dataclass
class EpisodicEvent:
    """เหตุการณ์ที่เกิดขึ้น — episodic memory"""
    day:       int
    hour:      int
    pos:       list
    action:    str
    outcome:   float   # +pleasure / -pain
    emotion:   str     # อารมณ์ขณะนั้น
    context:   str     # สิ่งที่เห็น/ได้ยินขณะนั้น
    importance:float = 0.5   # 0–1 สำคัญแค่ไหน (สูง = จำนานกว่า)


@dataclass
class SpatialMemory:
    """ตำแหน่งที่จำได้"""
    kind:      str     # "food_rich","water","fire_spot","danger","shelter"
    pos:       list
    last_seen: int     # day ที่เห็นล่าสุด
    visits:    int = 1
    reliability: float = 1.0  # ลดลงตามเวลา


class LongTermMemory:
    """
    ความทรงจำระยะยาว — จำเหตุการณ์สำคัญได้นาน
    ระบบลืม (forgetting curve) — ความทรงจำเลือนหายตามเวลา
    เว้นแต่ถูกกระตุ้นซ้ำ (reconsolidation)
    """

    def __init__(self, capacity: int = 500):
        self.capacity  = capacity
        self.episodes  : list[EpisodicEvent] = []
        self.spatial   : list[SpatialMemory] = []
        self.semantic  : dict[str, float]    = {}  # knowledge: "fire=warm" → confidence

    # ── Episodic ──────────────────────────────────────────────────────
    def store_episode(self, day: int, hour: int, pos: list,
                      action: str, outcome: float, emotion: str,
                      context: str, importance: float = 0.5):
        ep = EpisodicEvent(day, hour, pos[:], action, outcome,
                           emotion, context, importance)
        self.episodes.append(ep)

        # ลบความทรงจำที่สำคัญน้อยและเก่าที่สุดถ้าเกิน capacity
        if len(self.episodes) > self.capacity:
            # เรียงตาม importance × recency
            self.episodes.sort(
                key=lambda e: e.importance * (1 / max(1, day - e.day + 1)),
                reverse=True
            )
            self.episodes = self.episodes[:self.capacity]

    def recall_episodes(self, context: str = "", location: list = None,
                        action: str = "", limit: int = 5) -> list[EpisodicEvent]:
        """ดึงความทรงจำที่เกี่ยวข้อง"""
        candidates = self.episodes

        if context:
            ctx_keys = set(context.lower().split())
            candidates = [e for e in candidates
                          if any(k in e.context.lower() for k in ctx_keys)]

        if location:
            candidates = sorted(candidates,
                key=lambda e: abs(e.pos[0]-location[0])+abs(e.pos[1]-location[1]))

        if action:
            candidates = [e for e in candidates if e.action == action]

        return sorted(candidates,
                      key=lambda e: (e.importance, e.day),
                      reverse=True)[:limit]

    def avg_outcome_for_action(self, action: str, context: str = "") -> float:
        """outcome เฉลี่ยของ action นี้ — ใช้ตัดสินใจ"""
        eps = self.recall_episodes(context=context, action=action, limit=20)
        if not eps:
            return 0.0
        # recency-weighted average
        total_w, total_v = 0.0, 0.0
        for i, e in enumerate(eps):
            w = 1.0 + i * 0.1
            total_w += w
            total_v += e.outcome * w
        return total_v / total_w if total_w > 0 else 0.0

    # ── Spatial ───────────────────────────────────────────────────────
    def remember_place(self, kind: str, pos: list, day: int):
        # ค้นหาว่ามีตำแหน่งนี้อยู่แล้วไหม
        for sm in self.spatial:
            if sm.kind == kind and abs(sm.pos[0]-pos[0])+abs(sm.pos[1]-pos[1]) <= 2:
                sm.visits    += 1
                sm.last_seen  = day
                sm.reliability= min(1.0, sm.reliability + 0.1)
                return
        self.spatial.append(SpatialMemory(kind, pos[:], day))
        if len(self.spatial) > 100:
            # ลบที่ไปนานที่สุดและ reliability ต่ำ
            self.spatial.sort(key=lambda s: s.reliability * s.visits, reverse=True)
            self.spatial = self.spatial[:80]

    def find_nearest(self, kind: str, pos: list, max_age: int = 30) -> Optional[SpatialMemory]:
        """หาตำแหน่งที่ใกล้ที่สุดและยังน่าเชื่อถือ"""
        candidates = [
            s for s in self.spatial
            if s.kind == kind and s.reliability > 0.3
        ]
        if not candidates:
            return None
        return min(candidates,
                   key=lambda s: abs(s.pos[0]-pos[0])+abs(s.pos[1]-pos[1]))

    def decay(self, current_day: int):
        """ความทรงจำ spatial เลือนหายตามเวลา"""
        for sm in self.spatial:
            days_old = current_day - sm.last_seen
            sm.reliability = max(0.1, sm.reliability * (0.99 ** days_old))

    # ── Semantic ──────────────────────────────────────────────────────
    def learn_fact(self, fact: str, confidence: float = 1.0):
        """เรียนรู้ความจริงทั่วไป เช่น 'fire=warm', 'cooked_food=better'"""
        existing = self.semantic.get(fact, 0.0)
        self.semantic[fact] = min(1.0, existing + confidence * 0.2)

    def knows(self, fact: str, threshold: float = 0.5) -> bool:
        return self.semantic.get(fact, 0.0) >= threshold

    # ── Narrative — เล่าความทรงจำเป็นประโยค ─────────────────────────
    def narrate_recent(self, n: int = 5) -> list[str]:
        """เล่าเหตุการณ์ล่าสุด N ครั้งเป็นภาษาไทย"""
        recent = sorted(self.episodes, key=lambda e: e.day, reverse=True)[:n]
        narratives = []
        for ep in recent:
            feeling = "มีความสุข" if ep.outcome > 0.3 else (
                      "เจ็บปวด" if ep.outcome < -0.3 else "เฉยๆ")
            narratives.append(
                f"วันที่ {ep.day} เวลา {ep.hour:02d}:00 "
                f"ที่ [{ep.pos[0]},{ep.pos[1]}] "
                f"{ep.action} → {feeling} ({ep.emotion})"
            )
        return narratives

    @property
    def size(self) -> int:
        return len(self.episodes)


# ════════════════════════════════════════════════════════
# VISION SYSTEM
# ════════════════════════════════════════════════════════
class VisionSystem:
    """
    ระบบการมองเห็น — scan รัศมีรอบตัว
    สิ่งที่เห็น → VisualObject list → ส่งต่อให้ Brain + Memory
    """

    def scan(self, pos: list, hour: int, terrain,
             animals: list, partner, fire_system,
             near_fire: bool = False) -> list[VisualObject]:
        """
        scan สิ่งแวดล้อมรอบตัว
        คืน list ของ VisualObject ที่เห็นได้
        """
        # ── Vision radius ตามแสง ────────────────────────────────
        if 8 <= hour < 17:
            radius = VISION_RADIUS_DAY
        elif near_fire:
            radius = VISION_RADIUS_FIRE
        else:
            radius = VISION_RADIUS_NIGHT

        SIZE     = terrain.size
        visible  = []
        seen_pos = set()

        for dr in range(-radius, radius+1):
            for dc in range(-radius, radius+1):
                r = pos[0] + dr
                c = pos[1] + dc
                if not (0 <= r < SIZE and 0 <= c < SIZE):
                    continue
                dist = math.sqrt(dr*dr + dc*dc)
                if dist > radius:
                    continue
                if (r, c) in seen_pos:
                    continue
                seen_pos.add((r, c))

                info = terrain.get_info(r, c)

                # อาหาร
                if info["food_level"] > 30:
                    visible.append(VisualObject(
                        "food", [r,c], dist,
                        f"food_level={info['food_level']:.0f}",
                        valence=+0.6
                    ))

                # น้ำ
                if info.get("is_water"):
                    visible.append(VisualObject(
                        "water", [r,c], dist, "", valence=+0.4
                    ))

                # สมุนไพร
                if info.get("has_herb"):
                    visible.append(VisualObject(
                        "herb", [r,c], dist, "", valence=+0.3
                    ))

        # ── สัตว์ป่า ──────────────────────────────────────────────
        for a in animals:
            if not a.alive:
                continue
            dist = math.sqrt((a.pos[0]-pos[0])**2 + (a.pos[1]-pos[1])**2)
            if dist > radius:
                continue
            kind    = "animal_pred" if a.a_type == "Carnivore" else "animal_prey"
            valence = -0.8 if a.a_type == "Carnivore" else +0.5
            visible.append(VisualObject(
                kind, a.pos[:], dist,
                f"{a.species} ({a.status})",
                valence=valence
            ))

        # ── Partner ───────────────────────────────────────────────
        if partner:
            dist = math.sqrt((partner.pos[0]-pos[0])**2 + (partner.pos[1]-pos[1])**2)
            if dist <= radius:
                visible.append(VisualObject(
                    "partner", partner.pos[:], dist,
                    f"{partner.name} ({partner.current_action})",
                    valence=+0.7
                ))

        # ── ไฟ ────────────────────────────────────────────────────
        for f in fire_system.active_fires:
            dist = math.sqrt((f.pos[0]-pos[0])**2 + (f.pos[1]-pos[1])**2)
            if dist <= radius * 1.5:   # ไฟเห็นได้ไกลกว่า
                visible.append(VisualObject(
                    "fire", f.pos[:], dist,
                    f"temp={f.fire_temp_c:.0f}°C fuel={f.fuel_kg:.1f}kg",
                    valence=+0.6
                ))

        # เรียงตามระยะทาง (ใกล้สุดก่อน)
        visible.sort(key=lambda v: v.distance)
        return visible

    def to_perception_dict(self, visible: list[VisualObject],
                           memory: LongTermMemory,
                           pos: list, day: int) -> dict:
        """
        แปลง VisualObject list → perception dict สำหรับ Brain
        รวมกับ memory เพื่อให้ brain ตัดสินใจได้ดีขึ้น
        """
        kinds = {v.kind for v in visible}
        closest = {}
        for v in visible:
            if v.kind not in closest:
                closest[v.kind] = v

        # Memory-enhanced perception
        food_memory   = memory.find_nearest("food_rich", pos)
        water_memory  = memory.find_nearest("water", pos)
        fire_memory   = memory.find_nearest("fire_spot", pos)
        danger_memory = memory.find_nearest("danger", pos)

        return {
            # สิ่งที่เห็นตอนนี้
            "sees_food":       "food"         in kinds,
            "sees_water":      "water"        in kinds,
            "sees_fire":       "fire"         in kinds,
            "sees_prey":       "animal_prey"  in kinds,
            "sees_predator":   "animal_pred"  in kinds,
            "sees_partner":    "partner"      in kinds,
            "sees_herb":       "herb"         in kinds,
            # ระยะทาง
            "food_dist":       closest.get("food",         type("",(), {"distance":99})).distance,
            "water_dist":      closest.get("water",        type("",(), {"distance":99})).distance,
            "fire_dist":       closest.get("fire",         type("",(), {"distance":99})).distance,
            "predator_dist":   closest.get("animal_pred",  type("",(), {"distance":99})).distance,
            "partner_dist_vis":closest.get("partner",      type("",(), {"distance":99})).distance,
            # Memory recall
            "mem_food_pos":    food_memory.pos   if food_memory   else None,
            "mem_water_pos":   water_memory.pos  if water_memory  else None,
            "mem_fire_pos":    fire_memory.pos   if fire_memory   else None,
            "mem_danger_pos":  danger_memory.pos if danger_memory else None,
            # Semantic knowledge
            "knows_fire_warm": memory.knows("fire=warm"),
            "knows_cook":      memory.knows("cooked_food=better"),
            "knows_water_loc": water_memory is not None,
            # raw visible list
            "visible":         visible,
        }


# ════════════════════════════════════════════════════════
# SOUND SYSTEM
# ════════════════════════════════════════════════════════
class SoundSystem:
    """
    ระบบได้ยินเสียง — เหตุการณ์รอบข้างส่งเสียง
    เสียงใกล้ = ดัง = ส่งผลต่ออารมณ์มาก
    """
    HEAR_RADIUS = 12   # cell

    def listen(self, pos: list, animals: list,
               weather_state: str, fire_system,
               disasters: list) -> list[SoundEvent]:
        events = []

        # เสียงสัตว์
        for a in animals:
            if not a.alive:
                continue
            dist = math.sqrt((a.pos[0]-pos[0])**2 + (a.pos[1]-pos[1])**2)
            if dist > self.HEAR_RADIUS:
                continue
            intensity = max(0, 1 - dist/self.HEAR_RADIUS)

            if a.a_type == "Carnivore" and not a.sleeping:
                events.append(SoundEvent(
                    "roar", a.pos[:], dist, intensity,
                    f"ได้ยินเสียง{a.species}"
                ))
            elif a.a_type == "Herbivore" and a.drives.fear > 50:
                events.append(SoundEvent(
                    "rustling", a.pos[:], dist, intensity * 0.5,
                    f"ได้ยินเสียงสัตว์ตกใจ"
                ))

        # เสียงไฟ
        for f in fire_system.active_fires:
            dist = math.sqrt((f.pos[0]-pos[0])**2 + (f.pos[1]-pos[1])**2)
            if dist <= 5:
                events.append(SoundEvent(
                    "fire_crackle", f.pos[:], dist,
                    max(0, 1 - dist/5),
                    "ได้ยินเสียงไฟดังแตกปะทุ"
                ))

        # เสียงสภาพอากาศ
        if weather_state == "ฝนตก":
            events.append(SoundEvent("rain",    pos, 0, 0.6, "ฝนตก"))
        elif weather_state == "พายุเข้า":
            events.append(SoundEvent("thunder", pos, 0, 1.0, "พายุฟ้าร้อง"))

        # ภัยธรรมชาติ
        for d in disasters:
            if d.get("label"):
                events.append(SoundEvent(
                    "disaster", pos, 0, d.get("severity", 0.5),
                    f"ได้ยินเสียง{d['label']}"
                ))

        return events

    def to_perception(self, sounds: list[SoundEvent]) -> dict:
        has_danger_sound = any(s.kind in ("roar","thunder","disaster") for s in sounds)
        max_intensity    = max((s.intensity for s in sounds), default=0)
        labels           = [s.label for s in sounds[:3]]
        return {
            "hears_danger": has_danger_sound,
            "sound_intensity": max_intensity,
            "sound_labels": labels,
        }
