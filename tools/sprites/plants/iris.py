"""Schwertlilie (Iris) – Blumenwiese. Fächer aus steifen, schwertförmigen,
blaugrünen Blättern; hoher, gerader Blütenstiel; Blüte wie eine Fleur-de-lis:
drei aufrechte Domblätter oben, drei hängende Hängeblätter mit gelbem Bart."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import stamp

VARIANTS = {
    "lila": None,
    "blau": {"petal_purple": "petal_blue"},
    # gelbe Iris: Bart dunkler goldorange
    "gelb": {"petal_purple": "petal_yellow", "petal_yellow": "petal_orange"},
    "weiss": {"petal_purple": "bw_white"},
}

BY = 29
PET = "petal_purple"
LEAF = "bw_glaucous"
BEARD = {"y": ("petal_yellow", LIGHT), "z": ("petal_yellow", BASE)}

FLOWER = {
    "L": [".....h.....",
          "....lhb....",
          "...lhhbs...",
          "...lhbbs...",
          "....lbs....",
          ".lh.yzb.bb.",
          "lhhlyzbbbbs",
          "lhb.lzs.bss",
          "lb..lbs..bs",
          "l...lbs...s",
          ".....s....."],
    "M": ["....h....",
          "...lhb...",
          "...lhbs..",
          "....bs...",
          ".lhyzbbs.",
          "lhblzsbbs",
          "lb.lbs.bs",
          "l..lbs..s",
          "....s...."],
}
BUD = [".h.",
       "lhb",
       "lbs",
       "lbs",
       ".s."]
SHEATH = ["lb", "lb", "bs"]


def sword(sp, x, ang, L, bend=0.0):
    """Schwertblatt: 2 px breit, gerade und steif, oben spitz zulaufend (1 px),
    Lichtkante links, mittlere Rippe dunkler. bend > 0: Spitze neigt sich nach außen."""
    lay = sp.layer(LEAF, shading=False)
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    n = int(L * 3)
    for i in range(n + 1):
        t = i / n
        cx = x + 0.5 + ca * L * t + bend * t * t * (1 if ca >= 0 else -1)
        cy = BY + 0.5 + sa * L * t
        px, py = math.floor(cx), math.floor(cy)
        tip = t > 0.82
        lay.px(px, py, (HIGHLIGHT if t > 0.3 and i % 5 == 0 else LIGHT) if not tip else BASE)
        if not tip:
            lay.px(px + 1, py, BASE if t < 0.9 else SHADE)
            if t < 0.25:
                lay.px(px + 2, py, SHADE)


def stem(sp, x0, x1, y1):
    stalk(sp, x0 + 1, BY, x1 + 1, y1, ramp=LEAF, tone=SHADE)
    stalk(sp, x0, BY, x1, y1, ramp=LEAF, tone=LIGHT)


def flower(sp, x, y, size="L"):
    """(x, y) = oberes Ende des Stiels; Blüte sitzt darauf."""
    art = FLOWER[size]
    stamp(sp, x + 0.5, y - len(art) / 2 + 3, art, PET, BEARD)


def bud(sp, x, y, colored=True):
    stamp(sp, x + 0.5, y - 1, BUD, PET if colored else LEAF)
    stamp(sp, x + 0.5, y + 2.5, SHEATH, LEAF)


FAN = {
    1: [(15, -98, 5.5), (16, -80, 4.5), (14, -114, 3.5)],
    2: [(14, -100, 9), (16, -82, 8), (13, -118, 6.5), (17, -66, 5.5)],
    3: [(14, -98, 12), (16, -84, 11), (12, -114, 9), (17, -68, 8.5), (11, -130, 6)],
    4: [(14, -97, 12.5), (16, -85, 11.5), (12, -112, 10), (18, -70, 9.5), (10, -128, 7.5), (19, -56, 6.5)],
    5: [(13, -97, 13.5), (16, -86, 12.5), (11, -110, 11.5), (18, -72, 11), (9, -126, 9), (20, -58, 8.5),
        (8, -142, 6.5), (22, -40, 6)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp, w=8 if stage >= 4 else 7)
    fan = FAN[stage]
    back, front = fan[1::2], fan[0::2]
    for (x, a, L) in back:
        sword(sp, x, a, L, bend=0.6 if L > 9 else 0)
    if stage == 3:
        stem(sp, 15, 15, 12)
    elif stage == 4:
        stem(sp, 15, 15, 8)
        stem(sp, 18, 22, 15)
    elif stage == 5:
        stem(sp, 14, 12, 7)
        stem(sp, 17, 23, 10)
        stem(sp, 16, 18, 15)
    for (x, a, L) in front:
        sword(sp, x, a, L, bend=0.6 if L > 9 else 0)
    if stage == 3:
        bud(sp, 15, 10)
    elif stage == 4:
        flower(sp, 15, 8)
        bud(sp, 22, 13)
    elif stage == 5:
        bud(sp, 18, 14, colored=True)
        flower(sp, 23, 10, "M")
        flower(sp, 12, 7)
    return sp
