"""Germini (Mini-Gerbera) – Blumenwiese. Wenige große Einzelblüten in kräftigen Farben,
große dunkle Mitte, lange blattlose Stiele über einer niedrigen Blattrosette."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import ray_flower, eye

VARIANTS = {
    "rot": None,
    "orange": {"bw_gerbera": "petal_orange"},
    "gelb": {"bw_gerbera": "petal_yellow"},
    "rosa": {"bw_gerbera": "bw_magenta"},
    "weiss": {"bw_gerbera": "bw_white"},
}

BY = 29

ROSETTE = {
    1: [(14, -165, 5.5, 2.3), (17, -15, 5.5, 2.3), (16, -100, 4, 1.8)],
    2: [(13, -162, 6, 2.2), (18, -22, 6, 2.2), (15, -122, 4.5, 2), (17, -68, 5, 2)],
    3: [(12, -166, 7, 2.4), (19, -14, 7, 2.4), (14, -132, 5.5, 2.2), (18, -52, 6, 2.2)],
    4: [(11, -168, 7.5, 2.6), (20, -12, 7.5, 2.6), (14, -136, 6, 2.3), (18, -48, 6.5, 2.3)],
    5: [(10, -170, 8, 2.7), (21, -10, 8, 2.7), (13, -142, 6.5, 2.4), (19, -40, 6.5, 2.4), (16, -100, 4, 2)],
}


def rosette(sp, spec, lobed=True):
    for (bx, ang, L, W) in spec:
        heart_leaf(sp.layer("leaf"), bx, BY, ang, L, W, notch=False, midrib=lobed,
                   splits=(0.55,) if (lobed and L >= 5.5) else (), vein=SHADE)


def bud(sp, x, y, s=1.0, opening=False):
    """Knospe: grüner Hüllkelch, oben schauen die Blütenblätter heraus."""
    if opening:
        ray_flower(sp, "bw_gerbera", x + 0.5, y - 0.6, 3.4 * s, 1.0, 7, ysc=0.55, notch=0.25)
    c = sp.layer("leaf")
    c.ellipse(x, y + 0.6, 1.8 * s, 1.5 * s)
    if not opening:
        t = sp.layer("bw_gerbera")
        t.ellipse(x, y - 1.0 * s, 1.2 * s, 1.0 * s)
    hl = sp.layer("leaf", outline=False, shading=False)
    hl.px(int(math.floor(x - 0.8 * s)), int(math.floor(y + 0.3)), HIGHLIGHT)


def gerbera(sp, x, y, R):
    ray_flower(sp, "bw_gerbera", x, y, R, R * 0.4, 12 if R >= 6 else 10, ysc=0.88, rot=0.1, notch=0.2, groove=0.14)
    eye(sp, x, y, R * 0.4, ysc=0.88, ring="petal_yellow")


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 2:
        stalk(sp, 16, BY, 17, 22, bend=0.5)
    elif stage == 3:
        stalk(sp, 15, BY, 14, 13, bend=-1)
    elif stage == 4:
        stalk(sp, 14, BY, 13, 13, bend=-0.4)
        stalk(sp, 17, BY, 22, 20, bend=1.2)
    elif stage == 5:
        stalk(sp, 15, BY, 10, 13, bend=-1.5)
        stalk(sp, 17, BY, 23, 17, bend=1.2)
        stalk(sp, 16, BY, 17, 21, bend=0.3)
    rosette(sp, ROSETTE[stage], lobed=stage >= 1)
    if stage == 2:
        bud(sp, 17, 21, 0.8)
    elif stage == 3:
        bud(sp, 14, 12, 1.0, opening=True)
    elif stage == 4:
        bud(sp, 22, 19, 0.9)
        gerbera(sp, 13.5, 9.5, 6.6)
    elif stage == 5:
        bud(sp, 17, 20, 0.85)
        gerbera(sp, 23.5, 13.5, 5.6)
        gerbera(sp, 10.5, 8.5, 7.0)
    return sp
