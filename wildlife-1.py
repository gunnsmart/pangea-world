"""
wildlife.py — ระบบสัตว์ป่าสมจริง
════════════════════════════════════
กฎ:
  • ไม่เพิ่มอัตโนมัติ — ต้องผ่านการสืบพันธุ์จริง
  • มี drives: หิว, ง่วง, กลัว, ต้องการสืบพันธุ์
  • Food chain: Herbivore กิน vegetation, Carnivore ล่า Herbivore
  • ขับถ่าย — toxin สะสม ต้องหาน้ำ
  • นอน — ตาม schedule กลางวัน/กลางคืน
  • ตายได้จากหิว/บาดเจ็บ/อายุ
  • สืบพันธุ์ได้เมื่อ drives พร้อม
"""

import random
import math

# ── Activity schedules ──────────────────────────────────────────────────────
ACTIVITY = {
    "กระต่ายป่า":    list(range(5,9))  + list(range(17,21)),   # crepuscular
    "กวางเรนเดียร์": list(range(6,19)),                          # diurnal
    "หมูป่า":        list(range(18,24)) + list(range(0,6)),      # nocturnal
    "หมาป่าสีเทา":   list(range(19,24)) + list(range(0,7)),      # nocturnal
    "เสือเขี้ยวดาบ": list(range(5,8))  + list(range(18,23)),    # crepuscular
}

# ── Biome preference ────────────────────────────────────────────────────────
BIOME_PREF = {
    "กระต่ายป่า":    [2, 3, 4],   # ทุ่งหญ้า, tropical, ป่า
    "กวางเรนเดียร์": [3, 4, 5],   # ทุ่งหญ้า, tropical, ป่า
    "หมูป่า":        [3, 4, 5],
    "หมาป่าสีเทา":   [3, 5, 6],   # ทุ่งหญ้า, ป่า, ภูเขา
    "เสือเขี้ยวดาบ": [4, 5, 6],
}


class AnimalDrives:
    """ความต้องการพื้นฐานของสัตว์"""
    def __init__(self):
        self.hunger  : float = random.uniform(10, 40)
        self.thirst  : float = random.uniform(5,  20)
        self.tired   : float = random.uniform(5,  20)
        self.fear    : float = 0.0
        self.libido  : float = random.uniform(0,  30)

    def step(self, is_active: bool, temp_c: float):
        if is_active:
            self.hunger  = min(100, self.hunger  + 3.0)
            self.thirst  = min(100, self.thirst  + 4.0)
            self.tired   = min(100, self.tired   + 2.5)
            self.libido  = min(100, self.libido  + 0.8)
        else:
            # หลับ → ฟื้นฟู
            self.tired   = max(0,   self.tired   - 10)
            self.hunger  = min(100, self.hunger  + 1.0)
        self.fear = max(0, self.fear - 3)

    @property
    def dominant(self) -> str:
        d = {"hunger": self.hunger, "thirst": self.thirst,
             "tired": self.tired, "fear": self.fear}
        return max(d, key=d.get)


