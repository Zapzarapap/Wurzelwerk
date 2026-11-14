"""Chili – Gewächshaus. Buschig verzweigt, ab Stufe 4 grüne, in Stufe 5 reife Schoten."""
REGION = "gewaechshaus"

from pixel import Sprite
from parts import heart_leaf, stalk
from parts_gewaechshaus import greenhouse_ground, hanging_pod

VARIANTS = {
    "rot": None,
    "gelb": {"gh_chili_red": "gh_chili_yellow"},
    "gruen": {"gh_chili_red": "gh_chili_green"},
}

LEAF = "leaf_deep"

# Stiele (x0, y0, x1, y1)
STEMS = {
    1: [(15, 27, 16, 23)],
    2: [(15, 27, 15, 19)],
    3: [(15, 27, 15, 15), (15, 22, 11, 18), (16, 20, 20, 16)],
    4: [(15, 27, 15, 9), (15, 19, 10, 13), (16, 17, 21, 11), (15, 13, 12, 8)],
    5: [(15, 27, 15, 5), (15, 20, 9, 13), (16, 18, 22, 11), (15, 13, 11, 7), (16, 11, 20, 5)],
}

# Blätter: (Ansatz x, y, Winkel, Länge, halbe Breite)
LEAVES = {
    1: [(16, 23, -165, 3, 1.8), (16, 23, -15, 3, 1.8)],
    2: [(15, 22, -160, 4, 2.2), (15, 21, -20, 4, 2.2), (15, 19, -125, 4, 2.0), (15, 19, -60, 4, 2.0)],
    3: [(15, 25, 165, 4, 2.2), (16, 24, 15, 4, 2.2), (11, 18, -160, 5, 2.4), (20, 16, -20, 5, 2.4),
        (13, 20, -130, 4, 2.2), (18, 17, -50, 4, 2.2), (15, 15, -95, 5, 2.4)],
    4: [(15, 25, 160, 4, 2.2), (16, 24, 25, 4, 2.2), (10, 13, -160, 5, 2.6), (10, 13, -105, 5, 2.4),
        (21, 11, -25, 6, 2.6), (21, 11, -80, 5, 2.4), (12, 8, -135, 5, 2.4), (13, 9, -70, 5, 2.4),
        (15, 9, -95, 5, 2.4), (15, 14, -150, 4, 2.4)],
    5: [(15, 25, 160, 4, 2.2), (16, 24, 25, 4, 2.2), (9, 13, -155, 6, 2.8), (9, 13, -105, 5, 2.4),
        (22, 11, -25, 6, 2.8), (22, 11, -80, 5, 2.4), (19, 14, -45, 5, 2.6), (11, 7, -130, 6, 2.8),
        (11, 7, -75, 5, 2.4), (20, 5, -45, 6, 2.8), (20, 5, -115, 5, 2.4), (15, 5, -95, 5, 2.4),
        (15, 10, -150, 5, 2.6), (16, 9, -30, 5, 2.6)],
}

# Schoten: (Stiel-Start x,y, Oberkante x, y, Länge, Breite, Biegung)
PODS = {
    4: [((10, 13), 9, 15, 5, 2, -0.5), ((21, 11), 22, 13, 6, 2, 0.5), ((17, 17), 18, 19, 5, 2, 0.5)],
    5: [((9, 13), 8, 15, 9, 3, -1), ((12, 16), 12, 17, 8, 3, 1), ((22, 11), 23, 13, 9, 3, 1),
        ((19, 14), 19, 16, 8, 3, -1)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    for (x0, y0, x1, y1) in STEMS[stage]:
        stalk(sp, x0, y0, x1, y1, ramp="stem")
    for (bx, by, ang, L, W) in LEAVES[stage]:
        heart_leaf(sp.layer(LEAF), bx, by, ang, L, W, notch=False, midrib=L >= 6)
    ripe = "gh_chili_red" if stage == 5 else "gh_chili_green"
    for (st, x, y, L, W, bend) in PODS.get(stage, []):
        stalk(sp, st[0], st[1], x, y - 1, ramp="stem")
        hanging_pod(sp, ripe, x, y, L, W, bend)
    if stage == 5:
        # eine noch unreife Schote
        stalk(sp, 15, 19, 16, 19, ramp="stem")
        hanging_pod(sp, "gh_chili_green", 16, 20, 4, 2, 0.5)
    if stage == 3:
        for (x, y) in ((11, 20), (20, 18)):
            f = sp.layer("petal_white", outline=False, shading=False)
            f.px(x, y, 3)
    return sp
