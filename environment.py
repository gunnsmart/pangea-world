import random

class WeatherSystem:
    def __init__(self):
        self.states = ["แดดจ้า", "เมฆครึ้ม", "ฝนตก", "พายุเข้า"]
        self.current_state = "เมฆครึ้ม" # เริ่มต้นแบบกลางๆ
        
        # ปรับโอกาสให้ "เมฆครึ้ม" และ "ฝนตก" เกิดบ่อยขึ้นเพื่อให้พืชรอด
        self.transitions = {
            "แดดจ้า":   [0.50, 0.40, 0.09, 0.01],
            "เมฆครึ้ม": [0.20, 0.60, 0.18, 0.02],
            "ฝนตก":     [0.10, 0.40, 0.45, 0.05],
            "พายุเข้า": [0.05, 0.25, 0.50, 0.20]
        }
        
        self.global_moisture = 60.0 # เริ่มต้นที่ความชื้นพอเหมาะ
        self.global_temperature = 28.0 
        self.day = 1

    def step_day(self):
        self.day += 1
        probs = self.transitions[self.current_state]
        self.current_state = random.choices(self.states, weights=probs, k=1)[0]
        
        if self.current_state == "แดดจ้า":
            self.global_moisture -= 1.5 # ลดความชื้นช้าลงจากเดิม 3.0
            self.global_temperature += 0.5
        elif self.current_state == "เมฆครึ้ม":
            self.global_moisture += 0.5
            self.global_temperature -= 0.2
        elif self.current_state == "ฝนตก":
            self.global_moisture += 3.0
            self.global_temperature -= 1.0
        elif self.current_state == "พายุเข้า":
            self.global_moisture += 6.0
            self.global_temperature -= 2.0
            
        # ล็อกค่าไม่ให้สุดโต่งเกินไป
        self.global_moisture = max(20.0, min(90.0, self.global_moisture))
        self.global_temperature = max(20.0, min(38.0, self.global_temperature))
        
