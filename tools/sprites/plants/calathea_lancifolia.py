"""Calathea lancifolia – Pflanzenhandlung. Lange schmale Blätter mit welligem Rand, dunkle Ovalflecken an der Mittelrippe, purpurne Unterseite an Hängeblättern."""
REGION = "pflanzenhandlung"

from pixel import Sprite, LIGHT, BASE, SHADE, HIGHLIGHT
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem

# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, Unterseite sichtbar?, Stielbiegung)
STAGES = {
    1: [(15.5, 15.5, 19.5, -90, 5.5, 1.4, 0, False, 0)],
    2: [(14.5, 13.5, 17, -110, 8.5, 1.7, -8, False, 1),
        (16.5, 18, 19, -72, 6, 1.4, 6, False, -1)],
    3: [(14, 12, 14.5, -106, 10.5, 2.0, -10, False, 1),
        (16.5, 19.5, 15.5, -70, 10, 1.9, 16, False, -1),
        (15.5, 15.5, 19, -88, 6.5, 1.5, 0, False, 0)],
    4: [(13.5, 11.5, 12, -106, 12, 2.1, -14, False, 1),
        (17, 20, 13, -66, 11.5, 2.0, 28, False, -1),
        (14.5, 9, 18.5, -150, 8.5, 1.9, -38, True, 1.5),
        (16, 15.5, 16.5, -88, 8.5, 1.8, 6, False, 0)],
    5: [(13.5, 12.5, 12.5, -100, 12, 2.3, 12, False, 1),
        (17.5, 20, 11.5, -70, 13, 2.2, 30, False, -1),
        (13, 11, 15.5, -138, 11, 2.2, -30, False, 1.5),
        (17.5, 23, 17.5, -32, 9.5, 2.0, 56, True, -1),
        (15.5, 15.5, 16, -88, 9, 1.9, -8, False, 0),
        (14.5, 9.5, 20.5, -165, 7.5, 1.7, -42, True, 0)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp, "ph_pot_slate")
    for (sx, bx, by, ang, L, W, bend, flipped, sb) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb)
        if flipped:  # Unterseite (purpur) sichtbar
            leaf(sp, "ph_cal_purple", bx, by, ang, L, W, "lance", bend=bend,
                 wave=0.5, wfreq=2.0, midrib=4)
            continue
        overlays = []
        if L >= 8:
            gap = 3.0

            def spots(c, L=L, gap=gap):
                if not (0.12 <= c.t <= 0.88):
                    return None
                k = round((c.u - 0.16 * L) / gap)
                uk = 0.16 * L + k * gap
                if abs(c.u - uk) <= 1.1 and 0.6 <= abs(c.v) <= 1.7 and (c.v > 0) == (k % 2 == 0):
                    return SHADE
                return None
            overlays.append(("ph_cal_spot", spots))
        leaf(sp, "ph_cal_lan", bx, by, ang, L, W, "lance", bend=bend,
             wave=0.5 if L >= 8 else 0.0, wfreq=2.0, midrib=4, overlays=overlays)
    return sp
