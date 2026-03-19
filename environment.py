"""
environment.py — ระบบสิ่งแวดล้อมสมบูรณ์
──────────────────────────────────────────
ประกอบด้วย:
  • WeatherSystem  — สภาพอากาศ + ฤดูกาล 4 ฤดู
  • DisasterSystem — ภัยธรรมชาติ (น้ำท่วม, ภูเขาไฟ, แผ่นดินไหว, โรคระบาด)
  • ผลกระทบต่อ terrain, สัตว์, พืช, มนุษย์
"""

import random
import math
from dataclasses import dataclass, field
from typing import Optional

# ── ฤดูกาล (อิง Day of Year) ──────────────────────────────────────────────
SEASONS = [
    (  0,  89, "🌸 ฤดูใบไม้ผลิ", temp_mod=+2.0,  rain_mod=+1.5),
    ( 90, 179, "☀️ ฤดูร้อน",      temp_mod=+6.0,  rain_mod=-1.0),
    (180, 269, "🍂 ฤดูใบไม้ร่วง", temp_mod=+0.0,  rain_mod=+0.5),
    (270, 365, "❄️ ฤดูหนาว",      temp_mod=-5.0,  rain_mod=-0.5),
]

def get_season(day: int) -> dict:
    doy = day % 365
    for start, end, label, temp_mod, rain_mod in SEASONS:
        if start <= doy <= end:
            return {"label": label, "temp_mod": temp_mod, "rain_mod": rain_mod, "doy": doy}
    return {"label": "☀️ ฤดูร้อน", "temp_mod": 6.0, "rain_mod": -1.0, "doy": doy}


# ── ประเภทภัยธรรมชาติ ──────────────────────────────────────────────────────
@dataclass
class Disaster:
    kind:      str          # "flood" | "volcano" | "earthquake" | "plague" | "drought"
    label:     str
    day_start: int
    duration:  int          # วันที่ภัยยังอยู่
    severity:  float        # 0–1
    center:    list         # [r, c] ตำแหน่งบนแผนที่ (ถ้ามี)
    active:    bool = True

    @property
    def days_remaining(self) -> int:
        return self.duration

    def tick(self):
        self.duration -= 1
        if self.duration <= 0:
            self.active = False


# ── WeatherSystem ──────────────────────────────────────────────────────────
class WeatherSystem:
    STATES = ["แดดจ้า", "เมฆครึ้ม", "ฝนตก", "พายุเข้า"]

    TRANSITIONS = {
        "แดดจ้า":   [0.50, 0.40, 0.09, 0.01],
        "เมฆครึ้ม": [0.20, 0.60, 0.18, 0.02],
        "ฝนตก":     [0.10, 0.40, 0.45, 0.05],
        "พายุเข้า": [0.05, 0.25, 0.50, 0.20],
    }

    def __init__(self):
        self.current_state       = "เมฆครึ้ม"
        self.global_moisture     = 60.0
        self.global_temperature  = 28.0
        self.day                 = 0

    @property
    def season(self) -> dict:
        return get_season(self.day)

    def step_day(self) -> list[str]:
        self.day += 1
        events = []

        # ── เปลี่ยน state ──────────────────────────────────────────
        probs = self.TRANSITIONS[self.current_state]
        self.current_state = random.choices(self.STATES, weights=probs)[0]

        # ── ผลของสภาพอากาศ ────────────────────────────────────────
        delta_m, delta_t = {
            "แดดจ้า":   (-1.5, +0.5),
            "เมฆครึ้ม": (+0.5, -0.2),
            "ฝนตก":     (+3.0, -1.0),
            "พายุเข้า": (+6.0, -2.0),
        }[self.current_state]

        # ── ปรับตามฤดูกาล ─────────────────────────────────────────
        s = self.season
        delta_t += s["temp_mod"] * 0.05   # ปรับอุณหภูมิช้าๆ
        delta_m += s["rain_mod"] * 0.1

        self.global_moisture    = max(20.0, min(90.0, self.global_moisture    + delta_m))
        self.global_temperature = max(15.0, min(42.0, self.global_temperature + delta_t))

        # ── แจ้ง event เปลี่ยนฤดู ────────────────────────────────
        doy = self.day % 365
        if doy in (0, 90, 180, 270):
            events.append(f"🌏 เข้าสู่ {s['label']}")

        return events


