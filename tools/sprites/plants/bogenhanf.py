"""Bogenhanf (Sansevieria trifasciata „Laurentii“) – Pflanzenhandlung.

Steife, aufrechte, schwertförmige Blätter direkt aus der Erde (ohne Stiel),
dunkel graugrün mit hellen, gezackten Querbändern und kräftigem gelbem Rand.
Die Blätter stehen fast senkrecht, leicht gefächert, verschieden hoch; die
Spitzen laufen schmal aus.
"""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf

# (Fuß x, Winkel, Länge, halbe Breite, Biegung) – hinten -> vorn
STAGES = {
    1: [(14.5, -94, 6.5, 1.4, 2),
        (17, -76, 4.0, 1.1, -3)],
    2: [(14, -98, 9.0, 1.6, 3),
        (17.5, -80, 6.5, 1.4, -3)],
    3: [(14.5, -95, 14.0, 2.0, 3),
        (18.5, -76, 10.5, 1.8, -4),
        (11.5, -114, 8.5, 1.6, 6),
        (16.5, -86, 6.0, 1.4, 2)],
    4: [(14, -96, 19.0, 2.2, 3),
        (18, -80, 15.0, 2.1, -3),
        (10.5, -116, 11.5, 1.8, 7),
        (21, -64, 10.0, 1.7, -6),
        (16, -88, 8.5, 1.6, 2)],
    5: [(13.5, -97, 23.5, 2.4, 3),
        (18, -82, 19.5, 2.3, -3),
        (10, -116, 15.0, 2.0, 8),
        (21.5, -64, 13.0, 1.9, -7),
        (15.5, -90, 11.0, 1.8, 2),
        (12, -104, 7.0, 1.5, 0)],
}


def sword(sp, fx, ang, L, W, bend, seed):
    """Schwertblatt: Basis knapp unter der Erde, gelber Rand, gezackte Querbänder."""
    by = SOIL_Y + 0.6
    period = 3.2 if L >= 12 else 2.6
    phase = seed * 0.9

    def band(c):
        if c.edge or c.t > 0.93 or c.t < 0.04:
            return None
        # Zickzack-Querband: Bandlage wandert mit |v| leicht, wie bei echten Bändern
        z = c.u + phase + 0.45 * abs(math.sin(c.v * 1.7))
        f = (z / period) % 1.0
        if f < 0.32:
            return HIGHLIGHT if c.v < 0 else LIGHT
        return None

    def rim(c):
        if L < 3:
            return None
        if c.vn >= 0.62 and c.t > 0.04 and c.t < 0.95:
            return LIGHT if c.v < 0 else BASE
        return None

    leaf(sp, "ph_sans", fx, by, ang, L, W, "lance", bend=bend,
         overlays=[("ph_sans_band", band), ("ph_sans_rim", rim)])


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp, "ph_pot_cream")
    for i, (fx, ang, L, W, bend) in enumerate(STAGES[stage]):
        sword(sp, fx, ang, L, W, bend, i)
    # Erde vor die Blattfüße, damit sie aus dem Topf wachsen
    s = sp.layer("soil", outline=False, shading=False)
    s.rect(11, 24, 20, 24, tone=SHADE)
    return sp
