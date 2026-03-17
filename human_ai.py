import random
from datetime import datetime

class HumanAI:
    def __init__(self, name, height, mass, partner_name):
        self.name = name
        self.partner_name = partner_name
        self.height = height
        self.mass = mass
        self.birth_time = datetime.now()
        
        # --- Physical Stats ---
        self.age = 25.0
        self.u_energy = 850.0 # พลังงานเริ่มต้น
        self.toxin = 0.0
        self.libido = 20.0
        self.pos = [7, 7]
        self.bmi = self.mass / (self.height ** 2)
        
        # --- Perception & Memory (ดวงตาและความจำ) ---
        self.current_view = "ความว่างเปล่า"
        self.memory = [] # เก็บเหตุการณ์ล่าสุด 5 อย่าง

    def update_physics(self, elevation):
        # 1. Aging (1 วันจริง = 1 วันเกม)
        days = (datetime.now() - self.birth_time).total_seconds() / 86400
        self.age = 25.0 + (days / 365.25)
        
        # 2. Thermodynamics: Work = Force * Distance (ยิ่งหนักยิ่งเหนื่อย)
        work_load = 0.005 * (self.mass / 70.0) * (elevation + 1.2)
        self.u_energy -= work_load
        self.toxin += 0.001
        self.libido += 0.002
        
        # 3. BMI Dynamics (จำลองการเปลี่ยนแปลงมวลตามพลังงาน)
        energy_balance = (self.u_energy - 500) / 1000
        self.mass += energy_balance * 0.0001
        self.bmi = self.mass / (self.height ** 2)

    def observe(self, terrain_info):
        """ รับรู้และจำสิ่งที่เห็น """
        self.current_view = terrain_info['type']
        obs = f"อยู่ที่{self.current_view}"
        if terrain_info['elevation'] >= 4: obs += " (ลมแรงและล้ามาก)"
        
        if not self.memory or self.memory[-1] != obs:
            self.memory.append(obs)
            if len(self.memory) > 5: self.memory.pop(0)

    def get_feeling_context(self):
        """ สรุปความรู้สึกที่เชื่อมโยงกับความจำส่งให้ AI """
        feelings = []
        if self.u_energy < 300: feelings.append("หิวจนแสบท้อง")
        if self.bmi > 24: feelings.append("ตัวหนักเคลื่อนไหวลำบาก")
        if self.toxin > 80: feelings.append("อึดอัดต้องระบายของเสีย")
        
        recent_path = " -> ".join(self.memory)
        return f"ความรู้สึก: {', '.join(feelings) if feelings else 'ร่างกายปกติ'} | สิ่งที่เพิ่งเจอ: {recent_path}"
