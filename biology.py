class PlantEcosystem:
    def __init__(self):
        self.global_biomass = 60.0 

    def step_day(self, moisture, temperature):
        # พืชโตง่ายขึ้น
        growth_rate = 1.0 # มีอัตราเติบโตพื้นฐานเสมอ
        if 40.0 <= moisture <= 80.0: growth_rate += 3.0  
        elif moisture < 30.0: growth_rate -= 1.0 # ตายช้าลง
            
        if 22.0 <= temperature <= 32.0: growth_rate += 1.5
            
        self.global_biomass += growth_rate
        self.global_biomass = max(10.0, min(100.0, self.global_biomass)) # ป่าจะไม่เกลี้ยง 0%
        return self.global_biomass

class AnimalEcosystem:
    def __init__(self):
        self.herbivore_pop = 50 

    def step_day(self, current_biomass):
        # กวาง 1 ตัว กินน้อยลง (จาก 0.05 เหลือ 0.02) เพื่อไม่ให้พืชตายไว
        food_needed = self.herbivore_pop * 0.02 
        consumed_biomass = 0.0
        
        if current_biomass > 20.0: # ถ้าป่าสมบูรณ์ กวางจะขยายพันธุ์
            consumed_biomass = food_needed
            self.herbivore_pop += int(self.herbivore_pop * 0.05)
        else: # ถ้าป่าเริ่มน้อย กวางจะหยุดขยายพันธุ์และลดจำนวนลงบ้าง
            consumed_biomass = food_needed * 0.5
            self.herbivore_pop -= int(self.herbivore_pop * 0.05)
            
        self.herbivore_pop = max(2, min(2000, self.herbivore_pop)) # ให้รอดอย่างน้อย 2 ตัวเสมอ
        return consumed_biomass 
