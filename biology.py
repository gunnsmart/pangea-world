class FaunaEcosystem:
    def __init__(self):
        # สัตว์กินพืช
        self.rabbit_pop = 100  # 🐇 ขยายพันธุ์เร็ว เป็นอาหารหลัก
        self.deer_pop = 50     # 🦌 สมดุล
        self.elephant_pop = 10 # 🐘 อึด ตายยาก กินเยอะ
        
        # ผู้ล่า
        self.tiger_pop = 5     # 🐅 ล่ากวางและกระต่าย
        self.eagle_pop = 5     # 🦅 ล่ากระต่าย

    def step_day(self, current_biomass):
        # 1. การกินพืช (Herbivores eat)
        # กระต่ายกิน 0.01, กวางกิน 0.02, ช้างกิน 0.1
        total_eat = (self.rabbit_pop * 0.01) + (self.deer_pop * 0.02) + (self.elephant_pop * 0.1)
        
        if current_biomass > 20:
            # ขยายพันธุ์ตามธรรมชาติ
            self.rabbit_pop += int(self.rabbit_pop * 0.1)  # กระต่ายไวมาก
            self.deer_pop += int(self.deer_pop * 0.05)
            self.elephant_pop += (1 if self.elephant_pop < 20 and random.random() < 0.1 else 0)
        else:
            # อดอยาก
            self.rabbit_pop -= int(self.rabbit_pop * 0.2)
            self.deer_pop -= int(self.deer_pop * 0.1)
            self.elephant_pop -= (1 if random.random() < 0.05 else 0)

        # 2. การล่า (Predators hunt)
        # เสือ 1 ตัวล่าสัตว์ 1 ตัวต่อวัน (เน้นกวางก่อน)
        for _ in range(self.tiger_pop):
            if self.deer_pop > 0: self.deer_pop -= 1
            elif self.rabbit_pop > 0: self.rabbit_pop -= 1
            else: self.tiger_pop -= 1 # เสืออดตายถ้าไม่มีเหยื่อ
            
        # นกอินทรีล่ากระต่าย
        for _ in range(self.eagle_pop):
            if self.rabbit_pop > 0: self.rabbit_pop -= 1
            else: self.eagle_pop -= 1

        # เสือและนกขยายพันธุ์ถ้ามีเหยื่อเยอะ
        if self.deer_pop > 20 and random.random() < 0.1: self.tiger_pop += 1
        if self.rabbit_pop > 50 and random.random() < 0.1: self.eagle_pop += 1

        # ล็อกค่าต่ำสุด/สูงสุด
        self.rabbit_pop = max(0, min(2000, self.rabbit_pop))
        self.deer_pop = max(0, min(1000, self.deer_pop))
        self.elephant_pop = max(0, min(50, self.elephant_pop))
        self.tiger_pop = max(0, min(30, self.tiger_pop))
        self.eagle_pop = max(0, min(30, self.eagle_pop))
        
        return total_eat
        
