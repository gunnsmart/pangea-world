# models/animal.py
import random
import math
from typing import List, Tuple, Dict, Any
from utils.config import MAP_SIZE

class AnimalDrives:
    def __init__(self):
        self.hunger = random.uniform(10, 40)
        self.thirst = random.uniform(5, 20)
        self.tired = random.uniform(5, 20)
        self.fear = 0.0
        self.libido = random.uniform(0, 30)

    def step(self, is_active: bool, temp_c: float):
        if is_active:
            self.hunger = min(100, self.hunger + 3.0)
            self.thirst = min(100, self.thirst + 4.0)
            self.tired = min(100, self.tired + 2.5)
            self.libido = min(100, self.libido + 0.8)
        else:
            self.tired = max(0, self.tired - 10)
            self.hunger = min(100, self.hunger + 1.0)
        self.fear = max(0, self.fear - 3)

    @property
    def dominant(self) -> str:
        d = {"hunger": self.hunger, "thirst": self.thirst,
             "tired": self.tired, "fear": self.fear}
        return max(d, key=d.get)

ACTIVITY = {
    "กระต่ายป่า": list(range(5,9)) + list(range(17,21)),
    "กวางเรนเดียร์": list(range(6,19)),
    "หมูป่า": list(range(18,24)) + list(range(0,6)),
    "หมาป่าสีเทา": list(range(19,24)) + list(range(0,7)),
    "เสือเขี้ยวดาบ": list(range(5,8)) + list(range(18,23)),
}

BIOME_PREF = {
    "กระต่ายป่า": [2,3,4],
    "กวางเรนเดียร์": [3,4,5],
    "หมูป่า": [3,4,5],
    "หมาป่าสีเทา": [3,5,6],
    "เสือเขี้ยวดาบ": [4,5,6],
}

