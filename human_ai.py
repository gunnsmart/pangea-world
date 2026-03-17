import random
from datetime import datetime

class HumanAI:
    def __init__(self, name, height, mass, partner_name):
        self.name = name
        self.partner_name = partner_name
        self.height, self.mass = height, mass
        self.birth_time = datetime.now()
        
        # Stats พื้นฐาน (Thermodynamics)
        self.age = 25.0
        self.health = 100.0
        self.u_energy = 850.0
        self.pos = [7, 7]
        self.bond = 10.0
        
        # ระบบการเรียนรู้และกระเป๋าเก็บของ
        self.inventory = []
        self.knowledge = {} # { (item1, item2): "ชื่อที่ AI ตั้งให้" }
        
        # 🧪 นิยามคุณสมบัติวัตถุดิบ (Physics Attributes)
        self.materials_attr = {
            "หินเหล็กไฟ": {"sharp": 15, "hard": 60, "heat": 40, "weight": 20},
            "กิ่งไม้แห้ง": {"sharp": 5, "hard": 15, "heat": 20, "length": 50},
            "ใบไม้ใหญ่": {"sharp": 0, "hard": 2, "insulation": 40, "soft": 30},
            "เถาวัลย์": {"sharp": 0, "hard": 10, "binding": 60, "length": 30},
            "หินคม": {"sharp": 40, "hard": 50, "heat": 10, "weight": 15}
        }

    def experiment(self):
        """ สุ่มหยิบของมาลองผสม และส่งผลลัพธ์เป็น 'ค่าพลังดิบ' """
        if len(self.inventory) < 2: return None, None
        
        items = random.sample(self.inventory, 2)
        # ดึงค่าพลังจากวัตถุดิบ (ถ้าไม่มีให้ค่าเริ่มต้นเป็น 1)
        attr1 = self.materials_attr.get(items[0], {"hard": 1})
        attr2 = self.materials_attr.get(items[1], {"hard": 1})
        
        # ผลลัพธ์คือการ 'ผสาน' คุณสมบัติ (Emergent Attributes)
        result_stats = {
            "ความคม": attr1.get("sharp", 0) + attr2.get("sharp", 0),
            "ความแข็ง": attr1.get("hard", 0) + attr2.get("hard", 0),
            "ความร้อน": attr1.get("heat", 0) + attr2.get("heat", 0),
            "ความยาว/ระยะ": attr1.get("length", 0) + attr2.get("length", 0),
            "การกันหนาว": attr1.get("insulation", 0) + attr2.get("insulation", 0),
            "การยึดเหนี่ยว": attr1.get("binding", 0) + attr2.get("binding", 0)
        }
        return items, result_stats

    def update_physics(self, elevation, partner_pos):
        days = (datetime.now() - self.birth_time).total_seconds() / 86400
        self.age = 25.0 + (days / 365.25)
        # dU = dQ - dW (พลังงานลดลงตามงานและการเคลื่อนที่)
        work = 0.005 * (self.mass / 70.0) * (elevation + 1.2)
        self.u_energy -= work
        
        dist = abs(self.pos[0] - partner_pos[0]) + abs(self.pos[1] - partner_pos[1])
        if dist == 0: self.bond = min(100, self.bond + 0.03)
