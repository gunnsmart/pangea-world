# item.py
from materials import Material, MaterialTemplate

class Item:
    def __init__(self, material: Material, volume: float = 1.0, length: float = 1.0, width: float = 1.0):
        self.material = material
        self.volume = volume
        self.length = length
        self.width = width
        self.attrs = material.attrs.copy()
        self.attrs["mass"] = volume * self.attrs.get("mass_per_volume", 1.0)
        self.attrs["length"] = length
        self.attrs["width"] = width
        if "durability" not in self.attrs:
            self.attrs["durability"] = self.attrs.get("hardness", 5) * 0.5

    def __repr__(self):
        return f"{self.material.template.name}(vol={self.volume}, len={self.length})"

def create_item(template: MaterialTemplate, volume=1.0, length=1.0, modifiers=None):
    mat = Material(template, modifiers)
    return Item(mat, volume, length)
