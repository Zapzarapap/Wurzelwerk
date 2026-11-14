"""Gänseblümchen – Blumenwiese. Weiß mit rosa Spitzen, gelbe Mitte, mehrere kleine Blüten."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import stalk, meadow_ground
from parts_blumenwiese import star_flower, narrow_leaf

BY = 29

ROSETTE = {
    1: [(14, -160, 3.5), (17, -30, 3.5), (16, -95, 3)],
    2: [(13, -160, 4.5), (18, -25, 4.5), (15, -125, 3.5), (17, -70, 4), (16, -95, 3)],
    3: [(12, -165, 5), (19, -15, 5), (14, -130, 4.5), (18, -55, 4.5), (16, -95, 4)],
    4: [(11, -168, 5.5), (20, -12, 5.5), (14, -135, 5), (18, -50, 5), (16, -95, 4.5), (15, -155, 3.5)],
    5: [(10, -170, 6), (21, -10, 6), (13, -140, 5), (19, -45, 5.5), (16, -95, 4.5), (14, -160, 4), (18, -25, 4)],
}
# Blüten (x, y, Radius) und Knospen (x, y)
FLOWERS = {
    1: [], 2: [],
    3: [(10, 21, 2.6), (21, 22, 2.3)],
    4: [(10, 17, 3.3), (21, 13, 3.6), (26, 22, 2.7)],
    5: [(11, 9, 4.3), (22, 13, 4.0), (6, 19, 3.4), (26, 22, 3.0)],
}
BUDS = {
    1: [], 2: [(19, 22)], 3: [(16, 19)], 4: [(16, 20)], 5: [(16, 18)],
}


def daisy(sp, x, y, r):
    lay = star_flower(sp, "petal_white", x, y, r * 0.6, r, 8, ysc=0.82, p=0.55, valley=0.8, rot=0.3)
    tips = sp.layer("petal_pink", outline=False, shading=False)
    for (px, py) in lay.pixels:
        if math.hypot(px + 0.5 - x, (py + 0.5 - y) / 0.82) > r * 0.74:
            tips.px(px, py, BASE)
    c = sp.layer("petal_yellow", outline=False, shading=False)
    rc = max(1.0, r * 0.34)
    c.ellipse(x, y, rc, rc * 0.85, tone=BASE)
    c.px(int(math.floor(x - 0.5)), int(math.floor(y - 0.5)), LIGHT)


def bud(sp, x, y):
    c = sp.layer("leaf")
    c.ellipse(x, y + 1.6, 1.3, 1.0)
    b = sp.layer("petal_white")
    b.ellipse(x, y, 1.5, 1.7)
    t = sp.layer("petal_pink", outline=False, shading=False)
    t.px(x - 1, y - 1, BASE)
    t.px(x, y - 1, LIGHT)
    t.px(x, y - 2, BASE)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    fl = sorted(FLOWERS[stage], key=lambda f: f[1])
    for i, (x, y, r) in enumerate(fl):
        sx = 14 + (i * 2) % 5
        stalk(sp, sx, BY, x, y + r * 0.8, bend=(x - sx) * -0.25)
    for i, (x, y) in enumerate(BUDS[stage]):
        sx = 15 + (i * 3) % 4
        stalk(sp, sx, BY, x, y + 1.5, bend=(x - sx) * -0.2)
    for (bx, a, L) in ROSETTE[stage]:
        narrow_leaf(sp, "leaf", bx, BY, a, L, 1.7)
    for (x, y) in BUDS[stage]:
        bud(sp, x, y)
    for (x, y, r) in fl:
        daisy(sp, x, y, r)
    return sp
