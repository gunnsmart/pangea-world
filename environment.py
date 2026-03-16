import random

class WeatherSystem:
    def __init__(self):
        self.states = ["แดดจ้า", "เมฆครึ้ม", "ฝนตก", "พายุเข้า"]
        self.current_state = "แดดจ้า"
        
        self.transitions = {
            "แดดจ้า":   [0.70, 0.20, 0.08, 0.02],
            "เมฆครึ้ม": [0.30, 0.40, 0.25, 0.05],
            "ฝนตก":     [0.20, 0.30, 0.40, 0.10],
            "พายุเข้า": [0.10, 0.20, 0.50, 0.20]
        }
        
        self.global_moisture = 50.0   
        self.global_temperature = 30.0 
        self.day = 1

    def step_day(self):
        self.day += 1
        probs = self.transitions[self.current_state]
        self.current_state = random.choices(self.states, weights=probs, k=1)[0]
        
        if self.current_state == "แดดจ้า":
            self.global_moisture -= 3.0
            self.global_temperature += 1.5
        elif self.current_state == "เมฆครึ้ม":
            self.global_moisture -= 0.5
            self.global_temperature -= 1.0
        elif self.current_state == "ฝนตก":
            self.global_moisture += 5.0
            self.global_temperature -= 3.0
        elif self.current_state == "พายุเข้า":
            self.global_moisture += 12.0
            self.global_temperature -= 5.0
            
        self.global_moisture = max(0.0, min(100.0, self.global_moisture))
        self.global_temperature = max(-10.0, min(50.0, self.global_temperature))
        