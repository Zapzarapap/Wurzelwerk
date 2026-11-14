"""Orchidee (Phalaenopsis) – Pflanzenhandlung.

Unten wenige breite, dicke, glänzende Blätter, die flach nach außen kippen,
dazu silbrige Luftwurzeln über dem Topfrand. Die Blütenrispe wächst an einem
Bambusstab hoch und biegt oben in einem Bogen über: Stufe 4 mit Knospen,
Stufe 5 mit einem Bogen offener „Schmetterlings“-Blüten (Knospen an der Spitze).
"""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, rib

VARIANTS = {
    "weiss": {"petal_red": "petal_white"},
    "rosa": {"petal_red": "petal_pink"},
    "lila": {"petal_red": "petal_purple"},
    "gelb": {"petal_red": "petal_yellow"},
}

STAKE_X = 19


def _bez(pts, t):
    p = list(pts)
    while len(p) > 1:
        p = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(p, p[1:])]
    return p[0]


FLOWER = ["..P..",
          "PPPPP",
          "PPLPP",
          ".PlP.",
          ".P.P."]


def flower(sp, x0, y0):
    """Phalaenopsis-Blüte von vorn (5x5, links oben = x0, y0): oberes Kelchblatt,
    zwei breite Kronblätter, zwei untere Kelchblätter, dunkle Lippe in der Mitte."""
    f = sp.layer("petal_red")
    lip = sp.layer("ph_orchid_lip", outline=False, shading=False)
    for dy, row in enumerate(FLOWER):
        for dx, ch in enumerate(row):
            if ch != ".":
                f.px(x0 + dx, y0 + dy)
            if ch == "L":
                lip.px(x0 + dx, y0 + dy, BASE)
            elif ch == "l":
                lip.px(x0 + dx, y0 + dy, SHADE)
    return f


def bud(sp, x, y, big=False):
    b = sp.layer("petal_red")
    b.px(x, y)
    if big:
        b.px(x + 1, y)
        b.px(x, y + 1)
        b.px(x + 1, y + 1)
    return b


def root(sp, pts, steps=30):
    lay = sp.layer("ph_orchid_root")
    for i in range(steps + 1):
        x, y = _bez(pts, i / steps)
        lay.px(math.floor(x), math.floor(y))
    return lay


# Blätter: (Ansatz x, y, Winkel, Länge, halbe Breite, Biegung) – hinten -> vorn
LEAVES = {
    1: [(15, 22.5, -160, 4.5, 1.5, -10), (16.5, 22.5, -25, 4, 1.4, 14)],
    2: [(15.5, 22, -110, 4.5, 1.6, -12), (14.5, 22.5, -168, 6.5, 2.0, -12), (16.5, 22.5, -14, 6.5, 2.0, 14)],
    3: [(15.5, 22, -112, 5, 1.8, -14), (16.5, 22.5, -12, 8.5, 2.3, 16), (14.5, 22.5, -170, 8.5, 2.3, -14)],
    4: [(15.5, 22, -108, 5.5, 1.9, -16), (16.5, 22.5, -14, 9.5, 2.5, 20),
        (14.5, 22.5, -168, 10, 2.5, -18), (15, 22.5, -145, 6, 2.0, -24)],
    5: [(15.5, 22, -108, 6, 2.0, -16), (16.5, 22.5, -14, 10.5, 2.6, 22),
        (14.5, 22.5, -168, 10.5, 2.6, -20), (15, 22.5, -145, 6.5, 2.1, -24)],
}

# Rispe: senkrecht am Stab bis y=10, dann Bogen nach links
ARCH = [(STAKE_X, 10), (STAKE_X, 6), (17, 4), (13, 3.5), (9, 4.5), (6, 7), (4, 10.5), (3, 14)]
# Stufe 5: Blüten (linke obere Ecke) und Knospen (x, y, groß?)
FLOWERS = [(15, 5), (10, 4.5), (5, 7.5)]
BUDS5 = [(3, 13, True), (2, 16, False)]
BUDS4 = [(16, 4, True), (12, 3, True), (9, 4, False)]


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp, "cream")
    if stage >= 4:
        # Bambusstab und Rispe
        st = sp.layer("ph_bamboo", outline=False, shading=False)
        st.rect(STAKE_X + 1, 7, STAKE_X + 1, SOIL_Y - 1, tone=BASE)
        st.px(STAKE_X + 1, 6, LIGHT)
        sk = sp.layer("stem", outline=False, shading=False)
        sk.line(STAKE_X - 1, SOIL_Y - 1, STAKE_X, 19, tone=SHADE)
        sk.line(STAKE_X, 19, *ARCH[0], tone=SHADE)
        pts = ARCH if stage == 5 else ARCH[:6]
        for a, b in zip(pts, pts[1:]):
            sk.line(*a, *b, tone=SHADE)
        clip = sp.layer("ph_orchid_root", outline=False, shading=False)
        clip.px(STAKE_X, 15, LIGHT)
        clip.px(STAKE_X + 1, 15, LIGHT)
    if stage >= 3:
        root(sp, [(12.5, 23.5), (10, 24), (10, 27.5)])
    if stage >= 5:
        root(sp, [(18.5, 23.5), (21.5, 24), (22.5, 27)])
    for (bx, by, ang, L, W, bend) in LEAVES[stage]:
        leaf(sp, "ph_orchid_leaf", bx, by, ang, L, W, "paddle", bend=bend,
             overlays=[("ph_orchid_leaf", rib(SHADE, 0.45, 0.05, 0.85))] if L >= 6 else [])
    if stage == 4:
        for (x, y, big) in BUDS4:
            bud(sp, x, y + 1, big)
    elif stage == 5:
        for (x, y, big) in BUDS5:
            bud(sp, x, y, big)
        for (x, y) in FLOWERS:
            flower(sp, x, y)
    return sp
