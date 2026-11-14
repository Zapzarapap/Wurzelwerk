"""Mohnfeld – Blumenwiese. Gruppe mehrerer Klatschmohn-Pflanzen auf breitem
Grashügel; in Stufe 5 viele rote Blüten in verschiedenen Höhen, wie ein
kleines Feld. Blüten, Knospen und Blätter im Stil von mohn.py."""
REGION = "blumenwiese"

from pixel import Sprite, SHADE, BASE, LIGHT
from parts import heart_leaf, stalk, meadow_ground
from mohn import flower, bud

BY = 29


def tuft(sp, x, n, L):
    """Kleine Mohn-Blattrosette am Fuß x."""
    angles = [-160, -20, -125, -55, -95][:n]
    for i, a in enumerate(angles):
        heart_leaf(sp.layer("leaf_sage"), x, BY, a, L - (i % 2), 1.4, notch=False, midrib=False)


def nodding(sp, x0, x1, y1):
    """Stiel mit nickender Knospe (Haken oben)."""
    stalk(sp, x0, BY, x1, y1, bend=(x1 - x0) * -0.3)
    d = 1 if x1 >= x0 else -1
    stalk(sp, x1, y1, x1 + 2 * d, y1 + 2)
    bud(sp, x1 + 2 * d, y1 + 3)


def bloom(sp, x0, x, y, r):
    stalk(sp, x0, BY, x, y + 2, bend=(x - x0) * -0.25)
    return (x, y, r)


# Je Stufe: Blattbüschel (x, Blätter, Länge), nickende Knospen (Fuß x, x, y),
# Blüten (Fuß x, x, y, Radius), aufrechte Knospen (Fuß x, x, y)
STAGES = {
    1: dict(tufts=[(11, 3, 4), (20, 3, 3.5)], nod=[], fl=[], up=[]),
    2: dict(tufts=[(9, 3, 4.5), (16, 4, 5), (23, 3, 4)], nod=[(16, 18, 20), (9, 8, 22)], fl=[], up=[]),
    3: dict(tufts=[(8, 4, 5), (16, 5, 6), (24, 4, 5)],
            nod=[(8, 6, 18), (24, 26, 19)], fl=[(16, 15, 12, 3.4)], up=[(17, 20, 17)]),
    4: dict(tufts=[(7, 4, 5), (15, 5, 6), (24, 4, 6)],
            nod=[(24, 26, 17), (7, 5, 20)],
            fl=[(15, 13, 8, 3.6), (8, 8, 14, 3.4), (23, 21, 11, 3.5)], up=[(16, 17, 16)]),
    5: dict(tufts=[(6, 4, 5), (12, 5, 6), (19, 5, 6), (25, 4, 5)],
            nod=[(24, 26, 18), (7, 5, 21)],
            fl=[(12, 10, 5, 3.6), (19, 20, 4, 3.6), (7, 5, 12, 3.4), (25, 26, 9, 3.4),
                (15, 15, 13, 3.5), (22, 23, 17, 3.3), (9, 9, 19, 3.3)],
            up=[(16, 16, 19), (5, 3, 17)]),
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp, w=9 if stage < 3 else 13)
    st = STAGES[stage]
    flowers = [bloom(sp, x0, x, y, r) for (x0, x, y, r) in st["fl"]]
    for (x0, x, y) in st["up"]:
        stalk(sp, x0, BY, x, y + 2, bend=(x - x0) * -0.3)
    for (x0, x1, y1) in st["nod"]:
        nodding(sp, x0, x1, y1)
    for (x, n, L) in st["tufts"]:
        tuft(sp, x, n, L)
    for (x0, x, y) in st["up"]:
        bud(sp, x, y)
    # hintere (höhere) Blüten zuerst, vordere überdecken sie
    for (x, y, r) in sorted(flowers, key=lambda f: f[1]):
        flower(sp, x, y, r)
    return sp
