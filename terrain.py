class TerrainMap:
    def __init__(self):
        self.size = 15
        self.template = [...] # (Matrix 15x15 เดิม)
        self.mapping = {0: "ริมแม่น้ำ", 1: "ชายหาด", 2: "ทุ่งหญ้า", 3: "ป่าทึบ", 4: "ยอดเขา"}
        # ระบบนิเวศ: พลังงานอาหารในแต่ละช่อง (0-100)
        self.vegetation = [[random.randint(50, 100) for _ in range(15)] for _ in range(15)]

    def regrow(self):
        """ พืชงอกใหม่ตามแสงแดด (Entropy reversal) """
        for r in range(self.size):
            for c in range(self.size):
                if self.template[r][c] in [2, 3]: # ป่าและทุ่งหญ้าพืชโตไว
                    self.vegetation[r][c] = min(100, self.vegetation[r][c] + 0.1)

    def get_info(self, r, c):
        return {
            "type": self.mapping[self.template[r][c]], 
            "elevation": self.template[r][c],
            "food_level": self.vegetation[r][c]
        }
