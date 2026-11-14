"""Alocasia Dragon Scale – Pflanzenhandlung. Silbrige, dicke Blätter mit dunkelgrünen eingeprägten Adern, sehr kompakt."""
REGION = "pflanzenhandlung"

from pixel import Sprite, LIGHT, BASE, SHADE
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem, veins, herringbone, uv_to_xy

# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, jung?, Stielbiegung)
STAGES = {
    1: [(15.5, 15.5, 20, -92, 5, 3.2, 0, True, 0)],
    2: [(16.5, 18.5, 18.5, -62, 4.5, 2.9, 4, True, -0.5),
        (14.5, 12.5, 19.5, -140, 6.5, 4.2, -8, False, 1)],
    3: [(16.5, 19.5, 15.5, -70, 5, 3.1, 4, True, -0.5),
        (14.5, 13.5, 16.5, -112, 7.5, 5.0, 4, False, 1),
        (15, 9, 20, -170, 6.5, 4.4, -14, False, 1),
        (16.5, 21.5, 19.5, -18, 6.5, 4.4, 16, False, -1)],
    4: [(16.5, 20, 13, -64, 5.5, 3.3, 4, True, -0.5),
        (14.5, 12.5, 14, -108, 8, 5.4, 6, False, 1),
        (14, 8, 20, -168, 7.5, 5.0, -18, False, 1),
        (17, 23, 20.5, -14, 7, 4.8, 22, False, -1),
        (15.5, 16.5, 18.5, -78, 6, 4.0, 2, False, 0)],
    5: [(16.5, 20.5, 11, -66, 6, 3.6, 4, True, -0.5),
        (14.5, 12, 12, -104, 9, 6.0, 8, False, 1),
        (14, 9, 18, -165, 8.5, 5.6, -20, False, 1.5),
        (17, 24, 19.5, -12, 7.5, 5.2, 26, False, -1),
        (16.5, 21, 15, -50, 7, 4.8, 8, False, -1),
        (15, 15.5, 19.5, -96, 6.5, 4.4, -2, False, 0)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    for (sx, bx, by, ang, L, W, bend, young, sb) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb, thick=2 if L >= 7 else 1)
        ramp = "ph_dragon_young" if young else "ph_silver"
        lay, cells = leaf(sp, ramp, bx, by, ang, L, W, "heart", bend=bend)
        n = 1 if L < 7 else 2
        veins(sp, "ph_silver_vein", cells,
              herringbone(L, W, n=n, t0=0.2, t1=0.55, slope=0.9, reach=0.72),
              tone=SHADE if not young else BASE, geom=uv_to_xy(bx, by, ang, L, bend))
    return sp
