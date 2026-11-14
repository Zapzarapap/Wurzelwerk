"""Calathea orbifolia – Pflanzenhandlung.

Große, breit-ovale bis runde Blätter in sattem Grün mit kräftigen silbrigen
Querstreifen (von der Mittelrippe schräg zum Rand). Buschig: alle Stiele
kommen aus der Mitte, Blätter stehen schräg aufrecht und überlappen sich.
"""
REGION = "pflanzenhandlung"

from pixel import Sprite, LIGHT, BASE, SHADE, HIGHLIGHT
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem, veins, uv_to_xy

# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, Stielbiegung)
STAGES = {
    1: [(15.5, 15.5, 20, -95, 6.5, 2.6, 4, 0)],
    2: [(15, 13.5, 18.5, -115, 8.5, 3.3, -6, 0.5),
        (16, 18.5, 20, -55, 6.5, 2.6, 8, -0.5)],
    3: [(15, 14, 15.5, -105, 10, 3.8, -4, 0.5),
        (16, 19, 17.5, -52, 9, 3.5, 10, -0.5),
        (15, 12, 20, -148, 8, 3.2, -14, 0.5)],
    4: [(15, 13.5, 13, -104, 11, 4.1, -4, 0.5),
        (16, 19.5, 15, -60, 10.5, 3.9, 8, -0.5),
        (15, 11, 18.5, -146, 9.5, 3.7, -16, 1),
        (16, 21, 20.5, -22, 8.5, 3.4, 18, -1),
        (15.5, 16, 19.5, -84, 7, 2.8, 2, 0)],
    5: [(15, 13, 12, -108, 12, 4.4, -4, 0.5),
        (16, 19, 12.5, -68, 11.5, 4.2, 6, -0.5),
        (15, 10.5, 17, -144, 10.5, 4.0, -16, 1),
        (16, 21.5, 17.5, -30, 10, 3.8, 16, -1),
        (15, 11.5, 21.5, -172, 7.5, 3.0, -16, 0),
        (15.5, 16, 18.5, -88, 8, 3.1, 2, 0)],
}


def stripes(L, W, spacing=2.2, slope=0.45):
    """Silberne Querstreifen: von der Mittelrippe schräg nach außen/vorn, beidseitig."""
    lines = []
    u = L * 0.12
    while u < L * 0.86:
        for sgn in (1, -1):
            lines.append(((u, sgn * 0.6), (u + slope * W, sgn * W)))
        u += spacing
    return lines


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    for (sx, bx, by, ang, L, W, bend, sb) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb)
        lay, cells = leaf(sp, "ph_cal_orb", bx, by, ang, L, W, "round", bend=bend, midrib=LIGHT)
        if L >= 6:
            geom = uv_to_xy(bx, by, ang, L, bend)
            veins(sp, "ph_cal_stripe", cells, stripes(L, W, spacing=2.4 if L >= 9 else 2.6),
                  tone=BASE, geom=geom)
    return sp
