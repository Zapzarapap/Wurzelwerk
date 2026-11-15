"""Salat (Kopfsalat) – Gewächshaus. Flache Rosette aus rundlichen, hellgrünen Blättern mit
gekräuseltem Rand; ab Stufe 4 schließt sich das hellere Herz, Stufe 5 voller Kopf."""
REGION = "gewaechshaus"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts_gewaechshaus import greenhouse_ground, ruffled_leaf, SOIL_Y

VARIANTS = {
    "gruen": None,
    "rot": {"gh_lettuce": "gh_lettuce_red"},   # roter Kopfsalat: Außenblätter rötlich
}

OUTER = "gh_lettuce"
HEART = "gh_lettuce_heart"

# Außenblätter: (Mitte x,y, rx, ry, Richtung) – hinten nach vorn
LEAVES = {
    1: [(13.5, 24.5, 2.2, 1.4, -160), (18.5, 24.0, 2.4, 1.5, -20)],
    2: [(15.5, 21.5, 2.4, 1.8, -95), (11.5, 23.5, 3.0, 2.0, -160), (20.0, 23.0, 3.2, 2.1, -25),
        (16.5, 24.5, 2.4, 1.6, -60)],
    3: [(13.0, 19.5, 3.2, 2.6, -115), (19.0, 19.0, 3.4, 2.7, -60), (8.5, 23.0, 3.8, 2.4, -165),
        (23.0, 22.5, 4.0, 2.5, -15), (16.0, 22.5, 3.0, 2.4, -85), (11.5, 24.5, 3.0, 2.0, 160),
        (20.5, 24.5, 3.2, 2.0, 20)],
    4: [(12.0, 17.5, 4.0, 3.2, -120), (20.0, 17.0, 4.2, 3.3, -55), (6.5, 22.0, 4.2, 2.8, -170),
        (25.0, 21.5, 4.4, 2.9, -10), (9.5, 25.0, 3.8, 2.2, 165), (22.5, 25.0, 4.0, 2.3, 15)],
    5: [(9.5, 16.5, 4.8, 3.8, -130), (22.5, 16.0, 5.0, 3.9, -50), (5.0, 22.0, 4.4, 3.0, -172),
        (26.5, 21.5, 4.4, 3.0, -8), (8.0, 25.5, 4.4, 2.4, 168), (23.5, 25.5, 4.6, 2.4, 12)],
}

# Herz (geschlossener Kopf): (Mitte x,y, rx, ry)
HEADS = {
    4: (16.0, 20.5, 5.2, 4.6),
    5: (16.0, 17.6, 7.8, 7.6),
}


def head(sp, cx, cy, rx, ry):
    """Runder Salatkopf: helles Herz, von zwei großen, gewölbten Hüllblättern umgriffen."""
    ball = sp.layer(HEART)
    ball.ellipse(cx, cy, rx, ry)
    inside = set(ball.pixels)
    # kleine Herzblättchen ganz oben (gelblich, Glanz)
    top = sp.layer(HEART, outline=False, shading=False)
    for (dx, dy, t) in ((-1, 0, HIGHLIGHT), (0, 0, HIGHLIGHT), (1, 1, LIGHT), (-2, 1, LIGHT)):
        top.px(math.floor(cx) + dx, math.floor(cy - ry) + 1 + dy, t)
    # Hüllblätter: Ellipsen, auf den Kopf beschnitten -> Outline zeichnet die Blattkanten
    for (ox, oy, sx, sy) in ((-0.45, 0.3, 0.7, 0.85), (0.5, 0.4, 0.62, 0.78)):
        w = sp.layer(HEART)
        w.ellipse(cx + ox * rx, cy + oy * ry, rx * sx, ry * sy)
        for p in list(w.pixels):
            if p not in inside:
                w.erase(*p)
    return ball


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    leaves = LEAVES[stage]
    hd = HEADS.get(stage)
    # hintere Außenblätter (oben) vor dem Kopf, vordere (unten, flach) danach
    back = [l for l in leaves if l[4] < 0]
    front = [l for l in leaves if l[4] >= 0]
    for (cx, cy, rx, ry, ang) in back:
        ruffled_leaf(sp.layer(OUTER), cx, cy, rx, ry, ang, vein=rx >= 3)
    if hd:
        head(sp, *hd)
    for (cx, cy, rx, ry, ang) in front:
        ruffled_leaf(sp.layer(OUTER), cx, cy, rx, ry, ang, vein=rx >= 3)
    if stage == 1:
        b = sp.layer(HEART)
        b.ellipse(16, 23.5, 1.0, 1.3)
    return sp
