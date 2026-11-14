"""Mais – Gewächshaus. Hoher, kräftiger Halm mit langen, bandförmigen, überhängenden
Blättern; Stufe 4 Fahne, Stufe 5 Fahne + Kolben mit Seide."""
REGION = "gewaechshaus"

from pixel import Sprite
from parts_gewaechshaus import (greenhouse_ground, ribbon_leaf, corn_stalk, corn_tassel,
                                corn_ear, SOIL_Y)

LEAF = "gh_corn_leaf"
SX = 15  # Halm (x, x+1)

STALK_TOP = {1: None, 2: 21, 3: 13, 4: 7, 5: 6}
NODES = {2: (24,), 3: (23, 18), 4: (23, 18, 13), 5: (23, 18, 13, 9)}

# Blätter als Bezier-Kontrollpunkte (vom Halm nach außen), hinten nach vorn
LEAVES = {
    1: [[(15, 27), (14, 24), (12, 21)], [(16, 27), (17, 24), (19, 22)]],
    2: [[(15, 25), (11, 20), (8, 19), (6, 21)], [(16, 24), (20, 19), (23, 19), (25, 21)],
        [(15, 21), (14, 17), (13, 15)], [(16, 27), (19, 24), (21, 23)]],
    3: [[(15, 24), (9, 19), (6, 18), (4, 21)], [(16, 22), (22, 17), (25, 17), (27, 20)],
        [(15, 18), (11, 13), (9, 11), (7, 12)], [(16, 15), (19, 11), (21, 9), (22, 10)],
        [(15, 13), (15, 10), (14, 8)], [(16, 27), (19, 25), (22, 24)]],
    4: [[(15, 24), (8, 20), (5, 20), (3, 23)], [(16, 22), (23, 18), (26, 18), (28, 21)],
        [(15, 18), (10, 13), (7, 12), (5, 14)], [(16, 15), (21, 11), (24, 10), (26, 12)],
        [(15, 12), (12, 8), (10, 7), (9, 8)], [(16, 10), (19, 7), (21, 6), (22, 7)],
        [(16, 27), (20, 25), (23, 25)]],
    5: [[(15, 24), (8, 20), (5, 20), (2, 23)], [(16, 23), (23, 19), (26, 19), (29, 22)],
        [(15, 19), (9, 14), (6, 13), (4, 15)], [(16, 16), (22, 12), (25, 11), (27, 13)],
        [(15, 13), (11, 9), (9, 8), (7, 9)], [(16, 10), (20, 8), (22, 7), (24, 8)],
        [(16, 27), (20, 25), (24, 25)], [(15, 27), (12, 25), (9, 26)]],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    top = STALK_TOP[stage]
    if top is not None:
        corn_stalk(sp, SX, top, nodes=NODES.get(stage, ()))
    if stage == 4:
        corn_tassel(sp, SX + 1, 2, branches=((-3, 3), (3, 3), (-2, 4)), spike=5)
    if stage == 5:
        corn_tassel(sp, SX + 1, 1, branches=((-4, 3), (4, 3), (-3, 5), (3, 5)), spike=6)
    for pts in LEAVES[stage]:
        ribbon_leaf(sp, LEAF, pts, wide=0.5 if stage > 1 else 0.7)
    if stage == 5:
        corn_ear(sp, SX + 2, 22, H=10, lean=1)
        corn_ear(sp, SX - 1, 18, H=9, lean=-1)
    return sp
