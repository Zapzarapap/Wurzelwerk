"""Erdbeere – Gewächshaus. Niedrige Rosette aus dreiteiligen, gezähnten Blättern auf
langen Stielen, weiße Blüten; Stufe 5 rote Erdbeeren mit Nüsschen, die über den Rand hängen."""
REGION = "gewaechshaus"

from pixel import Sprite, BASE, LIGHT, SHADE
from parts import stalk
from parts_gewaechshaus import (greenhouse_ground, trifoliate, strawberry, small_bloom,
                                BERRY_BIG, BERRY_MID, BERRY_SMALL, SOIL_Y)

VARIANTS = {
    "weiss": None,                              # Blütenfarbe; die Früchte bleiben rot
    "rosa": {"petal_white": "petal_pink"},
}

LEAF = "leaf"
CX = 16  # Herz der Rosette

# Blätter: (Stielende x,y, Richtung, Größe, Biegung des Stiels) – hinten nach vorn
LEAVES = {
    1: [(16, 22, -95, 1.8, 0)],
    2: [(12, 19, -125, 2.3, -1), (20, 18, -60, 2.4, 1), (16, 22, -90, 1.7, 0)],
    3: [(10, 16, -130, 2.8, -1), (21, 15, -60, 2.9, 1), (15, 13, -95, 2.7, 0),
        (6, 22, -165, 2.3, -1)],
    4: [(9, 14, -130, 3.1, -1), (22, 13, -55, 3.2, 1), (15, 10, -95, 3.0, 0),
        (5, 21, -165, 2.6, -1), (26, 20, -15, 2.6, 1), (17, 16, -80, 2.5, 0)],
    5: [(8, 12, -130, 3.4, -1), (23, 11, -52, 3.5, 1), (15.5, 8, -95, 3.3, 0),
        (4.5, 19, -165, 2.9, -1), (27, 18, -15, 2.9, 1), (19, 15, -75, 2.8, 1),
        (11, 17, -115, 2.6, 0)],
}

# Blüten: (Stielansatz x,y, Blüte x,y)
BLOOMS = {
    3: [((15, 25), (11, 22)), ((17, 25), (21, 21))],
    4: [((17, 25), (20, 20)), ((15, 25), (12, 21))],
    5: [((17, 25), (19, 19))],
}

# Früchte: (Stielansatz x,y, Ecke x,y, Schablone, reif?)
BERRIES = {
    4: [((14, 25), (7, 22), BERRY_MID, False), ((18, 25), (23, 22), BERRY_MID, False)],
    5: [((13, 24), (6, 22), BERRY_BIG, True), ((19, 24), (23, 21), BERRY_BIG, True),
        ((16, 25), (13, 23), BERRY_MID, True), ((18, 25), (19, 25), BERRY_SMALL, False)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    for (x, y, ang, size, bend) in LEAVES[stage]:
        stalk(sp, CX, SOIL_Y - 1, x, y, bend=bend, ramp="stem")
    for (x, y, ang, size, bend) in LEAVES[stage]:
        trifoliate(sp, LEAF, x, y, ang, size)
    for (st, (bx, by)) in BLOOMS.get(stage, []):
        stalk(sp, st[0], st[1], bx, by + 1, bend=0.5, ramp="stem")
        small_bloom(sp, bx, by)
    for (st, (x, y), tpl, ripe) in BERRIES.get(stage, []):
        w = len(tpl[0])
        stalk(sp, st[0], st[1], x + w // 2, y - 1, bend=-1 if x < st[0] else 1, ramp="stem")
        strawberry(sp, "gh_strawberry" if ripe else "gh_strawberry_raw", x, y, tpl, seeds=ripe)
    return sp
