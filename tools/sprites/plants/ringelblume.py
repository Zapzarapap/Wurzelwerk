"""Ringelblume (Calendula) – Blumenwiese. Niedriger, buschiger Horst aus hellgrünen,
spateligen Blättern; viele mittelgroße, gefüllte Strahlenblüten in Orange/Gelb
(zwei Kränze schmaler Zungenblüten) mit dunkelbrauner bzw. gleichfarbiger Mitte,
einige Köpfe schräg von der Seite."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import stamp

VARIANTS = {
    "orange": None,
    # gelbe Sorten haben meist eine gleichfarbige (goldorange) Mitte
    "gelb": {"petal_orange": "petal_yellow", "bw_russet": "petal_orange"},
}

BY = 29
PETAL = "petal_orange"

# Blütenköpfe: dichter Kranz schmaler Zungenblüten (gefranster Rand), innen heller,
# kleine Mitte (c/d/e = Mitte dunkel/hell/mittel).
HEAD = {
    "L": ["...l.h...",
          ".l.hlh.b.",
          ".lhlhlhb.",
          "hlhhlhbbs",
          ".lhdebhb.",
          "hlhecbbbs",
          ".lbhbbbs.",
          ".b.sbs.s.",
          "...s.s..."],
    "M": ["..l.h..",
          ".lhlhb.",
          "hlhhlbs",
          ".hdebb.",
          "lbecbbs",
          ".bsbss.",
          "..s.s.."],
}
# schräg von der Seite: flache Scheibe
SIDE = [".h.l.h.l.",
        "hlhlhlhbb",
        "lhhdeebbs",
        ".sbsbsbs.",
        "..s.s.s.."]
CX = {"c": ("bw_russet", SHADE), "d": ("bw_russet", BASE), "e": ("bw_russet", SHADE)}
BUD = [".lb.",
       "lhbs",
       ".ss."]


def leaf(sp, x, y, ang, L, W=None):
    """Spateliges, weiches Ringelblumenblatt (vorn breit, zum Stiel schmal)."""
    heart_leaf(sp.layer("leaf"), x, y, ang, L, W or L * 0.4, notch=False, midrib=L >= 6, vein=SHADE)


def flower(sp, x, y, size="L"):
    stamp(sp, x, y, HEAD[size], PETAL, CX)


def side_flower(sp, x, y):
    stamp(sp, x, y + 2, ["lbs"], "leaf")
    stamp(sp, x, y, SIDE, PETAL, CX)


def bud(sp, x, y):
    stamp(sp, x + 0.5, y, BUD, PETAL)
    stamp(sp, x + 0.5, y + 1.5, ["lbs"], "leaf")


STEMS = []


def stem(sp, x0, y0, x1, y1, bend=0.0):
    stalk(sp, x0, y0, x1, y1, bend=bend, ramp="leaf", tone=BASE)
    STEMS.append((x0, y0, x1, y1, bend))


def stem_leaves(sp):
    """Wechselständige, stängelumfassende Blätter an den Blütenstielen (macht den Busch dicht)."""
    for i, (x0, y0, x1, y1, bend) in enumerate(STEMS):
        if y0 - y1 < 9:
            continue
        side = 1 if x1 >= x0 else -1
        for k, t in enumerate((0.45, 0.68)):
            lx = x0 + (x1 - x0) * t + bend * 0.5
            ly = y0 + (y1 - y0) * t
            sd = side if (k + i) % 2 == 0 else -side
            leaf(sp, lx, ly, -90 + sd * (55 + 10 * k), 4.6 - 0.8 * k)


def tuft(sp, spec):
    for (x, y, ang, L) in spec:
        leaf(sp, x, y, ang, L)


TUFT = {
    1: [(14, BY, -150, 5), (17, BY, -35, 5.5), (15, BY, -100, 4.5)],
    2: [(13, BY, -165, 6.5), (18, BY, -18, 6.5), (14, BY, -128, 6), (17, BY, -60, 6), (16, BY, -96, 5)],
    3: [(12, BY, -170, 7.5), (19, BY, -12, 7.5), (13, BY, -140, 7), (18, BY, -45, 7), (15, BY, -110, 6.5),
        (17, BY, -78, 6.5)],
    4: [(11, BY, -172, 8), (20, BY, -8, 8), (13, BY, -145, 7.5), (18, BY, -38, 7.5), (14, BY, -116, 7),
        (17, BY, -70, 7.5), (15, 25, -150, 5), (17, 24, -30, 5)],
    5: [(10, BY, -174, 8.5), (21, BY, -6, 8.5), (12, BY, -150, 8), (19, BY, -32, 8), (14, BY, -122, 7.5),
        (17, BY, -66, 8), (16, BY, -95, 6), (13, 24, -160, 5), (19, 23, -25, 5.5)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    STEMS.clear()
    meadow_ground(sp, w=8 if stage >= 4 else 7)
    if stage == 2:
        stem(sp, 16, BY, 16, 21, bend=0.3)
    elif stage == 3:
        stem(sp, 16, BY, 15, 16, bend=-0.5)
        stem(sp, 17, BY, 20, 20, bend=0.8)
    elif stage == 4:
        stem(sp, 15, BY, 11, 13, bend=-1)
        stem(sp, 17, BY, 21, 16, bend=1)
        stem(sp, 16, BY, 17, 11, bend=0.5)
    elif stage == 5:
        stem(sp, 15, BY, 8, 14, bend=-1.2)
        stem(sp, 17, BY, 23, 12, bend=1.2)
        stem(sp, 16, BY, 15, 8, bend=0.3)
        stem(sp, 15, BY, 6, 21, bend=-1)
        stem(sp, 17, BY, 26, 20, bend=1)
    tuft(sp, TUFT[stage])
    stem_leaves(sp)
    STEMS.clear()
    if stage == 2:
        bud(sp, 16, 20)
    elif stage == 3:
        flower(sp, 15, 13.5, "M")
        bud(sp, 20, 19)
    elif stage == 4:
        bud(sp, 17, 10)
        side_flower(sp, 21.5, 15)
        flower(sp, 11, 11.5)
    elif stage == 5:
        leaf(sp, 16, 16, -60, 4.2)
        leaf(sp, 15, 15, -125, 3.8)
        bud(sp, 6, 19)
        side_flower(sp, 25.5, 19)
        flower(sp, 23, 10.5, "M")
        flower(sp, 8, 12.5, "M")
        flower(sp, 15.5, 7.5)
    return sp
