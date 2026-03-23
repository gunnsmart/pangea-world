# materials.py
# แม่แบบวัสดุพื้นฐาน

class MaterialTemplate:
    def __init__(self, name: str, base_attrs: dict):
        self.name = name
        self.base = base_attrs

class Material:
    def __init__(self, template: MaterialTemplate, modifiers: dict = None):
        self.template = template
        self.attrs = template.base.copy()
        if modifiers:
            self.attrs.update(modifiers)

    def __repr__(self):
        return f"{self.template.name}({self.attrs})"

# กำหนดแม่แบบหลัก
STONE = MaterialTemplate("stone", {
    "hardness": 9,
    "sharp": 2,
    "flammable": 0,
    "density": 2.5,
    "sticky": 0,
    "ignition_temp": 1000,
    "mass_per_volume": 2.5,
})

WOOD = MaterialTemplate("wood", {
    "hardness": 4,
    "sharp": 1,
    "flammable": 8,
    "density": 0.6,
    "sticky": 0,
    "ignition_temp": 300,
    "mass_per_volume": 0.6,
})

FIBER = MaterialTemplate("fiber", {
    "hardness": 1,
    "sharp": 0,
    "flammable": 5,
    "density": 0.2,
    "sticky": 10,
    "ignition_temp": 250,
    "mass_per_volume": 0.2,
})

BONE = MaterialTemplate("bone", {
    "hardness": 6,
    "sharp": 3,
    "flammable": 2,
    "density": 1.8,
    "sticky": 0,
    "ignition_temp": 400,
    "mass_per_volume": 1.8,
})

LEAF = MaterialTemplate("leaf", {
    "hardness": 1,
    "sharp": 0,
    "flammable": 9,
    "density": 0.1,
    "sticky": 0,
    "ignition_temp": 200,
    "mass_per_volume": 0.1,
})
