"""Kornblume – Blumenwiese. Zerzauste Strahlenblüte, graugrüne schmale Blätter."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import stalk, meadow_ground
from parts_blumenwiese import star_flower, leaf_line

VARIANTS = {
    "blau": None,
    "rosa": {"petal_blue": "petal_pink"},
    "weiss": {"petal_blue": "petal_white"},
    "lila": {"petal_blue": "petal_purple"},
}

BY = 29


def stem(sp, x0, y0, x1, y1, bend=0.0, leaves=2, side=1):
    stalk(sp, x0, y0, x1, y1, bend=bend)
    for i in range(leaves):
        t = 0.3 + 0.28 * i
        lx = x0 + (x1 - x0) * t + bend * 0.5
        ly = y0 + (y1 - y0) * t
        s = side if i % 2 == 0 else -side
        leaf_line(sp, lx, ly, lx + s * 4, ly - 3, bend=-s * 0.6)


def blades(sp, n, L):
    spec = [(14, -3, 1), (17, 4, 1), (16, 0, 0.8), (13, -5, 0.7), (18, 6, 0.75)][:n]
    for (bx, dx, k) in spec:
        leaf_line(sp, bx, BY, bx + dx * k * L / 4, BY - L * k, bend=dx * 0.2,
                  tone=LIGHT if bx % 2 else BASE)


def bud(sp, x, y):
    b = sp.layer("leaf_sage")
    b.ellipse(x, y, 1.5, 1.9)
    t = sp.layer("petal_blue", outline=False, shading=False)
    t.px(x - 1, y - 2, BASE)
    t.px(x, y - 2, LIGHT)
    t.px(x + 1, y - 2, BASE)


def flower(sp, x, y, r):
    star_flower(sp, "petal_blue", x, y, r * 0.5, r, 8, ysc=0.88, p=0.7, valley=0.75, rot=0.2)
    c = sp.layer("petal_purple", outline=False, shading=False)
    rc = max(1.0, r * 0.32)
    c.ellipse(x, y, rc, rc, tone=BASE)
    c.px(int(math.floor(x - 0.6)), int(math.floor(y - 0.6)), HIGHLIGHT)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 1:
        blades(sp, 3, 4)
    elif stage == 2:
        stem(sp, 16, BY, 18, 21, bend=1, leaves=1)
        blades(sp, 4, 6)
        bud(sp, 18, 19)
    elif stage == 3:
        stem(sp, 15, BY, 14, 14, bend=-1.5, leaves=2)
        stem(sp, 17, BY, 20, 19, bend=1.5, leaves=1, side=-1)
        blades(sp, 5, 7)
        bud(sp, 14, 12)
        bud(sp, 20, 17)
    elif stage == 4:
        stem(sp, 15, BY, 13, 12, bend=-2, leaves=3)
        stem(sp, 17, BY, 21, 19, bend=2, leaves=2, side=-1)
        stem(sp, 15, BY, 9, 21, bend=-1, leaves=1)
        blades(sp, 5, 8)
        flower(sp, 13, 9, 3.8)
        bud(sp, 21, 17)
        bud(sp, 9, 19)
    else:
        stem(sp, 15, BY, 12, 10, bend=-2, leaves=3)
        stem(sp, 17, BY, 22, 15, bend=2.5, leaves=3, side=-1)
        stem(sp, 15, BY, 7, 20, bend=-1.5, leaves=2)
        stem(sp, 17, BY, 25, 23, bend=1, leaves=1, side=-1)
        stem(sp, 16, BY, 17, 17, bend=0.5, leaves=0)
        blades(sp, 5, 9)
        bud(sp, 17, 15)
        flower(sp, 25, 21, 3.1)
        flower(sp, 7, 18, 3.5)
        flower(sp, 22, 12, 4.1)
        flower(sp, 12, 7, 4.4)
    return sp
