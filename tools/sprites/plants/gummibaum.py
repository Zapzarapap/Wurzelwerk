"""Gummibaum (Ficus elastica) – Pflanzenhandlung.

Ein aufrechter, holziger Stamm; daran wechselständig große, ovale,
dunkelgrüne, ledrig glänzende Blätter auf kurzen Stielen (helle Mittelrippe,
Glanzlicht). Ganz oben steckt die rötliche, spitze Blattscheide des
nächsten Blatts. Untere Blätter stehen waagerecht bis leicht hängend, obere
schräg nach oben.
"""
REGION = "pflanzenhandlung"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem

TX = 15  # Stamm (2 px breit: TX, TX+1)

# top: Stammspitze y; leaves: (Ansatz y, Seite -1/1, Winkel, Länge, halbe Breite, Biegung)
# Reihenfolge = hinten -> vorn
STAGES = {
    1: dict(top=20, sheath=3, leaves=[
        (22, -1, -160, 5.0, 2.0, -10),
        (21, 1, -30, 4.5, 1.8, 10),
    ]),
    2: dict(top=17, sheath=4, leaves=[
        (22, 1, -12, 6.5, 2.4, 16),
        (20, -1, -158, 7.0, 2.6, -16),
        (18, 1, -52, 5.0, 1.9, 6),
    ]),
    3: dict(top=13, sheath=4, leaves=[
        (22, -1, -176, 8.5, 2.9, -24),
        (20, 1, -12, 9.0, 3.0, 20),
        (16, -1, -140, 8.0, 2.8, -12),
        (14, 1, -54, 6.0, 2.2, 6),
    ]),
    4: dict(top=9, sheath=5, leaves=[
        (22, 1, 14, 9.5, 3.1, 14),
        (20, -1, -168, 10.5, 3.3, -10),
        (16, 1, -36, 10.0, 3.2, 8),
        (13, -1, -128, 8.5, 2.9, -6),
        (11, 1, -70, 6.5, 2.3, 2),
    ]),
    5: dict(top=6, sheath=5, leaves=[
        (22, -1, 170, 10.5, 3.3, 12),
        (21, 1, 8, 11.5, 3.5, 12),
        (17, -1, -156, 11.5, 3.5, -8),
        (14, 1, -32, 11.0, 3.4, 6),
        (11, -1, -118, 9.0, 3.0, -4),
        (8, 1, -70, 7.0, 2.4, 2),
    ]),
}


def oval(sp, x, y, ang, L, W, bend):
    """Großes ovales Ficus-Blatt mit heller Mittelrippe und Glanzlicht auf der Lichtseite."""
    def rib(c):
        return BASE if abs(c.v) <= 0.5 and 0.05 < c.t < 0.86 and L >= 6 else None

    def gloss(c):
        # schmaler Glanzstreifen parallel zur Rippe auf der oberen (lichtzugewandten) Hälfte
        if c.edge or L < 5:
            return None
        if 0.28 < c.t < 0.6 and 0.3 < c.vn < 0.65 and c.v * sgn > 0:
            return LIGHT if 0.36 < c.t < 0.5 else None
        return None
        return None

    # Lichtseite: Hälfte, die nach oben zeigt (bei Blättern nach links/rechts = v<0 bzw. v>0)
    import math
    sgn = -1 if math.cos(math.radians(ang)) >= 0 else 1
    lay, cells = leaf(sp, "ph_ficus", x, y, ang, L, W, "lance", bend=bend, lit=BASE, dark=SHADE,
                      overlays=[("ph_ficus_rib", rib), ("ph_ficus", gloss)])
    return lay


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    plan = STAGES[stage]
    top = plan["top"]
    # Stamm
    trunk = sp.layer("ph_ficus_trunk")
    trunk.rect(TX, top, TX + 1, SOIL_Y)
    if stage >= 4:
        trunk.px(TX - 1, SOIL_Y)  # Stammfuß etwas breiter
        trunk.px(TX + 2, SOIL_Y)
    # Blattnarben am Stamm (ringförmige Knoten)
    knots = sp.layer("ph_ficus_trunk", outline=False, shading=False)
    for (ly, side, *_r) in plan["leaves"]:
        knots.px(TX + (1 if side > 0 else 0), ly + 1, SHADE)
    s = sp.layer("soil", outline=False, shading=False)
    s.rect(11, 24, 20, 24, tone=SHADE)
    for (ly, side, ang, L, W, bend) in plan["leaves"]:
        ax = TX + 2 if side > 0 else TX - 1
        # kurzer Blattstiel
        p = sp.layer("ph_ficus_trunk", outline=False, shading=False)
        p.px(ax, ly, LIGHT)
        ax2 = ax + (1 if side > 0 else -1)
        if L >= 8:
            p.px(ax2, ly - 1 if abs(ang) > 30 and abs(ang) < 150 else ly, LIGHT)
            ax2 += (1 if side > 0 else -1)
        oval(sp, ax2 + 0.5, ly + 0.5 - (1 if L >= 8 and 30 < abs(ang) < 150 else 0), ang, L, W, bend)
    # rote Blattscheide an der Spitze: schmaler, spitzer Kegel
    sh = sp.layer("ph_ficus_sheath")
    n = plan["sheath"]
    sh.px(TX, top - 1)
    sh.px(TX + 1, top - 1)
    for i in range(1, n):
        sh.px(TX, top - 1 - i)
    hl = sp.layer("ph_ficus_sheath", outline=False, shading=False)
    hl.px(TX, top - 2, HIGHLIGHT)
    return sp
