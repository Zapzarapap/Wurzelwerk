"""Fingerhut – Blumenwiese. Breite weiche Blattrosette, darüber eine hohe
Blütenkerze mit hängenden Glocken (gefleckter Schlund), oben grüne Knospen."""
REGION = "blumenwiese"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import stamp

VARIANTS = {
    "lila": None,
    "weiss": {"bw_foxglove": "bw_white"},
    "rosa": {"bw_foxglove": "petal_pink"},
}

BY = 29
X = {"x": ("bw_spot", BASE), "w": ("bw_white", LIGHT)}

BELL = {
    "L": [".lhb.",
          "lhbbs",
          "lhbbs",
          "lbbbs",
          "hxwxs",
          ".wxw."],
    "M": [".lb.",
          "lhbs",
          "lbbs",
          "wxws"],
    "S": ["lb",
          "hs",
          "bs"],
}
GBUD = ["lb", "bs"]  # grüne Knospe


def thick(sp, x0, y0, x1, y1, bend=0.0):
    stalk(sp, x0 + 1, y0, x1 + 1, y1, bend=bend, tone=SHADE)
    stalk(sp, x0, y0, x1, y1, bend=bend, tone=BASE)


def rosette(sp, spec):
    for (bx, ang, L, W) in spec:
        heart_leaf(sp.layer("leaf"), bx, BY, ang, L, W, notch=False, midrib=L >= 6, vein=SHADE)


def raceme(sp, x, y_top, y_bot, n_green, bells):
    """Blütenkerze am Stiel x (oben y_top). bells: Liste (Größe, Seite, y) von oben nach unten."""
    yb = y_top
    for i in range(n_green):  # grüne Knospen an der Spitze
        stamp(sp, x + (1 if i % 2 else 0), yb + 1, GBUD, "leaf")
        yb += 2
    for (size, side, y) in bells:
        w = len(BELL[size][0])
        dx = side * (w / 2 + 0.6) + (1 if side > 0 else 0)
        stamp(sp, x + dx, y, BELL[size], "bw_foxglove", X, flip=side < 0)


ROSETTE = {
    1: [(13, -168, 5.5, 2.9), (18, -12, 5.5, 2.9)],
    2: [(12, -170, 8, 3.1), (19, -10, 8, 3.1), (14, -132, 6, 2.6), (17, -50, 6, 2.6)],
    3: [(12, -166, 8, 2.9), (19, -14, 8, 2.9), (14, -132, 6.5, 2.5), (18, -50, 6.5, 2.5)],
    4: [(11, -168, 9, 3.1), (20, -12, 9, 3.1), (14, -138, 7, 2.6), (18, -44, 7, 2.6)],
    5: [(11, -170, 8.8, 3.2), (21, -10, 9, 3.2), (13, -142, 7.5, 2.7), (19, -40, 7.5, 2.7), (16, -100, 5, 2.2)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp, w=8 if stage >= 4 else 7)
    if stage == 3:
        thick(sp, 15, BY - 2, 15, 13)
    elif stage == 4:
        thick(sp, 15, BY - 2, 15, 5, bend=0.5)
    elif stage == 5:
        thick(sp, 21, BY - 2, 22, 11, bend=0.5)
        thick(sp, 14, BY - 2, 13, 2, bend=-0.5)
    rosette(sp, ROSETTE[stage])
    if stage == 3:
        raceme(sp, 15, 12, 24, 3, [("S", 1, 19), ("S", -1, 21)])
    elif stage == 4:
        raceme(sp, 15, 4, 24, 3, [("S", 1, 11), ("S", -1, 12), ("M", 1, 15), ("M", -1, 17), ("M", 1, 20), ("L", -1, 22)])
    elif stage == 5:
        raceme(sp, 22, 10, 24, 2, [("S", 1, 15), ("M", -1, 17), ("M", 1, 20)])
        raceme(sp, 13, 1, 24, 3, [("S", 1, 7), ("S", -1, 8), ("M", 1, 11), ("M", -1, 13), ("L", 1, 16),
                                   ("L", -1, 19), ("L", 1, 22)])
    return sp
