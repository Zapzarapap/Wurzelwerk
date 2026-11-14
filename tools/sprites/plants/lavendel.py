"""Lavendel – Blumenwiese. Buschig, graugrüne Nadelblätter, Blütenähren."""
REGION = "blumenwiese"

from pixel import Sprite, SHADE, BASE, LIGHT
from parts import stalk, meadow_ground
from parts_blumenwiese import spike, leaf_line

VARIANTS = {
    "lila": None,
    "weiss": {"bw_lavender": "petal_white"},
    "rosa": {"bw_lavender": "petal_pink"},
}

BY = 29

# Ähren: (Stielfuß x, Ähren-Fuß x, y, Spitze x, y, Biegung)
SPIKES = {
    3: [(15, 15, 18, 15, 13, 0)],
    4: [(15, 15, 15, 15, 7, 0.3), (17, 21, 17, 22, 10, 0.5), (14, 9, 18, 8, 12, -0.5)],
    5: [(14, 14, 16, 14, 6, 0.3), (17, 21, 15, 22, 4, 0.5), (15, 8, 18, 6, 10, -0.6),
        (18, 26, 21, 27, 13, 0.6), (13, 3, 24, 3, 17, -0.4)],
}


def blades(sp, spec):
    for (bx, tx, ty, bend, tone) in spec:
        leaf_line(sp, bx, BY, tx, ty, bend=bend, tone=tone)


BLADES = {
    1: [(15, 13, 25, -1, BASE), (16, 18, 26, 1, LIGHT), (16, 16, 24, 0, BASE)],
    2: [(14, 8, 22, -2, BASE), (16, 22, 22, 2, LIGHT), (15, 14, 20, -1, BASE), (17, 19, 19, 1, BASE), (16, 16, 18, 0, LIGHT)],
    3: [(14, 7, 21, -2, BASE), (17, 24, 21, 2, LIGHT), (15, 12, 18, -1, BASE), (17, 20, 17, 1, BASE), (16, 15, 15, 0, LIGHT), (15, 10, 23, -1, LIGHT)],
    4: [(14, 5, 22, -2, BASE), (17, 26, 22, 2, LIGHT), (15, 10, 19, -1, BASE), (17, 22, 19, 1, BASE), (16, 16, 18, 0, LIGHT), (15, 8, 24, -1, LIGHT), (18, 24, 25, 1, BASE)],
    5: [(14, 4, 23, -2, BASE), (17, 27, 23, 2, LIGHT), (15, 9, 20, -1, BASE), (17, 23, 20, 1, BASE), (16, 16, 19, 0, LIGHT), (15, 7, 25, -1, LIGHT), (18, 25, 26, 1, BASE), (13, 12, 18, -1, BASE)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    for (sx, bx, by, tx, ty, bend) in SPIKES.get(stage, []):
        stalk(sp, sx, BY, bx, by, bend=(bx - sx) * -0.2)
    blades(sp, BLADES[stage])
    for (sx, bx, by, tx, ty, bend) in SPIKES.get(stage, []):
        if stage == 3:
            spike(sp, "bw_lavender", bx, by, tx, ty, w=1.1, step=2.0, bend=bend)
        else:
            spike(sp, "bw_lavender", bx, by, tx, ty, w=1.35, step=2.1, bend=bend)
    return sp
