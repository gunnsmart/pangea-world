# core/world.py
import threading
import time
import numpy as np
from typing import Callable, List, Dict, Any
from utils.config import MAP_SIZE, SIM_STEP_INTERVAL, MAX_CATCHUP
from models.terrain import TerrainMap
from models.environment import WeatherSystem, DisasterSystem
from models.plant import PlantEcosystem
from models.animal import Animal, spawn_wildlife
from models.human import HumanAI
from models.fire import FireSystem
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
        self.relationship = Relationship("Adam", "Eve")
        self.humans = [
            HumanAI("Adam", 170, 70, "Eve"),
            HumanAI("Eve", 160, 55, "Adam")
        ]
        self.animals = spawn_wildlife()
        self.event_bus = EventBus()
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
            if not self.paused:
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

        # hourly updates
        self._update_hourly()

    def _update_day(self):
        # daily systems
        self.weather.step_day()
        dis_events, dis_fx = self.disasters.step_day(self.weather)
        for ev in dis_events:
            self.event_bus.emit("log", ev)
        self.plants.step_day(self.weather.global_moisture, self.weather.global_temperature)
        self.fauna.step_day(self.plants.global_biomass)
        # apply disaster effects
        if dis_fx["biomass_mod"] != 0:
            self.plants.global_biomass = max(10, self.plants.global_biomass * (1 + dis_fx["biomass_mod"]))
        if dis_fx["animal_deaths"] > 0:
            self.fauna.rabbit_pop = max(0, self.fauna.rabbit_pop - dis_fx["animal_deaths"] * 3)
            self.fauna.deer_pop = max(0, self.fauna.deer_pop - dis_fx["animal_deaths"])
        if dis_fx["animal_flee"]:
            for a in self.animals:
                a.pos = [np.random.randint(0, MAP_SIZE-1), np.random.randint(0, MAP_SIZE-1)]

    def _update_hourly(self):
        # fire
        fire_events, _ = self.fires.step_hour(self.weather.global_temperature)
        for ev in fire_events:
            self.event_bus.emit("log", ev)

        # humans
        for h in self.humans:
            if not h.body.alive:
                continue
            partner = self.humans[1] if h.name == "Adam" else self.humans[0]
            perception = h.perceive(self, partner)
            action = h.decide(perception)
            h.act(action, self, partner)

            # physics update
            biome = self.terrain.template[int(h.pos[0])][int(h.pos[1])]
            elev = self.terrain.get_elevation(biome)
            h.update_physics(elev)

            # body step
            h.body.step_day(
                calories_in=800 if h.brain.drives.hunger < 60 else 200,
                is_active=not h.sleeping,
                stressed=(h.brain.drives.hunger >= 85),
                bonded=(np.linalg.norm(h.pos - partner.pos) <= 3)
            )

        # animals
        new_animals = []
        for a in self.animals:
            events = a.update(self.hour, self.terrain, self.weather.global_temperature)
            for ev_type, ev_data in events:
                if ev_type == "birth":
                    new_animals.append(ev_data)
                    self.event_bus.emit("log", f"🐣 {a.species} (Gen{a.generation}) คลอดลูก!")
                elif ev_type == "death":
                    self.event_bus.emit("log", f"💀 {a.species} เสียชีวิต (อายุ {a.age_years:.1f} ปี)")
            if a.alive:
                a.move_smart(self.terrain, MAP_SIZE)

        self.animals = [a for a in self.animals if a.alive] + new_animals

        # relationship
        dist = np.linalg.norm(self.humans[0].pos - self.humans[1].pos)
        mated = "mate" in self.humans[0].current_action or "mate" in self.humans[1].current_action
        rel_events = self.relationship.step_day(
            dist=int(dist),
            mated_today=mated,
            a_hungry=(self.humans[0].brain.drives.hunger>=85),
            b_hungry=(self.humans[1].brain.drives.hunger>=85)
        )
        for ev in rel_events:
            self.event_bus.emit("log", ev)

        # sync fauna counts
        self.fauna.rabbit_pop = sum(1 for a in self.animals if a.species == "กระต่ายป่า")
        self.fauna.deer_pop = sum(1 for a in self.animals if a.species == "กวางเรนเดียร์")
        self.fauna.tiger_pop = sum(1 for a in self.animals if a.species == "เสือเขี้ยวดาบ")
        self.fauna.eagle_pop = sum(1 for a in self.animals if a.species == "นกอินทรี")

    def _notify_listeners(self):
        snapshot = self.to_dict()
        for cb in self.listeners:
            cb(snapshot)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "day": self.day,
            "hour": self.hour,
            "weather": self.weather.current_state,
            "temp": self.weather.global_temperature,
            "moisture": self.weather.global_moisture,
            "biomass": self.plants.global_biomass,
            "humans": [h.to_dict() for h in self.humans],
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
            "history": self.event_bus.get_logs(30),
        }