class Animal:
    _id_counter = 0

    def __init__(self, species: str, a_type: str, mass: float,
                 energy_gain: float, icon: str, generation: int = 0):
        Animal._id_counter += 1
        self.id = Animal._id_counter
        self.species = species
        self.a_type = a_type
        self.mass = mass
        self.energy_gain = energy_gain
        self.icon = icon
        self.generation = generation

        self.energy = random.uniform(400, 700)
        self.health = 100.0
        self.age = random.uniform(0, 3*365)
        self.alive = True
        self.sleeping = False
        self.status = "ปกติ"
        self.pos = [random.randint(2, MAP_SIZE-3), random.randint(2, MAP_SIZE-3)]

        self.drives = AnimalDrives()
        self.sex = random.choice(["M", "F"])
        self.pregnant = False
        self.days_pregnant = 0
        self.gestation = self._gestation_days()
        self.recovery_days = 0
        self.total_births = 0

        self.active_hours = ACTIVITY.get(species, list(range(6,19)))
        self.biome_pref = BIOME_PREF.get(species, [3,4,5])

        self.known_food_pos = []
        self.known_water_pos = []
        self.known_danger_pos = []

    def _gestation_days(self) -> int:
        g = {"กระต่ายป่า":30, "กวางเรนเดียร์":230, "หมูป่า":120,
             "หมาป่าสีเทา":63, "เสือเขี้ยวดาบ":100}
        return g.get(self.species, 90)

    @property
    def age_years(self) -> float:
        return self.age / 365

    @property
    def max_age(self) -> float:
        m = {"กระต่ายป่า":5, "กวางเรนเดียร์":15, "หมูป่า":10,
             "หมาป่าสีเทา":13, "เสือเขี้ยวดาบ":20}
        return m.get(self.species, 10) * 365

    def is_active(self, hour: int) -> bool:
        return hour in self.active_hours

    def update(self, hour: int, terrain, temp_c: float) -> List[Tuple[str, Any]]:
        if not self.alive:
            return []
        events = []
        self.age += 1
        active = self.is_active(hour)
        self.sleeping = not active
        self.drives.step(active, temp_c)

        if active:
            self.energy -= 0.003 * (self.mass/10.0) * (1 + self.age_years*0.01)
            self.energy = max(0, self.energy)

        if self.pregnant:
            self.days_pregnant += 1
            if self.days_pregnant >= self.gestation:
                baby = self._give_birth()
                if baby:
                    events.append(("birth", baby))
                    self.pregnant = False
                    self.days_pregnant = 0
                    self.recovery_days = 30

        if self.recovery_days > 0:
            self.recovery_days -= 1

        dom = self.drives.dominant
        if dom == "hunger": self.status = "🍖 หิว"
        elif dom == "thirst": self.status = "💧 กระหาย"
        elif dom == "tired": self.status = "😴 ง่วง"
        elif dom == "fear": self.status = "😱 กลัว"
        else: self.status = "✅ ปกติ"
        if self.sleeping: self.status = "😴 หลับ"

        if self._check_death():
            self.alive = False
            events.append(("death", self))

        return events

    def _give_birth(self):
        survival = 0.6 if self.health > 60 else 0.3
        if random.random() < survival:
            baby = Animal(self.species, self.a_type, self.mass * 0.3,
                          self.energy_gain, self.icon, self.generation+1)
            baby.pos = self.pos[:]
            baby.age = 0
            baby.energy = 200
            self.total_births += 1
            return baby
        return None

    def _check_death(self) -> bool:
        if self.drives.hunger >= 100 and self.energy <= 0:
            return True
        if self.age > self.max_age and random.random() < 0.01:
            return True
        if self.health <= 0:
            return True
        return False

    def move_smart(self, terrain, size: int):
        if self.sleeping:
            return
        dom = self.drives.dominant
        if dom == "hunger" and self.known_food_pos:
            target = random.choice(self.known_food_pos[-3:])
            self._move_toward(target, size)
            return
        if dom == "thirst" and self.known_water_pos:
            target = random.choice(self.known_water_pos[-3:])
            self._move_toward(target, size)
            return
        if self.drives.fear > 30 and self.known_danger_pos:
            danger = self.known_danger_pos[-1]
            dr = self.pos[0] - danger[0]
            dc = self.pos[1] - danger[1]
            dist = max(1, math.sqrt(dr*dr+dc*dc))
            self.pos[0] = max(0, min(size-1, self.pos[0] + int(2*dr/dist)))
            self.pos[1] = max(0, min(size-1, self.pos[1] + int(2*dc/dist)))
            return
        best_pos, best_score = self.pos[:], -1
        for _ in range(5):
            dr, dc = random.randint(-3,3), random.randint(-3,3)
            nr = max(0, min(size-1, self.pos[0]+dr))
            nc = max(0, min(size-1, self.pos[1]+dc))
            biome = terrain.template[nr][nc]
            veg = terrain.vegetation[nr][nc]
            score = (1 if biome in self.biome_pref else 0) + veg * 0.01
            if score > best_score:
                best_score, best_pos = score, [nr, nc]
        self.pos = best_pos

    def _move_toward(self, target: List[int], size: int):
        dr = max(-3, min(3, target[0]-self.pos[0]))
        dc = max(-3, min(3, target[1]-self.pos[1]))
        self.pos[0] = max(0, min(size-1, self.pos[0]+dr))
        self.pos[1] = max(0, min(size-1, self.pos[1]+dc))

    def eat_vegetation(self, terrain) -> float:
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
        r, c = self.pos
        info = terrain.get_info(r, c)
        if info.get("is_water"):
            self.drives.thirst = max(0, self.drives.thirst - 60)
            self.known_water_pos.append([r, c])
            if len(self.known_water_pos) > 5:
                self.known_water_pos.pop(0)
            return True
        return False

    def try_mate(self, other: "Animal") -> bool:
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
            self.drives.libido = max(0, self.drives.libido - 60)
            other.drives.libido = max(0, other.drives.libido - 60)
            return True
        return False

    def to_dict(self) -> Dict:
        return {
            "species": self.species,
            "type": self.a_type,
            "pos": self.pos,
            "sleeping": self.sleeping,
            "status": self.status,
            "icon": self.icon,
        }

def spawn_wildlife() -> List[Animal]:
    animals = []
    specs = [
        ("กระต่ายป่า", "Herbivore", 2.0, 150, "🐰", 4),
        ("กวางเรนเดียร์", "Herbivore", 120.0, 400, "🦌", 4),
        ("หมูป่า", "Herbivore", 80.0, 300, "🐗", 2),
        ("หมาป่าสีเทา", "Carnivore", 45.0, 500, "🐺", 2),
        ("เสือเขี้ยวดาบ", "Carnivore", 200.0, 800, "🐯", 2),
    ]
    for species, atype, mass, eg, icon, count in specs:
        males = count // 2
        females = count - males
        for sex in ["M"]*males + ["F"]*females:
            a = Animal(species, atype, mass, eg, icon)
            a.sex = sex
            animals.append(a)
    return animals