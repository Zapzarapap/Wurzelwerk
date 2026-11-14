"""Alocasia Black Velvet – Pflanzenhandlung. Fast schwarzgrün, kräftige weiße Adern, rötlicher Neuaustrieb."""
REGION = "pflanzenhandlung"

from pixel import Sprite, LIGHT, HIGHLIGHT, BASE, SHADE
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem, rib, laterals, rim, combine

# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, neu?, Stielbiegung)
STAGES = {
    1: [(15.5, 15.5, 19.5, -92, 5.5, 3.2, 0, True, 0)],
    2: [(14.5, 12, 18.5, -140, 7, 4.0, -12, False, 1),
        (17, 18.5, 19.5, -70, 4.5, 2.7, 0, True, -1)],
    3: [(15, 14, 14.5, -105, 8.5, 4.8, 6, False, 1),
        (16.5, 21, 17.5, -35, 7.5, 4.3, 10, False, -1),
        (16, 16.5, 19.5, -72, 5, 2.8, 0, True, 0)],
    4: [(14.5, 12.5, 12, -100, 9.5, 5.4, 8, False, 1),
        (16.5, 21, 15, -45, 8, 4.8, 8, False, -1),
        (14, 8, 18.5, -165, 7.5, 4.4, -20, False, 1),
        (16, 16.5, 19.5, -78, 5.5, 3.1, 0, True, 0)],
    5: [(14.5, 12.5, 10.5, -100, 10, 5.8, 8, False, 1),
        (16.5, 22, 13.5, -50, 9, 5.2, 8, False, -1.5),
        (14, 9, 17.5, -165, 8.5, 4.9, -20, False, 1.5),
        (17, 23.5, 20, -15, 7, 4.2, 24, False, -1),
        (15.5, 16.5, 18, -80, 5.2, 3.0, 0, True, 0)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    for (sx, bx, by, ang, L, W, bend, new, sb) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb, thick=2 if L >= 7 else 1)
        if new:
            leaf(sp, "ph_velvet_new", bx, by, ang, L, W, "heart", bend=bend, midrib=4)
        else:
            us = [L * 0.2, L * 0.5]
            pat = combine(rib(BASE, 0.5, 0.0, 0.9),
                          laterals(us, 1.2, BASE, 0.5, t1=0.9))
            leaf(sp, "ph_velvet", bx, by, ang, L, W, "heart", bend=bend,
                 lit=LIGHT, dark=BASE, overlays=[("ph_vein_white", pat)])
    return sp
