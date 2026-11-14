"""Efeu – Wald. Dunkelgrüne gelappte Blätter, rankt über den Boden und an einem Baumstumpf hoch."""
REGION = "wald"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import forest_ground, stalk
from parts_wald import ivy_leaf, GROUND

# Stumpf rechts hinten: x 17..24, Oberkante bei y=15
SX0, SX1, STOP = 17, 24, 15


def stump(sp):
    b = sp.layer("wood")
    for y in range(STOP, GROUND + 1):
        flare = 1 if y >= GROUND - 1 else 0
        b.rect(SX0 - flare, y, SX1 + flare, y)
    # gebrochene Oberkante
    b.erase(SX1, STOP)
    b.erase(SX1 - 1, STOP)
    b.erase(SX0, STOP)
    b.px(SX0 + 2, STOP - 1)
    b.px(SX0 + 3, STOP - 1)
    b.px(SX0 + 3, STOP - 2)
    # Rindenstriche
    r = sp.layer("wood", outline=False, shading=False)
    for (x, y0, y1) in ((SX0 + 2, STOP + 3, STOP + 7), (SX0 + 5, STOP + 5, STOP + 10), (SX0 + 1, STOP + 9, STOP + 11)):
        for y in range(y0, y1):
            r.px(x, y, SHADE)
    # Moos auf Stumpfkante
    m = sp.layer("moss", outline=False, shading=False)
    for x in range(SX0 + 3, SX0 + 6):
        m.px(x, STOP - 1 if x < SX0 + 4 else STOP, LIGHT)


def vine(sp, pts, bend=0.0):
    for (a, b) in zip(pts, pts[1:]):
        stalk(sp, a[0], a[1], b[0], b[1], bend=bend, ramp="wa_ivy", tone=BASE)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(11 if stage >= 4 else 8))
    if stage == 1:
        vine(sp, [(15, 28), (13, 26)])
        ivy_leaf(sp, 13, 26, -140, 4)
        ivy_leaf(sp, 16, 28, -50, 3.5)
    elif stage == 2:
        vine(sp, [(12, 28), (16, 27), (21, 28)], bend=-1)
        ivy_leaf(sp, 12, 28, -150, 5)
        ivy_leaf(sp, 16, 27, -85, 5)
        ivy_leaf(sp, 21, 28, -30, 4.5)
    elif stage == 3:
        stump(sp)
        vine(sp, [(6, 28), (11, 27), (16, 28), (20, 25)], bend=-1)
        ivy_leaf(sp, 6, 28, -165, 6)
        ivy_leaf(sp, 11, 27, -95, 6.5)
        ivy_leaf(sp, 16, 28, -20, 5.5)
        ivy_leaf(sp, 20, 25, -130, 6)
    elif stage == 4:
        stump(sp)
        vine(sp, [(4, 28), (9, 27), (14, 28), (18, 26), (23, 22), (19, 19)], bend=-1)
        ivy_leaf(sp, 4, 28, -165, 6)
        ivy_leaf(sp, 9, 27, -100, 7)
        ivy_leaf(sp, 14, 28, -35, 6)
        ivy_leaf(sp, 23, 22, -25, 7)
        ivy_leaf(sp, 19, 19, -145, 6.5)
        ivy_leaf(sp, 22, 15, -70, 5.5)
    else:
        stump(sp)
        vine(sp, [(2, 28), (6, 27), (11, 28), (16, 27), (19, 25), (24, 21), (18, 18), (23, 15)], bend=-1)
        vine(sp, [(24, 17), (27, 21), (26, 25)], bend=1)
        ivy_leaf(sp, 23, 15, -85, 6)
        ivy_leaf(sp, 2, 28, -170, 6)
        ivy_leaf(sp, 6, 27, -105, 7.5)
        ivy_leaf(sp, 11, 28, -40, 6.5)
        ivy_leaf(sp, 19, 25, -160, 6.5)
        ivy_leaf(sp, 24, 21, -20, 7.5)
        ivy_leaf(sp, 18, 18, -135, 7)
        ivy_leaf(sp, 27, 21, 70, 5.5)
    return sp
