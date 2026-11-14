"""Tomate – Gewächshaus. Am Rankstab, ab Stufe 4 grüne, in Stufe 5 reife Früchte."""
REGION = "gewaechshaus"

from pixel import Sprite, BASE, LIGHT
from parts import stalk
from parts_gewaechshaus import (greenhouse_ground, stake, tie, winding_stem, compound_leaf,
                                fruit_ball, calyx, flower, SOIL_Y)

VARIANTS = {
    "rot": None,
    "gelb": {"gh_tomato_red": "gh_tomato_yellow"},
}

SX = 17  # Rankstab (x, x+1)
LEAF = "leaf"

# (Ansatz-x, Ansatz-y, Richtung, Länge, Anstieg, Hängen, Fiedern, Größe)
FRONDS = {
    1: [],
    2: [(17, 21, -1, 5, 1, 2, 2, 1.5), (18, 18, 1, 5, 1, 2, 2, 1.5)],
    3: [(17, 24, -1, 7, 1, 3, 3, 1.8), (18, 21, 1, 7, 1, 3, 3, 1.8),
        (17, 17, -1, 6, 0, 3, 3, 1.8), (18, 14, 1, 6, 1, 2, 2, 1.7)],
    4: [(17, 23, -1, 8, 1, 3, 3, 2.0), (18, 21, 1, 8, 1, 3, 3, 2.0),
        (17, 18, -1, 8, 1, 3, 3, 2.0), (18, 15, 1, 7, 1, 2, 3, 1.9),
        (17, 11, -1, 7, 1, 2, 2, 1.9), (18, 8, 1, 6, 1, 2, 2, 1.8)],
    5: [(17, 23, -1, 9, 1, 3, 3, 2.2), (18, 21, 1, 9, 1, 3, 3, 2.2),
        (17, 18, -1, 9, 1, 3, 3, 2.1), (18, 15, 1, 8, 1, 3, 3, 2.1),
        (17, 11, -1, 8, 1, 2, 3, 2.0), (18, 8, 1, 7, 1, 2, 3, 2.0),
        (17, 5, -1, 5, 1, 1, 2, 1.8)],
}
STAKE_TOP = {1: None, 2: 15, 3: 9, 4: 4, 5: 2}
STEM_TOP = {1: 22, 2: 16, 3: 10, 4: 5, 5: 3}

# Früchte: (Stiel-Start x,y, Frucht cx,cy, rx, ry)
FRUITS = {
    4: [((16, 19), (8.5, 21.5), 2.6, 2.4), ((16, 19), (11.5, 25), 2.2, 2.0),
        ((19, 16), (25, 19.5), 2.6, 2.4), ((19, 16), (22.5, 24.5), 2.0, 1.8)],
    5: [((16, 21), (10.5, 22), 3.0, 2.6), ((16, 21), (14, 24.5), 2.6, 2.3),
        ((19, 17), (24.5, 19), 3.0, 2.6), ((19, 17), (22, 22.5), 2.4, 2.2),
        ((16, 14), (10.5, 15), 2.6, 2.3)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    if STAKE_TOP[stage] is not None:
        stake(sp, SX, STAKE_TOP[stage])
    winding_stem(sp, SX + 0.5, STEM_TOP[stage], amp=1.0, freq=0.55)
    if stage >= 3:
        tie(sp, SX - 1, 20)
    if stage >= 4:
        tie(sp, SX - 1, 10)
    if stage == 1:
        for (cx, cy, rx) in ((14, 22, 2.4), (20, 21, 2.4)):
            l = sp.layer(LEAF)
            l.ellipse(cx, cy, rx, 1.3)
    for fr in FRONDS[stage]:
        compound_leaf(sp, LEAF, *fr)
    # Blattknospe oben
    if stage >= 2:
        top = STEM_TOP[stage]
        b = sp.layer(LEAF)
        b.ellipse(SX + 0.5, top - 1, 1.6, 2.0)
    if stage == 3:
        flower(sp, 12, 19)
    ripe = "gh_tomato_red" if stage == 5 else "gh_tomato_green"
    for (st, (fx, fy), rx, ry) in FRUITS.get(stage, []):
        stalk(sp, st[0], st[1], round(fx), round(fy - ry), bend=0)
        fruit_ball(sp, ripe, fx, fy, rx, ry)
        calyx(sp, round(fx - 1), round(fy - ry), 3)
    return sp
