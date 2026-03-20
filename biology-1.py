import random

class PlantEcosystem:
    """
    Grid-based biomass — แต่ละ cell มีค่าของตัวเอง
    global_biomass = ค่าเฉลี่ยทั้งแผนที่ (ใช้กับ fauna/weather เหมือนเดิม)
    vegetation[r][c] = biomass จริงในแต่ละ cell (ใช้กับ human/animal กินอาหาร)
    """
    def __init__(self, terrain=None):
        self.global_biomass = 60.0
        self.terrain = terrain   # TerrainMap reference (set หลัง init)

    def step_day(self, moisture, temperature):
        growth_rate = 1.0
        if 40.0 <= moisture <= 80.0: growth_rate += 3.0
        elif moisture < 30.0:        growth_rate -= 1.0
        if 22.0 <= temperature <= 32.0: growth_rate += 1.5
        self.global_biomass += growth_rate
        self.global_biomass = max(10.0, min(100.0, self.global_biomass))

        # ── Grid update — แต่ละ cell เติบโตตาม biome + weather ──────────
        if self.terrain is not None:
            from terrain import TROPICAL, FOREST, GRASSLAND, SHALLOW, MOUNTAIN, PEAK, DEEP_WATER, BEACH
            biome_rate = {
                TROPICAL: 0.5, FOREST: 0.3, GRASSLAND: 0.2,
                SHALLOW: 0.1, BEACH: 0.05, MOUNTAIN: 0.08,
                PEAK: 0.02, DEEP_WATER: 0,
            }
            weather_mult = growth_rate / 5.5  # normalize ~0.5–1.5
            SIZE = self.terrain.size
            for r in range(SIZE):
                for c in range(SIZE):
                    biome = self.terrain.template[r][c]
                    rate  = biome_rate.get(biome, 0.1) * weather_mult
                    self.terrain.vegetation[r][c] = min(
                        100, self.terrain.vegetation[r][c] + rate
                    )
        return self.global_biomass

    def consume_at(self, r: int, c: int, amount: float) -> float:
        """กินอาหารที่ cell (r,c) คืนจำนวนที่กินได้จริง"""
        if self.terrain is None:
            return amount
        available = self.terrain.vegetation[r][c]
        eaten     = min(available, amount)
        self.terrain.vegetation[r][c] = max(0, available - eaten)
        # global biomass ลดตามสัดส่วน
        self.global_biomass = max(10, self.global_biomass - eaten * 0.01)
        return eaten


class FaunaEcosystem:
    def __init__(self):
        self.rabbit_pop   = 100
        self.deer_pop     = 50
        self.elephant_pop = 10
        self.tiger_pop    = 5
        self.eagle_pop    = 5

    def step_day(self, current_biomass):
        total_eat = (self.rabbit_pop * 0.01) + (self.deer_pop * 0.02) + (self.elephant_pop * 0.1)
        if current_biomass > 20:
            self.rabbit_pop   += int(self.rabbit_pop * 0.1)
            self.deer_pop     += int(self.deer_pop   * 0.05)
            self.elephant_pop += (1 if self.elephant_pop < 20 and random.random() < 0.1 else 0)
        else:
            self.rabbit_pop   -= int(self.rabbit_pop * 0.2)
            self.deer_pop     -= int(self.deer_pop   * 0.1)
            self.elephant_pop -= (1 if random.random() < 0.05 else 0)

        for _ in range(self.tiger_pop):
            if   self.deer_pop   > 0: self.deer_pop   -= 1
            elif self.rabbit_pop > 0: self.rabbit_pop -= 1
            else:                     self.tiger_pop  -= 1

        for _ in range(self.eagle_pop):
            if self.rabbit_pop > 0: self.rabbit_pop -= 1
            else:                   self.eagle_pop  -= 1

        if self.deer_pop   > 20 and random.random() < 0.1: self.tiger_pop += 1
        if self.rabbit_pop > 50 and random.random() < 0.1: self.eagle_pop += 1

        self.rabbit_pop   = max(0, min(2000, self.rabbit_pop))
        self.deer_pop     = max(0, min(1000, self.deer_pop))
        self.elephant_pop = max(0, min(50,   self.elephant_pop))
        self.tiger_pop    = max(0, min(30,   self.tiger_pop))
        self.eagle_pop    = max(0, min(30,   self.eagle_pop))
        return total_eat


# ─────────────────────────────────────────────────────────────────────────────
# HumanEcosystem — ระบบประชากรสมจริง
#
# กฎชีววิทยา:
#   • ต้องมีคู่ชาย-หญิง (อย่างน้อย 1 คู่) ถึงจะมีลูกได้
#   • ตั้งครรภ์ 280 วัน (GESTATION_DAYS)
#   • ผู้หญิงอยู่ในวัยเจริญพันธุ์ช่วง 15–45 ปีอายุ sim
#   • หลังคลอดพักฟื้น RECOVERY_DAYS ก่อนตั้งครรภ์ใหม่
#   • อัตราตายตามอาหาร/ความเครียด
# ─────────────────────────────────────────────────────────────────────────────
GESTATION_DAYS = 280   # ~9 เดือน
RECOVERY_DAYS  = 365   # พักฟื้น 1 ปีหลังคลอด
MAX_BIRTHS_EVER = 8    # จำนวนลูกสูงสุดต่อคน (เหมือนสมัยโบราณ)


