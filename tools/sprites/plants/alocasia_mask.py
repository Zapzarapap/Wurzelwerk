"""Mask Alocasia (Alocasia amazonica 'Polly') – Pflanzenhandlung. Lange pfeilförmige Blätter, gewellter Rand, helle Adern, hängend."""
REGION = "pflanzenhandlung"

from pixel import Sprite, LIGHT, BASE, SHADE
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem, rib, laterals, combine

# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung)
STAGES = {
    1: [(15.5, 15.5, 19, -92, 6, 2.2, 0)],
    2: [(14.5, 13.5, 16.5, -125, 8, 2.6, -26),
        (16.5, 18, 18.5, -70, 5, 1.9, 6)],
    3: [(14, 12, 14, -120, 9.5, 3.0, -40),
        (17, 19, 15.5, -60, 9, 2.8, 38),
        (15.5, 15.5, 18.5, -88, 5.5, 2.0, 0)],
    4: [(13.5, 11, 11.5, -118, 11, 3.2, -48),
        (17.5, 20, 12.5, -62, 10.5, 3.0, 48),
        (14.5, 9, 17.5, -155, 8, 2.7, -36),
        (16, 15.5, 15, -88, 7.5, 2.5, 12)],
    5: [(13.5, 11, 9, -115, 12, 3.4, -55),
        (18, 20.5, 10, -60, 12, 3.3, 60),
        (15, 15.5, 13.5, -86, 8.5, 2.7, 14),
        (14, 8.5, 16.5, -152, 8.5, 2.8, -44),
        (17.5, 24, 17.5, -25, 7.5, 2.5, 40),
        (15.5, 15.5, 19, -92, 5, 1.9, 0)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    for (sx, bx, by, ang, L, W, bend) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=0.0, thick=2 if L >= 11.5 else 1)
        us = [L * 0.22, L * 0.5]
        veins = combine(rib(BASE, 0.5, 0.0, 0.94), laterals(us, 0.75, SHADE, 0.4, t1=0.85, min_v=0.6))
        leaf(sp, "ph_mask", bx, by, ang, L, W, "arrow", bend=bend,
             wave=0.55 if L >= 7 else 0.0, wfreq=2.2,
             overlays=[("ph_mask_vein", veins)])
    return sp
