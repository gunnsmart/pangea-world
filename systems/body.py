# systems/body.py
import random
import numpy as np
from dataclasses import dataclass, field
from typing import Optional, List
from utils.config import *

@dataclass
class Hormone:
    testosterone: float = 0.0
    estrogen: float = 0.0
    progesterone: float = 0.0
    cortisol: float = 10.0
    oxytocin: float = 0.0

class Body:
    def __init__(self, name: str, sex: str, mass: float, height: float, time_scale: float = 1.0):
        self.name = name
        self.sex = sex
        self.mass = mass
        self.height = height
        self.age = 25 * 365
        self.time_scale = time_scale

        self.position = np.array([0.0,0.0,0.0])
        self.velocity = np.array([0.0,0.0,0.0])
        self.acceleration = np.array([0.0,0.0,0.0])
        self.on_ground = True
        self.height_m = height/100.0

        if sex == "M":
            self.muscle_ratio = MUSCLE_M
            self.fat_ratio = FAT_M
            self.pain_tol = PAIN_TOLERANCE_M
            self.base_death = 1 / LIFESPAN_M
            self.strength = 80.0
            self.stamina = 70.0
        else:
            self.muscle_ratio = MUSCLE_F
            self.fat_ratio = FAT_F
            self.pain_tol = PAIN_TOLERANCE_F
            self.base_death = 1 / LIFESPAN_F
            self.strength = 55.0
            self.stamina = 80.0

        self.fat_reserve = mass * self.fat_ratio * 7700
        self.health = 100.0
        self.u_energy = 2000.0
        self.alive = True

        self.hormone = Hormone()
        if sex == "M":
            self.hormone.testosterone = 70.0
        else:
            self.hormone.estrogen = 60.0

        self.cycle_day = random.randint(1,28)
        self.is_fertile = False
        self.menopause = False
        self.pregnant = False
        self.days_pregnant = 0
        self.recovery_days = 0
        self.total_births = 0
        self.diseases: List[str] = []

    @property
    def age_years(self) -> float:
        return self.age / 365

    def step_day(self, calories_in: float, is_active: bool,
                 stressed: bool = False, bonded: bool = False) -> List[str]:
        if not self.alive:
            return []
        events = []
        self.age += 1

        bmr = self._calc_bmr()
        activity_cost = bmr * 0.3 if is_active else 0
        total_cost = bmr + activity_cost
        if self.pregnant:
            total_cost += 150   # extra energy drain
        net = calories_in - total_cost
        self.u_energy = max(0, self.u_energy + net * 0.01)

        if self.u_energy <= 0 and self.fat_reserve > 0:
            self.fat_reserve = max(0, self.fat_reserve - abs(net))
            self.mass = max(30, self.mass - 0.01)

        self._update_hormones(stressed, bonded)

        if self.sex == "F" and not self.pregnant:
            self._update_cycle(events)

        if self.sex == "F" and self.pregnant:
            self._update_pregnancy(events)

        if self.age % 365 == 0:
            self._age_effects(events)

        self._check_disease(events)
        self._check_death(events)

        return events

    def physics_step(self, terrain_height: float):
        # gravity
        if not self.on_ground:
            self.acceleration += np.array([0.0,0.0,-9.81])
        if self.on_ground:
            self.velocity[0:2] *= 0.8
        self.velocity += self.acceleration
        self.position += self.velocity
        self.acceleration = np.array([0.0,0.0,0.0])
        if self.position[2] < terrain_height:
            self.position[2] = terrain_height
            self.velocity[2] = 0.0
            self.on_ground = True
        else:
            self.on_ground = False

    def _calc_bmr(self) -> float:
        if self.sex == "M":
            return 10*self.mass + 6.25*self.height - 5*self.age_years + 5
        else:
            return 10*self.mass + 6.25*self.height - 5*self.age_years - 161

    def _update_hormones(self, stressed: bool, bonded: bool):
        h = self.hormone
        h.cortisol = min(100, h.cortisol + (5 if stressed else -2))
        h.cortisol = max(5, h.cortisol)
        h.oxytocin = min(100, h.oxytocin + (3 if bonded else -1))
        h.oxytocin = max(0, h.oxytocin)

        if self.sex == "M" and self.age_years > 40:
            h.testosterone = max(20, h.testosterone - 0.05)
        if self.sex == "F" and self.age_years > 40:
            h.estrogen = max(10, h.estrogen - 0.1)

    def _update_cycle(self, events: List[str]):
        if self.menopause:
            return
        if self.age_years < 14:
            return
        if self.age_years >= 45:
            self.menopause = True
            events.append(f"🔴 {self.name} เข้าสู่วัยหมดประจำเดือน")
            return
        self.cycle_day += 1
        if self.cycle_day > 28:
            self.cycle_day = 1
        self.is_fertile = abs(self.cycle_day - 14) <= 3
        if self.cycle_day <= 5:
            self.u_energy = max(0, self.u_energy - 5)
            self.hormone.estrogen = max(10, self.hormone.estrogen - 2)
        if self.cycle_day == 14:
            self.hormone.estrogen = min(100, self.hormone.estrogen + 20)
            events.append(f"🥚 {self.name} ไข่ตก (วันอุดมสมบูรณ์)")

    def _update_pregnancy(self, events: List[str]):
        self.days_pregnant += 1
        self.hormone.progesterone = min(100, self.hormone.progesterone + 0.1)
        if self.days_pregnant == 1:
            events.append(f"🤰 {self.name} เริ่มตั้งครรภ์!")
        elif self.days_pregnant >= 280:
            self._give_birth(events)

    def _give_birth(self, events: List[str]):
        self.pregnant = False
        self.days_pregnant = 0
        self.recovery_days = 365
        self.total_births += 1
        self.u_energy = max(0, self.u_energy - 200)
        self.hormone.progesterone = 0
        self.hormone.oxytocin = min(100, self.hormone.oxytocin + 30)
        has_food = self.u_energy > 500
        survived = random.random() < (0.75 if has_food else 0.45)
        if survived:
            sex_baby = random.choice(["👦 ชาย","👧 หญิง"])
            events.append(f"👶 {self.name} คลอดทารก{sex_baby} สำเร็จ!")
        else:
            events.append(f"😢 {self.name} คลอดแล้วแต่ทารกไม่รอด")

    def try_conceive(self) -> bool:
        if self.sex != "F":
            return False
        if self.pregnant or self.menopause or self.recovery_days > 0:
            return False
        if not self.is_fertile:
            return False
        if self.age_years < 14:
            return False
        if random.random() < 0.25:
            self.pregnant = True
            self.days_pregnant = 0
            return True
        return False

    def _age_effects(self, events: List[str]):
        age_y = self.age_years
        if age_y > 30:
            decay = (age_y - 30) * 0.5
            self.strength = max(10, self.strength - decay)
            self.stamina = max(10, self.stamina - decay*0.5)
        if age_y > 50:
            events.append(f"👴 {self.name} อายุ {age_y:.0f} ปี ร่างกายเสื่อมลงมาก")

    def _check_disease(self, events: List[str]):
        base_risk = 0.0001
        if self.hormone.cortisol > 60:
            base_risk *= 3
        if self.age_years > 30:
            base_risk *= 1 + (self.age_years-30)*0.1
        if random.random() < base_risk:
            disease = random.choice(["ไข้","บาดเจ็บ","ติดเชื้อ","หัก"])
            if disease not in self.diseases:
                self.diseases.append(disease)
                self.health = max(0, self.health - 20)
                events.append(f"🤒 {self.name} ป่วย: {disease}")
        if self.diseases and random.random() < (0.05 + self.hormone.oxytocin*0.001):
            recovered = self.diseases.pop(0)
            self.health = min(100, self.health + 15)
            events.append(f"💊 {self.name} หายจาก{recovered}")

    def _check_death(self, events: List[str]):
        death_rate = self.base_death
        if self.age_years > 30:
            death_rate *= 1 + (self.age_years-30)**1.5 * 0.01
        if self.health < 30:
            death_rate *= 5
        if self.hormone.cortisol > 70:
            death_rate *= 2
        if self.sex == "F" and self.total_births > 0 and self.recovery_days > 350:
            death_rate *= 1.5
        if random.random() < death_rate:
            self.alive = False
            self.health = 0
            events.append(f"💀 {self.name} เสียชีวิตแล้ว (อายุ {self.age_years:.1f} ปี)")