class Pregnancy:
    """ติดตามการตั้งครรภ์ของผู้หญิงแต่ละคน"""
    def __init__(self):
        self.pregnant      = False
        self.days_pregnant = 0
        self.recovery_days = 0   # วันพักฟื้นหลังคลอด
        self.total_births  = 0


class HumanEcosystem:
    def __init__(self):
        # เริ่มต้น Adam (ชาย) และ Eve (หญิง) — อายุ 20 ปี
        self.human_pop  = 2
        self.males      = 1   # Adam
        self.females    = 1   # Eve

        # ติดตามการตั้งครรภ์ของผู้หญิงแต่ละคน (index = id ผู้หญิง)
        self.pregnancies: list[Pregnancy] = [Pregnancy()]  # Eve คนเดียว

        self.day = 0  # นับวันภายใน ecosystem

        # อัตราตายฐาน (ต่อวัน) — สมัยโบราณอายุขัยเฉลี่ย ~35 ปี
        self.base_death_rate = 1 / (35 * 365)

    # ── คู่ที่จับคู่ได้ (min ของ males/females) ─────────────────────────
    @property
    def couples(self) -> int:
        return min(self.males, self.females)

    # ── ผู้หญิงที่พร้อมตั้งครรภ์ ─────────────────────────────────────
    def _available_women(self) -> list[Pregnancy]:
        return [
            p for p in self.pregnancies
            if not p.pregnant
            and p.recovery_days == 0
            and p.total_births < MAX_BIRTHS_EVER
        ]

    # ── คลอดลูก — สุ่มเพศ ───────────────────────────────────────────
    def _give_birth(self, preg: Pregnancy, has_food: bool):
        preg.pregnant      = False
        preg.days_pregnant = 0
        preg.recovery_days = RECOVERY_DAYS
        preg.total_births += 1

        # อัตรารอดขึ้นกับอาหาร — สมัยโบราณทารกตายสูง
        survival_chance = 0.7 if has_food else 0.4
        if random.random() < survival_chance:
            if random.random() < 0.5:
                self.males   += 1
            else:
                self.females += 1
                self.pregnancies.append(Pregnancy())  # เพิ่ม tracking ให้ลูกสาว
            self.human_pop += 1
            return True
        return False  # ทารกไม่รอด

    # ── step ทีละวัน ─────────────────────────────────────────────────
    def step_day(self, current_biomass: float, current_herbivores: int):
        if self.human_pop <= 0:
            return 0

        self.day += 1
        has_food = current_biomass > 10 or current_herbivores > 5

        # ── 1. ล่าสัตว์ ──────────────────────────────────────────────
        hunted_deer = 0
        if current_herbivores > 5:
            hunted_deer = min(current_herbivores, max(1, self.couples))

        # ── 2. อัปเดตการตั้งครรภ์ทุกคน ──────────────────────────────
        births_log = []
        for preg in self.pregnancies:
            # นับวันพักฟื้น
            if preg.recovery_days > 0:
                preg.recovery_days -= 1
                continue

            # นับวันตั้งครรภ์
            if preg.pregnant:
                preg.days_pregnant += 1
                if preg.days_pregnant >= GESTATION_DAYS:
                    survived = self._give_birth(preg, has_food)
                    births_log.append(survived)

        # ── 3. โอกาสตั้งครรภ์ใหม่ ────────────────────────────────────
        # ต้องมีคู่ และมีอาหาร และผู้หญิงพร้อม
        if self.couples >= 1 and has_food:
            available = self._available_women()
            for preg in available:
                # โอกาสตั้งครรภ์ต่อวัน ~1/90 (เฉลี่ย 3 เดือนกว่าจะตั้งได้)
                if random.random() < (1 / 90):
                    preg.pregnant      = True
                    preg.days_pregnant = 0

        # ── 4. อัตราตาย ───────────────────────────────────────────────
        # ตายเพิ่มถ้าอาหารขาด
        death_rate = self.base_death_rate * (1.0 if has_food else 5.0)
        deaths = 0
        for _ in range(self.human_pop):
            if random.random() < death_rate:
                deaths += 1

        # หักคนตายออก (สุ่มว่าเป็นชายหรือหญิง)
        for _ in range(min(deaths, self.human_pop)):
            if self.human_pop <= 0:
                break
            self.human_pop -= 1
            if self.males > 0 and (self.females == 0 or random.random() < 0.5):
                self.males -= 1
            elif self.females > 0:
                self.females -= 1
                # ลบ pregnancy tracking ของคนที่ตาย
                if self.pregnancies:
                    self.pregnancies.pop()

        self.human_pop = max(0, self.human_pop)
        self.males     = max(0, self.males)
        self.females   = max(0, self.females)

        return hunted_deer

    # ── สรุปสถานะสำหรับแสดงผล ────────────────────────────────────────
    @property
    def pregnant_count(self) -> int:
        return sum(1 for p in self.pregnancies if p.pregnant)

    @property
    def summary(self) -> str:
        return (f"👨 {self.males} ชาย  👩 {self.females} หญิง"
                f"  🤰 {self.pregnant_count} ตั้งครรภ์"
                f"  👶 รวม {self.human_pop} คน")
