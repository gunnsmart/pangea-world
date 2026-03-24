
# models/shelter.py
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Shelter:
    pos: List[int]
    durability: float = 100.0
    protection: float = 0.5  # 0.0 - 1.0 (ลดผลกระทบจากความหนาวและฝน)
    capacity: int = 2
    owner: str = "Common"

    def decay(self, weather_state: str):
        """เสื่อมสภาพตามสภาพอากาศ"""
        decay_rate = 0.5
        if weather_state == "ฝนตก":
            decay_rate = 2.0
        elif weather_state == "พายุเข้า":
            decay_rate = 5.0
        self.durability = max(0, self.durability - decay_rate)
        return self.durability <= 0

    def repair(self, amount: float):
        self.durability = min(100.0, self.durability + amount)

class ShelterSystem:
    def __init__(self):
        self.shelters: List[Shelter] = []

    def build_shelter(self, pos: List[int], owner: str = "Common") -> Shelter:
        new_shelter = Shelter(pos=pos, owner=owner)
        self.shelters.append(new_shelter)
        return new_shelter

    def get_nearby_shelter(self, pos: List[float], radius: float = 2.0) -> Optional[Shelter]:
        for s in self.shelters:
            dist = ((s.pos[0] - pos[0])**2 + (s.pos[1] - pos[1])**2)**0.5
            if dist <= radius:
                return s
        return None

    def step_hour(self, weather_state: str):
        destroyed = []
        for s in self.shelters:
            if s.decay(weather_state):
                destroyed.append(s)
        for s in destroyed:
            self.shelters.remove(s)
        return [f"🏚️ ที่พักที่ตำแหน่ง {s.pos} พังทลายลง" for s in destroyed]
