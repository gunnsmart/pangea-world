import random
from datetime import datetime

class HumanAI:
    def __init__(self, name, height, mass, partner_name):
        self.name = name
        self.partner_name = partner_name
        self.height = height
        self.mass = mass
        self.birth_time = datetime.now()
        
        # --- Stats เดิม ---
        self.age = 25.0
        self.u_energy = 850.0
        self.toxin = 0.0
        self.libido = 20.0
        self.pos = [7, 7]
        self.bmi = self.mass / (self.height ** 2)
        
        # --- Perception & Memory ---
        self.current_view = "ความว่างเปล่า"
        self.memory = []

        # --- 💖 เพิ่มระบบความสัมพันธ์ (Relationship) ---
        self.bond = 10.0 # เริ่มต้นที่ 10 (คนแปลกหน้า) เต็ม 100

    def update_physics(self, elevation, partner_pos):
        # 1. Aging & Physics (เหมือนเดิม)
        days = (datetime.now() - self.birth_time).total_seconds() / 86400
        self.age = 25.0 + (days / 365.25)
        
        work_load = 0.005 * (self.mass / 70.0) * (elevation + 1.2)
        self.u_energy -= work_load
        self.toxin += 0.001
        self.libido += 0.002
        
        # 2. BMI Dynamics
        energy_balance = (self.u_energy - 500) / 1000
        self.mass += energy_balance * 0.0001
        self.bmi = self.mass / (self.height ** 2)

        # 3. 💖 คำนวณความผูกพัน (Bonding Logic)
        dist = abs(self.pos[0] - partner_pos[0]) + abs(self.pos[1] - partner_pos[1])
        if dist == 0:
            self.bond = min(100, self.bond + 0.02) # อยู่ใกล้กันความผูกพันเพิ่ม
        elif dist > 5:
            self.bond = max(0, self.bond - 0.005) # ห่างกันนานๆ จะเริ่มอ้างว้าง

    def observe(self, terrain_info):
        self.current_view = terrain_info['type']
        obs = f"อยู่ที่{self.current_view}"
        if not self.memory or self.memory[-1] != obs:
            self.memory.append(obs)
            if len(self.memory) > 5: self.memory.pop(0)

    def get_feeling_context(self):
        feelings = []
        if self.u_energy < 300: feelings.append("หิวจนแสบท้อง")
        if self.bond > 80: feelings.append("รู้สึกรักและอยากดูแลคู่ครองมาก")
        elif self.bond < 20: feelings.append("รู้สึกไม่ค่อยคุ้นเคยกับอีกคน")
        
        recent_path = " -> ".join(self.memory)
        return f"ความรู้สึก: {', '.join(feelings) if feelings else 'ปกติ'} | ระดับความผูกพัน: {self.bond:.1f}/100 | สิ่งที่เพิ่งเจอ: {recent_path}"

class HumanAI:
    def __init__(self, name, height, mass, partner_name):
        # ... Stats เดิม ...
        self.inventory = [] # เก็บวัสดุดิบ: "หิน", "กิ่งไม้", "เถาวัลย์"
        self.knowledge = {} # { "หิน+กิ่งไม้": "หอกไม้ (ประสิทธิภาพ +20)" }
        self.discovery_points = 0 # คะแนนวิวัฒนาการ
        self.health = 100.0

    def collect_material(self, terrain_type):
        """ สุ่มเก็บของตามพื้นที่ (ไม่ต้องสั่ง) """
        if random.random() < 0.1: # โอกาส 10% ในการเจอวัสดุ
            mats = {
                "ริมแม่น้ำ": "หินแม่น้ำ",
                "ป่าดิบทึบ": "กิ่งไม้แข็ง",
                "ทุ่งหญ้ากว้าง": "เถาวัลย์"
            }
            item = mats.get(terrain_type)
            if item and item not in self.inventory:
                self.inventory.append(item)

    def experiment(self):
        """ ลองเอาของ 2 อย่างใน Inventory มาผสมกันมั่วๆ """
        if len(self.inventory) >= 2:
            item1, item2 = random.sample(self.inventory, 2)
            recipe = "+".join(sorted([item1, item2]))
            
            # ตรวจสอบผลลัพธ์ (เราไม่ได้สอน แต่ระบบฟิสิกส์เป็นคนตัดสิน)
            if recipe == "กิ่งไม้แข็ง+หินแม่น้ำ":
                res = "หอกหิน"
                reward = 50
            elif recipe == "กิ่งไม้แข็ง+เถาวัลย์":
                res = "กับดักสัตว์"
                reward = 30
            else:
                res = "ขยะ"
                reward = -10
            
            # เรียนรู้
            if recipe not in self.knowledge:
                self.knowledge[recipe] = res
                self.discovery_points += reward
                return f"ค้นพบวิธีทำ {res} จากการลองผิดลองถูก!"
        return None

import random
from datetime import datetime

