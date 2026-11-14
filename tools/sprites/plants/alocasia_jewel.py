"""Jewel Alocasia – Pflanzenhandlung. Sattes Grün, helle Felder zwischen tief eingesenkten dunklen Adern (gestepptes Muster), buschig."""
REGION = "pflanzenhandlung"

from pixel import Sprite, LIGHT, BASE, SHADE
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem, rib, laterals, combine

# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, jung?, Stielbiegung)
STAGES = {
    1: [(15.5, 15.5, 19.5, -92, 5.5, 2.7, 0, True, 0)],
    2: [(14.5, 12, 18.5, -140, 7, 3.4, -10, False, 1),
        (17, 18.5, 19.5, -62, 5, 2.5, 4, True, -1)],
    3: [(13.5, 13.5, 14.5, -108, 7.5, 3.8, 6, False, 1),
        (16, 20, 17, -45, 6.5, 3.4, 8, False, -1),
        (14, 10, 19.5, -165, 6, 3.2, -14, False, 1),
        (16, 16.5, 19.5, -80, 4.5, 2.3, 0, True, 0)],
    4: [(13, 12, 11.5, -105, 9, 4.5, 6, False, 1),
        (17.5, 19.5, 13.5, -65, 8, 4.0, 4, False, -1),
        (13.5, 9.5, 17.5, -155, 7.5, 3.8, -18, False, 1),
        (16.5, 22.5, 18, -25, 7.5, 3.8, 16, False, -1),
        (15.5, 16, 18.5, -85, 4.8, 2.4, 0, True, 0)],
    5: [(13, 12.5, 10.5, -105, 9.5, 4.7, 6, False, 1),
        (17.5, 19.5, 11, -70, 9, 4.4, -4, False, -1),
        (13.5, 9.5, 14.5, -150, 8.5, 4.2, -18, False, 1),
        (17, 22.5, 14, -30, 8.5, 4.2, 14, False, -1.5),
        (14.5, 8.5, 20, -172, 6.5, 3.3, -20, False, 0),
        (17, 24, 20.5, -10, 6.5, 3.4, 26, False, 0),
        (15.5, 16, 17, -88, 5.2, 2.6, 0, True, 0)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    for (sx, bx, by, ang, L, W, bend, young, sb) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb, thick=2 if L >= 8 else 1)
        if young:
            leaf(sp, "ph_jewel", bx, by, ang, L, W, "heart", bend=bend, lit=LIGHT + 1, dark=LIGHT, midrib=4)
            continue
        us = [L * 0.14 + k * 2.3 for k in range(6)]
        fields = lambda c: BASE if c.vn < 0.74 and c.t > 0.1 else None
        veins = combine(rib(BASE, 0.5, 0.0, 0.92), laterals(us, 1.15, BASE, 0.45, t1=0.92))
        leaf(sp, "ph_jewel", bx, by, ang, L, W, "heart", bend=bend,
             overlays=[("ph_jewel_light", fields), ("ph_jewel_dark", veins)])
    return sp
