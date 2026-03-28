# core/world.py
import threading
import time
import numpy as np
import random
from typing import Callable, List, Dict, Any, Set
from utils.config import MAP_SIZE, SIM_STEP_INTERVAL, MAX_CATCHUP
from models.terrain import TerrainMap
from models.environment import WeatherSystem, DisasterSystem
from models.plant import PlantEcosystem
from models.animal import Animal, spawn_wildlife
from models.human import HumanAI
from models.fire import FireSystem
from models.shelter import ShelterSystem
from models.relationship import Relationship
from systems.physics import WorldPhysics
from systems.biology import FaunaEcosystem, HumanEcosystem
from core.event_bus import EventBus

class World:
    def __init__(self):
        self.day = 0
        self.hour = 12
        self.terrain = TerrainMap()
        self.weather = WeatherSystem()
        self.plants = PlantEcosystem(self.terrain)
        self.fauna = FaunaEcosystem()
        self.humansys = HumanEcosystem()
        self.disasters = DisasterSystem(MAP_SIZE)
        self.physics = WorldPhysics()
        self.fires = FireSystem()
        self.shelters = ShelterSystem()
        self.relationship = Relationship("Adam", "Eve")
        self.humans = [
            HumanAI("Adam", 170, 70, "Eve", time_scale=5.0),
            HumanAI("Eve", 160, 55, "Adam", time_scale=5.0)
        ]
        self.animals = spawn_wildlife()
        self.event_bus = EventBus()
        self.dead: Set[str] = set()
        self.game_over = False
        self._setup_initial_positions()

        self.running = True
        self.paused = False
        self.sim_thread = threading.Thread(target=self._run, daemon=True)
        self.listeners: List[Callable[[Dict], None]] = []

    def _setup_initial_positions(self):
        self.humans[0].pos = np.array([50.0, 50.0, 0.0])
        self.humans[1].pos = np.array([50.0, 52.0, 0.0])
        for a in self.animals:
            for _ in range(20):
                if self.terrain.template[a.pos[0]][a.pos[1]] not in [0,1]:
                    break
                a.pos = [np.random.randint(20, 80), np.random.randint(20, 80)]

    def start(self):
        self.sim_thread.start()

    def _run(self):
        last_time = time.monotonic()
        accumulated = 0.0
        while self.running:
            now = time.monotonic()
            delta = now - last_time
            last_time = now
            if not self.paused and not self.game_over:
                accumulated += delta
                steps = int(accumulated / SIM_STEP_INTERVAL)
                steps = min(steps, MAX_CATCHUP)
                if steps:
                    accumulated -= steps * SIM_STEP_INTERVAL
                    for _ in range(steps):
                        self._update_hour()
                        self._notify_listeners()
            time.sleep(0.01)

    def _update_hour(self):
        self.hour = (self.hour + 1) % 24
        if self.hour == 0:
            self.day += 1
            self._update_day()
        self._update_hourly()

    def _update_day(self):
        self.weather.step_day()
        dis_events, dis_fx = self.disasters.step_day(self.weather)
        for ev in dis_events:
            self.event_bus.emit("log", ev)
        self.plants.step_day(self.weather.global_moisture, self.weather.global_temperature)
        self.fauna.step_day(self.plants.global_biomass)
        if dis_fx["biomass_mod"] != 0:
            self.plants.global_biomass = max(10, self.plants.global_biomass * (1 + dis_fx["biomass_mod"]))
        if dis_fx["animal_deaths"] > 0:
            self.fauna.rabbit_pop = max(0, self.fauna.rabbit_pop - dis_fx["animal_deaths"] * 3)
            self.fauna.deer_pop = max(0, self.fauna.deer_pop - dis_fx["animal_deaths"])
        if dis_fx["animal_flee"]:
            for a in self.animals:
                a.pos = [np.random.randint(0, MAP_SIZE-1), np.random.randint(0, MAP_SIZE-1)]

        # Apply disaster effects to humans
        if dis_fx["human_injury"] > 0:
            for h in self.humans:
                if random.random() < 0.5:
                    h.body.health = max(0, h.body.health - dis_fx["human_injury"])
                    h.brain.receive_pain("injury", dis_fx["human_injury"]/50)
        if dis_fx["plague_active"]:
            for h in self.humans:
                if random.random() < dis_fx["plague_severity"] * 0.05:
                    if "🦠 โรคระบาด" not in h.body.diseases:
                        h.body.diseases.append("🦠 โรคระบาด")
                        h.body.health = max(0, h.body.health - 15)
                        h.brain.receive_pain("disease", 0.5)
                        self.event_bus.emit("log", f"🦠 {h.name} ติดโรค!")

        hunted = self.humansys.step_day(self.plants.global_biomass, self.fauna.deer_pop)
        self.fauna.deer_pop = max(0, self.fauna.deer_pop - hunted)

        # Save snapshot and timeseries
        try:
            from persistence.database import save_snapshot, record_timeseries
            state_dict = {
                "day": self.day,
                "weather_day": self.weather.day,
                "temp": self.weather.global_temperature,
                "moisture": self.weather.global_moisture,
                "biomass": self.plants.global_biomass,
                "rabbit": self.fauna.rabbit_pop,
                "deer": self.fauna.deer_pop,
                "tiger": self.fauna.tiger_pop,
                "human_pop": self.humansys.human_pop,
            }
            save_snapshot(self.day, state_dict, self.humans)
            record_timeseries(self.day, self.fauna, self.plants.global_biomass,
                              self.physics.atmo.co2_ppm, self.weather.global_temperature,
                              self.humansys.human_pop)
        except Exception as e:
            print(f"[DB] persistence error: {e}")

    def _update_hourly(self):
        # Fire
        fire_events, _ = self.fires.step_hour(self.weather.global_temperature)
        for ev in fire_events:
            self.event_bus.emit("log", ev)

        # Shelter
        shelter_events = self.shelters.step_hour(self.weather.current_state)
        for ev in shelter_events:
            self.event_bus.emit("log", ev)

        # Humans
        for h in self.humans:
            if not h.body.alive:
                continue
            partner = self.humans[1] if h.name == "Adam" else self.humans[0]
            perception = h.perceive(self, partner)
            action = h.decide(perception)
            h.current_action = action

            # Record drives before action to compute outcome
            old_hunger = h.brain.drives.hunger
            old_tired = h.brain.drives.tired
            old_cold = h.brain.drives.cold

            h.act(action, self, partner)   # execute action

            # Compute outcome: improvement in drives (negative change is good)
            outcome = (old_hunger - h.brain.drives.hunger) / 100 \
                      + (old_tired - h.brain.drives.tired) / 100 \
                      + (old_cold - h.brain.drives.cold) / 100
            outcome = max(-1, min(1, outcome))
            h.brain.learn(action, outcome)

            # Physics
            biome = self.terrain.template[int(h.pos[0])][int(h.pos[1])]
            elev = self.terrain.get_elevation(biome)
            h.update_physics(elev)

            # Body step
            body_events = h.body.step_day(
                calories_in=800 if h.brain.drives.hunger < 60 else 200,
                is_active=not h.sleeping,
                stressed=(h.brain.drives.hunger >= 85),
                bonded=(np.linalg.norm(h.pos - partner.pos) <= 3)
            )
            for ev in body_events:
                self.event_bus.emit("log", ev)

            # Pain/pleasure signals
            if h.body.health < 50:
                h.brain.receive_pain("injury", (50 - h.body.health)/100)
            if h.body.u_energy < 500:
                h.brain.receive_pain("hunger", (500 - h.body.u_energy)/500)
            if h.brain.drives.cold > 60:
                h.brain.receive_pain("cold", (h.brain.drives.cold-60)/80)
            if h.brain.drives.tired > 90 and not h.sleeping:
                h.brain.receive_pain("tired", 0.3)
            if h.brain.drives.hunger < 30:
                h.brain.receive_pleasure("food", 0.5)
            if self.fires.nearby_fire(h.pos) is not None:
                h.brain.receive_pleasure("warmth", 0.3)

            # Episodic memory
            context_str = "+".join([v.kind for v in h.visible[:3]] + [s.kind for s in h.sounds[:2]]) or "normal"
            h.ltm.store_episode(
                day=self.day, hour=self.hour, pos=[int(h.pos[0]), int(h.pos[1])],
                action=action, outcome=outcome,
                emotion=h.brain.emotion.label,
                context=context_str,
                importance=min(1.0, abs(outcome)+0.2)
            )

            # Spatial memory
            for vo in h.visible[:5]:
                if vo.kind == "food" and vo.distance <= 3:
                    h.ltm.remember_place("food_rich", vo.pos, self.day)
                elif vo.kind == "water":
                    h.ltm.remember_place("water", vo.pos, self.day)
                elif vo.kind == "fire":
                    h.ltm.remember_place("fire_spot", vo.pos, self.day)
                elif vo.kind == "animal_pred" and vo.distance <= 5:
                    h.ltm.remember_place("danger", vo.pos, self.day)

            # Semantic learning
            if action == "start_fire" and outcome > 0:
                h.ltm.learn_fact("fire=warm", 1.0)
            if action == "eat_cooked" and outcome > 0.5:
                h.ltm.learn_fact("cooked_food=better", 1.0)
            if perception.get("sees_predator"):
                h.ltm.learn_fact("predator=danger", 1.0)

            if self.day % 10 == 0:
                h.ltm.decay(self.day)

            # Wake up
            if h.sleeping and 6 <= self.hour < 21 and h.brain.drives.tired < 30:
                h.sleeping = False
                h.brain.receive_pleasure("rest", 0.5)
                self.event_bus.emit("log", f"🌅 {h.name} ตื่นนอน")

            # Death check
            if not h.body.alive and h.name not in self.dead:
                self.dead.add(h.name)
                self.event_bus.emit("log", f"💀 {h.name} เสียชีวิต (อายุ {h.body.age_years:.1f} ปี)")
                if len(self.dead) >= 2:
                    self.game_over = True
                    self.event_bus.emit("log", "🌑 สายพันธุ์มนุษย์สูญพันธุ์")

        # Animals
        new_animals = []
        dead_animals = []
        for a in self.animals:
            events = a.update(self.hour, self.terrain, self.weather.global_temperature)
            for ev_type, ev_data in events:
                if ev_type == "birth":
                    new_animals.append(ev_data)
                    self.event_bus.emit("log", f"🐣 {a.species} (Gen{a.generation}) คลอดลูก!")
                elif ev_type == "death":
                    dead_animals.append(a)
                    self.event_bus.emit("log", f"💀 {a.species} เสียชีวิต (อายุ {a.age_years:.1f} ปี)")
            if a.alive:
                a.move_smart(self.terrain, MAP_SIZE)
                if a.a_type == "Herbivore" and not a.sleeping:
                    if a.drives.hunger > 40:
                        a.eat_vegetation(self.terrain)
                    if a.drives.thirst > 50:
                        a.drink_water(self.terrain)
                if a.a_type == "Carnivore" and not a.sleeping and a.drives.hunger > 50:
                    for prey in self.animals:
                        if (prey.alive and not prey.sleeping and prey.a_type == "Herbivore"
                                and abs(prey.pos[0]-a.pos[0]) + abs(prey.pos[1]-a.pos[1]) <= 1):
                            a.energy = min(1000, a.energy + a.energy_gain)
                            a.drives.hunger = max(0, a.drives.hunger - 60)
                            prey.health -= 80
                            if prey.health <= 0:
                                prey.alive = False
                                self.event_bus.emit("log", f"🩸 {a.species} ล่า {prey.species} สำเร็จ")
                            break
                if a.drives.libido > 70 and not a.sleeping and not a.pregnant:
                    for other in self.animals:
                        if (other.alive and other.species == a.species and other.sex != a.sex
                                and abs(other.pos[0]-a.pos[0]) + abs(other.pos[1]-a.pos[1]) <= 2):
                            if a.try_mate(other):
                                self.event_bus.emit("log", f"💕 {a.species} สืบพันธุ์ (Gen{a.generation})")
                                break

        self.animals = [a for a in self.animals if a.alive and a not in dead_animals] + new_animals
        MAX_ANIMALS = 60
        if len(self.animals) > MAX_ANIMALS:
            self.animals.sort(key=lambda x: x.age, reverse=True)
            self.animals = self.animals[:MAX_ANIMALS]

        self.fauna.rabbit_pop = sum(1 for a in self.animals if a.species == "กระต่ายป่า")
        self.fauna.deer_pop = sum(1 for a in self.animals if a.species == "กวางเรนเดียร์")
        self.fauna.tiger_pop = sum(1 for a in self.animals if a.species == "เสือเขี้ยวดาบ")
        self.fauna.eagle_pop = sum(1 for a in self.animals if a.species == "นกอินทรี")

        # Relationship
        dist_ab = np.linalg.norm(self.humans[0].pos - self.humans[1].pos)
        mated = "mate" in self.humans[0].current_action or "mate" in self.humans[1].current_action
        rel_events = self.relationship.step_day(
            dist=int(dist_ab),
            mated_today=mated,
            a_hungry=(self.humans[0].brain.drives.hunger >= 85),
            b_hungry=(self.humans[1].brain.drives.hunger >= 85)
        )
        for ev in rel_events:
            self.event_bus.emit("log", ev)

        self.invalidate()

    def _notify_listeners(self):
        snapshot = self.to_dict()
        for cb in self.listeners:
            cb(snapshot)

    def _brightness(self, hour: int) -> float:
        if 6 <= hour < 8:   return 0.65
        if 8 <= hour < 17:  return 1.0
        if 17 <= hour < 19: return 0.65
        if 19 <= hour < 22: return 0.35
        return 0.15

    def _build_map(self) -> list:
        """สร้าง map เป็น list 100x100 ของ RGB colors"""
        SIZE = self.terrain.size
        img = []
        for r in range(SIZE):
            row = []
            for c in range(SIZE):
                color = list(self.terrain.get_color(r, c))
                row.append(color)
            img.append(row)

        # overlay flood
        for d in self.disasters.active_disasters:
            if d.kind == "flood" and d.active:
                radius = int(d.severity * 6)
                for dr in range(-radius, radius+1):
                    for dc in range(-radius, radius+1):
                        fr = max(0, min(SIZE-1, d.center[0]+dr))
                        fc = max(0, min(SIZE-1, d.center[1]+dc))
                        img[fr][fc] = [30, 100, 220]

        # overlay fire
        for f in self.fires.active_fires:
            fr, fc = int(f.pos[0]), int(f.pos[1])
            if 0 <= fr < SIZE and 0 <= fc < SIZE:
                img[fr][fc] = [255, 140, 0]

        # overlay animals
        for a in self.animals:
            ar, ac = int(a.pos[0]), int(a.pos[1])
            if 0 <= ar < SIZE and 0 <= ac < SIZE:
                if a.sleeping:
                    img[ar][ac] = [100, 100, 120]
                elif a.a_type == "Carnivore":
                    img[ar][ac] = [255, 50, 50]
                else:
                    img[ar][ac] = [255, 220, 50]

        # overlay humans
        for h in self.humans:
            hr, hc = int(h.pos[0]), int(h.pos[1])
            if 0 <= hr < SIZE and 0 <= hc < SIZE:
                img[hr][hc] = [255, 255, 255]

        # night overlay
        brightness = self._brightness(self.hour)
        if brightness < 1.0:
            for r in range(SIZE):
                for c in range(SIZE):
                    px = img[r][c]
                    img[r][c] = [
                        int(px[0]*brightness),
                        int(px[1]*brightness),
                        min(255, int(px[2]*brightness + (1-brightness)*20))
                    ]

        return img

    def to_dict(self) -> Dict[str, Any]:
        human_dicts = []
        for h in self.humans:
            d = h.to_dict()
            d["has_shelter"] = self.shelters.get_nearby_shelter(h.pos) is not None
            human_dicts.append(d)

        return {
            "day": self.day,
            "hour": self.hour,
            "weather": self.weather.current_state,
            "temp": self.weather.global_temperature,
            "moisture": self.weather.global_moisture,
            "biomass": self.plants.global_biomass,
            "humans": human_dicts,
            "shelters": [s.to_dict() for s in self.shelters.shelters],
            "animals": [a.to_dict() for a in self.animals],
            "fauna": {
                "rabbit": self.fauna.rabbit_pop,
                "deer": self.fauna.deer_pop,
                "tiger": self.fauna.tiger_pop,
                "eagle": self.fauna.eagle_pop,
            },
            "relationship": self.relationship.summary,
            "disasters": self.disasters.active_summary,
            "atmosphere": self.physics.atmo.summary,
            "fires": [f.to_dict() for f in self.fires.active_fires],
            "shelters": [ {"pos": s.pos, "durability": s.durability} for s in self.shelters.shelters ],
            "history": self.event_bus.get_logs(30),
            "map": self._build_map(),          # <--- เพิ่ม field map
        }

    def invalidate(self):
        pass
