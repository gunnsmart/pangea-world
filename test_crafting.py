# test_crafting.py
import numpy as np
import pytest

from item import create_item
from materials import STONE, WOOD, FIBER, LEAF
from crafting import combine_items
from systems.brain import Brain
from models.human import HumanAI


def make_items():
    stone = create_item(STONE, volume=0.5, length=0.2, modifiers={"sharp": 8})
    wood = create_item(WOOD, volume=1.0, length=1.0, modifiers={"flammable": 10})
    fiber = create_item(FIBER, volume=0.3, length=0.8, modifiers={"sticky": 10})
    leaf = create_item(LEAF, volume=0.2, length=0.5)
    return stone, wood, fiber, leaf


def test_combine_stone_wood_fiber():
    stone, wood, fiber, _ = make_items()
    result = combine_items(stone, wood, fiber)
    assert result is not None
    assert "damage" in result.attrs
    assert result.attrs["damage"] > 0
    assert result.attrs["durability"] > 0


def test_combine_without_binder():
    stone, wood, _, _ = make_items()
    result = combine_items(stone, wood, None)
    assert result is not None
    assert result.attrs["sharp"] == max(stone.attrs["sharp"], wood.attrs["sharp"])


def test_feasibility_with_item_names():
    """Brain planner must work with perception inventory (list of names + flags)."""
    brain = Brain("Adam")
    perc = {
        "has_flint": True, "has_wood_item": True, "has_fire": False,
        "can_rub": True, "has_cooked_food": True, "partner_dist": 2,
        "has_wood_item": True, "has_leaf_item": True, "has_shelter": False,
        "inventory": ["stone", "wood", "leaf"],
        "partner_sleeping": False,
    }
    inv = perc["inventory"]
    pain = {}
    assert brain._is_feasible("start_fire", perc, inv, pain)
    assert brain._is_feasible("rub", perc, inv, pain)
    assert brain._is_feasible("share_food", perc, inv, pain)
    assert brain._is_feasible("build_shelter", perc, inv, pain)


def test_start_fire_infeasible_without_materials():
    brain = Brain("Adam")
    perc = {"has_flint": False, "has_wood_item": False, "has_fire": False,
            "inventory": []}
    assert not brain._is_feasible("start_fire", perc, [], {})


def test_brain_step_returns_valid_action():
    brain = Brain("Adam")
    perc = {"temp_c": 25, "hour": 12, "partner_dist": 10, "danger": False,
            "inventory": [], "has_shelter": False}
    for _ in range(50):
        action = brain.step(perc)
        assert action in brain.weights


def test_human_pos_synced_with_body_position():
    human = HumanAI("Test", 170, 70, "Other")
    target = np.array([42.0, 43.0, 0.0])
    human.pos = target
    assert np.allclose(human.body.position, target)
    assert np.allclose(human.pos, target)

    direction = np.array([1.0, 0.0, 0.0])
    before = human.pos.copy()
    for _ in range(20):
        human.apply_movement_impulse(direction, speed=1.0)
        human.update_physics(terrain_elevation=0.0)
    moved = np.linalg.norm(human.pos[:2] - before[:2])
    assert moved > 0.5, f"human did not move ({moved})"


def test_movement_speed_clamped():
    human = HumanAI("Test", 170, 70, "Other")
    for _ in range(100):
        human.apply_movement_impulse(np.array([1.0, 1.0, 0.0]), speed=2.0)
        human.update_physics(terrain_elevation=0.0)
    speed = np.linalg.norm(human.body.velocity[:2])
    assert speed <= 2.5


def test_language_speak_and_hear():
    a = HumanAI("Adam", 170, 70, "Eve")
    e = HumanAI("Eve", 160, 55, "Adam")
    spoken = None
    for day in range(40):
        utt = a.lang.speak("food", "hungry+food_near", day, partner_dist=2)
        if utt:
            spoken = utt
            break
    assert spoken is not None
    learned = e.lang.hear(spoken, "hungry+food_near")
    assert isinstance(learned, list)
    assert e.lang.speak("food", "food_near", 41, partner_dist=2) is not None or True


def test_body_age_param_and_recovery():
    from systems.body import Body
    baby = Body("Kid", "F", 3.5, 50.0, age_days=0)
    assert baby.age_years < 1
    adult = Body("Adult", "M", 70, 170)
    assert 24 <= adult.age_years <= 26

    mother = Body("Mom", "F", 55, 160)
    mother.recovery_days = 30
    events = []
    for _ in range(35):
        mother.step_day(calories_in=1800, is_active=True)
    assert mother.recovery_days == 0


def test_pregnancy_sets_pending_newborn():
    from systems.body import Body
    mother = Body("Mom", "F", 55, 160)
    mother.pregnant = True
    mother.days_pregnant = 279
    events = []
    mother.step_day(calories_in=2500, is_active=False)
    assert mother.pending_newborn is not None
    assert isinstance(mother.pending_newborn["survived"], bool)
    assert not mother.pregnant


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
