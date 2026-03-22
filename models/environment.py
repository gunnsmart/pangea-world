# models/environment.py
import random
import math
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple

SEASONS = [
    (0,89,"🌸 ฤดูใบไม้ผลิ", +2.0, +1.5),
    (90,179,"☀️ ฤดูร้อน", +6.0, -1.0),
    (180,269,"🍂 ฤดูใบไม้ร่วง", 0.0, +0.5),
    (270,365,"❄️ ฤดูหนาว", -5.0, -0.5),
]

def get_season(day: int) -> dict:
    doy = day % 365
    for start, end, label, temp_mod, rain_mod in SEASONS:
        if start <= doy <= end:
            return {"label": label, "temp_mod": temp_mod, "rain_mod": rain_mod, "doy": doy}
    return {"label": "☀️ ฤดูร้อน", "temp_mod": 6.0, "rain_mod": -1.0, "doy": doy}

class WeatherSystem:
    STATES = ["แดดจ้า", "เมฆครึ้ม", "ฝนตก", "พายุเข้า"]
    TRANSITIONS = {
        "แดดจ้า": [0.50,0.40,0.09,0.01],
        "เมฆครึ้ม": [0.20,0.60,0.18,0.02],
        "ฝนตก": [0.10,0.40,0.45,0.05],
        "พายุเข้า": [0.05,0.25,0.50,0.20],
    }
    def __init__(self):
        self.current_state = "เมฆครึ้ม"
        self.global_moisture = 60.0
        self.global_temperature = 28.0
        self.day = 0

    def step_day(self) -> List[str]:
        self.day += 1
        events = []
        probs = self.TRANSITIONS[self.current_state]
        self.current_state = random.choices(self.STATES, weights=probs)[0]
        delta_m, delta_t = {
            "แดดจ้า": (-1.5, +0.5),
            "เมฆครึ้ม": (+0.5, -0.2),
            "ฝนตก": (+3.0, -1.0),
            "พายุเข้า": (+6.0, -2.0),
        }[self.current_state]
        s = get_season(self.day)
        delta_t += s["temp_mod"] * 0.05
        delta_m += s["rain_mod"] * 0.1
        self.global_moisture = max(20.0, min(90.0, self.global_moisture + delta_m))
        self.global_temperature = max(15.0, min(42.0, self.global_temperature + delta_t))
        doy = self.day % 365
        if doy in (0,90,180,270):
            events.append(f"🌏 เข้าสู่ {s['label']}")
        return events

@dataclass
class Disaster:
    kind: str
    label: str
    day_start: int
    duration: int
    severity: float
    center: List[int]
    active: bool = True

class DisasterSystem:
    BASE_CHANCE = {"flood":0.002, "volcano":0.0003, "earthquake":0.0005, "plague":0.001, "drought":0.002}
    LABELS = {
        "flood":"🌊 น้ำท่วม", "volcano":"🌋 ภูเขาไฟระเบิด",
        "earthquake":"🌍 แผ่นดินไหว", "plague":"🦠 โรคระบาด", "drought":"🏜 ภัยแล้ง"
    }
    def __init__(self, map_size: int):
        self.map_size = map_size
        self.active_disasters: List[Disaster] = []
        self.day = 0

    def step_day(self, weather: WeatherSystem) -> Tuple[List[str], dict]:
        self.day += 1
        events = []
        effects = {"biomass_mod":0, "animal_deaths":0, "animal_flee":False,
                   "human_injury":0, "moisture_mod":0, "temp_mod":0,
                   "flood_cells":[], "plague_active":False, "plague_severity":0}
        for d in self.active_disasters:
            if not d.active:
                continue
            self._apply_disaster(d, effects, events)
            d.duration -= 1
            if d.duration <= 0:
                d.active = False
        self.active_disasters = [d for d in self.active_disasters if d.active]
        new = self._try_spawn(weather)
        if new:
            self.active_disasters.append(new)
            events.append(f"⚠️ Day {self.day}: {new.label} เกิดขึ้น! (ความรุนแรง {new.severity:.0%})")
        return events, effects

    def _try_spawn(self, weather: WeatherSystem) -> Optional[Disaster]:
        active_kinds = {d.kind for d in self.active_disasters}
        season = get_season(self.day)
        doy = season["doy"]
        for kind, base in self.BASE_CHANCE.items():
            if kind in active_kinds:
                continue
            chance = base
            if kind == "flood" and doy in range(90,180): chance *= 3
            if kind == "drought" and doy in range(90,180): chance *= 2
            if kind == "flood" and weather.current_state == "พายุเข้า": chance *= 4
            if kind == "plague" and weather.global_moisture > 75: chance *= 2
            if kind == "volcano" and doy in range(270,365): chance *= 1.5
            if random.random() < chance:
                severity = random.uniform(0.3,1.0)
                duration = {"flood":random.randint(3,14), "volcano":random.randint(7,21),
                            "earthquake":random.randint(1,3), "plague":random.randint(14,60),
                            "drought":random.randint(10,30)}[kind]
                center = [random.randint(5,self.map_size-5), random.randint(5,self.map_size-5)]
                return Disaster(kind, self.LABELS[kind], self.day, duration, severity, center)
        return None

    def _apply_disaster(self, d: Disaster, effects: dict, events: list):
        s = d.severity
        if d.kind == "flood":
            radius = int(s*8*(1-d.duration/14))
            cells = []
            for dr in range(-radius, radius+1):
                for dc in range(-radius, radius+1):
                    r = max(0, min(self.map_size-1, d.center[0]+dr))
                    c = max(0, min(self.map_size-1, d.center[1]+dc))
                    cells.append([r,c])
            effects["flood_cells"].extend(cells)
            effects["biomass_mod"] -= s*0.05
            effects["animal_deaths"] += int(s*2)
            effects["human_injury"] += s*5
            effects["moisture_mod"] += s*3
        elif d.kind == "volcano":
            effects["biomass_mod"] -= s*0.10
            effects["temp_mod"] += s*2
            effects["animal_deaths"] += int(s*5)
            effects["animal_flee"] = True
            effects["human_injury"] += s*15
        elif d.kind == "earthquake":
            effects["biomass_mod"] -= s*0.03
            effects["animal_flee"] = True
            effects["human_injury"] += s*25
            effects["animal_deaths"] += int(s*3)
        elif d.kind == "plague":
            effects["plague_active"] = True
            effects["plague_severity"] = s
            effects["animal_deaths"] += int(s*3)
        elif d.kind == "drought":
            effects["biomass_mod"] -= s*0.08
            effects["moisture_mod"] -= s*5
            effects["animal_deaths"] += int(s*1)

    @property
    def active_summary(self) -> List[dict]:
        return [{"label": d.label, "severity": d.severity,
                 "days_left": d.duration, "center": d.center}
                for d in self.active_disasters if d.active]