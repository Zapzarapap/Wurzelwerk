"""Bärlauch – Wald. Dichter Teppich breiter, lanzettlicher, frisch hellgrüner Blätter;
Stufe 4–5 blattlose Stiele mit kugeligen Dolden weißer Sternblüten."""
REGION = "wald"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import forest_ground
from parts_wald import blade_leaf, bezier

LEAF = "wa_baer"


def leaf(sp, ctrl, W):
    blade_leaf(sp, LEAF, ctrl, W, base_w=0.18, power=0.7, veins=0)


def stalk_line(sp, pts):
    s = sp.layer("stem", outline=False, shading=False)
    prev = None
    for (x, y) in bezier(pts, 60):
        p = (round(x), round(y))
        if p != prev:
            s.px(*p, BASE)
            prev = p


def umbel(sp, x, y, n=7, bud=False):
    """Kugelige Dolde aus kleinen weißen Sternen: eine gemeinsame Ebene (Outline nur
    außen), Sternarme hell, Sternmitten grau-grün -> Sternmuster bleibt lesbar."""
    spots = [(0, 0), (-2, 1), (2, 1), (-1, -2), (2, -2), (-3, -1), (0, 2), (3, 0), (-2, 3), (2, 3)][:n]
    f = sp.layer("petal_white", shading=False)
    for (dx, dy) in spots:
        cx, cy = x + dx, y + dy
        for ex, ey in ((0, -1), (-1, 0), (1, 0), (0, 1)):
            q = (cx + ex, cy + ey)
            if q not in f.pixels:
                f.px(*q, 4 if (ex + ey) < 0 else 3)
    for (dx, dy) in spots:
        f.px(x + dx, y + dy, 2)
    c = sp.layer("wa_baer", outline=False, shading=False)
    for (dx, dy) in spots[:2]:
        c.px(x + dx, y + dy, 4)


def leaf_back(sp, ctrl, W):
    blade_leaf(sp, "leaf", ctrl, W, base_w=0.18, power=0.7)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(12 if stage >= 4 else 8 if stage <= 2 else 10))
    if stage == 1:
        # zwei breite Blättchen auf dünnen Stielen, seitlich abstehend (V-Form)
        stalk_line(sp, [(15, 28), (14, 27), (13, 25)])
        leaf(sp, [(13, 25), (11, 22), (8, 19)], 1.6)
        stalk_line(sp, [(17, 28), (18, 27), (19, 25)])
        leaf(sp, [(19, 25), (21, 22), (24, 19)], 1.6)
    elif stage == 2:
        stalk_line(sp, [(15, 28), (14, 26), (12, 23)])
        leaf(sp, [(12, 23), (10, 21), (6, 21)], 2.1)
        stalk_line(sp, [(17, 28), (18, 26), (20, 23)])
        leaf(sp, [(20, 23), (22, 21), (26, 21)], 2.1)
        stalk_line(sp, [(16, 28), (16, 26), (16, 24)])
        leaf(sp, [(16, 24), (16, 21), (17, 17)], 2.0)
    elif stage == 3:
        leaf_back(sp, [(15, 28), (13, 20), (13, 13)], 2.5)
        leaf(sp, [(13, 28), (8, 21), (3, 21)], 2.4)
        leaf(sp, [(17, 28), (22, 22), (27, 23)], 2.3)
        leaf(sp, [(16, 28), (18, 21), (22, 16)], 2.5)
        leaf(sp, [(14, 28), (11, 25), (8, 26)], 1.8)
    elif stage == 4:
        leaf_back(sp, [(12, 28), (10, 19), (8, 13)], 2.6)
        leaf_back(sp, [(19, 28), (21, 19), (25, 14)], 2.6)
        stalk_line(sp, [(16, 28), (15, 18), (14, 10)])
        leaf(sp, [(9, 28), (5, 21), (1, 21)], 2.4)
        leaf(sp, [(22, 28), (27, 22), (31, 23)], 2.3)
        leaf(sp, [(16, 28), (18, 21), (21, 18)], 2.3)
        umbel(sp, 14, 8, n=7)
        leaf(sp, [(14, 28), (11, 24), (7, 25)], 2.0)
        leaf(sp, [(18, 28), (21, 26), (25, 27)], 1.9)
    else:
        leaf_back(sp, [(10, 28), (8, 19), (7, 11)], 2.7)
        leaf_back(sp, [(21, 28), (24, 19), (27, 13)], 2.7)
        leaf_back(sp, [(16, 28), (17, 19), (18, 13)], 2.4)
        stalk_line(sp, [(15, 28), (13, 16), (12, 8)])
        stalk_line(sp, [(19, 28), (21, 19), (23, 12)])
        leaf(sp, [(7, 28), (3, 21), (0, 21)], 2.4)
        leaf(sp, [(24, 28), (29, 22), (31, 24)], 2.3)
        leaf(sp, [(13, 28), (10, 21), (5, 18)], 2.5)
        leaf(sp, [(18, 28), (22, 21), (26, 19)], 2.5)
        umbel(sp, 12, 6, n=10)
        umbel(sp, 23, 10, n=7)
        leaf(sp, [(14, 28), (11, 25), (6, 26)], 2.0)
        leaf(sp, [(17, 28), (19, 23), (22, 23)], 2.0)
        leaf(sp, [(19, 28), (23, 26), (27, 27)], 1.8)
    return sp
