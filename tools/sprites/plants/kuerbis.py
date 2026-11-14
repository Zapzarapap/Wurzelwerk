"""Kürbis – Gewächshaus. Kriechend, große Blätter, Ranken, Stufe 5 gerippter Kürbis."""
REGION = "gewaechshaus"

from pixel import Sprite
from parts import stalk
from parts_gewaechshaus import (greenhouse_ground, round_leaf, ribbed_fruit, flower,
                                tendril, SOIL_Y)

VARIANTS = {
    "orange": None,
    "gruen": {"gh_pumpkin_orange": "gh_pumpkin_green"},
    "beige": {"gh_pumpkin_orange": "gh_pumpkin_beige"},
}

LEAF = "leaf"


def vine(sp, pts):
    v = sp.layer("stem", outline=False, shading=False)
    v.curve(pts, tone=2)
    return v


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    if stage == 1:
        for (cx, cy) in ((13, 23), (19, 22)):
            l = sp.layer(LEAF)
            l.ellipse(cx, cy, 2.5, 1.4)
        stalk(sp, 16, 27, 16, 23, ramp="stem")
    elif stage == 2:
        for (cx, cy) in ((11, 24), (21, 24)):
            l = sp.layer(LEAF)
            l.ellipse(cx, cy, 2.3, 1.2)
        stalk(sp, 16, 27, 16, 20, ramp="stem")
        round_leaf(sp.layer(LEAF), 16, 17, 4.0, lobes=5, depth=0.14)
    elif stage == 3:
        vine(sp, [(20, 27), (16, 24), (10, 25), (5, 26)])
        stalk(sp, 19, 27, 22, 17, ramp="stem")
        stalk(sp, 15, 25, 13, 14, ramp="stem")
        round_leaf(sp.layer(LEAF), 23, 16, 5.0, depth=0.12, rot=-1.9)
        round_leaf(sp.layer(LEAF), 12, 12, 5.6, depth=0.12, rot=-1.4)
        round_leaf(sp.layer(LEAF), 7, 21, 3.8, depth=0.14, rot=-1.2)
        flower(sp, 17, 22, "petal_orange", "petal_yellow")
    elif stage == 4:
        vine(sp, [(22, 27), (17, 24), (9, 26), (4, 26)])
        stalk(sp, 21, 27, 24, 15, ramp="stem")
        stalk(sp, 16, 25, 13, 10, ramp="stem")
        round_leaf(sp.layer(LEAF), 24, 14, 6.2, depth=0.12, rot=-1.9)
        round_leaf(sp.layer(LEAF), 13, 9, 6.0, depth=0.12, rot=-1.4)
        ribbed_fruit(sp, "gh_pumpkin_green", 10, 23.5, 4.4, 3.6, ks=(-0.45, 0.2))
        round_leaf(sp.layer(LEAF), 26, 23, 4.0, depth=0.12, rot=-1.5)
        flower(sp, 19, 21, "petal_orange", "petal_yellow")
        tendril(sp, [(5, 26), (3, 24), (4, 22), (6, 23)])
    else:
        vine(sp, [(25, 27), (19, 24), (10, 26), (3, 26)])
        stalk(sp, 22, 26, 24, 12, ramp="stem")
        stalk(sp, 17, 25, 12, 7, ramp="stem")
        stalk(sp, 24, 27, 27, 22, ramp="stem")
        round_leaf(sp.layer(LEAF), 24, 11, 6.8, depth=0.12, rot=-1.9)
        round_leaf(sp.layer(LEAF), 11, 7, 6.6, depth=0.12, rot=-1.4)
        ribbed_fruit(sp, "gh_pumpkin_orange", 12, 21.5, 7.4, 5.6, ks=(-0.72, -0.3, 0.3, 0.72))
        round_leaf(sp.layer(LEAF), 26, 22, 4.2, depth=0.12, rot=-1.5)
        flower(sp, 21, 22, "petal_orange", "petal_yellow")
        tendril(sp, [(4, 25), (2, 22), (3, 20), (5, 21)])
        tendril(sp, [(19, 10), (17, 14), (19, 17), (21, 16)])
    return sp
