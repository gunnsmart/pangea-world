# models/fire.py
import random
import math
from dataclasses import dataclass
import copy
from typing import List, Optional, Dict, Any
from utils.config import FUEL_BURN_RATE, IGNITION_TEMP_C, FIRE_TEMP_C, COOKING_TEMP_C, MAILLARD_TEMP_C, WARMTH_RADIUS



# ... (ส่วน Campfire และ FireSystem เหมือนเดิม) ...

@dataclass
class Food:
    name: str
    raw_kcal: float
    cooked_kcal: float = 0.0
    cooked: bool = False
    protein_g: float = 0.0
    carb_g: float = 0.0

    def cook(self, fire_temp_c: float):
        if self.cooked:
            return False, f"🍖 {self.name} สุกแล้ว"
        if fire_temp_c < 60:
            return False, f"🥩 ไฟไม่ร้อนพอ ({fire_temp_c:.0f}°C < 60°C)"
        self.cooked = True
        base_bonus = 1.3
        if fire_temp_c >= 140:
            base_bonus = 1.5
        self.cooked_kcal = self.raw_kcal * base_bonus
        return True, f"✅ {self.name} สุกแล้ว (+{(base_bonus-1)*100:.0f}% kcal)"

    @property
    def kcal(self):
        return self.cooked_kcal if self.cooked else self.raw_kcal * 0.7

class FireSystem:
    # ... (existing code) ...
    def cook_food(self, food_name: str, fire: Campfire):
        if not fire or not fire.active:
            return None, "❌ ไม่มีไฟ"
        food_types = {
            "เนื้อกวาง": Food("เนื้อกวาง", 200),
            "เนื้อกระต่าย": Food("เนื้อกระต่าย", 120),
            "ปลา": Food("ปลา", 180),
        }
        template = food_types.get(food_name)
        if not template:
            return None, f"❌ ไม่รู้จัก '{food_name}'"
        food = copy.copy(template)
        success, msg = food.cook(fire.fire_temp_c)
        return food if success else None, msg

@dataclass
class Campfire:
    pos: List[int]
    fuel_kg: float = 5.0
    fire_temp_c: float = 0.0
    active: bool = False
    hours_burning: float = 0.0
    co2_released: float = 0.0

    def ignite(self, humidity: float, has_flint: bool) -> tuple[bool, str]:
        if self.fuel_kg <= 0:
            return False, "❌ ไม่มีเชื้อเพลิง"
        if humidity >= 0.7:
            return False, "❌ เชื้อเพลิงเปียกเกินไป"
        success_rate = 0.70 if has_flint else 0.20
        success_rate *= (1 - humidity)
        if random.random() < success_rate:
            self.active = True
            self.fire_temp_c = IGNITION_TEMP_C
            return True, "🔥 จุดไฟสำเร็จ!"
        return False, "💨 จุดไม่ติด"

    def step_hour(self, env_temp_c: float, wind: float = 0.1) -> Dict[str, Any]:
        events = []
        if not self.active:
            return {"heat_kj": 0, "events": events, "temp_c": env_temp_c}
        burn_rate = FUEL_BURN_RATE * (1 + wind)
        burned = min(self.fuel_kg, burn_rate)
        self.fuel_kg -= burned
        heat_kj = burned * 17000 * 0.9  # rough efficiency
        self.co2_released += burned * 1.47
        target_temp = FIRE_TEMP_C * (self.fuel_kg / 5.0) ** 0.3
        target_temp = max(IGNITION_TEMP_C, min(FIRE_TEMP_C, target_temp))
        self.fire_temp_c = max(env_temp_c, self.fire_temp_c + (target_temp - self.fire_temp_c) * 0.3)
        self.hours_burning += 1
        if self.fuel_kg <= 0:
            self.active = False
            events.append("🪵 ไฟดับ")
        return {"heat_kj": heat_kj, "events": events, "temp_c": self.fire_temp_c}

    def add_fuel(self, kg: float) -> str:
        self.fuel_kg += kg
        return f"🪵 เพิ่มเชื้อเพลิง {kg:.1f}kg"

    @property
    def warmth_output(self) -> float:
        if not self.active:
            return 0
        T = self.fire_temp_c + 273.15
        sigma = 5.67e-8
        return sigma * T**4 * 1e-6

    def to_dict(self) -> Dict:
        return {
            "pos": self.pos,
            "temp": round(self.fire_temp_c, 1),
            "fuel": round(self.fuel_kg, 2),
            "hours": round(self.hours_burning, 1),
            "co2": round(self.co2_released, 3),
        }

class FireSystem:
    def __init__(self):
        self.fires: List[Campfire] = []
        self.cooked_foods: List[Dict] = []

    def start_fire(self, pos: List[int], fuel_kg: float = 5.0) -> Campfire:
        fire = Campfire(pos, fuel_kg)
        self.fires.append(fire)
        return fire

    def get_fire_at(self, pos: List[int]) -> Optional[Campfire]:
        for f in self.fires:
            if f.pos == pos and f.active:
                return f
        return None

    def nearby_fire(self, pos: List[int], radius: int = WARMTH_RADIUS) -> Optional[Campfire]:
        closest, min_dist = None, float('inf')
        for f in self.fires:
            if not f.active:
                continue
            dist = abs(f.pos[0]-pos[0]) + abs(f.pos[1]-pos[1])
            if dist <= radius and dist < min_dist:
                closest, min_dist = f, dist
        return closest

    def step_hour(self, env_temp_c: float) -> tuple[List[str], float]:
        events, total_heat = [], 0.0
        for f in self.fires:
            result = f.step_hour(env_temp_c)
            total_heat += result["heat_kj"]
            events.extend(result["events"])
        self.fires = [f for f in self.fires if f.active or f.fuel_kg > 0]
        return events, total_heat

    def warmth_at(self, pos: List[int], env_temp_c: float) -> float:
        temp = env_temp_c
        for f in self.fires:
            if not f.active:
                continue
            dist = max(1, abs(f.pos[0]-pos[0]) + abs(f.pos[1]-pos[1]))
            if dist <= WARMTH_RADIUS:
                temp += f.warmth_output / (dist**2)
        return min(50.0, temp)

    @property
    def active_fires(self) -> List[Campfire]:
        return [f for f in self.fires if f.active]