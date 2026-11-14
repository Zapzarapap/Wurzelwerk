"""Paprika – Gewächshaus. Kräftiger Busch mit breiten, glänzenden Blättern;
Stufe 4 grüne, Stufe 5 große reife Paprika in Blockform."""
REGION = "gewaechshaus"

from pixel import Sprite
from parts import heart_leaf, stalk
from parts_gewaechshaus import (greenhouse_ground, bell_pepper, small_bloom,
                                PEPPER_BIG, PEPPER_MID, PEPPER_SMALL, SOIL_Y)

VARIANTS = {
    "rot": None,
    "gelb": {"gh_paprika_red": "gh_paprika_yellow"},
    "orange": {"gh_paprika_red": "gh_paprika_orange"},
    "gruen": {"gh_paprika_red": "gh_paprika_green"},
}

LEAF = "leaf_deep"
UNRIPE = "gh_paprika_green"

STEMS = {
    1: [(16, 27, 16, 23)],
    2: [(16, 27, 16, 19)],
    3: [(16, 27, 16, 14), (16, 22, 11, 17), (16, 20, 21, 15)],
    4: [(16, 27, 16, 10), (16, 21, 10, 14), (16, 19, 23, 13), (16, 14, 12, 8), (16, 13, 20, 7)],
    5: [(16, 27, 16, 10), (16, 21, 8, 13), (16, 19, 25, 12), (16, 14, 11, 8), (16, 13, 21, 7)],
}

# Blätter: (Ansatz x,y, Winkel, Länge, halbe Breite) – breit-eiförmig
LEAVES = {
    1: [(16, 23, -160, 3, 2.0), (16, 23, -20, 3, 2.0)],
    2: [(16, 22, -165, 4, 2.4), (16, 21, -15, 4, 2.4), (16, 19, -115, 4, 2.4), (16, 19, -65, 4, 2.2)],
    3: [(16, 25, 170, 4, 2.2), (16, 24, 10, 4, 2.2), (11, 17, -155, 5, 2.8), (21, 15, -25, 5, 2.8),
        (16, 14, -100, 5, 2.8), (13, 19, -120, 4, 2.4)],
    4: [(16, 25, 170, 4, 2.4), (17, 24, 10, 4, 2.4),
        (10, 14, -160, 6, 3.0), (12, 8, -125, 6, 3.0), (16, 10, -92, 5, 2.8),
        (20, 7, -55, 6, 3.0), (23, 13, -20, 6, 3.0)],
    5: [(16, 25, 170, 5, 2.6), (17, 24, 10, 5, 2.6),
        (8, 13, -165, 7, 3.2), (11, 8, -135, 7, 3.2), (16, 10, -95, 6, 3.0),
        (21, 7, -45, 7, 3.2), (25, 12, -15, 6, 3.0), (13, 15, -130, 5, 2.6)],
}

# Früchte: (Stiel-Start x,y, Körper-Ecke x,y, Schablone, Stiel-Neigung)
FRUITS = {
    4: [((11, 15), (9, 16), PEPPER_SMALL, 1), ((21, 14), (20, 15), PEPPER_MID, -1)],
    5: [((10, 14), (6, 16), PEPPER_BIG, 1), ((22, 13), (19, 15), PEPPER_BIG, -1),
        ((15, 20), (12, 21), PEPPER_MID, 1)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    for (x0, y0, x1, y1) in STEMS[stage]:
        stalk(sp, x0, y0, x1, y1, ramp="stem")
    for (bx, by, ang, L, W) in LEAVES[stage]:
        heart_leaf(sp.layer(LEAF), bx, by, ang, L, W, notch=False, midrib=L >= 6)
    ripe = "gh_paprika_red" if stage == 5 else UNRIPE
    for (st, (x, y), tpl, lean) in FRUITS.get(stage, []):
        W = len(tpl[0])
        stalk(sp, st[0], st[1], x + (W - 1) // 2 + lean, y - 2, ramp="stem")
        bell_pepper(sp, ripe, x, y, tpl, lean=lean)
    if stage == 3:
        small_bloom(sp, 13, 21)
        small_bloom(sp, 20, 19)
    if stage == 4:
        small_bloom(sp, 15, 19)
    return sp
