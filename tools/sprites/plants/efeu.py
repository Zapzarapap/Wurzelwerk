"""Efeu – Wald. Dunkelgrüne gelappte Blätter; kriecht erst über den Boden, klettert dann
an einem abgebrochenen Baumstamm hoch und hängt in Stufe 5 oben über."""
REGION = "wald"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import forest_ground, stalk
from parts_wald import ivy_leaf, stump, GROUND


def vine(sp, pts, bend=0.0):
    for (a, b) in zip(pts, pts[1:]):
        stalk(sp, a[0], a[1], b[0], b[1], bend=bend, ramp="wa_ivy", tone=SHADE)


def leaves(sp, spec):
    for (x, y, ang, L) in spec:
        ivy_leaf(sp, x, y, ang, L)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    if stage == 1:
        forest_ground(sp)
        vine(sp, [(15, 28), (13, 27)])
        leaves(sp, [(13, 27, -135, 4.5), (16, 28, -55, 4)])
    elif stage == 2:
        forest_ground(sp, w=9)
        vine(sp, [(10, 28), (15, 27), (21, 28)], bend=-1)
        leaves(sp, [(10, 28, -160, 4.5), (21, 28, -25, 4.5), (13, 27, -110, 5), (17, 27, -70, 5.5)])
    elif stage == 3:
        forest_ground(sp, w=10)
        stump(sp, 17, 24, 21, low=True)
        vine(sp, [(5, 28), (10, 27), (15, 28), (18, 25)], bend=-1)
        leaves(sp, [(5, 28, -165, 5.5), (10, 27, -100, 6.5), (14, 28, -45, 5),
                    (18, 25, -150, 4.5), (19, 21, -70, 5), (26, 28, -15, 4.5)])
    elif stage == 4:
        forest_ground(sp, w=11)
        stump(sp, 16, 23, 10)
        vine(sp, [(3, 28), (8, 27), (13, 28), (17, 25), (22, 21), (17, 17), (20, 13)], bend=-1)
        vine(sp, [(23, 27), (27, 28)])
        leaves(sp, [(3, 28, -170, 5.5), (8, 27, -105, 7), (12, 28, -40, 5),
                    (27, 28, -10, 5.5), (16, 25, -160, 6), (23, 21, -15, 6),
                    (16, 17, -155, 5), (20, 13, -75, 4.5)])
    else:
        forest_ground(sp, w=12)
        stump(sp, 15, 22, 7)
        # Ranken: Boden, spiralig den Stamm hoch, oben über die Bruchkante, rechts und links herab
        vine(sp, [(2, 28), (7, 27), (12, 28), (16, 26), (22, 22), (15, 18), (22, 14), (16, 10), (18, 5)], bend=-1)
        vine(sp, [(19, 4), (24, 5), (26, 10), (26, 16)], bend=1)
        vine(sp, [(15, 4), (12, 7), (11, 12)], bend=-1)
        leaves(sp, [
            (2, 28, -170, 6), (7, 27, -110, 7.5), (11, 28, -45, 5.5), (27, 28, -15, 6),
            (15, 26, -160, 6.5), (23, 22, -20, 6), (14, 18, -160, 5.5), (23, 14, -20, 5.5),
            (15, 10, -150, 5), (18, 5, -80, 5.5),
            (24, 5, -30, 5), (26, 11, 15, 5.5), (26, 16, 75, 4.5),
            (12, 7, -150, 5), (11, 12, 100, 4.5),
        ])
    return sp
