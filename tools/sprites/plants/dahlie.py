"""Dahlie – Blumenwiese. Kräftiger, buschiger Strauch mit dunkelgrünem, gefiedertem Laub,
darüber große, kugelige Pompon-Blüten aus schuppig versetzten Röhrenblütenblättern."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import stamp

VARIANTS = {
    "rot": None,
    "rosa": {"petal_red": "petal_pink"},
    "orange": {"petal_red": "petal_orange"},
    "gelb": {"petal_red": "petal_yellow"},
    "weiss": {"petal_red": "bw_white"},
    "lila": {"petal_red": "petal_purple"},
}

BY = 29
LEAF = "bw_dahlialeaf"

# Dahlienblüten von vorn: Kranz aus breiten Zungenblüten mit Kerben am Rand
# und dunklen Fugen dazwischen, innen ein hellerer zweiter Kranz um die dichte Mitte.
BLOOM = {
    "L": ["....hl.lb....",
          "...hhlslbb...",
          ".lhshlslbsbs.",
          "hlhlshhlsbbs.",
          "lhlhhlhlbsbss",
          ".sssllsbsooo.",
          "lblblbbsssbsb",
          "lblbsbososbs.",
          ".lbsbsosboss.",
          "...bsbosss...",
          "....ss.ss...."],
    "M": ["..hl.lb..",
          ".hlslsbb.",
          "hlhhlbsbs",
          ".sslsboo.",
          "lblbssbsb",
          ".bsosobs.",
          "..s.s.s.."],
}
BUD = [".lb.",
       "lhbs",
       "lbbs",
       ".ss."]
GREEN_BUD = [".l.",
             "lbs",
             ".s."]


def stem(sp, x0, y0, x1, y1, bend=0.0):
    """Kräftiger, 2 px breiter Dahlienstängel."""
    stalk(sp, x0 + 1, y0, x1 + 1, y1, bend=bend, ramp=LEAF, tone=SHADE)
    stalk(sp, x0, y0, x1, y1, bend=bend, ramp=LEAF, tone=BASE)


def leaf(sp, x, y, ang, L, W=None):
    heart_leaf(sp.layer(LEAF), x, y, ang, L, W or L * 0.42, notch=False, midrib=L >= 5, vein=SHADE)


def frond(sp, x, y, ang, s=1.0):
    """Gefiedertes Dahlienblatt: großes, spitzes Endblättchen + zwei Seitenblättchen."""
    a = math.radians(ang)
    mx, my = x + math.cos(a) * 1.6 * s, y + math.sin(a) * 1.6 * s
    leaf(sp, mx, my, ang - 60, 3.2 * s)
    leaf(sp, mx, my, ang + 60, 3.2 * s)
    leaf(sp, x + math.cos(a) * 2.4 * s, y + math.sin(a) * 2.4 * s, ang, 5.6 * s)


def bloom(sp, x, y, size="L"):
    """Blüte, (x, y) = Mitte des Stempels; darunter grüne Hüllblätter."""
    h = len(BLOOM[size])
    stamp(sp, x, y + h / 2 - 0.5, ["lbbs"] if size == "L" else ["lbs"], LEAF)
    stamp(sp, x, y, BLOOM[size], "petal_red")


def bud(sp, x, y, colored=True):
    if colored:
        stamp(sp, x + 0.5, y, BUD, "petal_red")
        stamp(sp, x + 0.5, y + 2.5, ["lbs"], LEAF)
    else:
        stamp(sp, x + 0.5, y, GREEN_BUD, LEAF)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp, w=8 if stage >= 3 else 7)
    if stage == 1:
        stem(sp, 15, BY, 15, 25)
        leaf(sp, 15, 26, -155, 4.5, 2.0)
        leaf(sp, 16, 25, -30, 5, 2.1)
        leaf(sp, 15, 24, -98, 3.5, 1.5)
    elif stage == 2:
        stem(sp, 15, BY, 15, 19, bend=0.4)
        frond(sp, 15, 27, -168, 0.85)
        frond(sp, 16, 26, -15, 0.9)
        frond(sp, 15, 22, -140, 0.7)
        frond(sp, 16, 21, -45, 0.65)
        bud(sp, 16, 17, colored=False)
    elif stage == 3:
        stem(sp, 15, BY, 14, 14, bend=-0.8)
        stem(sp, 16, BY, 21, 19, bend=1)
        frond(sp, 15, 27, -172, 1.05)
        frond(sp, 16, 27, -8, 1.0)
        frond(sp, 14, 22, -150, 0.9)
        frond(sp, 18, 23, -35, 0.85)
        frond(sp, 14, 18, -115, 0.7)
        bud(sp, 14, 12)
        bud(sp, 21, 17, colored=False)
    elif stage == 4:
        stem(sp, 15, BY, 13, 13, bend=-1.0)
        stem(sp, 16, BY, 23, 17, bend=1.4)
        frond(sp, 15, 27, -174, 1.2)
        frond(sp, 16, 27, -6, 1.15)
        frond(sp, 14, 23, -150, 1.0)
        frond(sp, 19, 22, -30, 1.0)
        frond(sp, 13, 18, -125, 0.8)
        frond(sp, 17, 19, -70, 0.75)
        frond(sp, 16, 24, -84, 0.75)
        bud(sp, 23, 15)
        bloom(sp, 13.5, 8.5)
    else:
        stem(sp, 15, BY, 11, 12, bend=-1.2)
        stem(sp, 16, BY, 23, 14, bend=1.6)
        stem(sp, 15, BY, 7, 20, bend=-1)
        stem(sp, 16, 26, 18, 17, bend=0.4)
        frond(sp, 15, 27, -176, 1.25)
        frond(sp, 16, 27, -4, 1.25)
        frond(sp, 13, 23, -150, 1.05)
        frond(sp, 19, 22, -30, 1.05)
        frond(sp, 15, 20, -95, 0.85)
        frond(sp, 20, 18, -55, 0.75)
        frond(sp, 17, 25, -78, 0.8)
        bud(sp, 18, 15)
        bloom(sp, 6.5, 18.5, "M")
        bloom(sp, 24.5, 11.5, "M")
        bloom(sp, 11.5, 7.5)
    return sp
