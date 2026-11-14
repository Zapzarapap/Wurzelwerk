"""Germini (Mini-Gerbera) – Blumenwiese. Lange blattlose Stiele, Margeritenblüte mit dunkler Mitte."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import star_flower

VARIANTS = {
    "rot": None,
    "orange": {"petal_red": "petal_orange"},
    "gelb": {"petal_red": "petal_yellow"},
    "rosa": {"petal_red": "petal_pink"},
    "weiss": {"petal_red": "petal_white"},
}

BY = 29


def rosette(sp, spec, lobed=True):
    for (bx, ang, L, W) in spec:
        heart_leaf(sp.layer("leaf"), bx, BY, ang, L, W, notch=False, midrib=lobed,
                   splits=(0.5,) if lobed else (), vein=SHADE)


ROSETTE = {
    1: [(14, -155, 4, 1.8), (17, -30, 4, 1.8), (16, -95, 3.5, 1.6)],
    2: [(13, -160, 6, 2.2), (18, -25, 6, 2.2), (15, -120, 5, 2), (17, -65, 5, 2)],
    3: [(12, -165, 7, 2.4), (19, -15, 7, 2.4), (14, -130, 6, 2.2), (18, -50, 6, 2.2), (16, -100, 4.5, 2)],
    4: [(11, -168, 7.5, 2.6), (20, -12, 7.5, 2.6), (14, -135, 6.5, 2.3), (18, -45, 6.5, 2.3), (16, -100, 5, 2)],
    5: [(10, -170, 8, 2.7), (21, -10, 8, 2.7), (13, -140, 7, 2.4), (19, -42, 7, 2.4), (16, -100, 5.5, 2.2), (14, -158, 5, 2)],
}


def bud(sp, x, y, s=1.0):
    c = sp.layer("leaf")
    c.ellipse(x, y + 0.6, 1.7 * s, 1.5 * s)
    t = sp.layer("petal_red")
    t.ellipse(x, y - 1.2 * s, 1.5 * s, 1.3 * s)
    d = sp.layer("petal_red", outline=False, shading=False)
    d.px(int(x - 1), int(y - 2 * s), LIGHT)


def gerbera(sp, x, y, R):
    star_flower(sp, "petal_red", x, y, R * 0.38, R, 10, ysc=0.9, rot=0.25, p=1.0, valley=0.75)
    c = sp.layer("dark", shading=False)
    rc = max(1.5, R * 0.26)
    c.ellipse(x, y, rc, rc * 0.85, tone=BASE)
    c.px(int(math.floor(x - 0.5)), int(math.floor(y - 0.5)), HIGHLIGHT)
    c.px(int(math.floor(x + 0.5)), int(math.floor(y - 0.5)), LIGHT)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 2:
        stalk(sp, 16, BY, 16, 21, bend=0.5)
    elif stage == 3:
        stalk(sp, 15, BY, 14, 15, bend=-1)
        stalk(sp, 17, BY, 20, 21, bend=1)
    elif stage == 4:
        stalk(sp, 15, BY, 14, 14, bend=-1)
        stalk(sp, 17, BY, 22, 20, bend=1.5)
    elif stage == 5:
        stalk(sp, 15, BY, 11, 14, bend=-2)
        stalk(sp, 17, BY, 24, 19, bend=2)
        stalk(sp, 15, BY, 7, 25, bend=-1)
        stalk(sp, 16, BY, 17, 20, bend=0.5)
    rosette(sp, ROSETTE[stage], lobed=stage >= 3)
    if stage == 2:
        bud(sp, 16, 20, 0.8)
    elif stage == 3:
        bud(sp, 14, 14, 1.0)
        bud(sp, 20, 20, 0.8)
    elif stage == 4:
        bud(sp, 22, 19, 0.9)
        gerbera(sp, 14, 10, 6.0)
    elif stage == 5:
        bud(sp, 17, 19, 0.9)
        gerbera(sp, 7, 22, 4.6)
        gerbera(sp, 24, 15, 5.4)
        gerbera(sp, 11, 9, 7.0)
    return sp
