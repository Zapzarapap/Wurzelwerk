"""Melone – Gewächshaus. Kriechend, große gelappte Blätter, Stufe 5 gestreifte Melone."""
REGION = "gewaechshaus"

from pixel import Sprite
from parts import stalk
from parts_gewaechshaus import (greenhouse_ground, round_leaf, striped_fruit, flower,
                                tendril, SOIL_Y)

LEAF = "leaf_deep"
KS = (-0.62, -0.2, 0.22, 0.64)


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
            l.ellipse(cx, cy, 2.4, 1.3)
        stalk(sp, 16, 27, 16, 23, ramp="stem")
    elif stage == 2:
        for (cx, cy) in ((11, 24), (21, 24)):
            l = sp.layer(LEAF)
            l.ellipse(cx, cy, 2.2, 1.1)
        stalk(sp, 16, 27, 16, 20, ramp="stem")
        round_leaf(sp.layer(LEAF), 16, 17, 3.8, lobes=5, depth=0.25)
    elif stage == 3:
        vine(sp, [(12, 27), (16, 24), (22, 25), (27, 26)])
        stalk(sp, 13, 27, 9, 18, ramp="stem")
        stalk(sp, 17, 25, 17, 15, ramp="stem")
        stalk(sp, 23, 25, 25, 20, ramp="stem")
        round_leaf(sp.layer(LEAF), 9, 17, 4.8, depth=0.2)
        round_leaf(sp.layer(LEAF), 17, 13, 5.4, depth=0.2, rot=-1.3)
        round_leaf(sp.layer(LEAF), 25, 19, 3.8, depth=0.2, rot=-1.7)
        flower(sp, 22, 23)
    elif stage == 4:
        vine(sp, [(9, 27), (14, 24), (21, 26), (28, 26)])
        stalk(sp, 10, 27, 7, 16, ramp="stem")
        stalk(sp, 15, 25, 16, 11, ramp="stem")
        stalk(sp, 24, 26, 25, 16, ramp="stem")
        round_leaf(sp.layer(LEAF), 7, 15, 5.8, depth=0.22)
        round_leaf(sp.layer(LEAF), 16, 10, 6.2, depth=0.22, rot=-1.3)
        round_leaf(sp.layer(LEAF), 25, 15, 4.8, depth=0.2, rot=-1.8)
        striped_fruit(sp, "gh_melon", "gh_melon_stripe", 20.5, 23.8, 3.9, 3.4, (-0.45, 0.1, 0.6))
        flower(sp, 12, 21)
    else:
        vine(sp, [(7, 27), (11, 24), (19, 26), (28, 26)])
        stalk(sp, 9, 26, 7, 14, ramp="stem")
        stalk(sp, 12, 25, 16, 8, ramp="stem")
        stalk(sp, 22, 26, 25, 12, ramp="stem")
        stalk(sp, 8, 27, 5, 23, ramp="stem")
        round_leaf(sp.layer(LEAF), 8, 13, 6.4, depth=0.22, rot=-1.7)
        round_leaf(sp.layer(LEAF), 17, 8, 6.6, depth=0.22, rot=-1.3)
        round_leaf(sp.layer(LEAF), 25, 11, 5.2, depth=0.22, rot=-1.9)
        striped_fruit(sp, "gh_melon", "gh_melon_stripe", 19, 22, 7.2, 5.8, KS)
        round_leaf(sp.layer(LEAF), 5.5, 23, 3.6, depth=0.2, rot=-1.4)
        flower(sp, 10, 21)
        tendril(sp, [(8, 27), (5, 28), (3, 26), (5, 25)]) if False else None
    return sp
