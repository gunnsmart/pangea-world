# models/human.py
import numpy as np
from typing import Dict, Any
from systems.brain import Brain
from systems.body import Body
from systems.senses import VisionSystem, SoundSystem
from systems.memory import LongTermMemory
from systems.language import ProtoLanguage

class HumanAI:
    def __init__(self, name: str, height: float, mass: float, partner_name: str):
        self.name = name
        self.partner_name = partner_name
        self.sex = "M" if name == "Adam" else "F"
        self.body = Body(name, self.sex, mass, height)
        self.brain = Brain(name)
        self.vision = VisionSystem()
        self.hearing = SoundSystem()
        self.ltm = LongTermMemory()
        self.lang = ProtoLanguage(name)
        self.inventory = []
        self.current_action = "idle"
        self.sleeping = False
        self.pos = np.array([50.0, 50.0, 0.0])

    def perceive(self, world, partner) -> Dict[str, Any]:
        info = world.terrain.get_info(int(self.pos[0]), int(self.pos[1]))
        visible = self.vision.scan(
            self.pos, world.hour, world.terrain,
            world.animals, partner, world.fires
        )
        sounds = self.hearing.listen(
            self.pos, world.animals,
            world.weather.current_state, world.fires,
            world.disasters.active_summary
        )
        vision_dict = self.vision.to_perception_dict(visible, self.ltm, self.pos, world.day)
        sound_dict = self.hearing.to_perception(sounds)

        return {
            "temp_c": world.weather.global_temperature,
            "hour": world.hour,
            "partner_dist": np.linalg.norm(self.pos - partner.pos),
            "partner_sleeping": partner.sleeping,
            "partner_hungry": partner.brain.drives.hunger > 70,
            "danger": any( a.a_type == "Carnivore" and not a.sleeping and
                           np.linalg.norm(a.pos - self.pos[:2]) <= 4
                           for a in world.animals ),
            "has_food": info["food_level"] > 20,
            "has_water": info.get("is_water", False),
            "has_fire": world.fires.nearby_fire(self.pos) is not None,
            "has_cooked_food": len(world.fires.cooked_foods) > 0,
            "biome_food": info["food_level"],
            "is_night": world.hour >= 21 or world.hour < 6,
            "inventory": self.inventory,
            **vision_dict,
            **sound_dict,
        }

    def decide(self, perception: Dict) -> str:
        action = self.brain.step(perception)
        self.current_action = action
        return action

    def act(self, action: str, world, partner):
        # Simplified version - will be expanded
        if action == "sleep":
            self.sleeping = True
            self.brain.drives.relieve("tired", 12)
        elif action == "eat_raw":
            # try to eat from terrain or animals
            pass
        # ... other actions

    def update_physics(self, terrain_elevation: float):
        self.body.physics_step(terrain_elevation)

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "sex": self.sex,
            "pos": self.pos.tolist(),
            "health": self.body.health,
            "age": self.body.age_years,
            "action": self.current_action,
            "sleeping": self.sleeping,
            "emotion": self.brain.emotion.label,
            "drives": {
                "hunger": self.brain.drives.hunger,
                "tired": self.brain.drives.tired,
                "cold": self.brain.drives.cold,
                "fear": self.brain.drives.fear,
                "lonely": self.brain.drives.lonely,
                "bored": self.brain.drives.bored,
            },
            "inventory": self.inventory,
            "last_speech": self.lang.last_utterance_str if hasattr(self.lang, 'last_utterance_str') else "",
        }