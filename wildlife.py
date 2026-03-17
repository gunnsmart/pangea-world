import random
from datetime import datetime

class Animal:
    def __init__(self, species, a_type, mass, energy_gain, icon):
        self.species = species
        self.a_type = a_type # 'Herbivore' หรือ 'Carnivore'
        self.mass = mass
        self.energy = 500.0
        self.toxin = 0.0
        self.pos = [random.randint(0, 14), random.randint(0, 14)]
        self.icon = icon
        self.energy_gain = energy_gain # พลังงานที่ได้จากการกิน
        self.status = "ปกติ"

    def update_life(self, elevation):
        # Thermodynamics: ใช้พลังงานตามมวล
        work = 0.003 * (self.mass / 10.0) * (elevation + 1)
        self.energy -= work
        self.toxin += 0.0005
        
        # ตัดสินใจตามสัญชาตญาณ
        if self.energy < 200: self.status = "หิว"
        elif self.toxin > 70: self.status = "ปวดท้อง"
        elif self.energy < 100: self.status = "ง่วง"
        else: self.status = "สำรวจ"

    def move(self):
        self.pos[0] = max(0, min(14, self.pos[0] + random.randint(-1, 1)))
        self.pos[1] = max(0, min(14, self.pos[1] + random.randint(-1, 1)))

# คลังสัตว์ป่าใน Pangea
def spawn_wildlife():
    return [
        Animal("กระต่ายป่า", "Herbivore", 2.0, 150, "🐰"),
        Animal("กวางเรนเดียร์", "Herbivore", 120.0, 400, "🦌"),
        Animal("หมูป่า", "Herbivore", 80.0, 300, "🐗"),
        Animal("หมาป่าสีเทา", "Carnivore", 45.0, 500, "🐺"),
        Animal("เสือเขี้ยวดาบ", "Carnivore", 200.0, 800, "🐯")
    ]
