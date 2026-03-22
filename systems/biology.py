# systems/biology.py
import random

class FaunaEcosystem:
    def __init__(self):
        self.rabbit_pop = 100
        self.deer_pop = 50
        self.elephant_pop = 10
        self.tiger_pop = 5
        self.eagle_pop = 5

    def step_day(self, current_biomass):
        total_eat = (self.rabbit_pop*0.01) + (self.deer_pop*0.02) + (self.elephant_pop*0.1)
        if current_biomass > 20:
            self.rabbit_pop += int(self.rabbit_pop * 0.1)
            self.deer_pop += int(self.deer_pop * 0.05)
            if self.elephant_pop < 20 and random.random() < 0.1:
                self.elephant_pop += 1
        else:
            self.rabbit_pop -= int(self.rabbit_pop * 0.2)
            self.deer_pop -= int(self.deer_pop * 0.1)
            if random.random() < 0.05:
                self.elephant_pop -= 1

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
        self.human_pop = 2
        self.males = 1
        self.females = 1
        self.day = 0
        self.base_death_rate = 1/(35*365)

    @property
    def couples(self):
        return min(self.males, self.females)

    def step_day(self, current_biomass, current_herbivores):
        if self.human_pop <= 0:
            return 0
        self.day += 1
        has_food = current_biomass > 10 or current_herbivores > 5
        hunted = 0
        if current_herbivores > 5:
            hunted = min(current_herbivores, max(1, self.couples))
        death_rate = self.base_death_rate * (1.0 if has_food else 5.0)
        deaths = 0
        for _ in range(self.human_pop):
            if random.random() < death_rate:
                deaths += 1
        self.human_pop = max(0, self.human_pop - deaths)
        self.males = max(0, self.males - int(deaths * 0.5))
        self.females = max(0, self.females - int(deaths * 0.5))
        if self.human_pop == 0:
            self.males = self.females = 0
        return hunted