"""Monstera – Pflanzenhandlung. Überarbeitet: unregelmäßig, überlappend, hängende Blätter."""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, OUTLINE
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem, uv_to_xy


def cut_slits(lay, cells, geom, L, W, ts, depth=0.6, slope=0.3):
    """Monstera-Schlitze als dunkle Linien vom Blattrand Richtung Mittelrippe.

    ts: Positionen (Anteil von L) an der Mittelrippe; jeder Schlitz läuft schräg
    nach außen Richtung Spitze. Innen bleibt es eine Outline-farbene Linie, am
    Rand wird die Randzelle entfernt, so dass eine saubere Kerbe entsteht."""
    for tk in ts:
        u0 = tk * L
        for sgn in (1, -1):
            path = []
            for i in range(0, 40):
                f = i / 39
                v = sgn * (W * (1 - depth) + f * (W * depth + 1.0))
                x, y = geom(u0 + slope * abs(v), v)
                q = (math.floor(x), math.floor(y))
                if q not in path:
                    path.append(q)
            for q in path:
                c = cells.get(q)
                if c is None or c.t > 0.93:
                    continue
                if c.vn > 0.74:
                    lay.erase(*q)
                else:
                    lay.px(*q, OUTLINE)


# Reihenfolge = Zeichenreihenfolge (hinten -> vorn).
# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, Schlitze, Stielbiegung)
STAGES = {
    1: [(15.5, 15.5, 19.5, -92, 5.5, 3.2, 0, (), 0)],
    2: [(14.5, 11.5, 18, -145, 7, 4.0, -16, (), 1),
        (17, 19.5, 19.5, -60, 5, 2.9, 8, (), -1)],
    3: [(15, 14.5, 12.5, -100, 9, 5.0, 4, (0.46,), 1),
        (14, 8, 19, -170, 6.5, 3.8, -22, (), 1),
        (16.5, 22, 18, -28, 6.5, 3.8, 22, (), -1),
        (16, 17.5, 19.5, -72, 4.5, 2.6, 0, (), 0)],
    4: [(15, 12.5, 11.5, -102, 10, 5.4, 4, (0.36, 0.6), 1),
        (16.5, 22, 14, -40, 8, 4.5, 10, (0.46,), -1),
        (14, 8.5, 18, -168, 7, 4.0, -22, (), 1.5),
        (15.5, 16, 20, -78, 5.2, 3.0, 0, (), 0)],
    5: [(14.5, 11, 13, -148, 10, 5.5, -14, (0.36, 0.6), 1.5),
        (16.5, 19.5, 11, -78, 10.5, 5.8, 4, (0.34, 0.58), -1),
        (17.5, 22.5, 18, -22, 9, 5.0, 24, (0.38, 0.62), -1),
        (15.5, 16, 20.5, -92, 6, 3.4, 4, (), 0),
        (14, 10, 22, -175, 5, 2.9, -30, (), 0)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    for (sx, bx, by, ang, L, W, bend, splits, sb) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb)
        lay, cells = leaf(sp, "leaf_deep", bx, by, ang, L, W, "heart", bend=bend, midrib=4)
        if splits:
            cut_slits(lay, cells, uv_to_xy(bx, by, ang, L, bend), L, W, splits)
    return sp
