"""Lilie – Blumenwiese. Hoher Stängel mit Lanzettblättern, großer sechszackiger Trichterstern."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import star_flower

VARIANTS = {
    "weiss": None,
    "rosa": {"bw_white": "petal_pink"},
    "orange": {"bw_white": "petal_orange"},
    "gelb": {"bw_white": "petal_yellow"},
    "rot": {"bw_white": "petal_red"},
}

BY = 29


def bloom(sp, x, y, size, rot=0.0):
    """Offene Lilie: sechs spitze Blütenblätter mit Mittelrinne, grüngelber Schlund, Staubblätter."""
    lay = star_flower(sp, "bw_white", x, y, size * 0.3, size, 6, ysc=0.82, rot=math.radians(rot), p=1.5, valley=0.75)
    det = sp.layer("bw_white", outline=False, shading=False)
    for k in range(6):
        ar = math.radians(rot) + k * math.pi / 3
        for t in (0.45, 0.62, 0.78):  # helle Mittelrinne jedes Blütenblatts
            q = (int(math.floor(x + math.cos(ar) * size * t)), int(math.floor(y + math.sin(ar) * size * t * 0.82)))
            if q in lay.pixels:
                det.px(*q, HIGHLIGHT if math.cos(ar) + math.sin(ar) < 0.3 else LIGHT)
    th = sp.layer("petal_yellow", outline=False, shading=False)  # Schlund
    cx, cy = int(math.floor(x)), int(math.floor(y))
    for (dx, dy, t) in ((0, 0, LIGHT), (-1, 0, HIGHLIGHT), (0, 1, BASE), (-1, -1, LIGHT) ):
        th.px(cx + dx, cy + dy, t)
    fil = sp.layer("leaf", outline=False, shading=False)
    ant = sp.layer("bw_russet", outline=False, shading=False)
    k = size / 7.0
    for (dx, dy) in ((-2.5, -3.2), (1.2, -3.8), (3.2, -2.0)) if size >= 6 else ((-1.6, -2.4), (1.8, -2.2)):
        fil.line(x, y - 0.5, x + dx * k, y + dy * k, tone=LIGHT)
        ant.px(round(x + dx * k), round(y + dy * k), BASE)


def bud(sp, x, y, L, ang=-90, colored=False):
    lay = sp.layer("bw_white" if colored else "leaf")
    heart_leaf(lay, x, y, ang, L, L * 0.33, notch=False, midrib=False)
    return lay


def thick(sp, x0, y0, x1, y1, bend=0.0):
    """Kräftiger Lilienstängel: 2 px, rechts schattiert."""
    stalk(sp, x0 + 1, y0, x1 + 1, y1, bend=bend, tone=SHADE)
    stalk(sp, x0, y0, x1, y1, bend=bend, tone=BASE)


def blade(sp, x, y, ang, L, W=1.6):
    """Lanzettliches Lilienblatt mit Outline und heller Mittelrippe."""
    heart_leaf(sp.layer("leaf"), x, y, ang, L, W, notch=False, midrib=L >= 6, vein=LIGHT)


def leaves(sp, spec):
    for leaf in spec:
        blade(sp, *leaf)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 1:
        # kräftiger Austrieb: drei Blätter wie eine kleine Spitze
        leaves(sp, [(15, 29, -130, 5, 1.7), (17, 29, -50, 5.5, 1.7), (16, 29, -94, 7, 1.9)])
    elif stage == 2:
        thick(sp, 15, BY, 15, 17, bend=0.3)
        leaves(sp, [(15, 28, -165, 7, 1.9), (16, 27, -20, 7, 1.9), (15, 23, -140, 6, 1.7),
                    (16, 21, -50, 6, 1.7), (15, 18, -100, 5, 1.6)])
    elif stage == 3:
        thick(sp, 15, BY, 15, 12, bend=-0.5)
        leaves(sp, [(15, 28, -168, 8, 1.9), (16, 26, -15, 8, 1.9), (15, 22, -148, 7, 1.8),
                    (16, 19, -35, 6.5, 1.7), (15, 16, -140, 5, 1.5)])
        bud(sp, 15.5, 13, 6, -92)
    elif stage == 4:
        thick(sp, 15, BY, 14, 11, bend=-1)
        stalk(sp, 15, 17, 21, 14, bend=-1)
        leaves(sp, [(15, 28, -170, 9, 2.0), (16, 26, -12, 8.5, 1.9), (15, 22, -150, 7.5, 1.8),
                    (16, 20, -30, 7, 1.7), (15, 16, -145, 5.5, 1.5)])
        bud(sp, 21, 15, 4.5, -60)
        bud(sp, 14.5, 12, 8, -95, colored=True)
    else:
        thick(sp, 15, BY, 12, 13, bend=-1.5)
        stalk(sp, 14, 20, 22, 18, bend=-1.5)
        stalk(sp, 15, 24, 6, 21, bend=-1)
        leaves(sp, [(15, 28, -170, 9, 2.0), (16, 27, -12, 9, 2.0), (15, 24, -145, 7, 1.8),
                    (15, 22, -35, 7.5, 1.8), (14, 18, -150, 5.5, 1.5)])
        bud(sp, 6, 21, 5, -125, colored=True)
        bloom(sp, 23, 15, 5.6, rot=-20)
        bloom(sp, 12, 8, 7.6, rot=10)
    return sp
