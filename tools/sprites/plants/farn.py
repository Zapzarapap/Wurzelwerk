"""Farn – Wald. Frühe Stufen: eingerollte Spiralen; später gefiederte, bogig überhängende Wedel."""
REGION = "wald"

from pixel import Sprite
from parts import forest_ground
from parts_wald import crozier, pinnate_frond

R = "wa_fern"


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(10 if stage >= 4 else 8))
    if stage == 1:
        crozier(sp, R, 15.5, 28, 16, 22, 2.2, direction=1, bend=-1)
    elif stage == 2:
        crozier(sp, R, 14, 28, 12, 20, 2.3, direction=-1, bend=1)
        crozier(sp, R, 17, 28, 19, 22, 2.0, direction=1, bend=-1)
    elif stage == 3:
        crozier(sp, R, 13, 28, 9, 18, 2.4, direction=-1, bend=-2)
        pinnate_frond(sp, R, [(16, 28), (18, 19), (23, 14), (26, 17)], 3.0, depth=0, bare=0.2)
        crozier(sp, R, 15, 28, 15, 15, 2.2, direction=1, bend=1)
    elif stage == 4:
        pinnate_frond(sp, R, [(14, 28), (9, 20), (4, 16), (2, 21)], 3.4, depth=2, sag=0.3)
        pinnate_frond(sp, R, [(15, 28), (13, 18), (14, 9), (18, 8)], 3.4, depth=1)
        pinnate_frond(sp, R, [(16, 28), (22, 21), (27, 17), (29, 22)], 3.2, depth=0, sag=0.3)
        crozier(sp, R, 16, 28, 19, 19, 1.9, direction=1, bend=1)
    else:
        # hinten/seitlich (im Schatten): weit zur Seite gebogen, Spitze hängt
        pinnate_frond(sp, R, [(14, 28), (6, 20), (1, 14), (0, 21)], 3.6, depth=2, sag=0.3)
        pinnate_frond(sp, R, [(17, 28), (25, 21), (31, 17), (31, 24)], 3.4, depth=2, sag=0.3)
        # Mitte: steil aufrecht, Spitzen nicken
        pinnate_frond(sp, R, [(16, 28), (20, 14), (23, 4), (28, 4)], 3.6, depth=1)
        pinnate_frond(sp, R, [(15, 28), (11, 14), (9, 4), (13, 1)], 3.8, depth=1)
        # vorn: kürzerer, heller Wedel
        pinnate_frond(sp, R, [(15, 28), (15, 21), (17, 14), (21, 13)], 3.2, depth=0)
        crozier(sp, R, 15, 28, 11, 22, 1.8, direction=-1, bend=-1)
    return sp