class HumanAI:
    def __init__(self, name, height, mass, partner_name):
        self.name = name
        self.partner_name = partner_name
        self.height, self.mass = height, mass
        self.birth_time = datetime.now()
        
        # --- ระบบพลังชีวิตและเครื่องมือ ---
        self.health = 100.0
        self.inventory = [] 
        self.knowledge = {} # เก็บสิ่งที่ค้นพบ เช่น {"หิน+ไม้": "หอก"}
        self.u_energy = 850.0
        self.age = 25.0
        self.pos = [7, 7]
        self.bond = 10.0
        self.memory = []

    def get_combat_power(self):
        """ คำนวณพลังโจมตี: มวลร่างกาย + อาวุธที่มีในความรู้ """
        base_power = self.mass * 0.1
        if "หอกหิน" in self.knowledge.values():
            base_power += 50.0 # โบนัสจากอาวุธ
        return base_power

    def process_encounter(self, animal):
        """ ประมวลผลเมื่อเจอสัตว์: ล่า หรือ ถูกล่า """
        power = self.get_combat_power()
        
        # โอกาสชนะอิงจากพลังโจมตี vs มวลของสัตว์
        win_chance = (power / animal.mass) * 0.5
        outcome = random.random() < win_chance
        
        if outcome: # ชนะ
            self.u_energy = min(1000, self.u_energy + animal.energy_gain)
            return "WIN"
        else: # แพ้
            damage = (animal.mass / self.mass) * 20
            self.health -= damage
            self.u_energy -= 100
            return "LOSE"

    # ... (Method update_physics, observe, experiment เดิม) ...
class HumanAI:
    def __init__(self, name, height, mass, partner_name):
        # ... (Stats เดิม) ...
        self.health = 100.0
        self.inventory = []
        self.knowledge = {} # เก็บสิ่งที่เรียนรู้: {"ใบไม้สีเขียว": "ยารักษา"}
        
    def collect_material(self, terrain_info):
        """ สุ่มเก็บวัสดุและสมุนไพรตามพื้นที่ """
        if terrain_info.get("has_herb"):
            item = "ใบไม้ปริศนา"
            if item not in self.inventory:
                self.inventory.append(item)
        
        # เก็บหินหรือกิ่งไม้เหมือนเดิม
        if random.random() < 0.05:
            mats = {"ยอดเขาสูง": "หินคม", "ป่าดิบทึบ": "กิ่งไม้"}
            item = mats.get(terrain_info['type'])
            if item and item not in self.inventory: self.inventory.append(item)

    def self_heal(self):
        """ ลองรักษาตัวเองเมื่อบาดเจ็บ """
        if self.health < 80 and "ใบไม้ปริศนา" in self.inventory:
            # ลองใช้ใบไม้ (Trial)
            self.inventory.remove("ใบไม้ปริศนา")
            heal_amount = random.randint(10, 30)
            self.health = min(100, self.health + heal_amount)
            
            # เรียนรู้ (Discovery)
            if "ใบไม้ปริศนา" not in self.knowledge:
                self.knowledge["ใบไม้ปริศนา"] = "สมุนไพรรักษาแผล"
                return f"ค้นพบว่า 'ใบไม้ปริศนา' ช่วยให้แผลดีขึ้น!"
        return None

    # ... (Method update_physics, experiment เดิม) ...


class HumanAI:
    def __init__(self, name, height, mass, partner_name):
        # ... (Stats เดิม) ...
        self.has_shelter = False
        self.shelter_pos = None
        self.health = 100.0
        # ...

    def update_physics(self, elevation, partner_pos):
        # 1. Aging & Physics พื้นฐาน
        days = (datetime.now() - self.birth_time).total_seconds() / 86400
        self.age = 25.0 + (days / 365.25)
        
        # 2. กฎพลังงาน (dU = dQ - dW)
        # หากมีที่พัก และอยู่ในตำแหน่งที่พัก จะลดการเสียพลังงานลง 40%
        work_load = 0.005 * (self.mass / 70.0) * (elevation + 1.2)
        
        dist_to_shelter = 0
        if self.has_shelter and self.shelter_pos:
            dist_to_shelter = abs(self.pos[0] - self.shelter_pos[0]) + abs(self.pos[1] - self.shelter_pos[1])
        
        if self.has_shelter and dist_to_shelter == 0:
            work_load *= 0.6 # ประสิทธิภาพการพักผ่อนดีขึ้นมาก
            self.u_energy += 0.01 # ฟื้นฟูพลังงานเล็กน้อยจากการได้พักผ่อนจริงๆ
            
        self.u_energy -= work_load
        self.toxin += 0.001
        self.libido += 0.002
        
        # ... (Bonding Logic เดิม) ...

    def experiment(self):
        """ ลองเอาของ 2 อย่างมาผสมกัน """
        if len(self.inventory) >= 2:
            item1, item2 = random.sample(self.inventory, 2)
            recipe = "+".join(sorted([item1, item2]))
            
            # การค้นพบเพิงพัก (Shelter)
            if recipe == "กิ่งไม้+ใบไม้ปริศนา":
                if not self.has_shelter:
                    self.has_shelter = True
                    self.shelter_pos = [self.pos[0], self.pos[1]]
                    self.knowledge[recipe] = "เพิงพักใบไม้"
                    return f"ค้นพบวิธีสร้าง 'เพิงพักใบไม้' ที่นี่! ร่างกายจะได้พักผ่อนเสียที"
            
            # (ผลลัพธ์การผสมอื่นๆ เช่น หอกหิน)
            # ...
        return None



