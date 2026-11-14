"""Edelnelke – Blumenwiese. Gefranste, gefüllte Blüte auf Kelch, schmale blaugrüne Blätter."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import stalk, meadow_ground
from parts_blumenwiese import stamp, leaf_line

VARIANTS = {
    "rot": None,
    "rosa": {"petal_red": "petal_pink"},
    "weiss": {"petal_red": "bw_white"},
    "gelb": {"petal_red": "petal_yellow"},
}

BY = 29


HEAD = {
    "L": ["..h.l.h..",
          ".hlhlhlb.",
          "hlhlblbsb",
          "lbslbsbss",
          ".lblbsbs.",
          "..sbsbs.."],
    "M": [".h.l.b.",
          "hlhlbsb",
          "lblsbss",
          ".lbsbs."],
}
CALYX = {"L": ["lbs", "lbs", "lbs"], "M": ["lbs", "lbs"]}
BUD = [".h.",
       "lbs",
       "lbs",
       "lbs",
       ".b."]


def stem(sp, x0, y0, x1, y1, bend=0.0, pairs=2):
    """Stängel mit Knoten und gegenständigen, schmalen blaugrünen Blattpaaren."""
    stalk(sp, x0, y0, x1, y1, bend=bend, ramp="bw_glaucous", tone=BASE)
    for i in range(pairs):
        t = 0.28 + 0.27 * i
        lx = x0 + (x1 - x0) * t + bend * 0.5
        ly = y0 + (y1 - y0) * t
        leaf_line(sp, lx, ly, lx - 4, ly - 2 - i, bend=0.5, ramp="bw_glaucous", tone=LIGHT)
        leaf_line(sp, lx, ly, lx + 4, ly - 3 + i, bend=-0.5, ramp="bw_glaucous", tone=BASE)
        sp.layer("bw_glaucous", outline=False, shading=False).px(round(lx), round(ly), HIGHLIGHT)  # Knoten


def blades(sp, n, L):
    """Grasartiges Polster aus schmalen, bereiften Blättern (kräftiger als bei der Kornblume)."""
    spec = [(14, -4, 1), (17, 5, 1), (16, 1, 0.8), (13, -6, 0.7), (18, 7, 0.7), (15, -2, 0.9)][:n]
    for (bx, dx, k) in spec:
        x1, y1 = bx + dx * k * L / 5, BY - L * k
        leaf_line(sp, bx, BY, x1, y1, bend=dx * 0.25, ramp="bw_glaucous", tone=LIGHT if bx % 2 else BASE)
        leaf_line(sp, bx + 1, BY, x1 + (1 if dx >= 0 else 0), y1 + 1, bend=dx * 0.25, ramp="bw_glaucous", tone=SHADE)


def bud(sp, x, y):
    stamp(sp, x + 0.5, y + 0.5, BUD, "bw_glaucous")
    t = sp.layer("petal_red", outline=False, shading=False)
    t.px(int(x), int(y) - 2, LIGHT)


def carnation(sp, x, y, r):
    size = "L" if r >= 4.4 else "M"
    h = len(HEAD[size])
    stamp(sp, x + 0.5, y + h / 2 + len(CALYX[size]) / 2 - 0.5, CALYX[size], "bw_glaucous")
    stamp(sp, x + 0.5, y, HEAD[size], "petal_red")


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 1:
        blades(sp, 3, 4)
    elif stage == 2:
        stem(sp, 16, BY, 18, 21, bend=1, pairs=1)
        blades(sp, 5, 6)
        bud(sp, 18, 19)
    elif stage == 3:
        stem(sp, 15, BY, 14, 15, bend=-1, pairs=2)
        stem(sp, 17, BY, 20, 20, bend=1, pairs=1)
        blades(sp, 6, 7)
        bud(sp, 14, 13)
        bud(sp, 20, 18)
    elif stage == 4:
        stem(sp, 15, BY, 13, 14, bend=-1.5, pairs=2)
        stem(sp, 17, BY, 21, 20, bend=1.5, pairs=2)
        stem(sp, 15, BY, 8, 22, bend=-1, pairs=1)
        blades(sp, 6, 8)
        bud(sp, 21, 18)
        bud(sp, 8, 20)
        carnation(sp, 13, 10, 4.2)
    else:
        stem(sp, 15, BY, 12, 12, bend=-2, pairs=2)
        stem(sp, 17, BY, 22, 17, bend=2, pairs=2)
        stem(sp, 15, BY, 7, 23, bend=-1.5, pairs=1)
        stem(sp, 16, BY, 17, 17, bend=0.5, pairs=1)
        blades(sp, 6, 9)
        bud(sp, 17, 15)
        carnation(sp, 7, 20, 3.6)
        carnation(sp, 23, 14, 4.2)
        carnation(sp, 12, 8, 4.8)
    return sp
