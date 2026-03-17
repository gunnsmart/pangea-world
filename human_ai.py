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
