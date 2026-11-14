"""Sonnenblume – Blumenwiese. Hoher kräftiger Stängel, große Blätter, riesige Körbchenblüte."""
REGION = "blumenwiese"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import ray_flower, seed_disc, stamp

VARIANTS = {
    "gelb": None,
    "rotbraun": {"petal_yellow": "bw_russet"},
}

BY = 29


def thick(sp, x0, y0, x1, y1, bend=0.0):
    stalk(sp, x0 + 1, y0, x1 + 1, y1, bend=bend, tone=SHADE)
    stalk(sp, x0, y0, x1, y1, bend=bend, tone=BASE)


def leaf(sp, bx, by, ang, L, W):
    """Herzblatt mit kurzem Blattstiel, der vom Stängel (bx,by) abgeht."""
    import math
    a = math.radians(ang)
    px, py = bx + math.cos(a) * 2.5, by + math.sin(a) * 2.5
    stalk(sp, bx, by, px, py)
    heart_leaf(sp.layer("leaf"), px, py, ang + 12 * (1 if math.cos(a) < 0 else -1), L, W, midrib=True, vein=SHADE)


BUD = [".l.l.b.",
       "lhlhlbs",
       "hlhlbbs",
       "lhbbbss",
       ".lbbss.",
       "..s.s.."]


def head(sp, x, y, R, disc):
    ray_flower(sp, "petal_yellow", x, y, R, disc, 15, ysc=0.92, rot=0.25, notch=0.32, groove=0.17, inner_dark=0.6)
    seed_disc(sp, "soil", x, y, disc, disc * 0.92)


def bud(sp, x, y, r, open_=False):
    """Knospe mit spitzen Hüllblättern; open_: erste gelbe Blütenblätter schauen hervor."""
    if open_:
        ray_flower(sp, "petal_yellow", x + 0.5, y, r * 1.9, r * 0.8, 12, ysc=0.9, notch=0.3, groove=0.12)
    stamp(sp, x + 0.5, y + 0.5, BUD, "leaf")


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 1:
        leaf(sp, 15, 27, -150, 4, 2.4)
        leaf(sp, 16, 27, -35, 4, 2.4)
    elif stage == 2:
        thick(sp, 15, BY, 15, 20, bend=0.5)
        leaf(sp, 15, 26, -160, 6, 3.2)
        leaf(sp, 15, 25, -20, 6, 3.2)
        leaf(sp, 15, 20, -100, 4, 2.4)
    elif stage == 3:
        thick(sp, 15, BY, 15, 14, bend=1)
        leaf(sp, 15, 27, -168, 6, 3.0)
        leaf(sp, 16, 23, -12, 6, 3.0)
        leaf(sp, 15, 19, -150, 4.5, 2.4)
        bud(sp, 16, 12, 2.6)
    elif stage == 4:
        thick(sp, 15, BY, 15, 14, bend=1.5)
        leaf(sp, 15, 27, -170, 7, 3.5)
        leaf(sp, 16, 24, -10, 7, 3.5)
        leaf(sp, 15, 21, -150, 5.5, 2.8)
        leaf(sp, 16, 18, -35, 5, 2.4)
        bud(sp, 16, 12, 3.0, open_=True)
    else:
        thick(sp, 15, BY, 14, 15, bend=2)
        stalk(sp, 16, 24, 25, 20, bend=-1)
        leaf(sp, 15, 27, -172, 8, 4.0)
        leaf(sp, 16, 24, -8, 7.5, 3.8)
        leaf(sp, 15, 21, -150, 6, 3.0)
        leaf(sp, 15, 19, -35, 5.5, 2.8)
        bud(sp, 25, 19, 2.4, open_=False)
        head(sp, 14.5, 9.5, 8.6, 3.6)
    return sp
