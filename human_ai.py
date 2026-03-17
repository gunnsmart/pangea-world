import random
from datetime import datetime

class HumanAI:
    def __init__(self, name, partner_name):
        self.name = name
        self.partner_name = partner_name
        self.energy = 800.0   
        self.entropy = 0.0    
        self.toxin = 5.0      
        self.libido = 20.0    
        self.pos = [random.randint(6,8), random.randint(6,8)] # เริ่มต้นใกล้กัน
        self.action = "มองหาคู่"

    def process_life(self, elevation, partner_pos):
        hour = datetime.now().hour
        
        # Thermodynamics: เผาผลาญพลังงาน
        metabolism = 0.005 if (22 <= hour or hour < 5) else 0.015
        self.energy -= metabolism * (elevation + 1)
        self.entropy += 0.0001
        self.toxin += 0.001
        self.libido += 0.002

        # --- ตรรกะการอยู่ร่วมกัน ---
        dist = abs(self.pos[0] - partner_pos[0]) + abs(self.pos[1] - partner_pos[1])
        
        # ถ้าอยู่ห่างกันเกินไป จะเกิดความกังวล (Social Need)
        if dist > 2:
            self.move_towards(partner_pos)
            self.action = f"กำลังเดินไปหา {self.partner_name}"
        elif dist == 0:
            self.action = f"อยู่กับ {self.partner_name}"
        else:
            self.action = "พักผ่อนใกล้กัน"

    def move_towards(self, target_pos):
        # เคลื่อนที่เข้าหาเป้าหมายทีละ 1 ช่อง
        if self.pos[0] < target_pos[0]: self.pos[0] += 1
        elif self.pos[0] > target_pos[0]: self.pos[0] -= 1
        
        if self.pos[1] < target_pos[1]: self.pos[1] += 1
        elif self.pos[1] > target_pos[1]: self.pos[1] -= 1

    def get_realtime_thought(self, partner_pos):
        hour = datetime.now().hour
        dist = abs(self.pos[0] - partner_pos[0]) + abs(self.pos[1] - partner_pos[1])
        
        if dist == 0:
            if 22 <= hour or hour < 5:
                return f"{self.name}: 'ความอบอุ่นจาก {self.partner_name} ช่วยลดการสูญเสียความร้อนในคืนที่หนาวเหน็บ'"
            if self.libido > 80:
                return f"{self.name}: 'สายใยระหว่างเราเข้มแข็งขึ้น... ถึงเวลาของการส่งต่อชีวิต'"
            return f"{self.name}: 'อยู่ใกล้ {self.partner_name} แล้วรู้สึกถึงความสมดุลของเอนโทรปีในใจ'"
        
        if dist > 3:
            return f"{self.name}: 'ความอ้างว้างในมหาทวีปมันน่ากลัว... ต้องรีบกลับไปหา {self.partner_name}'"
            
        return f"{self.name}: 'มองเห็น {self.partner_name} อยู่ไกลๆ ร่างกายยังมีพลังงานเพียงพอ'"
