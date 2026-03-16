import random

class PlantEcosystem:
    def __init__(self):
        self.global_biomass = 60.0 

    def step_day(self, moisture, temperature):
        growth_rate = 1.0 
        if 40.0 <= moisture <= 80.0: growth_rate += 3.0  
        elif moisture < 30.0: growth_rate -= 1.0 
        if 22.0 <= temperature <= 32.0: growth_rate += 1.5
        self.global_biomass += growth_rate
        self.global_biomass = max(10.0, min(100.0, self.global_biomass))
        return self.global_biomass

class FaunaEcosystem:
    def __init__(self):
        self.rabbit_pop = 100
        self.deer_pop = 50
        self.elephant_pop = 10
        self.tiger_pop = 5
        self.eagle_pop = 5

    def step_day(self, current_biomass):
        total_eat = (self.rabbit_pop * 0.01) + (self.deer_pop * 0.02) + (self.elephant_pop * 0.1)
        if current_biomass > 20:
            self.rabbit_pop += int(self.rabbit_pop * 0.1)
            self.deer_pop += int(self.deer_pop * 0.05)
            self.elephant_pop += (1 if self.elephant_pop < 20 and random.random() < 0.1 else 0)
        else:
            self.rabbit_pop -= int(self.rabbit_pop * 0.2)
            self.deer_pop -= int(self.deer_pop * 0.1)
            self.elephant_pop -= (1 if random.random() < 0.05 else 0)

        for _ in range(self.tiger_pop):
            if self.deer_pop > 0: self.deer_pop -= 1
            elif self.rabbit_pop > 0: self.rabbit_pop -= 1
            else: self.tiger_pop -= 1
            
        for _ in range(self.eagle_pop):
            if self.rabbit_pop > 0: self.rabbit_pop -= 1
            else: self.eagle_pop -= 1

        if self.deer_pop > 20 and random.random() < 0.1: self.tiger_pop += 1
        if self.rabbit_pop > 50 and random.random() < 0.1: self.eagle_pop += 1

        self.rabbit_pop = max(0, min(2000, self.rabbit_pop))
        self.deer_pop = max(0, min(1000, self.deer_pop))
        self.elephant_pop = max(0, min(50, self.elephant_pop))
        self.tiger_pop = max(0, min(30, self.tiger_pop))
        self.eagle_pop = max(0, min(30, self.eagle_pop))
        return total_eat

class HumanEcosystem:
    def __init__(self):
        self.human_pop = 2 # เริ่มต้นที่ Adam & Eve

    def step_day(self, current_biomass, current_herbivores):
        if self.human_pop <= 0: return 0
        food_needed = self.human_pop * 0.1
        hunted_deer = 0
        if current_herbivores > 5:
            hunted_deer = min(current_herbivores, int(self.human_pop * 0.1))
        if current_biomass > 10 or hunted_deer > 0:
            if self.human_pop < 100: self.human_pop += max(1, int(self.human_pop * 0.02))
        else:
            self.human_pop -= max(1, int(self.human_pop * 0.1))
        self.human_pop = max(0, self.human_pop)
        return hunted_deer
        
