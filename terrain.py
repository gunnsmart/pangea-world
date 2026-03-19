import random

class TerrainMap:
    def __init__(self):
        self.size = 15
        self.mapping = {0: "ริมแม่น้ำ", 1: "ชายหาด", 2: "ทุ่งหญ้า", 3: "ป่าทึบ", 4: "ยอดเขา"}

        # Matrix 15x15 — ออกแบบให้มีภูมิประเทศหลากหลาย
        # 0=ริมแม่น้ำ, 1=ชายหาด, 2=ทุ่งหญ้า, 3=ป่าทึบ, 4=ยอดเขา
        self.template = [
            [1, 1, 1, 2, 2, 3, 3, 3, 2, 2, 1, 1, 0, 0, 0],
            [1, 2, 2, 2, 3, 3, 3, 3, 3, 2, 2, 0, 0, 0, 0],
            [2, 2, 3, 3, 3, 4, 4, 3, 3, 3, 2, 2, 0, 0, 1],
            [2, 3, 3, 4, 4, 4, 4, 4, 3, 3, 3, 2, 2, 1, 1],
            [2, 3, 3, 4, 4, 4, 4, 3, 3, 2, 2, 2, 2, 2, 1],
            [0, 0, 3, 3, 4, 4, 3, 3, 2, 2, 2, 3, 3, 2, 2],
            [0, 0, 0, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 3, 2],
            [0, 0, 0, 2, 3, 3, 2, 2, 2, 3, 3, 3, 4, 3, 2],
            [0, 0, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 3, 3],
            [1, 0, 0, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 3, 3],
            [1, 1, 0, 0, 2, 2, 3, 3, 3, 4, 4, 4, 3, 3, 2],
            [2, 1, 1, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2],
            [2, 2, 1, 1, 0, 0, 3, 3, 3, 3, 2, 2, 2, 2, 2],
            [2, 2, 2, 1, 1, 0, 0, 2, 2, 2, 2, 2, 2, 3, 2],
            [3, 2, 2, 2, 1, 1, 0, 0, 2, 2, 2, 3, 3, 3, 3],
        ]

        # พลังงานอาหารในแต่ละช่อง (0–100)
        self.vegetation = [
            [random.randint(50, 100) for _ in range(self.size)]
            for _ in range(self.size)
        ]

    def regrow(self):
        """พืชงอกใหม่ตามแสงแดด — ป่าและทุ่งหญ้าโตเร็วกว่า"""
        for r in range(self.size):
            for c in range(self.size):
                terrain_type = self.template[r][c]
                if terrain_type == 3:    # ป่าทึบ
                    self.vegetation[r][c] = min(100, self.vegetation[r][c] + 0.2)
                elif terrain_type == 2:  # ทุ่งหญ้า
                    self.vegetation[r][c] = min(100, self.vegetation[r][c] + 0.1)

    def get_info(self, r, c):
        """คืนข้อมูลพื้นที่ รวมถึงโอกาสเจอสมุนไพรในป่าและริมน้ำ"""
        terrain_type = self.template[r][c]
        return {
            "type":      self.mapping[terrain_type],
            "elevation": terrain_type,
            "food_level": self.vegetation[r][c],
            "has_herb":  (terrain_type in [0, 3]) and (random.random() < 0.2),
        }
