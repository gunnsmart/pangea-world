import random
import numpy as np
from datetime import datetime

class HumanAI:
    def __init__(self, name, height, mass, partner_name):
        self.name = name
        self.partner_name = partner_name
        self.height = height # m
        self.mass = mass     # kg
        self.birth_time = datetime.now()
        
        # --- Stats (1:1 Real-time Scale) ---
        self.u_energy = 800.0  # พลังงานภายใน
        self.entropy = 0.0     # เอนโทรปี/ความเสื่อม
        self.toxin = 0.0       # ของเสีย
        self.libido = 20.0     # ความต้องการสืบพันธุ์
        self.pos = [7, 7]
        self.status = "ปกติ"

    def update_physics(self, elevation):
        # Thermodynamics: เผาผลาญตามมวลและพื้นที่ (W = F * d)
        work = 0.005 * (self.mass / 70.0) * (elevation + 1)
        self.u_energy -= work
        self.entropy += 0.0001
        self.toxin += 0.0005
        self.libido += 0.001
        
        # Aging & BMI
        days = (datetime.now() - self.birth_time).total_seconds() / 86400
        self.age = 25.0 + (days / 365.25)
        self.bmi = self.mass / (self.height ** 2)

    def get_feeling(self):
        f = []
        if self.u_energy < 300: f.append("หิวจัด")
        if self.bmi > 25: f.append("อึดอัดเพราะน้ำหนักตัว")
        if self.toxin > 80: f.append("ปวดท้องขับถ่าย")
        if self.libido > 90: f.append("อยากใกล้ชิดคู่ครอง")
        return ", ".join(f) if f else "ร่างกายสมบูรณ์ดี"
