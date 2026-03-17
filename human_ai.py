import random
from datetime import datetime

class HumanAI:
    def __init__(self, name, height, mass, partner_name):
        self.name = name
        self.partner_name = partner_name
        self.height, self.mass = height, mass
        self.birth_time = datetime.now()
        
        # Stats
        self.age = 25.0
        self.health = 100.0
        self.u_energy = 850.0
        self.toxin = 0.0
        self.bond = 10.0
        self.pos = [7, 7]
        
        # Discovery & Inventory
        self.inventory = []
        self.knowledge = {} # เก็บสิ่งที่เรียนรู้เอง
        self.memory = []
        self.has_shelter = False
        self.shelter_pos = None
        self.has_fire = False # เตรียมสำหรับระบบไฟ

    def update_physics(self, elevation, partner_pos):
        days = (datetime.now() - self.birth_time).total_seconds() / 86400
        self.age = 25.0 + (days / 365.25)
        
        # ถ้าอยู่ในบ้าน (Shelter) จะลดการใช้พลังงาน
        dist_to_shelter = 0
        if self.has_shelter:
            dist_to_shelter = abs(self.pos[0] - self.shelter_pos[0]) + abs(self.pos[1] - self.shelter_pos[1])
        
        mult = 0.6 if (self.has_shelter and dist_to_shelter == 0) else 1.0
        work_load = 0.005 * (self.mass / 70.0) * (elevation + 1.2) * mult
        
        self.u_energy -= work_load
        self.bmi = self.mass / (self.height ** 2)

        # Bonding
        dist = abs(self.pos[0] - partner_pos[0]) + abs(self.pos[1] - partner_pos[1])
        if dist == 0: self.bond = min(100, self.bond + 0.02)

    def experiment(self):
        """ ลองผิดลองถูกด้วยตัวเอง """
        if len(self.inventory) >= 2:
            items = random.sample(self.inventory, 2)
            recipe = "+".join(sorted(items))
            
            if recipe == "กิ่งไม้+ใบไม้" and not self.has_shelter:
                self.has_shelter, self.shelter_pos = True, [self.pos[0], self.pos[1]]
                self.knowledge[recipe] = "เพิงพัก"
                return "สร้างเพิงพักสำเร็จ! นอนสบายขึ้นเยอะ"
            
            if recipe == "หิน+หิน" and not self.has_fire:
                if random.random() < 0.1: # ไฟจุดยาก ต้องลองบ่อยๆ
                    self.has_fire = True
                    self.knowledge[recipe] = "ไฟ"
                    return "เหวอ! มีประกายไฟออกมาจากหินว่ะ!"
        return None

    def self_heal(self):
        if self.health < 80 and "ใบไม้" in self.inventory:
            self.inventory.remove("ใบไม้")
            self.health = min(100, self.health + 20)
            self.knowledge["ใบไม้"] = "ยารักษา"
            return "แผลเริ่มดีขึ้นแฮะ ใบไม้นี้ใช้ได้!"
        return None
