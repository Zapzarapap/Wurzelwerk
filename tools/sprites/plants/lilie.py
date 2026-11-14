"""Lilie – Blumenwiese. Hoher Stängel mit Lanzettblättern, großer sechszackiger Trichterstern."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import star_flower

VARIANTS = {
    "weiss": None,
    "rosa": {"petal_white": "petal_pink"},
    "orange": {"petal_white": "petal_orange"},
    "gelb": {"petal_white": "petal_yellow"},
    "rot": {"petal_white": "petal_red"},
}

BY = 29


def bloom(sp, x, y, size, rot=0.0):
    """Offene Lilie: sechszackiger Stern mit Rinnen, Punkten und Staubblättern."""
    star_flower(sp, "petal_white", x, y, size * 0.32, size, 6, ysc=0.8, rot=math.radians(rot), p=1.1, valley=0.7)
    sp_l = sp.layer("petal_white", outline=False, shading=False)
    for k in range(6):
        ar = math.radians(rot + k * 60)
        for t in (0.3, 0.45):
            sp_l.px(int(math.floor(x + math.cos(ar) * size * t)), int(math.floor(y + math.sin(ar) * size * t * 0.8)), HIGHLIGHT)
        if k % 2 == 0 and size >= 5:
            for t in (0.55, 0.68):
                sp_l.px(int(math.floor(x + math.cos(ar) * size * t + 1)), int(math.floor(y + math.sin(ar) * size * t * 0.8)), SHADE)
    # Staubblätter
    fil = sp.layer("cream", outline=False, shading=False)
    ant = sp.layer("wood", outline=False, shading=False)
    k = size / 6.0
    for (dx, dy) in ((-3, -3.5), (1, -4.5), (4, -2)):
        fil.line(x, y, x + dx * k, y + dy * k, tone=LIGHT)
        ant.px(round(x + dx * k), round(y + dy * k), BASE)
        ant.px(round(x + dx * k) + 1, round(y + dy * k), SHADE)


def bud(sp, x, y, L, ang=-90, colored=False):
    lay = sp.layer("petal_white" if colored else "leaf")
    heart_leaf(lay, x, y, ang, L, L * 0.33, notch=False, midrib=False)
    return lay


def blade(sp, x, y, dx, dy, bend=0.0):
    """Lilienblatt: 2 px breite Klinge ohne Outline, oben heller."""
    stalk(sp, x, y, x + dx, y + dy, bend=bend, ramp="leaf", tone=LIGHT)
    stalk(sp, x, y + 1, x + dx, y + dy + 1, bend=bend, ramp="leaf", tone=SHADE)


def leaves(sp, spec):
    for (bx, by, dx, dy, bend) in spec:
        blade(sp, bx, by, dx, dy, bend)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 1:
        leaves(sp, [(15, 28, -2, -5, -0.5), (17, 28, 3, -3, 0.5)])
    elif stage == 2:
        stalk(sp, 16, BY, 16, 19, bend=0.5)
        leaves(sp, [(16, 27, -6, -3, 0.5), (16, 24, 6, -5, -0.5), (16, 21, -3, -5, 0.5)])
    elif stage == 3:
        stalk(sp, 16, BY, 15, 12, bend=-1)
        leaves(sp, [(16, 27, -7, -2, 0.5), (16, 25, 6, -5, -0.5), (15, 21, -6, -5, 0.5), (15, 18, 4, -5, -0.5),
                    (15, 16, -3, -4, 0.5)])
        bud(sp, 15, 14, 5, -92)
    elif stage == 4:
        stalk(sp, 16, BY, 14, 10, bend=-1.5)
        stalk(sp, 15, 17, 21, 14, bend=-1)
        leaves(sp, [(16, 27, -8, -2, 0.5), (16, 25, 7, -5, -0.5), (15, 21, -5, -6, 0.5), (15, 19, 8, -3, -0.5),
                    (14, 15, -4, -5, 0.5)])
        bud(sp, 21, 15, 4, -60)
        bud(sp, 14, 11, 7, -95, colored=True)
    else:
        stalk(sp, 16, BY, 12, 12, bend=-2)
        stalk(sp, 14, 21, 23, 18, bend=-1.5)
        stalk(sp, 16, 26, 7, 22, bend=-1)
        leaves(sp, [(16, 28, -9, -2, 0.5), (16, 26, 8, -6, -0.5), (15, 24, -4, -6, 0.5), (15, 21, 9, -3, -0.5),
                    (13, 18, -6, -4, 0.5)])
        bud(sp, 7, 22, 5, -125, colored=True)
        bloom(sp, 23, 15, 5.6, rot=-20)
        bloom(sp, 12, 8, 7.6, rot=10)
    return sp
