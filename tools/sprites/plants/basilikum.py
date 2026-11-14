"""Basilikum – Gewächshaus. Buschig, glänzende Blätter."""
REGION = "gewaechshaus"

import math

from pixel import Sprite, BASE, LIGHT, HIGHLIGHT, SHADE
from parts import heart_leaf, stalk
from parts_gewaechshaus import greenhouse_ground, SOIL_Y

LEAF = "gh_basil"

# (Stiel-Start x,y, Ansatz x,y, Winkel, Länge, halbe Breite) – von hinten nach vorne
LEAVES = {
    1: [(15, 27, 14, 23, -160, 3, 1.9), (16, 27, 18, 23, -20, 3, 1.9)],
    2: [(15, 27, 14, 22, -150, 4, 2.4), (16, 27, 19, 22, -30, 4, 2.4),
        (15, 24, 14, 19, -105, 4, 2.2), (16, 24, 17, 18, -75, 4, 2.2)],
    3: [(15, 21, 13, 15, -110, 5, 2.8), (16, 20, 18, 14, -65, 5, 2.8),
        (15, 27, 10, 22, -165, 6, 3.2), (16, 27, 21, 21, -15, 6, 3.2),
        (15, 24, 12, 18, -145, 5, 3.0), (16, 24, 19, 18, -35, 5, 3.0)],
    4: [(15, 18, 14, 10, -108, 5, 2.8), (16, 17, 18, 9, -70, 5, 2.8),
        (15, 22, 11, 15, -138, 6, 3.4), (16, 21, 20, 14, -42, 6, 3.4),
        (15, 27, 9, 22, -168, 7, 3.6), (16, 27, 22, 21, -12, 6, 3.4),
        (15, 25, 13, 19, -148, 5, 3.2), (16, 25, 18, 19, -28, 5, 3.0),
        (16, 27, 18, 24, 40, 4, 2.8)],
    5: [(15, 16, 15, 9, -112, 5, 2.8), (16, 15, 18, 7, -72, 6, 3.0),
        (15, 19, 11, 12, -140, 6, 3.4), (16, 19, 20, 11, -40, 7, 3.6),
        (15, 22, 10, 16, -165, 7, 3.8), (16, 22, 22, 16, -28, 6, 3.4),
        (15, 27, 9, 22, -170, 7, 3.8), (16, 27, 23, 21, -8, 6, 3.6),
        (15, 25, 13, 17, -125, 6, 3.4), (16, 25, 19, 18, -60, 6, 3.2),
        (15, 27, 10, 25, 155, 5, 3.2), (16, 27, 21, 24, 15, 5, 3.2),
        (15, 27, 14, 22, -150, 5, 3.0)],
}
STEMS = {  # Hauptstiele (x0,y0 -> x1,y1)
    1: [(15, 27, 16, 23)],
    2: [(15, 27, 15, 20), (16, 27, 17, 19)],
    3: [(15, 27, 14, 17), (16, 27, 17, 16)],
    4: [(15, 27, 14, 11), (16, 27, 18, 10)],
    5: [(15, 27, 15, 9), (16, 27, 17, 8)],
}


def gloss(sp, bx, by, ang, L):
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    px, py = bx + ca * L * 0.45, by + sa * L * 0.45
    # Seite zum Licht (oben links)
    nx, ny = -sa, ca
    if nx + ny > 0:
        nx, ny = -nx, -ny
    g = sp.layer(LEAF, outline=False, shading=False)
    g.px(round(px + nx * 1.2 - 0.5), round(py + ny * 1.2 - 0.5), HIGHLIGHT)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    for (x0, y0, x1, y1) in STEMS[stage]:
        stalk(sp, x0, y0, x1, y1, ramp="stem")
    for (sx, sy, bx, by, ang, L, W) in LEAVES[stage]:
        stalk(sp, sx, sy, bx, by, ramp="stem")
    for (sx, sy, bx, by, ang, L, W) in LEAVES[stage]:
        heart_leaf(sp.layer(LEAF), bx, by, ang, L, W, notch=False, midrib=L >= 6)
        if L >= 5:
            gloss(sp, bx, by, ang, L)
    if stage == 5:
        # Blütenähren: weiße Lippenblüten in Etagen, grüne Hochblätter dazwischen
        stalk(sp, 16, 9, 16, 6, ramp="stem")
        spike(sp, 16, 2, 8)
        spike(sp, 12, 6, 10, tiers=2)
    return sp


def spike(sp, x, ytop, ybot, tiers=3):
    """Basilikum-Blütenähre (x = Mitte, ytop..ybot)."""
    body = sp.layer(LEAF, shading=False)
    for y in range(ytop, ybot + 1):
        body.px(x, y, SHADE)
    whites = []
    for i in range(tiers):
        y = ytop + 1 + 2 * i
        if y + 1 > ybot:
            break
        body.px(x - 1, y)
        body.px(x + 1, y)
        body.px(x - 1, y + 1, LIGHT)
        body.px(x + 1, y + 1, BASE)
        whites += [(x - 1, y, HIGHLIGHT), (x + 1, y, LIGHT)]
    body.px(x, ytop)
    whites.append((x, ytop, HIGHLIGHT))
    w = sp.layer("petal_white", outline=False, shading=False)
    for (px, py, t) in whites:
        w.px(px, py, t)
