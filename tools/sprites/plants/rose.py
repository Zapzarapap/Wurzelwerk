"""Rose – Blumenwiese. Strauch mit gefiederten Blättern, Knospen und spiralig gerollten Blüten."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import rose_bloom

VARIANTS = {
    "rot": None,
    "rosa": {"petal_red": "petal_pink"},
    "weiss": {"petal_red": "petal_white"},
    "gelb": {"petal_red": "petal_yellow"},
    "orange": {"petal_red": "petal_orange"},
}

BY = 29


def leaflet(sp, x, y, ang, L):
    heart_leaf(sp.layer("leaf"), x, y, ang, L, L * 0.42, notch=False, midrib=False)


def leaf_group(sp, x, y, ang, s=1.0):
    """Gefiedertes Rosenblatt: Stiel mit Endblättchen und zwei Seitenblättchen."""
    a = math.radians(ang)
    ex, ey = x + math.cos(a) * 4.5 * s, y + math.sin(a) * 4.5 * s
    stalk(sp, x, y, ex, ey)
    mx, my = x + math.cos(a) * 2.2 * s, y + math.sin(a) * 2.2 * s
    leaflet(sp, mx, my, ang - 65, 3.2 * s)
    leaflet(sp, mx, my, ang + 65, 3.2 * s)
    leaflet(sp, ex - math.cos(a), ey - math.sin(a), ang, 4.2 * s)


def bud(sp, x, y, s=1.0):
    sep = sp.layer("leaf")
    sep.ellipse(x, y + 2.4 * s, 2.0 * s, 1.3 * s)
    b = sp.layer("petal_red")
    b.ellipse(x, y, 1.9 * s, 2.6 * s)
    sw = sp.layer("petal_red", outline=False, shading=False)
    sw.px(int(x), int(y - 1), SHADE)
    sw.px(int(x), int(y), SHADE)
    sw.px(int(x - 1), int(y), LIGHT)


def bloom(sp, x, y, r):
    sep = sp.layer("leaf")
    sep.ellipse(x, y + r * 0.9, r * 0.55, 1.6)
    rose_bloom(sp, "petal_red", x, y, r)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 1:
        leaflet(sp, 14, BY, -150, 3.5)
        leaflet(sp, 17, BY, -40, 3.5)
        leaflet(sp, 16, BY, -100, 4)
    elif stage == 2:
        stalk(sp, 15, BY, 15, 20, bend=0.5)
        leaf_group(sp, 15, 26, -150, 0.8)
        leaf_group(sp, 15, 23, -30, 0.8)
        leaflet(sp, 15, 21, -95, 4)
    elif stage == 3:
        stalk(sp, 15, BY, 14, 14, bend=-1)
        stalk(sp, 16, BY, 20, 20, bend=1)
        leaf_group(sp, 15, 26, -160, 1.0)
        leaf_group(sp, 15, 22, -25, 1.0)
        leaf_group(sp, 14, 18, -150, 0.9)
        leaf_group(sp, 19, 22, -30, 0.7)
        bud(sp, 14, 12)
    elif stage == 4:
        stalk(sp, 15, BY, 13, 12, bend=-2)
        stalk(sp, 16, BY, 22, 19, bend=1.5)
        leaf_group(sp, 15, 26, -165, 1.1)
        leaf_group(sp, 15, 22, -20, 1.1)
        leaf_group(sp, 14, 18, -150, 1.0)
        leaf_group(sp, 19, 23, -150, 0.8)
        bloom(sp, 13, 9, 4.4)
        bud(sp, 22, 17, 0.9)
    else:
        stalk(sp, 15, BY, 12, 14, bend=-2)
        stalk(sp, 16, BY, 23, 20, bend=2)
        stalk(sp, 15, 27, 8, 23, bend=-1)
        stalk(sp, 16, 25, 20, 13, bend=1.5)
        leaf_group(sp, 15, 27, -168, 1.2)
        leaf_group(sp, 16, 26, -15, 1.2)
        leaf_group(sp, 14, 20, -150, 1.0)
        leaf_group(sp, 17, 20, -30, 1.0)
        leaf_group(sp, 12, 25, 160, 0.8)
        bud(sp, 20, 10, 0.95)
        bloom(sp, 24, 17, 3.6)
        bloom(sp, 8, 20, 3.6)
        bloom(sp, 12, 9, 5.4)
    return sp
