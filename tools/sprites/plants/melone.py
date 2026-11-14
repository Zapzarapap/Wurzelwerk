"""Melone (Wassermelone) – Gewächshaus. Kriechend, kleinere, tief gelappte dunkle Blätter,
kleine gelbe Blüten; Stufe 5 große gestreifte Melone."""
REGION = "gewaechshaus"

import math

from pixel import Sprite
from parts import stalk
from parts_gewaechshaus import (greenhouse_ground, lobed_leaf, striped_fruit, flower,
                                tendril, SOIL_Y)

LEAF = "leaf_deep"
KS = (-0.62, -0.2, 0.22, 0.64)
UP = -math.pi / 2


def vine(sp, pts):
    v = sp.layer("stem", outline=False, shading=False)
    v.curve(pts, tone=2)
    return v


def leaf(sp, x, y, R, tilt=0.0):
    """Tief gelapptes Melonenblatt (deutlich anders als das runde Kürbisblatt)."""
    lobed_leaf(sp.layer(LEAF), x, y, R, lobes=5, depth=0.34, rot=UP + tilt, flat=0.92,
               sinus=0.3, sharp=1.0)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    if stage == 1:
        stalk(sp, 16, 27, 16, 23, ramp="stem")
        for (cx, cy) in ((13.5, 22.5), (18.5, 22)):
            l = sp.layer(LEAF)
            l.ellipse(cx, cy, 2.2, 1.2)
    elif stage == 2:
        stalk(sp, 16, 27, 16, 20, ramp="stem")
        for (cx, cy) in ((12, 24), (20, 24)):
            l = sp.layer(LEAF)
            l.ellipse(cx, cy, 2.1, 1.1)
        leaf(sp, 16.5, 17, 3.8, 0.2)
    elif stage == 3:
        vine(sp, [(12, 27), (16, 25), (22, 26), (27, 26)])
        stalk(sp, 13, 26, 9, 19, ramp="stem")
        stalk(sp, 17, 25, 17, 15, ramp="stem")
        stalk(sp, 23, 26, 25, 21, ramp="stem")
        leaf(sp, 9, 17.5, 4.2, -0.3)
        leaf(sp, 17, 13.5, 4.8, 0.1)
        leaf(sp, 25, 20, 3.4, 0.5)
        flower(sp, 21, 23)
    elif stage == 4:
        vine(sp, [(8, 27), (14, 25), (21, 26), (28, 26)])
        stalk(sp, 10, 26, 7, 16, ramp="stem")
        stalk(sp, 15, 25, 15, 11, ramp="stem")
        stalk(sp, 24, 26, 25, 15, ramp="stem")
        leaf(sp, 7, 14.5, 4.8, -0.4)
        leaf(sp, 15.5, 9.5, 5.4, 0.1)
        leaf(sp, 24.5, 13.5, 4.4, 0.5)
        leaf(sp, 10.5, 21.5, 3.4, -0.2)
        striped_fruit(sp, "gh_melon", "gh_melon_stripe", 20.5, 23.6, 4.0, 3.4, (-0.45, 0.1, 0.6), stem=False)
        flower(sp, 6, 23)
        tendril(sp, [(26, 26), (28, 24), (27, 22), (26, 23)])
    else:
        vine(sp, [(6, 27), (11, 25), (20, 26), (29, 26)])
        stalk(sp, 8, 26, 6, 14, ramp="stem")
        stalk(sp, 12, 25, 14, 8, ramp="stem")
        stalk(sp, 22, 25, 23, 9, ramp="stem")
        stalk(sp, 27, 26, 28, 18, ramp="stem")
        leaf(sp, 6, 12.5, 5.0, -0.5)
        leaf(sp, 14, 7, 5.4, 0.0)
        leaf(sp, 23.5, 8, 5.2, 0.45)
        leaf(sp, 27.5, 17.5, 3.6, 0.7)
        striped_fruit(sp, "gh_melon", "gh_melon_stripe", 17, 21.6, 8.0, 5.6, KS, stem=False)
        leaf(sp, 5.5, 22, 3.6, -0.6)
        flower(sp, 26, 24)
        tendril(sp, [(10, 25), (9, 22), (11, 20), (12, 22)])
    return sp
