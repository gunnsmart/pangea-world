class PlantEcosystem:
    def __init__(self):
        self.global_biomass = 40.0 

    def step_day(self, moisture, temperature):
        growth_rate = 0.0
        if 40.0 <= moisture <= 80.0: growth_rate += 2.0  
        elif moisture < 20.0: growth_rate -= 3.0  
        elif moisture > 90.0: growth_rate -= 1.5  
            
        if 20.0 <= temperature <= 35.0: growth_rate += 1.0  
        elif temperature > 40.0: growth_rate -= 2.0  
        elif temperature < 15.0: growth_rate -= 1.0  
            
        self.global_biomass += growth_rate
        self.global_biomass = max(0.0, min(100.0, self.global_biomass))
        return self.global_biomass

class AnimalEcosystem:
    def __init__(self):
        self.herbivore_pop = 50  # เริ่มต้นกวาง 50 ตัว

    def step_day(self, current_biomass):
        food_needed = self.herbivore_pop * 0.05 
        consumed_biomass = 0.0
        
        if current_biomass >= food_needed and current_biomass > 10.0:
            consumed_biomass = food_needed
            self.herbivore_pop += int(self.herbivore_pop * 0.10) # กวางขยายพันธุ์ไว (10%)
        elif current_biomass < food_needed:
            consumed_biomass = current_biomass
            starving_deaths = max(1, int(self.herbivore_pop * 0.15))
            self.herbivore_pop -= starving_deaths # กวางอดตาย
            
        self.herbivore_pop = max(0, min(5000, self.herbivore_pop))
        return consumed_biomass 

class CarnivoreEcosystem:
    def __init__(self):
        self.carnivore_pop = 5  # เริ่มต้นที่เสือ 5 ตัว

    def step_day(self, current_herbivores):
        # เสือ 1 ตัว ต้องการกินกวาง 0.2 ตัวต่อวัน
        food_needed = self.carnivore_pop * 0.2 
        consumed_herbivores = 0
        
        if current_herbivores >= food_needed and current_herbivores > 5:
            # ล่าสำเร็จ: มีอาหารพอ ขยายพันธุ์
            consumed_herbivores = food_needed
            self.carnivore_pop += max(1, int(self.carnivore_pop * 0.05)) # เสือขยายพันธุ์ช้า (5%)
        elif current_herbivores < food_needed:
            # ล่าล้มเหลว (18+ วิกฤตอดตาย): กินเท่าที่มีและล้มตาย
            consumed_herbivores = current_herbivores
            starving_deaths = max(1, int(self.carnivore_pop * 0.20)) # เสืออดตายไวมาก (20%)
            self.carnivore_pop -= starving_deaths
            
        self.carnivore_pop = max(0, min(500, self.carnivore_pop))
        return int(consumed_herbivores) # ส่งจำนวนกวางที่ถูกกินกลับไปหักลบ
        