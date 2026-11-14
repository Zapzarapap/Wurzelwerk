"""Gurke – Gewächshaus. Rankt an einem Gitter aus zwei Stäben und Querlatten."""
REGION = "gewaechshaus"

from pixel import Sprite, BASE, LIGHT, SHADE, HIGHLIGHT
from parts import heart_leaf, stalk
from parts_gewaechshaus import (greenhouse_ground, stake, bar, winding_stem, flower,
                                tendril, SOIL_Y)

LEAF = "leaf"
LX, RX = 6, 24  # Gitterstäbe (linke Spalte)

# Gitterhöhe je Stufe (oberste Stabspitze) und Querlatten
TRELLIS = {2: (17, []), 3: (11, [18]), 4: (5, [9, 16, 23]), 5: (2, [7, 13, 19, 25])}
STEM_TOP = {1: 22, 2: 18, 3: 12, 4: 8, 5: 4}

# Hauptranke als weiche Kurve (Kontrollpunkte), statt Zickzack
VINE = {
    2: [(16, 27), (17, 23), (15, 20), (16, 17)],
    3: [(16, 27), (18, 21), (14, 16), (16, 11)],
    4: [(16, 27), (18, 19), (14, 13), (16, 7)],
    5: [(16, 27), (18, 18), (14, 11), (16, 3)],
}

# Blätter: (Stiel-Start x,y, Ansatz x,y, Winkel, Länge, halbe Breite) – hinten nach vorn
LEAVES = {
    2: [(16, 21, 13, 20, -165, 5, 3.4), (16, 18, 19, 16, -25, 5, 3.2),
        (17, 24, 20, 23, -5, 4, 2.8)],
    3: [(16, 13, 15, 11, -105, 5, 3.4), (17, 18, 21, 16, -22, 6, 4.0),
        (16, 21, 12, 20, -168, 6, 4.0), (17, 24, 21, 24, 5, 4, 3.0),
        (15, 16, 11, 14, -140, 4, 3.0)],
    4: [(16, 22, 12, 22, 175, 5, 3.6), (16, 17, 12, 16, -165, 7, 4.6),
        (17, 14, 21, 13, -25, 7, 4.6), (16, 11, 14, 9, -115, 6, 4.0)],
    5: [(16, 23, 12, 23, 175, 5, 3.4), (16, 14, 12, 13, -165, 8, 5.4),
        (17, 11, 21, 10, -25, 8, 5.4), (16, 8, 14, 6, -110, 6, 4.4),
        (17, 16, 21, 15, -15, 7, 4.6)],
}

CUKES = {
    4: [((16, 17), (9.5, 21.5), 1.8, 3.4)],
    5: [((16, 18), (9.5, 22), 2.0, 4.4), ((17, 17), (21, 23), 2.1, 4.2),
        ((16, 21), (14.5, 25), 1.5, 2.4)],
}
FLOWERS = {2: [], 3: [(9, 19)], 4: [(22, 19), (8, 17)], 5: [(24, 12), (7, 18)]}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    if stage == 1:
        for (cx, cy) in ((14, 22), (20, 21)):
            l = sp.layer(LEAF)
            l.ellipse(cx, cy, 2.4, 1.3)
        winding_stem(sp, 16.5, 22, amp=0.0)
        return sp

    top, bars = TRELLIS[stage]
    stake(sp, LX, top)
    stake(sp, RX, top)
    for y in bars:
        bar(sp, LX + 2, RX - 1, y)
    v = sp.layer("stem", outline=False, shading=False)
    v.curve(VINE[stage], tone=BASE)
    for (sx, sy, bx, by, ang, L, W) in LEAVES[stage]:
        stalk(sp, sx, sy, bx, by, ramp="stem")
    for (sx, sy, bx, by, ang, L, W) in LEAVES[stage]:
        heart_leaf(sp.layer(LEAF), bx, by, ang, L, W, notch=True)
    for (st, (cx, cy), rx, ry) in CUKES.get(stage, []):
        stalk(sp, st[0], st[1], round(cx), round(cy - ry), ramp="stem")
        f = sp.layer("gh_cuke")
        f.ellipse(cx, cy, rx, ry)
        g = sp.layer("gh_cuke", outline=False, shading=False)
        gx = round(cx - rx * 0.45 - 0.5)
        g.px(gx, round(cy - ry + 1), HIGHLIGHT)
        for i in range(3, int(ry * 2) - 1, 2):
            g.px(gx, round(cy - ry + i), LIGHT)
    for (x, y) in FLOWERS.get(stage, []):
        flower(sp, x, y)
    if stage >= 3:
        tendril(sp, [(17, 13), (20, 17), (22, 16), (21, 15)] if stage < 5 else [(17, 20), (19, 24), (21, 24), (21, 22)])
    if stage == 2:
        tendril(sp, [(16, 18), (18, 15), (20, 16), (19, 17)])
    if stage >= 4:
        tendril(sp, [(15, 9), (11, 11), (9, 10), (10, 9)])
    return sp
