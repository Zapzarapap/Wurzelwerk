"""Strelitzie (Paradiesvogelblume) – Pflanzenhandlung.

Große, paddelförmige, aufrechte Blätter auf langen, steifen Stielen (Fächerwuchs).
Stufe 5 mit Vogelkopf-Blüte: waagerechte Blütenscheide als „Schnabel“, darauf
aufgestellte orange Kelchblätter als „Federschopf“ und blaue Pfeilzunge.
"""
REGION = "pflanzenhandlung"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem, rib

VARIANTS = {
    "orange": {"petal_red": "petal_orange"},
    "gelb": {"petal_red": "petal_yellow"},
}

# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, Stielbiegung)
STAGES = {
    1: [(15.5, 15.5, 20, -86, 6, 1.4, 6, 0)],
    2: [(15, 13.5, 17.5, -110, 8, 1.9, -10, 0),
        (16, 18, 19.5, -62, 6, 1.6, 10, 0)],
    3: [(15, 13, 15, -106, 10, 2.3, -10, 0.5),
        (16.5, 20, 16.5, -54, 8.5, 2.1, 16, -0.5),
        (15.5, 15.5, 19, -84, 6.5, 1.8, 4, 0)],
    4: [(15, 13, 12.5, -102, 11, 2.6, -10, 0.5),
        (17, 20.5, 13.5, -64, 10.5, 2.5, 14, -0.5),
        (14, 9.5, 17.5, -146, 9, 2.3, -22, 0.5),
        (16, 16.5, 16, -82, 8, 2.1, 6, 0)],
    5: [(15, 12.5, 12.5, -100, 12, 2.8, -10, 0.5),
        (17, 21, 12, -68, 11.5, 2.7, 12, -0.5),
        (14, 9, 19, -164, 9, 2.4, -22, 0.5),
        (17.5, 23, 17.5, -32, 9, 2.4, 26, -0.5),
        (16, 17, 15, -84, 9, 2.3, 6, 0)],
}


def blade(sp, bx, by, ang, L, W, bend):
    veins = rib(BASE, 0.5, 0.02, 0.92) if L >= 6 else (lambda c: None)
    leaf(sp, "ph_strel", bx, by, ang, L, W, "paddle", bend=bend,
         overlays=[("ph_strel_rib", veins)])


def bird(sp, x, y):
    """Vogelkopf-Blüte. (x, y) = Ansatz der Scheide am Stiel (Schnabel zeigt nach links)."""
    # Blütenscheide (Schnabel): lang, spitz zulaufend, leicht nach oben gebogen
    sh = sp.layer("ph_strel_spathe")
    sh.rect(x - 8, y, x, y)
    sh.rect(x - 4, y + 1, x, y + 1)
    sh.px(x - 9, y - 1)
    # orange Federschopf: drei spitze Kelchblätter, nach hinten oben gestellt (je eigene Ebene)
    spikes = [
        [(-5, -1), (-6, -2), (-6, -3), (-7, -4), (-7, -5), (-8, -6)],
        [(-3, -1), (-3, -2), (-3, -3), (-3, -4), (-2, -5), (-2, -6), (-2, -7)],
        [(-1, -1), (0, -2), (1, -3), (2, -4), (3, -4)],
    ]
    for pts in spikes:
        cr = sp.layer("petal_red")
        for (dx, dy) in pts:
            cr.px(x + dx, y + dy)
    # blaue Pfeilzunge, zeigt schräg nach vorn
    bl = sp.layer("petal_blue")
    bl.px(x - 4, y - 1)
    bl.px(x - 5, y - 2)
    bl.px(x - 5, y - 3)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    plan = STAGES[stage]
    if stage == 5:
        # Blütenstiel hinter dem vorderen Blatt
        stem(sp, 13.5, SOIL_Y, 11, 13, bend=1, ramp="ph_strel", thick=1)
    for i, (sx, bx, by, ang, L, W, bend, sb) in enumerate(plan):
        stem(sp, sx, SOIL_Y, bx, by, bend=sb, ramp="ph_strel", thick=2 if L >= 8 else 1)
        blade(sp, bx, by, ang, L, W, bend)
    if stage == 5:
        bird(sp, 11, 13)
    return sp
