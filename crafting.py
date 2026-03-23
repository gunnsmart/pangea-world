# crafting.py
import random
from item import Item
from materials import STONE, WOOD, FIBER, Material

def combine_items(item_a: Item, item_b: Item, binder: Item = None) -> Item:
    new_attrs = {}

    # Sharpness: max
    new_attrs["sharp"] = max(item_a.attrs.get("sharp", 0), item_b.attrs.get("sharp", 0))

    # Length: sum
    new_attrs["length"] = item_a.attrs.get("length", 1) + item_b.attrs.get("length", 1)

    # Hardness: min
    new_attrs["hardness"] = min(item_a.attrs.get("hardness", 1), item_b.attrs.get("hardness", 1))

    # Mass: sum
    new_attrs["mass"] = item_a.attrs.get("mass", 1) + item_b.attrs.get("mass", 1)

    # Volume: sum
    new_attrs["volume"] = item_a.volume + item_b.volume

    # Sticky: max of all
    sticky_vals = [item_a.attrs.get("sticky", 0), item_b.attrs.get("sticky", 0)]
    if binder:
        sticky_vals.append(binder.attrs.get("sticky", 0))
    new_attrs["sticky"] = max(sticky_vals)

    # Durability
    if binder:
        new_attrs["durability"] = new_attrs["sticky"] * 5
    else:
        new_attrs["durability"] = new_attrs["hardness"] * 0.5

    # Flammability: max
    new_attrs["flammable"] = max(item_a.attrs.get("flammable", 0), item_b.attrs.get("flammable", 0))
    # Ignition temp: min (easier to ignite)
    new_attrs["ignition_temp"] = min(item_a.attrs.get("ignition_temp", 1000), item_b.attrs.get("ignition_temp", 1000))

    # Damage: sharp * length * mass / 10
    new_attrs["damage"] = (new_attrs["sharp"] * new_attrs["length"] * new_attrs["mass"]) / 10

    # Determine template based on dominant attributes
    new_template = determine_template_from_attrs(new_attrs)

    # Create new item
    new_item = Item(Material(new_template), volume=new_attrs["volume"], length=new_attrs["length"])
    for k, v in new_attrs.items():
        new_item.attrs[k] = v
    return new_item

def determine_template_from_attrs(attrs: dict):
    if attrs.get("hardness", 0) > 7:
        return STONE
    if attrs.get("sticky", 0) > 5:
        return FIBER
    if attrs.get("flammable", 0) > 6:
        return WOOD
    return WOOD

def generate_item_name(attrs: dict) -> str:
    if attrs.get("sharp", 0) > 5 and attrs.get("length", 0) > 3:
        category = "Piercing Tool"
        syllables = ["krak", "tak", "shar", "thrust"]
    elif attrs.get("mass", 0) > 10 and attrs.get("hardness", 0) > 7:
        category = "Blunt Tool"
        syllables = ["thud", "bam", "gron", "smash"]
    elif attrs.get("sticky", 0) > 7:
        category = "Binding Tool"
        syllables = ["klu", "mu", "tie", "bind"]
    elif attrs.get("flammable", 0) > 7:
        category = "Fuel"
        syllables = ["flam", "burn", "torch"]
    else:
        category = "Tool"
        syllables = ["un", "kno", "won", "thing"]
    name_parts = random.sample(syllables, k=min(2, len(syllables)))
    name = "".join(name_parts).capitalize()
    return f"{name} ({category})"
