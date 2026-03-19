"""
body.py — ระบบร่างกายแยกตามเพศ (Adam = M, Eve = F)
─────────────────────────────────────────────────────
อิงชีววิทยาจริง:
  • ชาย  — กล้ามเนื้อมาก, แข็งแรงกว่า, ไขมันน้อย, ตายเร็วกว่า
  • หญิง — ไขมันสำรองสูง, อดทนเจ็บปวดมากกว่า, รอบเดือน,
            ตั้งครรภ์ได้ (energy drain), วัยหมดประจำเดือน
"""

import random
from dataclasses import dataclass, field
from typing import Optional

# ── ค่าคงที่ชีววิทยา ─────────────────────────────────────────────────────────
LIFESPAN_M      = 35 * 365    # วัน — ชายอายุขัยเฉลี่ยยุคหิน ~35 ปี
LIFESPAN_F      = 38 * 365    # วัน — หญิงอยู่ทนกว่าเล็กน้อย
MENOPAUSE_AGE   = 45          # หยุดมีรอบเดือนที่อายุ 45 ปี
MENARCHE_AGE    = 14          # เริ่มมีรอบเดือนที่อายุ 14 ปี
CYCLE_DAYS      = 28          # รอบเดือน 28 วัน
OVULATION_DAY   = 14          # ไข่ตกวันที่ 14
FERTILE_WINDOW  = 3           # ตั้งครรภ์ได้ ±3 วันรอบไข่ตก

PREGNANCY_ENERGY_DRAIN = 1.5  # energy หายต่อวันขณะตั้งครรภ์
LABOR_ENERGY_COST      = 200  # energy หายตอนคลอด

MUSCLE_M  = 0.40   # สัดส่วนกล้ามเนื้อ (% mass) ชาย
MUSCLE_F  = 0.32   # หญิง
FAT_M     = 0.15   # ไขมัน ชาย
FAT_F     = 0.25   # หญิง — สำรองพลังงานสูงกว่า

PAIN_TOLERANCE_M = 0.5   # 0=ทนเจ็บน้อย, 1=ทนได้มาก
PAIN_TOLERANCE_F = 0.75  # หญิงทนเจ็บได้มากกว่า (วิวัฒนาการ)

BASE_DEATH_RATE_M = 1 / LIFESPAN_M
BASE_DEATH_RATE_F = 1 / LIFESPAN_F


@dataclass
class Hormone:
    """ระดับฮอร์โมนปัจจุบัน (0–100)"""
    testosterone: float = 0.0   # ชาย
    estrogen:     float = 0.0   # หญิง
    progesterone: float = 0.0   # หญิง — สูงช่วงตั้งครรภ์
    cortisol:     float = 10.0  # ความเครียด (ทั้งคู่)
    oxytocin:     float = 0.0   # ความผูกพัน (ทั้งคู่)


