"""Zucchini – Gewächshaus. Kompakter Busch ohne Ranken: sehr große, spitz gelappte,
silbrig gefleckte Blätter auf dicken Stielen rund um die Mitte, große gelbe
Trichterblüte; Stufe 5 dunkelgrüne Zucchini, die vorne auf der Erde liegen."""
REGION = "gewaechshaus"

import math

from pixel import Sprite, LIGHT, HIGHLIGHT
from parts import stalk
from parts_gewaechshaus import (greenhouse_ground, lobed_leaf, trumpet_bloom, lying_squash,
                                TRUMPET_BIG, TRUMPET_SMALL, SOIL_Y)

LEAF = "leaf"
FRUIT = "gh_zucchini"
UP = -math.pi / 2
CX, CY = 16, 25  # Herz der Pflanze


def leaf(sp, x, y, R, tilt=0.0):
    lay = sp.layer(LEAF)
    shape = lobed_leaf(lay, x, y, R, lobes=5, depth=0.26, rot=UP + tilt, flat=0.88,
                       sinus=0.3, sharp=1.5)
    # silbrige Flecken entlang der Adern (typisch für Zucchiniblätter)
    if R >= 4.5:
        sil = sp.layer("leaf_sage", outline=False, shading=False)
        for k in (-1, 1):
            th = UP + tilt + k * 2 * math.pi / 5
            for d in (R * 0.35, R * 0.55):
                p = (math.floor(x + math.cos(th) * d + 0.5 * k), math.floor(y + math.sin(th) * d * 0.88))
                if p in shape:
                    sil.px(*p, HIGHLIGHT)
    return shape


def petiole(sp, x, y, bend=0.0):
    s = sp.layer("stem", outline=False, shading=False)
    s.curve([(CX, CY), ((CX + x) / 2 + bend, (CY + y) / 2 + 1), (x, y)], tone=2)
    s.curve([(CX + 1, CY), ((CX + x) / 2 + bend + 1, (CY + y) / 2 + 1), (x + 1, y)], tone=1)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    if stage == 1:
        stalk(sp, 16, 27, 16, 23, ramp="stem")
        for (cx, cy) in ((12.5, 22.8), (19.5, 22.8)):
            l = sp.layer(LEAF)
            l.ellipse(cx, cy, 3.4, 1.0)
    elif stage == 2:
        stalk(sp, 16, 27, 16, 20, ramp="stem")
        for (cx, cy) in ((11.5, 24), (20.5, 24)):
            l = sp.layer(LEAF)
            l.ellipse(cx, cy, 2.4, 1.2)
        leaf(sp, 16.5, 17, 4.2, 0.1)
    elif stage == 3:
        petiole(sp, 10, 17, -1)
        petiole(sp, 22, 16, 1)
        petiole(sp, 16, 13, 0)
        leaf(sp, 9.5, 16, 4.6, -0.5)
        leaf(sp, 22.5, 15, 4.8, 0.5)
        leaf(sp, 16, 11, 5.0, 0.0)
        trumpet_bloom(sp, 14, 20, TRUMPET_SMALL)
    elif stage == 4:
        petiole(sp, 8, 15, -1)
        petiole(sp, 24, 14, 1)
        petiole(sp, 16, 10, 0)
        petiole(sp, 5, 22, 0)
        leaf(sp, 16, 8.5, 5.8, 0.0)
        leaf(sp, 7.5, 13.5, 5.6, -0.55)
        leaf(sp, 24.5, 12.5, 5.6, 0.55)
        leaf(sp, 5, 21.5, 3.8, -1.0)
        lying_squash(sp, FRUIT, 19, 25, 24.5, h=3.0, blossom=True)
        trumpet_bloom(sp, 12, 18, TRUMPET_BIG)
    else:
        petiole(sp, 7, 14, -1)
        petiole(sp, 25, 13, 1)
        petiole(sp, 16, 10, 0)
        petiole(sp, 4, 21, 0)
        petiole(sp, 28, 20, 0)
        leaf(sp, 16, 9, 6.2, 0.05)
        leaf(sp, 6.5, 12.5, 6.0, -0.55)
        leaf(sp, 25.5, 11.5, 6.0, 0.6)
        leaf(sp, 3.5, 20.5, 3.8, -1.1)
        leaf(sp, 28, 19.5, 3.6, 1.1)
        trumpet_bloom(sp, 13, 17, TRUMPET_BIG)
        lying_squash(sp, FRUIT, 19, 28, 23.5, h=3.8, stem_left=True)
        lying_squash(sp, FRUIT, 4, 12, 24.5, h=3.4, stem_left=False)
    return sp
