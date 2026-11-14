"""Alocasia Dragon Scale – Pflanzenhandlung. Silbrige, dicke Blätter mit dunkelgrünen eingeprägten Adern, sehr kompakt."""
REGION = "pflanzenhandlung"

from pixel import Sprite, LIGHT, BASE, SHADE
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem, rib, laterals, combine

# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, jung?, Stielbiegung)
STAGES = {
    1: [(15.5, 15.5, 20, -92, 5, 3.2, 0, True, 0)],
    2: [(14.5, 12, 19.5, -150, 6.5, 4.2, -8, False, 1),
        (17, 19, 20, -50, 4.5, 3.0, 0, True, -1)],
    3: [(14.5, 14, 17, -112, 7.5, 5.0, 4, False, 1),
        (15, 9, 20, -170, 6.5, 4.4, -14, False, 1),
        (16.5, 21, 19.5, -18, 6.5, 4.4, 16, False, -1),
        (16, 16.5, 21, -75, 4.5, 3.0, 0, True, 0)],
    4: [(14.5, 13, 14, -105, 8, 5.4, 6, False, 1),
        (16.5, 20, 15.5, -55, 7, 4.8, 6, False, -1),
        (14, 8, 20, -168, 7.5, 5.0, -18, False, 1),
        (17, 23, 21, -12, 7, 4.8, 22, False, -1),
        (15.5, 15.5, 19.5, -85, 5, 3.2, 0, True, 0)],
    5: [(14.5, 12, 12, -102, 9, 6.0, 8, False, 1),
        (16.5, 21.5, 13.5, -52, 8, 5.4, 6, False, -1),
        (14, 9, 18, -165, 8.5, 5.6, -20, False, 1.5),
        (17, 24, 20, -10, 7.5, 5.2, 26, False, -1),
        (15, 11.5, 21.5, -138, 6, 4.0, -10, False, 0),
        (16, 17, 19, -80, 5.5, 3.4, 0, True, 0)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    for (sx, bx, by, ang, L, W, bend, young, sb) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb, thick=2 if L >= 7 else 1)
        us = [L * 0.2, L * 0.5]
        pat = combine(rib(SHADE, 0.5, 0.0, 0.9), laterals(us, 1.2, SHADE, 0.5, t1=0.9))
        if young:
            leaf(sp, "ph_dragon_young", bx, by, ang, L, W, "heart", bend=bend, midrib=4)
        else:
            leaf(sp, "ph_silver", bx, by, ang, L, W, "heart", bend=bend,
                 overlays=[("ph_silver_vein", pat)])
    return sp