class Body:
    """
    ร่างกายของมนุษย์คนหนึ่ง — เรียก .step_day() ทุกวัน
    """

    def __init__(self, name: str, sex: str, mass: float, height: float):
        self.name   = name
        self.sex    = sex      # "M" หรือ "F"
        self.mass   = mass     # kg
        self.height = height   # cm
        self.age    = 25 * 365 # วัน (เริ่ม 25 ปี)

        # ── องค์ประกอบร่างกาย ─────────────────────────────────────
        if sex == "M":
            self.muscle_ratio = MUSCLE_M
            self.fat_ratio    = FAT_M
            self.pain_tol     = PAIN_TOLERANCE_M
            self.base_death   = BASE_DEATH_RATE_M
            self.strength     = 80.0   # แรงมาก
            self.stamina      = 70.0   # ความอึด
        else:
            self.muscle_ratio = MUSCLE_F
            self.fat_ratio    = FAT_F
            self.pain_tol     = PAIN_TOLERANCE_F
            self.base_death   = BASE_DEATH_RATE_F
            self.strength     = 55.0   # แรงน้อยกว่า
            self.stamina      = 80.0   # อึดกว่า

        self.fat_reserve = mass * self.fat_ratio * 7700  # kcal สำรอง

        # ── สุขภาพ ────────────────────────────────────────────────
        self.health    = 100.0
        self.u_energy  = 2000.0   # kcal พลังงานในตัว
        self.alive     = True

        # ── ฮอร์โมน ───────────────────────────────────────────────
        self.hormone = Hormone()
        if sex == "M":
            self.hormone.testosterone = 70.0
        else:
            self.hormone.estrogen = 60.0

        # ── รอบเดือน (หญิงเท่านั้น) ───────────────────────────────
        self.cycle_day      = random.randint(1, 28)   # วันในรอบเดือนปัจจุบัน
        self.is_fertile     = False
        self.menopause      = False

        # ── การตั้งครรภ์ ───────────────────────────────────────────
        self.pregnant         = False
        self.days_pregnant    = 0
        self.recovery_days    = 0
        self.total_births     = 0

        # ── โรคภัย ────────────────────────────────────────────────
        self.diseases: list[str] = []

        # ── log ────────────────────────────────────────────────────
        self.log: list[str] = []

    # ── อายุเป็นปี ──────────────────────────────────────────────────
    @property
    def age_years(self) -> float:
        return self.age / 365

    # ── BMI ─────────────────────────────────────────────────────────
    @property
    def bmi(self) -> float:
        h_m = self.height / 100
        return round(self.mass / (h_m ** 2), 1)

    # ── step ทีละวัน ────────────────────────────────────────────────
    def step_day(self, calories_in: float, is_active: bool,
                 stressed: bool = False, bonded: bool = False) -> list[str]:
        """
        calories_in — kcal ที่ได้รับวันนี้
        is_active   — ออกแรงไหม
        stressed    — เครียด (หิว/ขัดแย้ง)
        bonded      — อยู่ใกล้คู่ (oxytocin)
        """
        if not self.alive:
            return []

        events = []
        self.age += 1

        # ── พลังงาน ──────────────────────────────────────────────
        bmr = self._calc_bmr()
        activity_cost = bmr * 0.3 if is_active else 0
        total_cost    = bmr + activity_cost

        # ตั้งครรภ์ drain พิเศษ
        if self.pregnant:
            total_cost += PREGNANCY_ENERGY_DRAIN * 100

        net = calories_in - total_cost
        self.u_energy = max(0, self.u_energy + net * 0.01)

        # ถ้า energy หมด — ดึงจากไขมันสำรอง
        if self.u_energy <= 0 and self.fat_reserve > 0:
            self.fat_reserve = max(0, self.fat_reserve - abs(net))
            self.mass        = max(30, self.mass - 0.01)

        # ── ฮอร์โมน ──────────────────────────────────────────────
        self._update_hormones(stressed, bonded)

        # ── รอบเดือน (หญิง) ──────────────────────────────────────
        if self.sex == "F" and not self.pregnant:
            self._update_cycle(events)

        # ── การตั้งครรภ์ ──────────────────────────────────────────
        if self.sex == "F" and self.pregnant:
            self._update_pregnancy(events)

        # ── ความแก่ → ลด strength/stamina ────────────────────────
        if self.age % 365 == 0:
            self._age_effects(events)

        # ── โรคภัย ────────────────────────────────────────────────
        self._check_disease(events)

        # ── อัตราตาย ─────────────────────────────────────────────
        self._check_death(events)

        return events

    # ── BMR (Mifflin-St Jeor) ────────────────────────────────────
    def _calc_bmr(self) -> float:
        if self.sex == "M":
            return 10*self.mass + 6.25*self.height - 5*self.age_years + 5
        else:
            return 10*self.mass + 6.25*self.height - 5*self.age_years - 161

    # ── ฮอร์โมน ─────────────────────────────────────────────────
    def _update_hormones(self, stressed: bool, bonded: bool):
        h = self.hormone
        h.cortisol  = min(100, h.cortisol + (5 if stressed else -2))
        h.cortisol  = max(5, h.cortisol)
        h.oxytocin  = min(100, h.oxytocin + (3 if bonded else -1))
        h.oxytocin  = max(0, h.oxytocin)

        # testosterone ลดตามอายุชาย (andropause ~50+)
        if self.sex == "M" and self.age_years > 40:
            h.testosterone = max(20, h.testosterone - 0.05)

        # estrogen ลดเข้าใกล้วัยหมดประจำเดือน
        if self.sex == "F" and self.age_years > 40:
            h.estrogen = max(10, h.estrogen - 0.1)

    # ── รอบเดือน ─────────────────────────────────────────────────
    def _update_cycle(self, events: list):
        if self.menopause:
            return
        if self.age_years < MENARCHE_AGE:
            return
        if self.age_years >= MENOPAUSE_AGE:
            self.menopause = True
            events.append(f"🔴 {self.name} เข้าสู่วัยหมดประจำเดือน")
            return

        self.cycle_day += 1
        if self.cycle_day > CYCLE_DAYS:
            self.cycle_day = 1

        # ไข่ตก ±3 วัน
        self.is_fertile = abs(self.cycle_day - OVULATION_DAY) <= FERTILE_WINDOW

        # มีประจำเดือน (วันที่ 1–5) — energy ลดนิดหน่อย
        if self.cycle_day <= 5:
            self.u_energy = max(0, self.u_energy - 5)
            self.hormone.estrogen = max(10, self.hormone.estrogen - 2)

        # ไข่ตก — estrogen พุ่ง
        if self.cycle_day == OVULATION_DAY:
            self.hormone.estrogen = min(100, self.hormone.estrogen + 20)
            events.append(f"🥚 {self.name} ไข่ตก (วันอุดมสมบูรณ์)")

    # ── การตั้งครรภ์ ─────────────────────────────────────────────
    def _update_pregnancy(self, events: list):
        self.days_pregnant += 1
        self.hormone.progesterone = min(100, self.hormone.progesterone + 0.1)

        # อาการช่วงต่างๆ
        if self.days_pregnant == 1:
            events.append(f"🤰 {self.name} เริ่มตั้งครรภ์!")
        elif self.days_pregnant == 84:   # ไตรมาส 1 ผ่าน
            events.append(f"🤰 {self.name} ผ่านไตรมาสแรก (3 เดือน)")
        elif self.days_pregnant == 168:  # ไตรมาส 2
            events.append(f"🤰 {self.name} ผ่านไตรมาส 2 (6 เดือน) รู้สึกลูกดิ้น")
        elif self.days_pregnant >= 280:  # ครบกำหนด
            self._give_birth(events)

    def _give_birth(self, events: list):
        self.pregnant      = False
        self.days_pregnant = 0
        self.recovery_days = 365
        self.total_births += 1
        self.u_energy      = max(0, self.u_energy - LABOR_ENERGY_COST)
        self.hormone.progesterone = 0
        self.hormone.oxytocin     = min(100, self.hormone.oxytocin + 30)
        has_food = self.u_energy > 500
        survived = random.random() < (0.75 if has_food else 0.45)
        if survived:
            sex_baby = random.choice(["👦 ชาย", "👧 หญิง"])
            events.append(f"👶 {self.name} คลอดทารก{sex_baby} สำเร็จ!")
        else:
            events.append(f"😢 {self.name} คลอดแล้วแต่ทารกไม่รอด")

    def try_conceive(self) -> bool:
        """Adam เรียก method นี้เมื่อ mate กัน — คืน True ถ้า Eve ตั้งครรภ์"""
        if self.sex != "F":
            return False
        if self.pregnant or self.menopause or self.recovery_days > 0:
            return False
        if not self.is_fertile:
            return False
        if self.age_years < MENARCHE_AGE:
            return False
        # โอกาสตั้งครรภ์ต่อครั้ง ~25% (ปกติคนจริงอยู่ที่ 20–30%)
        if random.random() < 0.25:
            self.pregnant      = True
            self.days_pregnant = 0
            return True
        return False

    # ── ผลของอายุ ────────────────────────────────────────────────
    def _age_effects(self, events: list):
        age_y = self.age_years
        if age_y > 30:
            decay = (age_y - 30) * 0.5
            self.strength = max(10, self.strength - decay)
            self.stamina  = max(10, self.stamina  - decay * 0.5)
        if age_y > 50:
            events.append(f"👴 {self.name} อายุ {age_y:.0f} ปี ร่างกายเสื่อมลงมาก")

    # ── โรคภัย ───────────────────────────────────────────────────
    def _check_disease(self, events: list):
        # โอกาสป่วยเพิ่มถ้า cortisol สูง หรืออายุมาก
        base_risk = 0.0001
        if self.hormone.cortisol > 60:
            base_risk *= 3
        if self.age_years > 30:
            base_risk *= 1 + (self.age_years - 30) * 0.1

        if random.random() < base_risk:
            disease = random.choice(["ไข้", "บาดเจ็บ", "ติดเชื้อ", "หัก"])
            if disease not in self.diseases:
                self.diseases.append(disease)
                self.health = max(0, self.health - 20)
                events.append(f"🤒 {self.name} ป่วย: {disease}")

        # ฟื้นตัวจากโรค (ถ้า oxytocin สูง = มีคนดูแล)
        if self.diseases and random.random() < (0.05 + self.hormone.oxytocin * 0.001):
            recovered = self.diseases.pop(0)
            self.health = min(100, self.health + 15)
            events.append(f"💊 {self.name} หายจาก{recovered}")

    # ── ตรวจว่าตายไหม ────────────────────────────────────────────
    def _check_death(self, events: list):
        death_rate = self.base_death
        # อายุมาก → ตายง่ายขึ้น
        if self.age_years > 30:
            death_rate *= 1 + (self.age_years - 30) ** 1.5 * 0.01
        # สุขภาพต่ำ
        if self.health < 30:
            death_rate *= 5
        # cortisol สูง (เครียดเรื้อรัง)
        if self.hormone.cortisol > 70:
            death_rate *= 2
        # คลอดลูก — เสี่ยงตาย
        if self.sex == "F" and self.total_births > 0 and self.recovery_days > 350:
            death_rate *= 1.5

        if random.random() < death_rate:
            self.alive  = False
            self.health = 0
            events.append(f"💀 {self.name} เสียชีวิตแล้ว (อายุ {self.age_years:.1f} ปี)")

    # ── สรุปสถานะ UI ─────────────────────────────────────────────
    @property
    def summary(self) -> dict:
        return {
            "name":       self.name,
            "sex":        "♂ ชาย" if self.sex == "M" else "♀ หญิง",
            "age":        round(self.age_years, 1),
            "health":     round(self.health, 1),
            "bmi":        self.bmi,
            "strength":   round(self.strength, 1),
            "stamina":    round(self.stamina, 1),
            "fat_kcal":   round(self.fat_reserve),
            "pregnant":   self.pregnant,
            "days_preg":  self.days_pregnant,
            "fertile":    self.is_fertile,
            "menopause":  self.menopause,
            "cycle_day":  self.cycle_day,
            "diseases":   self.diseases.copy(),
            "testosterone": round(self.hormone.testosterone, 1),
            "estrogen":     round(self.hormone.estrogen, 1),
            "cortisol":     round(self.hormone.cortisol, 1),
            "oxytocin":     round(self.hormone.oxytocin, 1),
        }
