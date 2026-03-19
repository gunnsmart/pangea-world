"""
fire_system.py — ระบบไฟ อิงเคมีและ Thermodynamics
════════════════════════════════════════════════════
กฎที่ใช้:
  • Combustion: C6H12O6 + 6O2 → 6CO2 + 6H2O + heat
  • Heat transfer: Q = mcΔT
  • Radiation: Stefan-Boltzmann Q ∝ T⁴
  • Maillard reaction (ปรุงอาหาร) ≥ 140°C
  • Denaturation โปรตีน ≥ 60°C → อาหารสุก ฆ่าเชื้อ

ไฟต้องการ: เชื้อเพลิง + O2 + ความร้อนเริ่มต้น (Fire Triangle)
"""

import math
import random
from dataclasses import dataclass, field
from physics_engine import ChemistryEngine, Thermodynamics

# ── ค่าคงที่ ──────────────────────────────────────────────────────────────
IGNITION_TEMP_C     = 300.0   # °C — อุณหภูมิจุดติดไฟของไม้
FIRE_TEMP_C         = 600.0   # °C — อุณหภูมิเปลวไฟ (wood fire)
COOKING_TEMP_C      = 100.0   # °C — เริ่มปรุงอาหาร
MAILLARD_TEMP_C     = 140.0   # °C — Maillard reaction (สีน้ำตาล/กลิ่นหอม)
PROTEIN_DENATURE_C  = 60.0    # °C — โปรตีนสุก
WARMTH_RADIUS       = 3       # ช่อง — รัศมีที่ไฟให้ความอุ่น
FUEL_BURN_RATE      = 0.5     # kg/hour — เชื้อเพลิงหายต่อชั่วโมง
SPECIFIC_HEAT_BODY  = 3.5     # kJ/(kg·K) — ความจุความร้อนร่างกาย (เนื้อเยื่อ ~3.5)


@dataclass
class Campfire:
    """กองไฟ 1 กอง"""
    pos:          list          # [r, c] บนแผนที่
    fuel_kg:      float = 5.0   # เชื้อเพลิงคงเหลือ (kg)
    fire_temp_c:  float = 0.0   # อุณหภูมิเปลวไฟปัจจุบัน
    ash_kg:       float = 0.0
    active:       bool  = False
    cook_ready:   bool  = False  # พร้อมปรุงอาหารไหม
    hours_burning:float = 0.0
    co2_released: float = 0.0   # kg CO2 ที่ปล่อยออกมา

    # ── จุดไฟ ──────────────────────────────────────────────────
    def ignite(self, humidity: float, has_flint: bool) -> tuple[bool, str]:
        """
        ลองจุดไฟ
        humidity: 0–1, has_flint: มีหินเหล็กไฟไหม
        คืน (success, message)
        """
        if self.fuel_kg <= 0:
            return False, "❌ ไม่มีเชื้อเพลิง"
        if humidity >= 0.7:
            return False, "❌ เชื้อเพลิงเปียกเกินไป จุดไม่ติด"

        # โอกาสจุดติด: หินเหล็กไฟ+ไม้แห้ง = 70%, มือเปล่า = 20%
        success_rate = 0.70 if has_flint else 0.20
        success_rate *= (1 - humidity)   # ชื้นมาก → โอกาสลด

        if random.random() < success_rate:
            self.active      = True
            self.fire_temp_c = IGNITION_TEMP_C
            return True, "🔥 จุดไฟสำเร็จ!"
        return False, "💨 จุดไม่ติด ลองใหม่อีกครั้ง"

    # ── step ทีละชั่วโมง ────────────────────────────────────────
    def step_hour(self, env_temp_c: float, wind: float = 0.1) -> dict:
        """
        อัปเดตไฟ 1 ชั่วโมง
        คืน: heat_output_kj, events
        """
        events = []
        if not self.active:
            return {"heat_kj": 0, "events": events, "temp_c": env_temp_c}

        # ── เผาเชื้อเพลิง ─────────────────────────────────────
        burn_rate = FUEL_BURN_RATE * (1 + wind)
        burned    = min(self.fuel_kg, burn_rate)
        self.fuel_kg -= burned

        # Combustion chemistry (อิง ChemistryEngine)
        humidity_approx = 0.2   # ไม้ที่กองไฟค่อนข้างแห้ง
        fire_result = ChemistryEngine.fire_combustion(burned, humidity=humidity_approx)
        heat_kj     = fire_result["heat_kj"]
        self.co2_released += fire_result["co2_kg"]
        self.ash_kg       += fire_result["ash_kg"]

        # ── อุณหภูมิเปลวไฟ ────────────────────────────────────
        # ไฟแรง = เชื้อเพลิงมาก, ลดลงตอนเชื้อน้อย
        target_temp = FIRE_TEMP_C * (self.fuel_kg / 5.0) ** 0.3
        target_temp = max(IGNITION_TEMP_C, min(FIRE_TEMP_C, target_temp))
        # heat loss ไปสิ่งแวดล้อม (radiation + convection)
        heat_loss = Thermodynamics.heat_loss_radiation(
            self.fire_temp_c, env_temp_c, surface_area=0.5
        )
        self.fire_temp_c = max(
            env_temp_c,
            self.fire_temp_c + (target_temp - self.fire_temp_c) * 0.3 - heat_loss * 0.01
        )

        self.cook_ready    = self.fire_temp_c >= COOKING_TEMP_C
        self.hours_burning += 1

        # ── ไฟดับถ้าเชื้อหมด ─────────────────────────────────
        if self.fuel_kg <= 0:
            self.active      = False
            self.fire_temp_c = env_temp_c
            events.append("🪵 ไฟดับ เชื้อเพลิงหมด")

        return {"heat_kj": heat_kj, "events": events, "temp_c": self.fire_temp_c}

    # ── เพิ่มเชื้อเพลิง ──────────────────────────────────────
    def add_fuel(self, kg: float) -> str:
        self.fuel_kg += kg
        if not self.active:
            return f"🪵 เพิ่มเชื้อเพลิง {kg:.1f}kg (ไฟยังไม่ติด)"
        return f"🪵 เพิ่มเชื้อเพลิง {kg:.1f}kg — ไฟลุกแรงขึ้น"

    @property
    def warmth_output(self) -> float:
        """ความอุ่นที่แผ่ออกมา (°C เพิ่มในรัศมี)"""
        if not self.active:
            return 0
        # Stefan-Boltzmann radiation (simplified)
        T = self.fire_temp_c + 273.15
        sigma = 5.67e-8
        return sigma * T ** 4 * 1e-6   # scale ให้ใช้งานได้


