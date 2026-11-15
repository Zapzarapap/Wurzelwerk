"""Karotte – Gewächshaus. Büschel aus fein gefiederten Blattwedeln; ab Stufe 4 schaut der
orange Rübenansatz aus der Erde, Stufe 5 zusätzlich eine halb herausgezogene Karotte."""
REGION = "gewaechshaus"

import math

from pixel import Sprite, OUTLINE, SHADE, BASE, LIGHT, HIGHLIGHT
from parts_gewaechshaus import greenhouse_ground, feather_frond, root_shoulder, SOIL_Y

VARIANTS = {
    "orange": None,
    "gelb": {"gh_carrot": "gh_carrot_yellow"},
    "lila": {"gh_carrot": "gh_carrot_purple"},
}

LEAF = "gh_carrot_leaf"

# Wedel: (Ansatz x, Spitze x,y, Bogen, Fiederlänge) – hinten nach vorn
FRONDS = {
    1: [(15, 12, 22, -1, 1.3), (16, 19, 21, 1, 1.3)],
    2: [(15, 9, 18, -1.5, 1.8), (16, 16, 14, 0.5, 1.8), (16, 22, 19, 1.5, 1.8)],
    3: [(15, 7, 14, -2, 2.2), (16, 14, 9, -0.5, 2.2), (16, 22, 11, 1.5, 2.2),
        (15, 6, 21, -1, 1.8), (16, 25, 19, 1, 1.8)],
    4: [(15, 5, 11, -2, 2.4), (16, 12, 5, -1, 2.6), (16, 20, 4, 1, 2.6),
        (16, 26, 11, 2, 2.4), (15, 4, 20, -1, 2.0), (16, 27, 19, 1, 2.0)],
    5: [(15, 3, 9, -2, 2.6), (15, 10, 2, -1, 2.8), (16, 19, 1, 0.5, 2.8),
        (16, 27, 6, 2, 2.6), (15, 4, 17, -1, 2.2), (15, 15, 9, -0.5, 2.2)],
}

# Rübenköpfe in der Erde: (x, Breite, sichtbare Höhe)
SHOULDERS = {
    4: [(14, 4, 2)],
    5: [(12, 4, 2), (16, 3, 1)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    for (x0, tx, ty, bend, pl) in FRONDS[stage]:
        feather_frond(sp, LEAF, x0, SOIL_Y - 1, tx, ty, bend=bend, pinna=pl)
    for (x, w, h) in SHOULDERS.get(stage, []):
        root_shoulder(sp, "gh_carrot", x, SOIL_Y, w, h)
    if stage == 5:
        pulled_carrot(sp, 23, 19)
    return sp


def pulled_carrot(sp, x, y):
    """Halb herausgezogene Karotte, schräg aus der Erde ragend: dicker Kopf mit
    Krautbüschel oben bei (x,y), die Rübe wird nach unten schmaler und steckt mit der
    Spitze noch in der Erde (bei SOIL_Y)."""
    feather_frond(sp, LEAF, x + 1, y - 1, x + 5, y - 9, bend=1, pinna=1.8, start=0.35)
    feather_frond(sp, LEAF, x, y - 1, x - 2, y - 8, bend=-0.5, pinna=1.6, start=0.35)
    body = sp.layer("gh_carrot", shading=False)
    H = SOIL_Y - y + 1
    for j in range(H):
        t = j / max(H - 1, 1)
        cx = x + 1.5 - 3.0 * t          # neigt sich nach rechts oben
        w = 4 if t < 0.35 else (3 if t < 0.75 else 2)
        left = math.floor(cx - w / 2 + 0.5)
        for i in range(w):
            tone = LIGHT if i == 0 else (SHADE if i == w - 1 else BASE)
            body.px(left + i, y + j, tone)
        if j in (2, 5) and w >= 3:      # Querrillen
            body.px(left + w - 2, y + j, SHADE)
    body.px(math.floor(x + 1.5 - 2 + 0.5), y, HIGHLIGHT)
    return body
