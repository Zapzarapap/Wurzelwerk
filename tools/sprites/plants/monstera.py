"""Monstera – Pflanzenhandlung. Überarbeitet: unregelmäßig, überlappend, hängende Blätter."""
REGION = "pflanzenhandlung"

from pixel import Sprite
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem

# Reihenfolge = Zeichenreihenfolge (hinten -> vorn).
# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, Schlitze, Stielbiegung)
STAGES = {
    1: [(15.5, 15.5, 19.5, -92, 5.5, 3.2, 0, (), 0)],
    2: [(14.5, 11.5, 18, -145, 7, 4.0, -16, (), 1),
        (17, 19.5, 19.5, -60, 5, 2.9, 8, (), -1)],
    3: [(15, 14.5, 13.5, -100, 8, 4.5, 6, (0.55,), 1),
        (14, 8, 19, -170, 7, 4.1, -28, (0.6,), 1),
        (16.5, 22, 17, -28, 6.5, 3.9, 28, (0.6,), -1),
        (16, 17.5, 19.5, -72, 4.5, 2.6, 0, (), 0)],
    4: [(15, 12.5, 11.5, -102, 8.5, 4.7, 8, (0.4, 0.7), 1),
        (16.5, 21.5, 13.5, -52, 6.5, 3.9, 6, (0.5,), -1),
        (14, 8.5, 17.5, -168, 8, 4.6, -30, (0.4, 0.7), 1.5),
        (17, 23, 20, -12, 7, 4.2, 36, (0.45, 0.75), -1),
        (15.5, 15.5, 19, -80, 4.8, 2.7, 0, (), 0)],
    5: [(15, 12.5, 11, -100, 9, 4.9, 8, (0.3, 0.55, 0.8), 1),
        (16.5, 22, 12.5, -48, 7, 4.0, 6, (0.45, 0.75), -1.5),
        (14.5, 9, 16, -165, 8.5, 4.8, -32, (0.3, 0.55, 0.8), 2),
        (17.5, 23, 19, -10, 8, 4.5, 40, (0.3, 0.55, 0.8), -1),
        (15.5, 11, 20, -135, 5.5, 3.2, -20, (0.55,), 1),
        (15, 16.5, 18, -76, 5, 2.8, 0, (), 0)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    for (sx, bx, by, ang, L, W, bend, splits, sb) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb)
        leaf(sp, "leaf_deep", bx, by, ang, L, W, "heart", bend=bend, splits=splits, midrib=4)
    return sp