# ── ระบบปรุงอาหาร ────────────────────────────────────────────────────────
@dataclass
class Food:
    """อาหารชิ้นหนึ่ง"""
    name:         str
    raw_kcal:     float          # kcal ดิบ
    cooked_kcal:  float = 0.0    # kcal หลังปรุง (สูงกว่าเพราะย่อยง่ายขึ้น)
    cooked:       bool  = False
    protein_g:    float = 0.0
    carb_g:       float = 0.0

    def cook(self, fire_temp_c: float) -> tuple[bool, str]:
        """
        ปรุงอาหาร — Maillard reaction ≥ 140°C
        คืน (success, message)
        """
        if self.cooked:
            return False, f"🍖 {self.name} สุกแล้ว"
        if fire_temp_c < PROTEIN_DENATURE_C:
            return False, f"🥩 ไฟไม่ร้อนพอ ({fire_temp_c:.0f}°C < {PROTEIN_DENATURE_C}°C)"

        self.cooked = True
        # ปรุงแล้ว kcal เพิ่ม ~30% (ย่อยง่ายขึ้น, Wrangham hypothesis)
        base_bonus = 1.3
        if fire_temp_c >= MAILLARD_TEMP_C:
            base_bonus = 1.5   # Maillard = อร่อยขึ้น + ย่อยดีขึ้น
            msg = f"✅ {self.name} สุกดี! (Maillard reaction, +50% kcal)"
        else:
            msg = f"✅ {self.name} สุกแล้ว (+30% kcal)"

        self.cooked_kcal = self.raw_kcal * base_bonus
        return True, msg

    @property
    def kcal(self) -> float:
        return self.cooked_kcal if self.cooked else self.raw_kcal * 0.7


