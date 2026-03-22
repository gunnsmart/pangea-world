# systems/senses.py
import math
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from utils.config import VISION_RADIUS_DAY, VISION_RADIUS_NIGHT, VISION_RADIUS_FIRE, SOUND_RADIUS

@dataclass
class VisualObject:
    kind: str
    pos: List[int]
    distance: float
    detail: str = ""
    valence: float = 0.0

@dataclass
class SoundEvent:
    kind: str
    source: List[int]
    distance: float
    intensity: float
    label: str = ""

class VisionSystem:
    def scan(self, pos: List[float], hour: int, terrain,
             animals: list, partner, fire_system,
             near_fire: bool = False) -> List[VisualObject]:
        if 8 <= hour < 17:
            radius = VISION_RADIUS_DAY
        elif near_fire:
            radius = VISION_RADIUS_FIRE
        else:
            radius = VISION_RADIUS_NIGHT

        SIZE = terrain.size
        visible = []
        seen_pos = set()

        for dr in range(-radius, radius+1):
            for dc in range(-radius, radius+1):
                r = int(pos[0]) + dr
                c = int(pos[1]) + dc
                if not (0 <= r < SIZE and 0 <= c < SIZE):
                    continue
                dist = math.sqrt(dr*dr+dc*dc)
                if dist > radius:
                    continue
                if (r,c) in seen_pos:
                    continue
                seen_pos.add((r,c))
                info = terrain.get_info(r,c)
                if info["food_level"] > 30:
                    visible.append(VisualObject("food", [r,c], dist, f"food={info['food_level']:.0f}", +0.6))
                if info.get("is_water"):
                    visible.append(VisualObject("water", [r,c], dist, "", +0.4))
                if info.get("has_herb"):
                    visible.append(VisualObject("herb", [r,c], dist, "", +0.3))

        for a in animals:
            if not a.alive:
                continue
            dist = math.sqrt((a.pos[0]-pos[0])**2 + (a.pos[1]-pos[1])**2)
            if dist > radius:
                continue
            kind = "animal_pred" if a.a_type == "Carnivore" else "animal_prey"
            valence = -0.8 if a.a_type == "Carnivore" else +0.5
            visible.append(VisualObject(kind, a.pos, dist, f"{a.species} ({a.status})", valence))

        if partner:
            dist = math.sqrt((partner.pos[0]-pos[0])**2 + (partner.pos[1]-pos[1])**2)
            if dist <= radius:
                visible.append(VisualObject("partner", partner.pos, dist, f"{partner.name}", +0.7))

        for f in fire_system.active_fires:
            dist = math.sqrt((f.pos[0]-pos[0])**2 + (f.pos[1]-pos[1])**2)
            if dist <= radius*1.5:
                visible.append(VisualObject("fire", f.pos, dist, f"temp={f.fire_temp_c:.0f}", +0.6))

        visible.sort(key=lambda v: v.distance)
        return visible

    def to_perception_dict(self, visible: List[VisualObject],
                           memory, pos: List[int], day: int) -> Dict[str, Any]:
        kinds = {v.kind for v in visible}
        closest = {}
        for v in visible:
            if v.kind not in closest:
                closest[v.kind] = v

        food_mem = memory.find_nearest("food_rich", pos)
        water_mem = memory.find_nearest("water", pos)
        fire_mem = memory.find_nearest("fire_spot", pos)
        danger_mem = memory.find_nearest("danger", pos)

        return {
            "sees_food": "food" in kinds,
            "sees_water": "water" in kinds,
            "sees_fire": "fire" in kinds,
            "sees_prey": "animal_prey" in kinds,
            "sees_predator": "animal_pred" in kinds,
            "sees_partner": "partner" in kinds,
            "food_dist": closest.get("food", type("",(),{"distance":99})).distance,
            "water_dist": closest.get("water", type("",(),{"distance":99})).distance,
            "fire_dist": closest.get("fire", type("",(),{"distance":99})).distance,
            "predator_dist": closest.get("animal_pred", type("",(),{"distance":99})).distance,
            "mem_food_pos": food_mem.pos if food_mem else None,
            "mem_water_pos": water_mem.pos if water_mem else None,
            "mem_fire_pos": fire_mem.pos if fire_mem else None,
            "mem_danger_pos": danger_mem.pos if danger_mem else None,
        }

class SoundSystem:
    def listen(self, pos: List[float], animals: list,
               weather_state: str, fire_system, disasters: list) -> List[SoundEvent]:
        events = []
        for a in animals:
            if not a.alive:
                continue
            dist = math.sqrt((a.pos[0]-pos[0])**2 + (a.pos[1]-pos[1])**2)
            if dist > SOUND_RADIUS:
                continue
            intensity = max(0, 1 - dist/SOUND_RADIUS)
            if a.a_type == "Carnivore" and not a.sleeping:
                events.append(SoundEvent("roar", a.pos, dist, intensity, f"ได้ยินเสียง{a.species}"))
            elif a.a_type == "Herbivore" and a.drives.fear > 50:
                events.append(SoundEvent("rustling", a.pos, dist, intensity*0.5, "ได้ยินเสียงสัตว์ตกใจ"))

        for f in fire_system.active_fires:
            dist = math.sqrt((f.pos[0]-pos[0])**2 + (f.pos[1]-pos[1])**2)
            if dist <= 5:
                events.append(SoundEvent("fire_crackle", f.pos, dist, max(0,1-dist/5), "ไฟดังแตกปะทุ"))

        if weather_state == "ฝนตก":
            events.append(SoundEvent("rain", pos, 0, 0.6, "ฝนตก"))
        elif weather_state == "พายุเข้า":
            events.append(SoundEvent("thunder", pos, 0, 1.0, "พายุฟ้าร้อง"))

        for d in disasters:
            if d.get("label"):
                events.append(SoundEvent("disaster", pos, 0, d.get("severity",0.5), f"ได้ยินเสียง{d['label']}"))

        return events

    def to_perception(self, sounds: List[SoundEvent]) -> Dict:
        has_danger = any(s.kind in ("roar","thunder","disaster") for s in sounds)
        max_intensity = max((s.intensity for s in sounds), default=0)
        labels = [s.label for s in sounds[:3]]
        return {
            "hears_danger": has_danger,
            "sound_intensity": max_intensity,
            "sound_labels": labels,
        }