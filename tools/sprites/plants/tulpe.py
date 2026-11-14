"""Tulpe – Blumenwiese. Kelchförmige Blüte auf kräftigem Stiel, breite bereifte
blaugrüne Blätter, die von unten aufsteigen."""
REGION = "blumenwiese"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import stamp

VARIANTS = {
    "rot": None,
    "gelb": {"petal_red": "petal_yellow"},
    "rosa": {"petal_red": "petal_pink"},
    "weiss": {"petal_red": "bw_white"},
    "orange": {"petal_red": "petal_orange"},
    "lila": {"petal_red": "petal_purple"},
}

BY = 29

# Kelch: drei sichtbare Blütenblätter, oben gekerbte Spitzen, unten rund.
CUP = {
    "L": ["....h....",
          ".l.lhb.b.",
          "lh.lhbbbs",
          "lhllhbbss",
          "lhlhlbbss",
          "lhllbbbss",
          "lhllbbbss",
          ".lhlbbss.",
          "..sbbss.."],
    "M": ["...h...",
          "l.lhb.b",
          "lhlhbbs",
          "lhlhbbs",
          "lllbbss",
          "lllbbss",
          ".lbbbs.",
          "..sss.."],
}
BUD = ["..h..",
       ".lhb.",
       ".lhbs",
       ".lbbs",
       "..bs."]


def stem(sp, x0, y0, x1, y1, bend=0.0):
    """Kräftiger Tulpenstiel (2 px)."""
    stalk(sp, x0 + 1, y0, x1 + 1, y1, bend=bend, ramp="bw_glaucous", tone=SHADE)
    stalk(sp, x0, y0, x1, y1, bend=bend, ramp="bw_glaucous", tone=LIGHT)


def leaf(sp, bx, ang, L, W):
    heart_leaf(sp.layer("bw_glaucous"), bx, BY, ang, L, W, notch=False, midrib=L >= 7, vein=SHADE)


def tulip(sp, x, y, size="L"):
    stamp(sp, x, y, CUP[size], "petal_red")


def bud(sp, x, y, colored=False):
    stamp(sp, x, y, BUD, "petal_red" if colored else "bw_glaucous")


LEAVES = {
    1: [(15, -100, 6, 1.7), (17, -70, 4.5, 1.5)],
    2: [(14, -118, 9, 2.2), (17, -60, 8, 2.1), (16, -92, 5, 1.5)],
    3: [(14, -132, 11, 2.5), (18, -50, 10, 2.4), (16, -98, 7, 1.9)],
    4: [(13, -142, 12, 2.7), (19, -42, 11, 2.6), (15, -112, 9, 2.2), (17, -76, 7, 1.9)],
    5: [(12, -152, 12, 2.8), (20, -30, 12, 2.8), (14, -122, 10, 2.4), (18, -62, 10, 2.3), (16, -96, 6, 1.8)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 3:
        stem(sp, 15, BY, 15, 15, bend=0.3)
    elif stage == 4:
        stem(sp, 15, BY, 15, 13, bend=0.5)
    elif stage == 5:
        stem(sp, 14, BY, 9, 12, bend=-1)
        stem(sp, 16, BY, 23, 15, bend=1.2)
        stem(sp, 15, BY, 16, 18, bend=0)
    for (bx, ang, L, W) in LEAVES[stage]:
        leaf(sp, bx, ang, L, W)
    if stage == 3:
        bud(sp, 16, 13)
    elif stage == 4:
        tulip(sp, 16, 9)
    elif stage == 5:
        tulip(sp, 16.5, 14, "M")
        tulip(sp, 23.5, 10)
        tulip(sp, 9.5, 7)
    return sp