# ── FireSystem — จัดการทุกกองไฟใน simulation ──────────────────────────────
class FireSystem:
    def __init__(self):
        self.fires: list[Campfire] = []

        # อาหารดิบมาตรฐาน
        self.food_types = {
            "เนื้อกวาง":   Food("เนื้อกวาง",   200, protein_g=25, carb_g=0),
            "เนื้อกระต่าย":Food("เนื้อกระต่าย",120, protein_g=18, carb_g=0),
            "หัวมัน":      Food("หัวมัน",       150, protein_g=2,  carb_g=35),
            "ผลไม้ป่า":    Food("ผลไม้ป่า",     80,  protein_g=1,  carb_g=20),
            "ปลา":         Food("ปลา",          180, protein_g=22, carb_g=0),
        }

    def start_fire(self, pos: list, fuel_kg: float = 5.0) -> Campfire:
        """สร้างกองไฟใหม่ที่ตำแหน่ง pos"""
        fire = Campfire(pos=pos, fuel_kg=fuel_kg)
        self.fires.append(fire)
        return fire

    def get_fire_at(self, pos: list) -> Campfire | None:
        for f in self.fires:
            if f.pos == pos and f.active:
                return f
        return None

    def nearby_fire(self, pos: list, radius: int = WARMTH_RADIUS) -> Campfire | None:
        """หากองไฟที่ใกล้ที่สุดในรัศมี"""
        closest, min_dist = None, float('inf')
        for f in self.fires:
            if not f.active:
                continue
            dist = abs(f.pos[0]-pos[0]) + abs(f.pos[1]-pos[1])
            if dist <= radius and dist < min_dist:
                closest, min_dist = f, dist
        return closest

    def warmth_at(self, pos: list, env_temp_c: float) -> float:
        """
        อุณหภูมิสิ่งแวดล้อมที่ pos หลังรวมความอุ่นจากไฟ
        ใช้ inverse-square law: Q ∝ 1/r²
        """
        temp = env_temp_c
        for f in self.fires:
            if not f.active:
                continue
            dist = max(1, abs(f.pos[0]-pos[0]) + abs(f.pos[1]-pos[1]))
            if dist <= WARMTH_RADIUS:
                warmth = f.warmth_output / (dist ** 2)
                temp  += warmth
        return min(50.0, temp)

    def step_hour(self, env_temp_c: float) -> tuple[list[str], float]:
        """อัปเดตกองไฟทุกกอง คืน (events, total_heat_kj)"""
        events, total_heat = [], 0.0
        for f in self.fires:
            result = f.step_hour(env_temp_c)
            total_heat += result["heat_kj"]
            events.extend(result["events"])
        # ลบไฟที่ดับและหมดเชื้อ
        self.fires = [f for f in self.fires if f.active or f.fuel_kg > 0]
        return events, total_heat

    def human_warmth_effect(self, human_pos: list, mass_kg: float,
                            env_temp_c: float) -> dict:
        """
        ผลของความอุ่นจากไฟต่อร่างกายมนุษย์
        Q = mc∆T — ความร้อนที่ร่างกายรับ
        """
        warm_temp = self.warmth_at(human_pos, env_temp_c)
        delta_t   = max(0, warm_temp - env_temp_c)

        # Q = mcΔT (kJ ที่ร่างกายรับ)
        heat_gained = mass_kg * SPECIFIC_HEAT_BODY * delta_t * 0.01

        # ถ้าอากาศเย็น (<20°C) และไม่มีไฟ → สูญเสีย heat เพิ่ม
        cold_penalty = 0.0
        if env_temp_c < 20 and delta_t == 0:
            cold_penalty = mass_kg * SPECIFIC_HEAT_BODY * (20 - env_temp_c) * 0.001

        return {
            "env_temp_felt":  round(warm_temp, 1),
            "heat_gained_kj": round(heat_gained, 3),
            "cold_penalty_kj":round(cold_penalty, 3),
            "near_fire":      delta_t > 0,
        }

    def cook_food(self, food_name: str, fire: Campfire) -> tuple[Food | None, str]:
        """ปรุงอาหาร 1 ชิ้น ที่กองไฟ fire"""
        if not fire or not fire.active:
            return None, "❌ ไม่มีไฟ"
        template = self.food_types.get(food_name)
        if not template:
            return None, f"❌ ไม่รู้จัก '{food_name}'"
        import copy
        food = copy.copy(template)
        success, msg = food.cook(fire.fire_temp_c)
        return food if success else None, msg

    @property
    def active_fires(self) -> list[Campfire]:
        return [f for f in self.fires if f.active]

    @property
    def summary(self) -> list[dict]:
        return [
            {
                "pos":    f.pos,
                "temp":   round(f.fire_temp_c, 1),
                "fuel":   round(f.fuel_kg, 2),
                "hours":  round(f.hours_burning, 1),
                "co2_kg": round(f.co2_released, 3),
                "cook":   f.cook_ready,
            }
            for f in self.fires if f.active
        ]
