import random
import numpy as np
from typing import Dict, Any, List
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
        self.inventory: List[str] = []
        self.current_action = "idle"
        self.sleeping = False
        self.pos = np.array([50.0, 50.0, 0.0])
        self.visible = []
        self.sounds = []

    @property
    def health(self):
        return self.body.health

    @property
    def u_energy(self):
        return self.body.u_energy

    def perceive(self, world, partner) -> Dict[str, Any]:
        info = world.terrain.get_info(int(self.pos[0]), int(self.pos[1]))
        self.visible = self.vision.scan(
            self.pos, world.hour, world.terrain,
            world.animals, partner, world.fires
        )
        self.sounds = self.hearing.listen(
            self.pos, world.animals,
            world.weather.current_state, world.fires,
            world.disasters.active_summary
        )
        vision_dict = self.vision.to_perception_dict(self.visible, self.ltm, self.pos, world.day)
        sound_dict = self.hearing.to_perception(self.sounds)

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
        if not self.body.alive:
            return
        info = world.terrain.get_info(int(self.pos[0]), int(self.pos[1]))
        near_fire = world.fires.nearby_fire(self.pos, radius=3)
        has_cooked = len(world.fires.cooked_foods) > 0

        # ========== SLEEP ==========
        if action == "sleep":
            self.sleeping = True
            self.brain.drives.relieve("tired", 12)
            self.brain.receive_pleasure("rest", 0.3 + self.brain.drives.tired/100*0.7)

        # ========== EAT RAW / SEEK FOOD ==========
        elif action in ("eat_raw", "seek_food") and not self.sleeping:
            ate = False
            # Hunt animals
            for a in world.animals:
                if a.a_type == "Herbivore" and not a.sleeping:
                    if abs(a.pos[0]-self.pos[0]) + abs(a.pos[1]-self.pos[1]) <= 2:
                        if random.random() < 0.3 + self.brain.skill.get("hunt",0)/200:
                            kcal = {"🐰":120,"🦌":400,"🐗":300}.get(a.icon,150)
                            world.fires.cooked_foods.append({"name": f"เนื้อ{a.species}", "kcal": kcal*0.7, "who": self.name})
                            world.fauna.deer_pop = max(0, world.fauna.deer_pop - (1 if a.icon=="🦌" else 0))
                            world.fauna.rabbit_pop = max(0, world.fauna.rabbit_pop - (1 if a.icon=="🐰" else 0))
                            if a in world.animals:
                                world.animals.remove(a)
                            self.brain.drives.relieve("hunger", 20)
                            self.brain.receive_pleasure("hunt_success", 0.7)
                            self.brain.skill["hunt"] = min(100, self.brain.skill.get("hunt",0)+3)
                            world.event_bus.emit("log", f"🏹 {self.name} ล่า {a.species} สำเร็จ!")
                            ate = True
                            break
            # Eat vegetation
            if not ate and info["food_level"] > 10:
                eaten = world.plants.consume_at(int(self.pos[0]), int(self.pos[1]), 15)
                if eaten > 0:
                    self.body.u_energy = min(2000, self.body.u_energy + eaten * 10)
                    self.brain.drives.relieve("hunger", eaten * 1.5)
                    self.brain.receive_pleasure("food", 0.4 * (eaten/15))
                    ate = True
            if not ate:
                self.brain.receive_pain("hunger", 0.3)
                best, best_food = self.pos[:], -1
                for dr in range(-5,6):
                    for dc in range(-5,6):
                        r2 = max(0, min(world.terrain.size-1, int(self.pos[0])+dr))
                        c2 = max(0, min(world.terrain.size-1, int(self.pos[1])+dc))
                        fl = world.terrain.vegetation[r2][c2]
                        if fl > best_food:
                            best_food, best = fl, [r2,c2]
                direction = np.array([best[0]-self.pos[0], best[1]-self.pos[1], 0.0])
                if np.linalg.norm(direction) > 0.1:
                    direction /= np.linalg.norm(direction)
                self.apply_movement_impulse(direction, speed=1.0)

        # ========== EAT COOKED ==========
        elif action == "eat_cooked" and has_cooked and not self.sleeping:
            food = world.fires.cooked_foods.pop(0)
            self.body.u_energy = min(2000, self.body.u_energy + food["kcal"])
            self.brain.drives.relieve("hunger", 70)
            self.brain.receive_pleasure("food", 1.0)
            world.event_bus.emit("log", f"🍖 {self.name} กินอาหารสุก ({food['kcal']:.0f} kcal)")

        # ========== DRINK / SEEK WATER ==========
        elif action in ("drink", "seek_water") and not self.sleeping:
            if info.get("is_water"):
                self.brain.drives.relieve("thirst", 60)
                self.brain.receive_pleasure("water", 0.5)
            else:
                target = None
                for dr in range(-8,9):
                    for dc in range(-8,9):
                        r2 = max(0, min(world.terrain.size-1, int(self.pos[0])+dr))
                        c2 = max(0, min(world.terrain.size-1, int(self.pos[1])+dc))
                        if world.terrain.template[r2][c2] in [0,1]:
                            target = [r2,c2]
                            break
                    if target: break
                if target:
                    direction = np.array([target[0]-self.pos[0], target[1]-self.pos[1], 0.0])
                    if np.linalg.norm(direction) > 0.1:
                        direction /= np.linalg.norm(direction)
                    self.apply_movement_impulse(direction, speed=1.0)

        # ========== TOILET ==========
        elif action == "toilet" and not self.sleeping:
            self.brain.drives.relieve("bladder", 80)
            self.brain.receive_pleasure("relief", 0.4)

        # ========== START FIRE ==========
        elif action == "start_fire" and not self.sleeping:
            if "หินเหล็กไฟ" in self.inventory and "กิ่งไม้แห้ง" in self.inventory:
                campfire = world.fires.start_fire([int(self.pos[0]), int(self.pos[1])], fuel_kg=3.0)
                ok, msg = campfire.ignite(world.weather.global_moisture/100, True)
                world.event_bus.emit("log", f"🔥 {self.name}: {msg}")
                if ok:
                    self.brain.drives.relieve("cold", 40)
                    self.brain.receive_pleasure("warmth", 1.0)
                else:
                    self.brain.receive_pain("failure", 0.2)

        # ========== COOK / TEND FIRE ==========
        elif action in ("cook","tend_fire") and not self.sleeping:
            near = world.fires.nearby_fire(self.pos, radius=2)
            if near and near.active:
                if action == "cook":
                    food_choice = random.choice(["เนื้อกวาง","เนื้อกระต่าย","ปลา"])
                    cooked, msg = world.fires.cook_food(food_choice, near)
                    if cooked:
                        world.fires.cooked_foods.append({"name": cooked.name, "kcal": cooked.kcal, "who": self.name})
                        self.brain.receive_pleasure("cooked_food", 0.8)
                        world.event_bus.emit("log", f"🍖 {self.name} ปรุง {food_choice} สำเร็จ")
                else:  # tend_fire
                    if "กิ่งไม้แห้ง" in self.inventory:
                        near.add_fuel(2.0)

        # ========== GATHER ==========
        elif action == "gather" and not self.sleeping:
            pool = ["กิ่งไม้แห้ง","ใบไม้ใหญ่","เถาวัลย์","หินคม"]
            if info.get("has_herb"):
                pool.append("หินเหล็กไฟ")
            new_item = random.choice(pool)
            if new_item not in self.inventory:
                self.inventory.append(new_item)
                self.brain.receive_pleasure("discovery", 0.4)
                world.event_bus.emit("log", f"🌿 {self.name} เก็บ {new_item}")

        # ========== CRAFT ==========
        elif action == "craft" and not self.sleeping:
            items, stats, inv = self.experiment()
            if items and inv:
                inv_name = inv.get("name", f"{items[0]}+{items[1]}")
                self.brain.receive_pleasure("invention", 0.9)
                world.event_bus.emit("log", f"💡 {self.name} สร้าง '{inv_name}'")

        # ========== MATE ==========
        elif action == "mate" and not self.sleeping:
            if np.linalg.norm(self.pos - partner.pos) <= 3 and not partner.sleeping:
                self.brain.drives.relieve("lonely", 50)
                self.brain.receive_pleasure("connection", 1.0)
                world.event_bus.emit("log", f"💕 {self.name} ใกล้ชิด {partner.name}")
                if self.sex == "M" and partner.sex == "F" and not partner.body.pregnant:
                    if partner.body.try_conceive():
                        world.event_bus.emit("log", f"🤰 {partner.name} ตั้งครรภ์!")
                        self.brain.receive_pleasure("reproduce", 2.0)
                        partner.brain.receive_pleasure("reproduce", 2.0)

        # ========== SEEK_* ==========
        elif action in ("seek_partner","seek_fire","seek_food","seek_water") and not self.sleeping:
            if action == "seek_partner":
                target = partner.pos
            else:
                if action == "seek_fire":
                    target_obj = next((v for v in self.visible if v.kind=="fire"), None)
                    if target_obj:
                        target = target_obj.pos
                    else:
                        mem = self.ltm.find_nearest("fire_spot", [int(self.pos[0]), int(self.pos[1])])
                        target = mem.pos if mem else (world.fires.active_fires[0].pos if world.fires.active_fires else self.pos)
                elif action == "seek_food":
                    target_obj = next((v for v in self.visible if v.kind=="food"), None)
                    if target_obj:
                        target = target_obj.pos
                    else:
                        mem = self.ltm.find_nearest("food_rich", [int(self.pos[0]), int(self.pos[1])])
                        target = mem.pos if mem else self.pos
                elif action == "seek_water":
                    target_obj = next((v for v in self.visible if v.kind=="water"), None)
                    if target_obj:
                        target = target_obj.pos
                    else:
                        mem = self.ltm.find_nearest("water", [int(self.pos[0]), int(self.pos[1])])
                        target = mem.pos if mem else self.pos
                else:
                    target = self.pos
            direction = np.array([target[0]-self.pos[0], target[1]-self.pos[1], 0.0])
            if np.linalg.norm(direction) > 0.1:
                direction /= np.linalg.norm(direction)
            self.apply_movement_impulse(direction, speed=1.0)

        # ========== FLEE ==========
        elif action == "flee" and not self.sleeping:
            flee_dir = np.array([random.choice([-1,1]), random.choice([-1,1]), 0.0])
            self.apply_movement_impulse(flee_dir, speed=2.0)
            self.brain.drives.relieve("fear", 10)

        # ========== EXPLORE / REST ==========
        elif action in ("explore","rest") and not self.sleeping:
            if action == "explore":
                explore_dir = np.array([random.uniform(-1,1), random.uniform(-1,1), 0.0])
                if np.linalg.norm(explore_dir) > 0.1:
                    explore_dir /= np.linalg.norm(explore_dir)
                self.apply_movement_impulse(explore_dir, speed=0.5)
                self.brain.drives.relieve("bored", 5)
            else:
                self.brain.drives.relieve("tired", 5)

    def apply_movement_impulse(self, direction: np.ndarray, speed: float = 1.0):
        force = direction * speed * 5.0
        self.body.acceleration += force

    def update_physics(self, terrain_elevation: float):
        self.body.physics_step(terrain_elevation)

    def experiment(self):
        if self.sleeping or len(self.inventory) < 2:
            return None, None, None
        items = random.sample(self.inventory, 2)
        stats = {"hardness": 1}
        if "หิน" in items[0] and "ไม้" in items[1]:
            invention = {"name": "ขวานหิน", "use": "ตัดไม้ ล่าสัตว์"}
        elif "เถาวัลย์" in items[0] or "เถาวัลย์" in items[1]:
            invention = {"name": "เชือก", "use": "ผูกมัด"}
        elif "ใบไม้" in items[0] or "ใบไม้" in items[1]:
            invention = {"name": "เครื่องนุ่งห่ม", "use": "กันหนาว"}
        else:
            invention = {"name": f"{items[0]}+{items[1]}", "use": "ไม่ทราบ"}
        return items, stats, invention

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