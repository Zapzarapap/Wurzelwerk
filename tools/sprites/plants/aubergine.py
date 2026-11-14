"""Aubergine – Gewächshaus. Buschig, große graugrüne Blätter, nickende lila Blüten;
Stufe 5 dunkellila glänzende Früchte mit graugrünem Kelch."""
REGION = "gewaechshaus"

from pixel import Sprite
from parts import heart_leaf, stalk
from parts_gewaechshaus import greenhouse_ground, eggplant, star_bloom, SOIL_Y

LEAF = "gh_eggplant_leaf"
FRUIT = "gh_aubergine"

STEMS = {
    1: [(16, 27, 16, 23)],
    2: [(16, 27, 16, 19)],
    3: [(16, 27, 16, 13), (16, 22, 11, 17), (16, 20, 21, 15)],
    4: [(16, 27, 16, 10), (16, 21, 10, 14), (16, 19, 22, 13), (16, 14, 12, 9), (16, 13, 20, 8)],
    5: [(16, 27, 16, 10), (16, 21, 9, 14), (16, 19, 23, 12), (16, 14, 11, 8), (16, 13, 21, 7)],
}

# Blätter: (Ansatz x,y, Winkel, Länge, halbe Breite) – groß, breit-eiförmig
LEAVES = {
    1: [(16, 23, -160, 3, 2.0), (16, 23, -20, 3, 2.0)],
    2: [(16, 22, -160, 5, 2.8), (16, 20, -25, 5, 2.8), (16, 19, -95, 4, 2.4)],
    3: [(16, 25, 172, 5, 2.6), (16, 24, 8, 5, 2.6), (11, 17, -150, 6, 3.4), (21, 15, -30, 6, 3.4),
        (16, 13, -95, 5, 3.0)],
    4: [(16, 25, 172, 5, 2.8), (17, 24, 8, 5, 2.8),
        (10, 14, -162, 7, 3.6), (12, 9, -125, 7, 3.6), (16, 10, -92, 5, 3.0),
        (20, 8, -55, 7, 3.6), (22, 13, -18, 7, 3.6)],
    5: [(16, 25, 172, 6, 3.0), (17, 24, 8, 6, 3.0),
        (9, 14, -165, 8, 4.0), (11, 8, -128, 8, 3.8), (16, 10, -92, 6, 3.2),
        (21, 7, -50, 8, 3.8), (23, 12, -15, 8, 4.0)],
}

# Früchte: (Stiel-Start x,y, Oberkante x,y, Länge, Breite, Biegung)
FRUITS = {
    4: [((17, 17), 18, 17, 7, 4, 0.5)],
    5: [((16, 17), 16, 17, 7, 4, 0), ((11, 14), 10, 13, 12, 5, -1), ((21, 13), 22, 12, 12, 5, 1)],
}
BLOOMS = {3: [(12, 20), (20, 18)], 4: [(11, 17), (22, 16)], 5: [(26, 17)]}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    for (x0, y0, x1, y1) in STEMS[stage]:
        stalk(sp, x0, y0, x1, y1, ramp="stem")
    for (bx, by, ang, L, W) in LEAVES[stage]:
        heart_leaf(sp.layer(LEAF), bx, by, ang, L, W, notch=False, midrib=L >= 6)
    for (x, y) in BLOOMS.get(stage, []):
        star_bloom(sp, x, y)
    for (st, x, y, L, W, bend) in FRUITS.get(stage, []):
        stalk(sp, st[0], st[1], x, y - 1, ramp="stem")
        eggplant(sp, FRUIT, x, y, L, W, bend)
    return sp
