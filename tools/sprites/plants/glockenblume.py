"""Glockenblume (Campanula) – Blumenwiese. Lockerer Horst aus schlanken, leicht
überhängenden Stielen mit einzelnen nickenden Glocken (fünf Zipfel, innen dunkel),
kleine rundliche Grundblätter und schmale Stängelblätter. Luftig, nicht dicht."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import stamp, leaf_line

VARIANTS = {
    "blau": None,
    "lila": {"bw_bellblue": "petal_purple"},
    "weiss": {"bw_bellblue": "bw_white"},
}

BY = 29
BELLC = "bw_bellblue"

# nickende Glocken (Öffnung nach unten, Zipfel ausgestellt, innen dunkel)
BELL = {
    "L": [".lb.",
          "lhbs",
          "lhbs",
          "hlbss",
          "l.o.s"],
    "M": [".b.",
          "lhs",
          "lbbs",
          "l.os"],
    "S": [".b.",
          "lbs",
          "l.s"],
}
GBUD = [".b.", "lbs", ".s."]


def bell(sp, x, y, size="M", flip=False):
    """(x, y) = Aufhängepunkt oben an der Glocke."""
    art = BELL[size]
    w = max(len(r) for r in art)
    art = [r.ljust(w, ".") for r in art]
    stamp(sp, x + (0.5 if w % 2 else 0), y + len(art) / 2, art, BELLC, flip=flip)


def leaf(sp, x, y, ang, L, W=None):
    heart_leaf(sp.layer("leaf"), x, y, ang, L, W or L * 0.3, notch=False, midrib=L >= 6, vein=SHADE)


def raceme(sp, pts, bells, bud=True):
    """Stiel als Kurve pts (unten → Spitze). bells: Liste (t, Seite, Größe).
    Jede Glocke hängt an einem kurzen, gebogenen Blütenstiel."""
    stalk_layer = sp.layer("stem", outline=False, shading=False)
    stalk_layer.curve(pts, tone=SHADE)

    def at(t):
        p = list(pts)
        while len(p) > 1:
            p = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(p, p[1:])]
        return p[0]

    # schmale Stängelblätter weiter unten
    for t, side in ((0.18, -1), (0.32, 1)):
        x, y = at(t)
        leaf_line(sp, x, y, x + side * 3, y - 2, bend=-side * 0.4, ramp="leaf", tone=BASE)
    if bud:
        x, y = at(1.0)
        stamp(sp, x + 0.5, y + 1.5, GBUD, "leaf")
    for (t, side, size) in bells:
        x, y = at(t)
        hx = x + side * 3
        stalk_layer.line(round(x), round(y), round(x + side * 2), round(y) - 1, tone=SHADE)
        stalk_layer.px(round(hx), round(y), SHADE)
        bell(sp, hx + (0.5 if side > 0 else -0.5), y + 0.5, size, flip=side < 0)


ROSETTE = {
    1: [(14, BY, -140, 5), (17, BY, -45, 5.5), (16, BY, -100, 4.5)],
    2: [(13, BY, -155, 6), (18, BY, -28, 6.5), (15, BY, -118, 5.5), (17, BY, -72, 5)],
    3: [(12, BY, -162, 6.5), (19, BY, -18, 7), (14, BY, -128, 6), (18, BY, -60, 6), (16, BY, -96, 4.5)],
    4: [(11, BY, -166, 7), (20, BY, -14, 7), (13, BY, -134, 6.5), (18, BY, -50, 6.5), (16, BY, -98, 5)],
    5: [(10, BY, -168, 7.5), (21, BY, -12, 7.5), (13, BY, -138, 6.5), (19, BY, -44, 6.5), (16, BY, -100, 5)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    for (x, y, a, L) in ROSETTE[stage]:
        leaf(sp, x, y, a, L)
    if stage == 2:
        raceme(sp, [(16, BY), (16, 24), (17, 20)], [])
    elif stage == 3:
        raceme(sp, [(15, BY), (14, 20), (17, 11)], [(0.78, 1, "S"), (0.56, -1, "M")])
    elif stage == 4:
        raceme(sp, [(15, BY), (12, 16), (15, 5)], [(0.86, 1, "S"), (0.68, -1, "M"), (0.5, 1, "L")])
        raceme(sp, [(17, BY), (21, 22), (23, 14)], [(0.82, 1, "M"), (0.58, -1, "S")])
    elif stage == 5:
        raceme(sp, [(14, BY), (8, 15), (11, 2)], [(0.9, 1, "S"), (0.74, -1, "M"), (0.57, 1, "L"), (0.42, -1, "L")])
        raceme(sp, [(17, BY), (24, 18), (24, 6)], [(0.9, -1, "S"), (0.74, 1, "M"), (0.58, -1, "L"), (0.42, 1, "M")])
        raceme(sp, [(16, BY), (16, 23), (17, 19)], [], bud=True)
    return sp
