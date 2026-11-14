"""Chili – Gewächshaus. Buschig verzweigt, ab Stufe 4 grüne, in Stufe 5 reife Schoten."""
REGION = "gewaechshaus"

from pixel import Sprite
from parts import heart_leaf, stalk
from parts_gewaechshaus import greenhouse_ground, chili_pod

VARIANTS = {
    "rot": None,
    "gelb": {"gh_chili_red": "gh_chili_yellow"},
    "gruen": {"gh_chili_red": "gh_chili_green"},
    "orange": {"gh_chili_red": "gh_chili_orange"},
}

LEAF = "leaf_deep"

# Stiele (x0, y0, x1, y1)
STEMS = {
    1: [(15, 27, 16, 23)],
    2: [(15, 27, 15, 19)],
    3: [(15, 27, 15, 15), (15, 22, 11, 18), (16, 20, 20, 16)],
    4: [(15, 27, 15, 11), (15, 20, 10, 13), (16, 19, 21, 12), (15, 14, 12, 9), (16, 13, 19, 8)],
    5: [(15, 27, 15, 9), (15, 19, 8, 12), (16, 18, 23, 11), (15, 13, 10, 7), (16, 12, 21, 6)],
}

# Blätter: (Ansatz x, y, Winkel, Länge, halbe Breite) – schmal-eiförmig, spitz
LEAVES = {
    1: [(16, 23, -150, 3.8, 1.2), (16, 23, -30, 3.8, 1.2)],
    2: [(15, 22, -155, 4.8, 1.7), (15, 21, -25, 4.8, 1.7), (15, 19, -125, 4.6, 1.6), (15, 19, -60, 4.6, 1.6)],
    3: [(15, 25, 165, 4, 2.2), (16, 24, 15, 4, 2.2), (11, 18, -160, 5, 2.4), (20, 16, -20, 5, 2.4),
        (13, 20, -130, 4, 2.2), (18, 17, -50, 4, 2.2), (15, 15, -95, 5, 2.4)],
    4: [(15, 24, 165, 4, 1.9), (16, 23, 18, 4, 1.9),
        (10, 13, -168, 5, 2.0), (10, 13, -122, 5, 1.9),
        (12, 9, -150, 5, 2.0), (15, 11, -100, 5, 1.9), (15, 11, -62, 4, 1.8),
        (19, 8, -40, 5, 2.0), (21, 12, -12, 5, 2.0), (21, 12, -60, 4, 1.8)],
    5: [(15, 24, 165, 4, 1.9), (16, 23, 18, 4, 1.9),
        (8, 12, -172, 6, 2.1), (8, 12, -125, 5, 2.0),
        (10, 7, -152, 6, 2.1), (10, 7, -82, 5, 1.9),
        (15, 9, -112, 5, 1.9), (16, 9, -62, 5, 1.9),
        (21, 6, -28, 6, 2.1), (21, 6, -108, 4, 1.8),
        (23, 11, -8, 6, 2.1), (23, 11, -55, 5, 2.0)],
}

# Schoten: (Stiel-Start x,y, Oberkante x, y, Länge, Biegung, Breite)
PODS = {
    4: [((11, 14), 10, 15, 7, -0.5, 3), ((20, 13), 21, 14, 7, 0.5, 3), ((16, 18), 16, 19, 5, 0.5, 2)],
    5: [((8, 12), 7, 13, 9, -1, 3), ((12, 16), 12, 17, 8, 0, 3), ((20, 13), 20, 14, 8, 0.5, 3),
        ((23, 11), 25, 12, 9, 1, 3)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    for (x0, y0, x1, y1) in STEMS[stage]:
        stalk(sp, x0, y0, x1, y1, ramp="stem")
    for (bx, by, ang, L, W) in LEAVES[stage]:
        heart_leaf(sp.layer(LEAF), bx, by, ang, L, W, notch=False, midrib=L >= 6)
    ripe = "gh_chili_red" if stage == 5 else "gh_chili_unripe"
    for (st, x, y, L, bend, W) in PODS.get(stage, []):
        stalk(sp, st[0], st[1], x, y - 1, ramp="stem")
        chili_pod(sp, ripe, x, y, L, bend, W)
    if stage == 5:
        # eine noch unreife Schote
        chili_pod(sp, "gh_chili_unripe", 15, 20, 4, -0.5, 2)
    flowers = {3: ((11, 20), (20, 18)), 4: ((13, 17),), 5: ()}
    if stage >= 3:
        for (x, y) in flowers[stage]:
            f = sp.layer("petal_white", outline=False, shading=False)
            f.px(x, y, 3)
    return sp
