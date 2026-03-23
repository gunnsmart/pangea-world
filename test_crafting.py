
import random
from materials import STONE, WOOD, FIBER
from item import create_item, Item
from crafting import combine_items, generate_item_name
from systems.brain import Brain

def test_crafting():
    print("Testing Crafting System...")
    stone = create_item(STONE, volume=0.5, length=0.2, modifiers={"sharp": 8})
    wood = create_item(WOOD, volume=1.0, length=1.0, modifiers={"flammable": 10})
    fiber = create_item(FIBER, volume=0.3, length=0.8, modifiers={"sticky": 10})

    print(f"Item A: {stone}")
    print(f"Item B: {wood}")
    print(f"Binder: {fiber}")

    new_item = combine_items(stone, wood, fiber)
    print(f"Crafted Item: {new_item}")
    print(f"Attributes: {new_item.attrs}")
    
    name = generate_item_name(new_item.attrs)
    print(f"Generated Name: {name}")

    brain = Brain("Adam")
    brain.inventory = [stone, wood, fiber]
    
    # Test try_craft
    crafted = brain.try_craft(stone, wood, fiber)
    print(f"Brain try_craft: {crafted}")
    print(f"Brain memory: {brain.memory.episodes}")

if __name__ == "__main__":
    test_crafting()
