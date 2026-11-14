"""Calathea orbifolia – Pflanzenhandlung. Große runde Blätter, hellgrün mit silbrigen Querstreifen von der Mittelrippe."""
REGION = "pflanzenhandlung"

from pixel import Sprite, LIGHT, BASE, SHADE
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem, rib, laterals, combine

# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, Stielbiegung)
STAGES = {
    1: [(15.5, 15.5, 19.5, -92, 5, 2.2, 0, 0)],
    2: [(14.5, 12.5, 18, -135, 7, 3.4, -10, 1),
        (17, 18.5, 19.5, -65, 5, 2.4, 4, -1)],
    3: [(14.5, 13, 14.5, -105, 8, 4.0, 6, 1),
        (16, 21, 17.5, -35, 7, 3.6, 12, -1),
        (14, 9.5, 19.5, -165, 6, 3.0, -14, 1),
        (16, 16.5, 19.5, -80, 4.5, 2.3, 0, 0)],
    4: [(14.5, 12, 11, -100, 9, 4.5, 8, 1),
        (16.5, 21, 14, -52, 7.5, 3.8, 8, -1),
        (14, 9, 18, -168, 8, 4.0, -18, 1.5),
        (17, 23.5, 21, -12, 6.5, 3.2, 24, -1),
        (15.5, 16, 18.5, -82, 5, 2.6, 0, 0)],
    5: [(14.5, 12, 11, -100, 9.5, 4.8, 8, 1),
        (16.5, 20.5, 11.5, -58, 8.5, 4.2, 8, -1.5),
        (14, 9.5, 16, -163, 9, 4.6, -20, 2),
        (17, 23, 18.5, -14, 8, 4.0, 26, -1),
        (15, 11.5, 20.5, -135, 5.5, 2.8, -12, 0),
        (15.5, 16.5, 17, -84, 5.5, 2.8, 0, 0)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    for (sx, bx, by, ang, L, W, bend, sb) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb)
        us = [L * 0.1 + k * 3.0 for k in range(5)]
        stripes = combine(rib(BASE, 0.55, 0.0, 0.95), laterals(us, 1.25, BASE, 0.62, t1=0.95))
        leaf(sp, "ph_cal_orb", bx, by, ang, L, W, "round", bend=bend,
             overlays=[("ph_cal_stripe", stripes)] if L >= 6 else [])
    return sp
