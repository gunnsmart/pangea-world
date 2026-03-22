"""
human_ai.py — Human Agent ที่รวม Body + Brain + Senses
ใช้ Brain ในการตัดสินใจ (pure autonomous)
"""

import random
import numpy as np
from datetime import datetime
from body import Body
from brain import Brain
from senses import VisionSystem, SoundSystem, LongTermMemory
from language import ProtoLanguage

class HumanAI:
    def __init__(self, name: str, height: float, mass: float, partner_name: str, time_scale: float = 1.0):
        self.name = name
        self.partner_name = partner_name
        self.sex = "M" if name == "Adam" else "F"
        self.time_scale = time_scale

        # 🧬 ร่างกาย
        self.body = Body(name, self.sex, mass, height, time_scale=time_scale)

        # 🧠 สมอง
        self.brain = Brain(name, time_scale=time_scale)

        # 👁 ประสาทสัมผัส
        self.vision = VisionSystem()
        self.hearing = SoundSystem()
        self.ltm = LongTermMemory(capacity=500)

        # 💬 ภาษา
        self.lang = ProtoLanguage(name)
        self.last_utterance = None

        # สถานะปัจจุบัน
        self.sleeping = False
        self.current_action = "idle"
        self.inventory = []
        self.knowledge = {}

        # วัตถุดิบสำหรับ crafting
        self.materials_attr = {
            "หินเหล็กไฟ": {"sharp": 15, "hard": 60, "heat": 40, "weight": 20},
            "กิ่งไม้แห้ง": {"sharp": 5,  "hard": 15, "heat": 20, "length": 50},
            "ใบไม้ใหญ่":  {"sharp": 0,  "hard": 2,  "insulation": 40, "soft": 30},
            "เถาวัลย์":   {"sharp": 0,  "hard": 10, "binding": 60, "length": 30},
            "หินคม":      {"sharp": 40, "hard": 50, "heat": 10, "weight": 15},
        }

        # กำหนดตำแหน่งเริ่มต้น (ใช้ body.position)
        self.body.position = np.array([50.0, 50.0, 0.0])  # x, y, z

    # ────────────────────────────────────────────────────────────────
    # 🧠 Perception Gathering (เรียกก่อน brain.step)
    # ────────────────────────────────────────────────────────────────
    def gather_perception(self, hour: int, partner, terrain, weather, fire_system, animals, disasters, has_cooked_food):
        """
        รวบรวมข้อมูลทั้งหมดที่ brain ต้องการ
        """
        # Vision scan
        visible = self.vision.scan(
            pos=self.body.position,
            hour=hour,
            terrain=terrain,
            animals=animals,
            partner=partner,
            fire_system=fire_system,
            near_fire=fire_system.nearby_fire(self.body.position, radius=3) is not None
        )
        vision_perc = self.vision.to_perception_dict(visible, self.ltm, self.body.position, day=None)

        # Sound scan
        sounds = self.hearing.listen(
            self.body.position,
            animals,
            weather,
            fire_system,
            disasters
        )
        sound_perc = self.hearing.to_perception(sounds)

        # Basic info
        info = terrain.get_info(int(self.body.position[0]), int(self.body.position[1]))
        has_danger = any(
            a.a_type == "Carnivore" and not a.sleeping and
            np.linalg.norm(a.pos - self.body.position[:2]) <= 4
            for a in animals
        )
        partner_dist = np.linalg.norm(self.body.position[:2] - partner.body.position[:2])

        # Build perception dict
        perception = {
            "temp_c": weather.global_temperature,
            "hour": hour,
            "partner_dist": partner_dist,
            "partner_sleeping": partner.sleeping,
            "partner_hungry": partner.brain.drives.hunger > 70,
            "danger": has_danger,
            "has_food": info["food_level"] > 20,
            "has_water": info.get("is_water", False),
            "has_fire": fire_system.nearby_fire(self.body.position, radius=3) is not None,
            "has_cooked_food": has_cooked_food,
            "biome_food": info["food_level"],
            "is_night": hour >= 21 or hour < 6,
            "inventory": self.inventory,
            "has_child_nearby": False,  # จะ implement ทีหลัง
            # vision/sound override
            "sees_food": vision_perc.get("sees_food", False),
            "sees_water": vision_perc.get("sees_water", False),
            "sees_fire": vision_perc.get("sees_fire", False),
            "sees_predator": vision_perc.get("sees_predator", False),
            "mem_food_pos": vision_perc.get("mem_food_pos"),
            "mem_water_pos": vision_perc.get("mem_water_pos"),
            "mem_fire_pos": vision_perc.get("mem_fire_pos"),
            "hears_danger": sound_perc.get("hears_danger", False),
        }
        return perception, visible, sounds

    # ────────────────────────────────────────────────────────────────
    # 🧠 เรียก brain.step() และ execute action (จะถูกเรียกจาก server.py)
    # ────────────────────────────────────────────────────────────────
    def decide_action(self, perception: dict) -> str:
        """เรียก brain.step() และคืน action"""
        action = self.brain.step(perception)
        self.current_action = action
        return action

    # ────────────────────────────────────────────────────────────────
    # 🗣️ ภาษา
    # ────────────────────────────────────────────────────────────────
    def speak(self, context: str, partner, day: int):
        """พูดตาม drive ที่โดดเด่น"""
        if self.sleeping:
            return None
        dominant, level = self.brain.drives.dominant_pain
        if level < 50:
            return None
        utterance = self.lang.speak(
            intent=dominant,
            context=context,
            day=day,
            partner_dist=np.linalg.norm(self.body.position[:2] - partner.body.position[:2])
        )
        if utterance:
            self.last_utterance = utterance
            # ให้ partner ได้ยิน
            if np.linalg.norm(self.body.position[:2] - partner.body.position[:2]) <= 10:
                partner.lang.hear(utterance, context)
            return utterance
        return None

    # ────────────────────────────────────────────────────────────────
    # 🧪 Experiment (Crafting)
    # ────────────────────────────────────────────────────────────────
    def experiment(self):
        if self.sleeping:
            return None, None, None
        if len(self.inventory) < 2:
            return None, None, None
        items = random.sample(self.inventory, 2)
        attr1 = self.materials_attr.get(items[0], {"hard": 1})
        attr2 = self.materials_attr.get(items[1], {"hard": 1})
        stats = {
            "ความคม": attr1.get("sharp", 0) + attr2.get("sharp", 0),
            "ความแข็ง": attr1.get("hard", 0) + attr2.get("hard", 0),
            "ความร้อน": attr1.get("heat", 0) + attr2.get("heat", 0),
            "ความยาว/ระยะ": attr1.get("length", 0) + attr2.get("length", 0),
            "การกันหนาว": attr1.get("insulation", 0) + attr2.get("insulation", 0),
            "การยึดเหนี่ยว": attr1.get("binding", 0) + attr2.get("binding", 0),
        }
        # ถ้ามี Groq API key ก็เรียก ไม่งั้นใช้ default
        invention = self._invent_name(items[0], items[1], stats)
        key = tuple(sorted(items))
        self.knowledge[key] = invention
        return items, stats, invention

    def _invent_name(self, item1, item2, stats):
        """สร้างชื่อสิ่งประดิษฐ์ง่ายๆ (ไม่ใช้ API ถ้าไม่มี)"""
        # default logic
        if "หิน" in item1 and "ไม้" in item2:
            return {"name": "ขวานหิน", "use": "ตัดไม้ ล่าสัตว์"}
        if "เถาวัลย์" in item1 or "เถาวัลย์" in item2:
            return {"name": "เชือก", "use": "ผูกมัด"}
        if "ใบไม้" in item1 or "ใบไม้" in item2:
            return {"name": "เครื่องนุ่งห่ม", "use": "กันหนาว"}
        return {"name": f"{item1}+{item2}", "use": "ไม่ทราบ"}

    # ────────────────────────────────────────────────────────────────
    # ⚙️ Physics Update (เรียกทุก hour ใน simulation)
    # ────────────────────────────────────────────────────────────────
    def update_physics(self, terrain_elevation: float):
        """อัปเดตฟิสิกส์ของ body"""
        self.body.physics_step(terrain_elevation)

    # ────────────────────────────────────────────────────────────────
    # 📊 Properties
    # ────────────────────────────────────────────────────────────────
    @property
    def pos(self):
        return [int(self.body.position[0]), int(self.body.position[1])]

    @pos.setter
    def pos(self, value):
        self.body.position[0] = float(value[0])
        self.body.position[1] = float(value[1])
        self.body.position[2] = float(value[2]) if len(value) > 2 else 0.0

    @property
    def health(self):
        return self.body.health

    @health.setter
    def health(self, value):
        self.body.health = value

    @property
    def u_energy(self):
        return self.body.u_energy

    @u_energy.setter
    def u_energy(self, value):
        self.body.u_energy = value

    @property
    def age(self):
        return self.body.age_years

    @age.setter
    def age(self, value):
        self.body.age = value * 365

    @property
    def summary(self):
        """สรุปสำหรับ UI"""
        return {
            "name": self.name,
            "sex": self.sex,
            "pos": self.pos,
            "health": round(self.body.health, 1),
            "age": round(self.body.age_years, 1),
            "action": self.current_action,
            "sleeping": self.sleeping,
            "emotion": self.brain.emotion.label,
            "drives": {
                "hunger": round(self.brain.drives.hunger, 1),
                "tired": round(self.brain.drives.tired, 1),
                "cold": round(self.brain.drives.cold, 1),
                "fear": round(self.brain.drives.fear, 1),
                "lonely": round(self.brain.drives.lonely, 1),
                "bored": round(self.brain.drives.bored, 1),
            },
            "skills": self.brain.skill,
            "inventory": self.inventory,
            "language": self.lang.summary,
            "last_speech": " ".join(self.last_utterance.words) if self.last_utterance else "",
        }
