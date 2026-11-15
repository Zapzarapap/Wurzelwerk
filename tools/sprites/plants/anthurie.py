"""Anthurie (Flamingoblume, Anthurium andraeanum) – Pflanzenhandlung.

Dunkelgrüne, glänzende, länglich-herzförmige Blätter auf langen Stielen.
Darüber auf eigenen, dünnen Stielen die wachsartig glänzenden, herzförmigen
Hochblätter (Spatha, in petal_red → VARIANTS) mit dem aufrecht stehenden,
cremegelben Kolben (Spadix). Stufe 3 erste Blüte, Stufe 5 drei Blüten.
"""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem

VARIANTS = {
    "rot": None,
    "rosa": {"petal_red": "petal_pink"},
    "weiss": {"petal_red": "petal_white"},
}

# Blätter: (Stielfuß x, Ansatz x, y, Winkel, Länge, halbe Breite, Biegung, Stielbiegung)
# Blüten: (Stielfuß x, Ansatz x, y, Winkel der Spatha-Spitze, Länge, halbe Breite, Kolbenrichtung, Stielbiegung)
STAGES = {
    1: dict(leaves=[(15.5, 14.5, 19.5, -105, 5.0, 2.4, 0, 0)],
            flowers=[]),
    2: dict(leaves=[(15, 12.5, 17.5, -128, 6.5, 2.9, -6, 0.5),
                    (16.5, 19, 18.5, -55, 5.5, 2.5, 6, -0.5)],
            flowers=[]),
    3: dict(leaves=[(14.5, 11.5, 16, -135, 8.0, 3.4, -8, 1),
                    (17, 20.5, 17, -45, 7.5, 3.2, 10, -1),
                    (15.5, 14.5, 19.5, -100, 5.0, 2.3, 0, 0)],
            flowers=[(16, 18, 10.5, 70, 5.0, 2.9, -75, 0.5)]),
    4: dict(leaves=[(14.5, 10.5, 14, -140, 9.0, 3.7, -10, 1),
                    (17, 21.5, 15.5, -40, 8.5, 3.6, 12, -1),
                    (15.5, 14.5, 13, -95, 7.0, 3.0, -4, 0.5),
                    (16, 18.5, 20, -20, 5.5, 2.4, 14, 0)],
            flowers=[(15, 11, 7.5, 105, 5.5, 3.2, -105, 1),
                     (16.5, 20.5, 9, 70, 5.5, 3.2, -70, -0.5)]),
    5: dict(leaves=[(14.5, 10, 13, -145, 10.0, 4.0, -12, 1),
                    (17, 22, 14, -38, 9.5, 3.9, 14, -1),
                    (15.5, 15, 11.5, -98, 8.0, 3.4, -6, 0.5),
                    (14, 9.5, 19.5, -172, 7.0, 3.0, -20, 0.5),
                    (17.5, 22.5, 20, -8, 6.5, 2.8, 20, -0.5)],
            flowers=[(14.5, 9.5, 5.5, 110, 6.0, 3.4, -110, 1),
                     (16.5, 22, 5, 68, 6.0, 3.4, -68, -1),
                     (15.5, 16, 14, 88, 5.0, 2.9, -92, 0)]),
}


def blade(sp, bx, by, ang, L, W, bend):
    """Länglich-herzförmiges Blatt, glänzend: vertiefte (dunkle) Mittelrippe + Glanzstreifen."""
    sgn = -1 if math.cos(math.radians(ang)) >= 0 else 1

    def gloss(c):
        if c.edge or L < 6:
            return None
        if 0.3 < c.t < 0.55 and 0.35 < c.vn < 0.6 and c.v * sgn > 0:
            return HIGHLIGHT
        return None

    leaf(sp, "ph_anth_leaf", bx, by, ang, L, W, "heart", bend=bend, midrib=SHADE,
         overlays=[("ph_anth_leaf", gloss)])


def flower(sp, bx, by, ang, L, W, sang):
    """Spatha (wachsartiges Herz, Spitze schräg nach unten/außen) + Kolben."""
    a = math.radians(ang)

    def gloss(c):
        if c.edge:
            return None
        return LIGHT if 0.12 < c.t < 0.45 and 0.25 < c.vn < 0.7 and c.v * lit > 0 else None

    lit = -1 if math.cos(a) >= 0 else 1
    leaf(sp, "petal_red", bx, by, ang, L, W, "heart", lit=BASE, dark=SHADE,
         overlays=[("petal_red", gloss)], midrib=None)
    # Kolben: aus der Herzbucht schräg nach oben, 3–4 px, eigene Ebene mit Outline
    k = sp.layer("ph_anth_spadix")
    s = math.radians(sang)
    n = 4 if L >= 5 else 3
    for i in range(n):
        k.px(math.floor(bx + math.cos(s) * (i + 0.5)), math.floor(by + math.sin(s) * (i + 0.5)))
    tip = sp.layer("ph_anth_spadix", outline=False, shading=False)
    tip.px(math.floor(bx + math.cos(s) * (n - 0.5)), math.floor(by + math.sin(s) * (n - 0.5)), HIGHLIGHT)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    plan = STAGES[stage]
    for (sx, bx, by, ang, L, W, bend, sb) in plan["leaves"]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb)
        blade(sp, bx, by, ang, L, W, bend)
    for (sx, bx, by, ang, L, W, sang, sb) in plan["flowers"]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb)
        flower(sp, bx, by, ang, L, W, sang)
    return sp
