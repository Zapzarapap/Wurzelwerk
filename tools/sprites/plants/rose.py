"""Rose – Blumenwiese. Strauch mit gefiederten Blättern, Knospen und spiralig gerollten Blüten."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import stamp

VARIANTS = {
    "rot": None,
    "rosa": {"petal_red": "petal_pink"},
    "weiss": {"petal_red": "bw_white"},
    "gelb": {"petal_red": "petal_yellow"},
    "orange": {"petal_red": "petal_orange"},
}

BY = 29


# Rosenblüten als Kelch von schräg vorn: wellige Oberkante, eingerollte Mitte
# (Spirale), helle Blütenblatt-Ränder, unten schmaler zulaufend.
BLOOM = {
    "S": [".lhl.",
          "lbosb",
          "lslbs",
          ".lbs.",
          "..s.."],
    "M": [".lh.hl.",
          "lhboobl",
          "lbslsbs",
          "lslssbs",
          ".lbbbs.",
          "..sss.."],
    "L": ["..lh.hhl.",
          ".lhbllbbl",
          "lhsoossbs",
          "lbslhlosb",
          "lbsosbsbs",
          ".lllbsbs.",
          "..sbbbs..",
          "...sss..."],
    "XL": ["..lh..hl...",
           ".lhbllhbbl.",
           "lhbsooosbbl",
           "lbsolhlosbs",
           "lbsoslsosbs",
           ".lbsoosbbs.",
           ".llbsslbsb.",
           "..llbbbss..",
           "...ssss...."],
}
BUD = ["..l..",
       ".lhb.",
       ".lbs.",
       ".lbs.",
       "..s.."]
SEPALS = ["l.b.b",
          ".lbs."]


def leaflet(sp, x, y, ang, L, ramp="bw_roseleaf"):
    heart_leaf(sp.layer(ramp), x, y, ang, L, L * 0.45, notch=False, midrib=L >= 4, vein=SHADE)


def leaf_group(sp, x, y, ang, s=1.0, ramp="bw_roseleaf"):
    """Gefiedertes Rosenblatt: Stiel mit Endblättchen und zwei Seitenblättchen."""
    a = math.radians(ang)
    ex, ey = x + math.cos(a) * 4.5 * s, y + math.sin(a) * 4.5 * s
    stalk(sp, x, y, ex, ey, ramp=ramp)
    mx, my = x + math.cos(a) * 2.2 * s, y + math.sin(a) * 2.2 * s
    leaflet(sp, mx, my, ang - 65, 3.2 * s, ramp)
    leaflet(sp, mx, my, ang + 65, 3.2 * s, ramp)
    leaflet(sp, ex - math.cos(a), ey - math.sin(a), ang, 4.2 * s, ramp)


def bud(sp, x, y, s=1.0):
    stamp(sp, x + 0.5, y, BUD, "petal_red")
    stamp(sp, x + 0.5, y + 2.5, SEPALS, "bw_roseleaf")


def bloom(sp, x, y, r):
    size = "S" if r < 3 else ("M" if r < 4 else ("L" if r < 5 else "XL"))
    h = len(BLOOM[size])
    stamp(sp, x + 0.5, y + h / 2 + 0.5, ["lbbs"], "bw_roseleaf")  # Kelchblätter
    stamp(sp, x + 0.5, y + 0.5, BLOOM[size], "petal_red")


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 1:
        # roter Trieb mit kleinen gefiederten Blättern (typisch Rose)
        stalk(sp, 15, BY, 15, 23, bend=0.4, ramp="bw_roseshoot")
        leaf_group(sp, 15, 26, -155, 0.65)
        leaf_group(sp, 15, 25, -25, 0.65)
        leaflet(sp, 15, 24, -92, 3.4)
    elif stage == 2:
        stalk(sp, 15, BY, 15, 20, bend=0.5)
        leaf_group(sp, 15, 26, -150, 0.8)
        leaf_group(sp, 15, 23, -30, 0.8)
        leaflet(sp, 15, 21, -95, 4)
    elif stage == 3:
        stalk(sp, 15, BY, 14, 14, bend=-1)
        stalk(sp, 16, BY, 20, 20, bend=1)
        leaf_group(sp, 15, 26, -160, 1.0)
        leaf_group(sp, 15, 22, -25, 1.0)
        leaf_group(sp, 14, 18, -150, 0.9)
        leaf_group(sp, 19, 22, -30, 0.7)
        bud(sp, 14, 12)
    elif stage == 4:
        stalk(sp, 15, BY, 13, 12, bend=-2)
        stalk(sp, 16, BY, 22, 19, bend=1.5)
        leaf_group(sp, 15, 26, -165, 1.1)
        leaf_group(sp, 15, 22, -20, 1.1)
        leaf_group(sp, 14, 18, -150, 1.0)
        leaf_group(sp, 19, 23, -150, 0.8)
        bloom(sp, 13, 9, 4.4)
        bud(sp, 22, 17, 0.9)
    else:
        stalk(sp, 15, BY, 12, 14, bend=-2)
        stalk(sp, 16, BY, 23, 20, bend=2)
        stalk(sp, 15, 27, 8, 23, bend=-1)
        stalk(sp, 16, 25, 20, 13, bend=1.5)
        leaf_group(sp, 15, 27, -168, 1.2)
        leaf_group(sp, 16, 26, -15, 1.2)
        leaf_group(sp, 14, 20, -150, 1.1)
        leaf_group(sp, 17, 19, -35, 1.1)
        leaf_group(sp, 12, 25, 160, 0.8)
        leaf_group(sp, 16, 24, -92, 1.25)
        leaflet(sp, 17, 28, -60, 3.6)
        bud(sp, 20, 10, 0.95)
        bloom(sp, 24, 17, 3.6)
        bloom(sp, 8, 20, 3.6)
        bloom(sp, 12, 9, 5.4)
    return sp
