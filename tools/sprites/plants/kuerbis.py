"""Kürbis – Gewächshaus. Kriechend, große runde, nur leicht gelappte Blätter auf langen
Stielen, Ranken, große Trichterblüte; Stufe 5 flacher, gerippter Kürbis."""
REGION = "gewaechshaus"

import math

from pixel import Sprite
from parts import stalk
from parts_gewaechshaus import (greenhouse_ground, lobed_leaf, pumpkin_fruit, tendril, SOIL_Y)

VARIANTS = {
    "orange": None,
    "gruen": {"gh_pumpkin_orange": "gh_pumpkin_green"},
    "beige": {"gh_pumpkin_orange": "gh_pumpkin_beige"},
}

LEAF = "leaf"
UP = -math.pi / 2


def vine(sp, pts):
    v = sp.layer("stem", outline=False, shading=False)
    v.curve(pts, tone=2)
    return v


def leaf(sp, x, y, R, tilt=0.0):
    lobed_leaf(sp.layer(LEAF), x, y, R, lobes=5, depth=0.09, rot=UP + tilt, flat=0.86, sinus=0.34)


def bloom(sp, x, y):
    """Große gelb-orange Trichterblüte von schräg oben."""
    f = sp.layer("petal_yellow")
    f.ellipse(x, y, 2.2, 1.7)
    c = sp.layer("petal_orange", outline=False, shading=False)
    c.px(math.floor(x), math.floor(y), 2)
    c.px(math.floor(x), math.floor(y) + 1, 1)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    if stage == 1:
        stalk(sp, 16, 27, 16, 23, ramp="stem")
        for (cx, cy) in ((13, 22.3), (19, 21.8)):
            l = sp.layer(LEAF)
            l.ellipse(cx, cy, 2.4, 1.8)
    elif stage == 2:
        stalk(sp, 16, 27, 16, 19, ramp="stem")
        for (cx, cy) in ((11.5, 24), (20.5, 24)):
            l = sp.layer(LEAF)
            l.ellipse(cx, cy, 2.4, 1.2)
        leaf(sp, 16.5, 16.5, 4.2, 0.15)
    elif stage == 3:
        vine(sp, [(19, 27), (15, 25), (10, 26), (6, 26)])
        stalk(sp, 18, 26, 21, 17, ramp="stem")
        stalk(sp, 14, 25, 11, 14, ramp="stem")
        leaf(sp, 22, 15.5, 5.2, 0.3)
        leaf(sp, 11, 12, 5.6, -0.2)
        leaf(sp, 7, 22.5, 3.4, -0.4)
        bloom(sp, 17, 22)
    elif stage == 4:
        vine(sp, [(23, 27), (17, 25), (9, 26), (4, 26)])
        stalk(sp, 21, 26, 23, 14, ramp="stem")
        stalk(sp, 15, 25, 12, 9, ramp="stem")
        leaf(sp, 23.5, 12.5, 6.0, 0.3)
        leaf(sp, 11.5, 8.5, 6.2, -0.25)
        pumpkin_fruit(sp, "gh_pumpkin_green", 10, 23.5, 4.4, 3.0, ribs=4, stem_dx=1)
        leaf(sp, 26, 22.5, 3.8, 0.4)
        bloom(sp, 19, 21)
        tendril(sp, [(5, 26), (3, 24), (4, 22), (6, 23)])
    else:
        vine(sp, [(26, 27), (20, 25), (10, 26), (3, 26)])
        stalk(sp, 22, 25, 24, 13, ramp="stem")
        stalk(sp, 17, 25, 11, 9, ramp="stem")
        leaf(sp, 24, 11, 6.8, 0.3)
        leaf(sp, 10.5, 8.5, 7.0, -0.25)
        pumpkin_fruit(sp, "gh_pumpkin_orange", 13.5, 22.3, 9.0, 5.1, ribs=6, dimple=0.14, stem_dx=1)
        leaf(sp, 26, 21, 4.4, 0.45)
        bloom(sp, 25, 15.5)
        tendril(sp, [(4, 25), (2, 22), (3, 20), (5, 21)])
    return sp
