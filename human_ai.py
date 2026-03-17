import random

class HumanAI:
    def __init__(self, name, partner_name):
        self.name = name
        self.partner = partner_name
        self.energy = 800.0   # พลังงานภายใน (U)
        self.entropy = 0.0    # เอนโทรปี (S)
        self.toxin = 0.0      # ของเสียสะสม
        self.libido = 10.0    # ความต้องการสืบพันธุ์
        self.pos = [7, 7]
        self.action = "ตื่นนอน"

    def update_physics(self, elevation):
        # เอนโทรปีเพิ่มขึ้นตามกฎข้อที่ 2 ของ Thermodynamics
        self.entropy += 0.0001
        # งาน (Work) ที่เสียไปตามความชันพื้นผิว
        work = 0.005 * (elevation + 1)
        self.energy -= work
        self.toxin += 0.001
        self.libido += 0.002

    def get_thought(self):
        # แปลงค่าสถานะทางฟิสิกส์เป็นความรู้สึก
        if self.energy < 300:
            return f"{self.name}: 'ร่างกายเริ่มอ่อนแรง... ต้องหาพลังงานเคมีจากอาหารมาเติมระบบ'"
        if self.toxin > 70:
            return f"{self.name}: 'เอนโทรปีในรูปแบบของเสียเริ่มสูงเกินไป... ร่างกายต้องการการระบายออก'"
        if self.libido > 85:
            return f"{self.name}: 'สัญชาตญาณการส่งต่อรหัสพันธุกรรมเริ่มรุนแรง... {self.partner} อยู่ที่ไหน?'"
        if self.energy < 150:
            return f"{self.name}: 'Metabolism ต่ำเกินไป... พักผ่อนเพื่อลดการสูญเสียพลังงาน'"
        return f"{self.name}: 'เดินสำรวจสภาพแวดล้อม... อุณหภูมิร่างกายปกติดี'"

    def perform_action(self, terrain_type):
        # สุ่มขยับตำแหน่งเล็กน้อย
        self.pos[0] = max(0, min(14, self.pos[0] + random.randint(-1, 1)))
        self.pos[1] = max(0, min(14, self.pos[1] + random.randint(-1, 1)))
        return f"📍 {self.name} อยู่ที่ {terrain_type}"
