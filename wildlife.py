import random

# ─── Activity schedule (active_hours = ช่วงชั่วโมงที่ตื่น) ───────────────
# แต่ละสปีชีส์มี diurnal (กลางวัน) หรือ nocturnal (กลางคืน) ต่างกัน
ACTIVITY = {
    "กระต่ายป่า":     {"schedule": "crepuscular", "active": list(range(5,9))  + list(range(17,21))},  # รุ่งเช้า + โพล้เย็น
    "กวางเรนเดียร์":  {"schedule": "diurnal",     "active": list(range(6,19))},                        # กลางวัน
    "หมูป่า":         {"schedule": "nocturnal",    "active": list(range(18,24)) + list(range(0,6))},    # กลางคืน
    "หมาป่าสีเทา":    {"schedule": "nocturnal",    "active": list(range(19,24)) + list(range(0,7))},    # กลางคืน
    "เสือเขี้ยวดาบ":  {"schedule": "crepuscular",  "active": list(range(5,8))  + list(range(18,23))},  # รุ่งเช้า + หัวค่ำ
}


class Animal:
    def __init__(self, species, a_type, mass, energy_gain, icon):
        self.species     = species
        self.a_type      = a_type       # 'Herbivore' หรือ 'Carnivore'
        self.mass        = mass
        self.energy      = 500.0
        self.toxin       = 0.0
        self.pos         = [random.randint(0, 49), random.randint(0, 49)]
        self.icon        = icon
        self.energy_gain = energy_gain
        self.status      = "ปกติ"
        self.sleeping    = False

        # โหลด schedule
        sched = ACTIVITY.get(species, {"active": list(range(6, 19))})
        self.active_hours = sched["active"]
        self.schedule     = sched.get("schedule", "diurnal")

    # ── ตรวจสอบว่าตื่นอยู่ไหมตามเวลาไทย ──────────────────────────────
    def is_active(self, hour: int) -> bool:
        return hour in self.active_hours

    # ── update พลังงาน/สถานะ ──────────────────────────────────────────
    def update_life(self, elevation: int, hour: int):
        self.sleeping = not self.is_active(hour)

        if self.sleeping:
            # หลับ — พลังงานฟื้นฟูช้าๆ แทนที่จะลด
            self.energy = min(self.energy + 0.5, 1000.0)
            self.status = "😴 หลับ"
            return

        # ตื่น — คำนวณ work ปกติ
        work = 0.003 * (self.mass / 10.0) * (elevation + 1)
        self.energy -= work
        self.toxin  += 0.0005

        if self.energy < 200:
            self.status = "🍖 หิว"
        elif self.toxin > 70:
            self.status = "🤢 ปวดท้อง"
        else:
            self.status = "✅ ปกติ"

    # ── ขยับตำแหน่ง (เฉพาะเมื่อตื่น) ────────────────────────────────
    def move(self, size: int = 50):
        if self.sleeping:
            return  # ไม่ขยับตอนหลับ
        self.pos[0] = max(0, min(size - 1, self.pos[0] + random.randint(-1, 1)))
        self.pos[1] = max(0, min(size - 1, self.pos[1] + random.randint(-1, 1)))


def spawn_wildlife():
    return [
        Animal("กระต่ายป่า",    "Herbivore", 2.0,   150, "🐰"),
        Animal("กวางเรนเดียร์", "Herbivore", 120.0, 400, "🦌"),
        Animal("หมูป่า",        "Herbivore", 80.0,  300, "🐗"),
        Animal("หมาป่าสีเทา",   "Carnivore", 45.0,  500, "🐺"),
        Animal("เสือเขี้ยวดาบ", "Carnivore", 200.0, 800, "🐯"),
    ]