"""Heidelbeere – Wald. Kleiner Strauch; Stufe 4 weiß-rosa Blüten, Stufe 5 blaue Beeren."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import forest_ground, stalk
from parts_wald import oval_leaf, GROUND
import pixel


def twig(sp, ctrl, ramp="wood", tone=BASE):
    s = sp.layer(ramp, outline=False, shading=False)
    pts = ctrl
    s.curve(pts, tone=tone)
    return s


def leaves_along(sp, pts, size=4.0, start=0.2, step=0.3, rnd=0, flip=1, W=1.7):
    """Blätter wechselständig entlang eines Zweigs (pts = Bezier-Kontrollpunkte)."""
    from parts_wald import bezier
    path = bezier(pts, 60)
    n = len(path)
    i = int(n * 0.12)
    side = flip
    out = []
    while i < n - 1:
        x, y = path[i]
        x2, y2 = path[min(i + 3, n - 1)]
        ang = math.degrees(math.atan2(y2 - y, x2 - x))
        out.append((x, y, ang + 58 * side, size))
        side = -side
        i += max(3, int(n * 0.165))
    # Spitze
    x, y = path[-1]
    x0, y0 = path[-4]
    out.append((x, y, math.degrees(math.atan2(y - y0, x - x0)), size))
    return out


def shrub(sp, twigs, berries=(), flowers=(), size=4.0):
    for t in twigs:
        twig(sp, t)
    allleaves = []
    for k, t in enumerate(twigs):
        allleaves += leaves_along(sp, t, size=size, flip=1 if k % 2 == 0 else -1)
    # hintere (obere) Blätter zuerst, damit vordere überdecken
    allleaves.sort(key=lambda l: l[1])
    for (x, y, ang, L) in allleaves:
        oval_leaf(sp, "wa_heidel", x, y, ang, L, 1.7 if L >= 4 else 1.4)
    for (x, y, r) in berries:
        stalk(sp, x, y - r - 1, x, y - r + 1, ramp="wood", tone=BASE)
        b = sp.layer("wa_beere")
        b.ellipse(x, y, r, r)
        hl = sp.layer("wa_beere", outline=False, shading=False)
        hl.px(round(x - r * 0.5), round(y - r * 0.5), LIGHT)
        if r >= 1.8:
            hl.px(round(x - r * 0.5) + 1, round(y - r * 0.5), HIGHLIGHT)
        cr = sp.layer("wa_beere", outline=False, shading=False)
        cr.px(round(x + r * 0.3 - 0.5), round(y + r * 0.6), OUTLINE)
    for (x, y) in flowers:
        stalk(sp, x, y - 2, x, y - 1, ramp="wood", tone=BASE)
        f = sp.layer("petal_pink", shading=False)
        f.ellipse(x, y, 1.4, 1.5, tone=4)
        f.px(round(x + 0.5), round(y + 1), 3)
        f.px(round(x + 0.5), round(y), 3)
        f.erase(round(x - 1.5), round(y + 1)) if False else None
        w = sp.layer("petal_white", outline=False, shading=False)
        w.px(round(x - 1), round(y - 1), 4)
        # rosa Mündung
        m = sp.layer("petal_pink", outline=False, shading=False)
        m.px(round(x - 1), round(y + 1), 2)
        m.px(round(x), round(y + 1), 2)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(10 if stage >= 4 else 8))
    if stage == 1:
        shrub(sp, [[(15, 28), (14, 25), (15, 21)], [(16, 28), (18, 25), (20, 23)]], size=3.2)
    elif stage == 2:
        shrub(sp, [[(15, 28), (13, 24), (11, 21)], [(16, 28), (18, 24), (20, 20)]], size=3.4)
    elif stage == 3:
        shrub(sp, [[(14, 28), (11, 22), (9, 16)],
                   [(16, 28), (16, 21), (18, 14)],
                   [(17, 28), (21, 24), (24, 20)]], size=3.8)
    elif stage == 4:
        shrub(sp, [[(14, 28), (10, 22), (8, 14)],
                   [(16, 28), (15, 20), (18, 11)],
                   [(17, 28), (22, 23), (25, 17)],
                   [(15, 28), (11, 26), (6, 24)]], size=4.0,
              flowers=((10, 19), (18, 17), (23, 22), (7, 22), (14, 15)))
    else:
        shrub(sp, [[(14, 28), (9, 21), (7, 12)],
                   [(16, 28), (15, 19), (18, 8)],
                   [(17, 28), (23, 22), (26, 14)],
                   [(15, 28), (11, 26), (5, 24)],
                   [(17, 28), (21, 27), (27, 26)]], size=4.2,
              berries=((9, 19, 1.8), (13, 15, 1.7), (19, 14, 1.9), (22, 20, 1.8), (25, 23, 1.7),
                       (11, 25, 1.6), (17, 22, 1.7), (7, 15, 1.5)))
    return sp
