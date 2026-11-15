"""Rosmarin – Gewächshaus. Kleiner, verholzter Strauch: braune, knorrige Äste, darauf
aufrechte Triebe dicht mit schmalen, graugrünen Nadelblättern; ab Stufe 4 kleine
hellblaue Lippenblüten entlang der oberen Triebe."""
REGION = "gewaechshaus"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts_gewaechshaus import greenhouse_ground, needle_sprig, SOIL_Y

VARIANTS = {
    "hellblau": None,
    "weiss": {"gh_petal_lightblue": "petal_white"},
    "rosa": {"gh_petal_lightblue": "petal_pink"},
}

LEAF = "gh_rosemary"
WOOD = "gh_rosemary_wood"
BLOOM = "gh_petal_lightblue"

# Holzäste: Liste von Linien (x0,y0,x1,y1)
WOOD_LINES = {
    3: [(15, 27, 14, 22), (16, 27, 18, 23)],
    4: [(15, 27, 13, 21), (16, 27, 19, 21), (13, 22, 10, 19), (19, 22, 22, 20), (15, 26, 16, 20)],
    5: [(15, 27, 12, 20), (16, 27, 19, 20), (12, 21, 8, 18), (19, 21, 24, 18), (15, 27, 15, 21),
        (12, 23, 6, 22), (20, 23, 26, 22)],
}

# Triebe: (Ansatz x,y, Spitze x,y, Bogen, nackt-Anteil) – hinten nach vorn
SPRIGS = {
    1: [(16, 27, 16, 21, 0, 0.15)],
    2: [(15, 27, 13, 19, -0.5, 0.15), (16, 27, 19, 18, 0.5, 0.15), (16, 27, 21, 23, 0.5, 0.25)],
    3: [(14, 22, 11, 13, -0.5, 0.05), (18, 23, 20, 12, 0.5, 0.05), (16, 24, 16, 15, 0, 0.05),
        (14, 24, 8, 19, -1, 0.1), (18, 24, 24, 19, 1, 0.1)],
    4: [(13, 21, 10, 8, -0.5, 0.05), (19, 21, 22, 8, 0.5, 0.05), (16, 20, 16, 5, 0, 0.05),
        (10, 19, 5, 12, -1, 0.05), (22, 20, 27, 13, 1, 0.05), (13, 24, 7, 20, -1, 0.1),
        (19, 24, 25, 20, 1, 0.1)],
    5: [(12, 20, 9, 5, -0.5, 0.05), (20, 20, 23, 4, 0.5, 0.05), (16, 17, 16, 1, 0, 0.05),
        (8, 18, 4, 9, -1, 0.05), (24, 18, 28, 9, 1, 0.05), (6, 22, 2, 15, -0.5, 0.05),
        (26, 22, 29, 16, 0.5, 0.05), (13, 21, 12, 11, 0, 0.05), (19, 21, 20, 11, 0, 0.05)],
}

# Blüten: (Trieb-Index, Position 0..1 entlang, Seite)
FLOWERS = {
    4: [(0, 0.75, -1), (1, 0.7, 1), (2, 0.8, 1), (4, 0.6, 1)],
    5: [(0, 0.75, -1), (0, 0.45, 1), (1, 0.8, 1), (1, 0.5, -1), (2, 0.85, -1), (2, 0.6, 1),
        (3, 0.7, -1), (4, 0.7, 1), (5, 0.6, -1), (6, 0.6, 1), (7, 0.7, -1), (8, 0.75, 1)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    for (x0, y0, x1, y1) in WOOD_LINES.get(stage, []):
        w = sp.layer(WOOD, shading=False)
        w.line(x0, y0, x1, y1, BASE)
        w.line(x0 + 1, y0, x1 + 1, y1, SHADE)
    axes = []
    for (x0, y0, x1, y1, bend, bare) in SPRIGS[stage]:
        _, pts = needle_sprig(sp, LEAF, x0, y0, x1, y1, bend, bare, dense=1.0 if stage >= 3 else 0.5)
        axes.append(pts)
    for (i, t, side) in FLOWERS.get(stage, []):
        pts = axes[i]
        x, y = pts[min(len(pts) - 1, int(t * (len(pts) - 1)))]
        f = sp.layer(BLOOM)
        bx = x + side * 2
        f.px(bx, y - 1, HIGHLIGHT)
        f.px(bx + side, y - 1, BASE)
        f.px(bx, y, LIGHT if side < 0 else BASE)
    return sp