class Animal:
    _id_counter = 0

    def __init__(self, species: str, a_type: str, mass: float,
                 energy_gain: float, icon: str, generation: int = 0):
        Animal._id_counter += 1
        self.id          = Animal._id_counter
        self.species     = species
        self.a_type      = a_type
        self.mass        = mass
        self.energy_gain = energy_gain
        self.icon        = icon
        self.generation  = generation   # รุ่นที่เท่าไหร่

        # ── State ────────────────────────────────────────────────
        self.energy  : float = random.uniform(400, 700)
        self.health  : float = 100.0
        self.toxin   : float = 0.0
        self.age     : float = random.uniform(0, 3 * 365)  # วัน
        self.alive   : bool  = True
        self.sleeping: bool  = False
        self.status  : str   = "ปกติ"
        self.pos     : list  = [random.randint(2, 47), random.randint(2, 47)]

        # ── Drives ───────────────────────────────────────────────
        self.drives = AnimalDrives()

        # ── Reproduction ─────────────────────────────────────────
        self.sex              = random.choice(["M", "F"])
        self.pregnant         : bool  = False
        self.days_pregnant    : int   = 0
        self.gestation        : int   = self._gestation_days()
        self.recovery_days    : int   = 0
        self.total_births     : int   = 0

        # ── Schedule ─────────────────────────────────────────────
        self.active_hours = ACTIVITY.get(species, list(range(6, 19)))
        self.biome_pref   = BIOME_PREF.get(species, [3, 4, 5])

        # ── Memory (ง่ายๆ) ───────────────────────────────────────
        self.known_food_pos  : list = []   # ตำแหน่งที่เคยกินได้
        self.known_water_pos : list = []   # ตำแหน่งที่เคยดื่มได้
        self.known_danger_pos: list = []   # ตำแหน่งที่เคยเจออันตราย

    def _gestation_days(self) -> int:
        g = {"กระต่ายป่า": 30, "กวางเรนเดียร์": 230,
             "หมูป่า": 120, "หมาป่าสีเทา": 63, "เสือเขี้ยวดาบ": 100}
        return g.get(self.species, 90)

    @property
    def age_years(self) -> float:
        return self.age / 365

    @property
    def max_age(self) -> float:
        m = {"กระต่ายป่า": 5, "กวางเรนเดียร์": 15,
             "หมูป่า": 10, "หมาป่าสีเทา": 13, "เสือเขี้ยวดาบ": 20}
        return m.get(self.species, 10) * 365

    def is_active(self, hour: int) -> bool:
        return hour in self.active_hours

    # ── Update ──────────────────────────────────────────────────────────
    def update(self, hour: int, terrain, temp_c: float) -> list[str]:
        """อัปเดตทุก step คืน events"""
        if not self.alive:
            return []

        events = []
        self.age += 1

        active = self.is_active(hour)
        self.sleeping = not active
        self.drives.step(active, temp_c)

        # ── ความต้องการ ────────────────────────────────────────
        if active:
            # toxin สะสม
            self.toxin = min(100, self.toxin + 0.1)
            # energy ลดตาม mass
            work = 0.003 * (self.mass / 10.0) * (1 + self.age_years * 0.01)
            self.energy = max(0, self.energy - work)

        # ── ตั้งครรภ์ ───────────────────────────────────────────
        if self.pregnant:
            self.days_pregnant += 1
            if self.days_pregnant >= self.gestation:
                baby = self._give_birth()
                if baby:
                    events.append(("birth", baby))
                    self.days_pregnant = 0
                    self.pregnant = False
                    self.recovery_days = 30

        if self.recovery_days > 0:
            self.recovery_days -= 1

        # ── สถานะ ───────────────────────────────────────────────
        dom = self.drives.dominant
        if dom == "hunger":  self.status = "🍖 หิว"
        elif dom == "thirst":self.status = "💧 กระหาย"
        elif dom == "tired": self.status = "😴 ง่วง"
        elif dom == "fear":  self.status = "😱 กลัว"
        else:                self.status = "✅ ปกติ"

        if self.sleeping:    self.status = "😴 หลับ"

        # ── ตาย ─────────────────────────────────────────────────
        if self._check_death():
            self.alive = False
            events.append(("death", self))

        return events

    def _give_birth(self) -> "Animal | None":
        """คลอดลูก — คืน Animal ใหม่หรือ None ถ้าไม่รอด"""
        survival = 0.6 if self.health > 60 else 0.3
        if random.random() < survival:
            baby = Animal(self.species, self.a_type, self.mass * 0.3,
                          self.energy_gain, self.icon, self.generation + 1)
            baby.pos = self.pos[:]
            baby.age = 0
            baby.energy = 200
            self.total_births += 1
            return baby
        return None

    def _check_death(self) -> bool:
        # หิวมาก
        if self.drives.hunger >= 100 and self.energy <= 0:
            return True
        # อายุมาก
        if self.age > self.max_age:
            if random.random() < 0.01:
                return True
        # สุขภาพต่ำ
        if self.health <= 0:
            return True
        return False

    # ── Move ────────────────────────────────────────────────────────────
    def move_smart(self, terrain, size: int = 50):
        """เดินอย่างชาญฉลาด — ไปหาอาหาร/น้ำ ตามที่จำได้"""
        if self.sleeping:
            return

        dom = self.drives.dominant

        # ถ้าจำตำแหน่งอาหารได้และหิว
        if dom == "hunger" and self.known_food_pos:
            target = random.choice(self.known_food_pos[-3:])
            self._move_toward(target, size)
            return

        # ถ้าจำตำแหน่งน้ำได้และกระหาย
        if dom == "thirst" and self.known_water_pos:
            target = random.choice(self.known_water_pos[-3:])
            self._move_toward(target, size)
            return

        # หลีกเลี่ยงตำแหน่งอันตราย
        if self.drives.fear > 30 and self.known_danger_pos:
            danger = self.known_danger_pos[-1]
            # วิ่งหนีทิศตรงข้าม
            dr = self.pos[0] - danger[0]
            dc = self.pos[1] - danger[1]
            dist = max(1, math.sqrt(dr*dr + dc*dc))
            self.pos[0] = max(0, min(size-1, self.pos[0] + int(2*dr/dist)))
            self.pos[1] = max(0, min(size-1, self.pos[1] + int(2*dc/dist)))
            return

        # เดินสุ่มแต่ชอบ biome ที่ต้องการ
        best_pos, best_score = self.pos[:], -1
        for _ in range(5):
            dr, dc = random.randint(-3,3), random.randint(-3,3)
            nr = max(0, min(size-1, self.pos[0]+dr))
            nc = max(0, min(size-1, self.pos[1]+dc))
            biome = terrain.template[nr][nc]
            veg   = terrain.vegetation[nr][nc]
            score = (1 if biome in self.biome_pref else 0) + veg * 0.01
            if score > best_score:
                best_score, best_pos = score, [nr, nc]

        self.pos = best_pos

    def _move_toward(self, target: list, size: int):
        dr = max(-3, min(3, target[0]-self.pos[0]))
        dc = max(-3, min(3, target[1]-self.pos[1]))
        self.pos[0] = max(0, min(size-1, self.pos[0]+dr))
        self.pos[1] = max(0, min(size-1, self.pos[1]+dc))

    # ── Eat ─────────────────────────────────────────────────────────────
    def eat_vegetation(self, terrain) -> float:
        """กิน vegetation ที่ตำแหน่งปัจจุบัน คืน kcal ที่ได้"""
        if self.sleeping or self.a_type != "Herbivore":
            return 0
        r, c = self.pos
        available = terrain.vegetation[r][c]
        if available < 5:
            return 0
        eaten = min(available, self.mass * 0.05)
        terrain.vegetation[r][c] = max(0, available - eaten)
        self.energy = min(1000, self.energy + eaten * self.energy_gain * 0.01)
        self.drives.hunger = max(0, self.drives.hunger - eaten * 2)
        self.known_food_pos.append([r, c])
        if len(self.known_food_pos) > 10:
            self.known_food_pos.pop(0)
        return eaten

    def drink_water(self, terrain) -> bool:
        """ดื่มน้ำถ้าอยู่ริมน้ำ"""
        r, c = self.pos
        info = terrain.get_info(r, c)
        if info.get("is_water"):
            self.drives.thirst = max(0, self.drives.thirst - 60)
            self.toxin = max(0, self.toxin - 20)
            self.known_water_pos.append([r, c])
            if len(self.known_water_pos) > 5:
                self.known_water_pos.pop(0)
            return True
        return False

    def try_mate(self, other: "Animal") -> bool:
        """ลองสืบพันธุ์กับสัตว์อีกตัว — คืน True ถ้าตั้งครรภ์"""
        if (self.species != other.species or self.sex == other.sex
                or self.sleeping or other.sleeping
                or self.pregnant or other.pregnant
                or self.recovery_days > 0 or other.recovery_days > 0
                or self.drives.libido < 70 or other.drives.libido < 70):
            return False

        female = self if self.sex == "F" else other
        chance = 0.3 - (female.age_years / female.max_age * 0.2)
        if random.random() < max(0.05, chance):
            female.pregnant = True
            female.days_pregnant = 0
            self.drives.libido  = max(0, self.drives.libido  - 60)
            other.drives.libido = max(0, other.drives.libido - 60)
            return True
        return False


# ── Spawn initial wildlife ──────────────────────────────────────────────────
def spawn_wildlife() -> list[Animal]:
    """spawn สัตว์เริ่มต้น — ทั้งชาย/หญิง เพื่อให้สืบพันธุ์ได้"""
    animals = []
    specs = [
        ("กระต่ายป่า",    "Herbivore", 2.0,   150, "🐰", 4),  # 4 ตัว (2 คู่)
        ("กวางเรนเดียร์", "Herbivore", 120.0, 400, "🦌", 4),
        ("หมูป่า",        "Herbivore", 80.0,  300, "🐗", 2),
        ("หมาป่าสีเทา",   "Carnivore", 45.0,  500, "🐺", 2),
        ("เสือเขี้ยวดาบ", "Carnivore", 200.0, 800, "🐯", 2),
    ]
    for species, atype, mass, eg, icon, count in specs:
        males   = count // 2
        females = count - males
        for sex in ["M"] * males + ["F"] * females:
            a = Animal(species, atype, mass, eg, icon)
            a.sex = sex
            animals.append(a)
    return animals