# ── DisasterSystem ─────────────────────────────────────────────────────────
class DisasterSystem:
    """
    จัดการภัยธรรมชาติทั้งหมด
    เรียก .step_day() ทุกวัน คืน (events, effects)
    effects = dict ที่ update_world ใช้ปรับค่าต่างๆ
    """

    # โอกาสเกิดต่อวัน (base) — ปรับตามฤดู
    BASE_CHANCE = {
        "flood":      0.002,   # น้ำท่วม
        "volcano":    0.0003,  # ภูเขาไฟ
        "earthquake": 0.0005,  # แผ่นดินไหว
        "plague":     0.001,   # โรคระบาด
        "drought":    0.002,   # ภัยแล้ง
    }

    LABELS = {
        "flood":      "🌊 น้ำท่วม",
        "volcano":    "🌋 ภูเขาไฟระเบิด",
        "earthquake": "🌍 แผ่นดินไหว",
        "plague":     "🦠 โรคระบาด",
        "drought":    "🏜 ภัยแล้ง",
    }

    def __init__(self, map_size: int = 50):
        self.map_size = map_size
        self.active_disasters: list[Disaster] = []
        self.history: list[Disaster] = []
        self.day = 0

    # ── step ──────────────────────────────────────────────────────
    def step_day(self, weather: WeatherSystem) -> tuple[list[str], dict]:
        self.day += 1
        events  = []
        effects = {
            "biomass_mod":    0.0,    # ±% ของ biomass
            "animal_deaths":  0,      # จำนวนสัตว์ตาย
            "animal_flee":    False,  # อพยพออกจากพื้นที่
            "human_injury":   0.0,    # damage ต่อ health มนุษย์
            "moisture_mod":   0.0,
            "temp_mod":       0.0,
            "flood_cells":    [],     # list ของ [r,c] ที่น้ำท่วม
            "plague_active":  False,
            "plague_severity":0.0,
        }

        # ── tick disasters ที่กำลัง active ──────────────────────
        for d in self.active_disasters:
            if not d.active:
                continue
            self._apply_disaster(d, effects, events)
            d.tick()

        # ── ลบที่หมดแล้ว ─────────────────────────────────────────
        finished = [d for d in self.active_disasters if not d.active]
        for d in finished:
            events.append(f"✅ {d.label} สิ้นสุดแล้ว")
            self.history.append(d)
        self.active_disasters = [d for d in self.active_disasters if d.active]

        # ── ลองสุ่มภัยใหม่ ───────────────────────────────────────
        new_disaster = self._try_spawn(weather)
        if new_disaster:
            self.active_disasters.append(new_disaster)
            events.append(f"⚠️ Day {self.day}: {new_disaster.label} เกิดขึ้น! (ความรุนแรง {new_disaster.severity:.0%})")

        return events, effects

    # ── สุ่มภัย ───────────────────────────────────────────────────
    def _try_spawn(self, weather: WeatherSystem) -> Optional[Disaster]:
        # ไม่สุ่มถ้ามีภัยประเภทเดิมอยู่แล้ว
        active_kinds = {d.kind for d in self.active_disasters}

        season = weather.season
        doy    = season["doy"]

        for kind, base in self.BASE_CHANCE.items():
            if kind in active_kinds:
                continue

            chance = base
            # ปรับตามฤดู
            if kind == "flood"  and doy in range(90, 180):  chance *= 3   # น้ำท่วมหน้าร้อน
            if kind == "drought"and doy in range(90, 180):  chance *= 2
            if kind == "flood"  and weather.current_state == "พายุเข้า": chance *= 4
            if kind == "plague" and weather.global_moisture > 75: chance *= 2  # ชื้นมาก
            if kind == "volcano"and doy in range(270, 365): chance *= 1.5

            if random.random() < chance:
                severity = random.uniform(0.3, 1.0)
                duration = {
                    "flood":      random.randint(3, 14),
                    "volcano":    random.randint(7, 21),
                    "earthquake": random.randint(1, 3),
                    "plague":     random.randint(14, 60),
                    "drought":    random.randint(10, 30),
                }[kind]
                center = [random.randint(5, self.map_size-5),
                          random.randint(5, self.map_size-5)]
                return Disaster(
                    kind=kind, label=self.LABELS[kind],
                    day_start=self.day, duration=duration,
                    severity=severity, center=center,
                )
        return None

    # ── ผลกระทบต่อโลก ────────────────────────────────────────────
    def _apply_disaster(self, d: Disaster, effects: dict, events: list):
        s = d.severity

        if d.kind == "flood":
            # น้ำท่วม — ขยายพื้นที่ทุกวัน
            radius = int(s * 8 * (1 - d.duration / 14))
            cells  = []
            for dr in range(-radius, radius+1):
                for dc in range(-radius, radius+1):
                    r = max(0, min(self.map_size-1, d.center[0]+dr))
                    c = max(0, min(self.map_size-1, d.center[1]+dc))
                    cells.append([r, c])
            effects["flood_cells"].extend(cells)
            effects["biomass_mod"]   -= s * 0.05
            effects["animal_deaths"] += int(s * 2)
            effects["human_injury"]  += s * 5
            effects["moisture_mod"]  += s * 3

        elif d.kind == "volcano":
            effects["biomass_mod"]   -= s * 0.10
            effects["temp_mod"]      += s * 2
            effects["animal_deaths"] += int(s * 5)
            effects["animal_flee"]    = True
            effects["human_injury"]  += s * 15
            if random.random() < 0.1:
                events.append("🌋 เถ้าภูเขาไฟปกคลุมพืชพรรณ!")

        elif d.kind == "earthquake":
            effects["biomass_mod"]   -= s * 0.03
            effects["animal_flee"]    = True
            effects["human_injury"]  += s * 25   # อันตรายที่สุดในระยะสั้น
            effects["animal_deaths"] += int(s * 3)
            events.append(f"🌍 แผ่นดินสั่น! มนุษย์อาจบาดเจ็บหนัก")

        elif d.kind == "plague":
            effects["plague_active"]   = True
            effects["plague_severity"] = s
            effects["animal_deaths"]  += int(s * 3)
            if random.random() < s * 0.1:
                events.append(f"🦠 โรคระบาดแพร่กระจาย! (ความรุนแรง {s:.0%})")

        elif d.kind == "drought":
            effects["biomass_mod"]  -= s * 0.08
            effects["moisture_mod"] -= s * 5
            effects["animal_deaths"]+= int(s * 1)
            if random.random() < 0.05:
                events.append("🏜 ภัยแล้งทำให้แหล่งน้ำแห้ง!")

    # ── สรุปสำหรับ UI ─────────────────────────────────────────────
    @property
    def active_summary(self) -> list[dict]:
        return [
            {"label": d.label, "severity": d.severity,
             "days_left": d.duration, "center": d.center}
            for d in self.active_disasters if d.active
    ]
        
