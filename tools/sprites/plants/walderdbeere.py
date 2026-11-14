"""Walderdbeere – Wald. Zierliche Rosette aus dreiteiligen, gezähnten Blättern auf dünnen
Stielen; kleine weiße Blüten mit gelber Mitte, Stufe 5 winzige längliche rote Beeren,
dazu ein Ausläufer mit Jungpflanze."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import forest_ground, leaf_frame
from parts_wald import bezier

LEAF = "leaf"


def thin(sp, pts, ramp="stem", tone=SHADE):
    s = sp.layer(ramp, outline=False, shading=False)
    path = bezier(pts, 60)
    prev = None
    for (x, y) in path:
        p = (round(x), round(y))
        if p != prev:
            s.px(*p, tone)
            prev = p
    return path


def leaflet(lay, bx, by, ang, L, W, serr=True):
    a = math.radians(ang)
    r = int(L + W + 2)
    for y in range(int(by - r), int(by + r) + 1):
        for x in range(int(bx - r), int(bx + r) + 1):
            u, v = leaf_frame(bx, by, a, x + 0.5, y + 0.5)
            if u < 0 or u > L:
                continue
            w = W * math.sin(math.pi * min(1.0, (u / L) ** 0.75)) + 0.1
            # gezähnter Rand: Kerben in regelmäßigem Abstand
            if serr and L >= 3.5 and abs(v) > w - 0.9 and int(u * 1.2) % 2 == 1:
                w -= 0.8
            if abs(v) <= w:
                lay.px(x, y, ("a", LIGHT if v * (math.sin(a) - math.cos(a)) > 0 else BASE))


def trileaf(sp, x, y, ang, L=3.6, W=1.7):
    """Dreizähliges Blatt am Stielende (x,y): zwei seitliche Blättchen, darüber das
    Mittelblättchen – jedes als eigene Ebene, damit die Outline sie trennt."""
    out = []
    for off, lf in ((-68, 0.82), (68, 0.82), (0, 1.0)):
        a = math.radians(ang + off)
        lay = sp.layer(LEAF)
        bx, by = x + math.cos(a) * 0.6, y + math.sin(a) * 0.6
        leaflet(lay, bx, by, ang + off, L * lf, W * (0.92 if off else 1.0))
        if L >= 3.4:
            v = sp.layer(LEAF, outline=False, shading=False)
            for i in range(1, int(L * lf * 0.75)):
                p = (math.floor(bx + math.cos(a) * i), math.floor(by + math.sin(a) * i))
                if p in lay.pixels:
                    v.px(*p, SHADE)
        out.append(lay)
    return out


def leaf_on_stalk(sp, x0, y0, x1, y1, ang, L=3.6, bend=0.0):
    thin(sp, [(x0, y0), ((x0 + x1) / 2 + bend, (y0 + y1) / 2), (x1, y1)])
    trileaf(sp, x1, y1, ang, L)


def blossom(sp, x, y, open_=True):
    if not open_:
        b = sp.layer("petal_white")
        b.px(x, y, LIGHT)
        c = sp.layer("leaf", outline=False, shading=False)
        c.px(x, y + 1, BASE)
        return
    f = sp.layer("petal_white", shading=False)
    for dx, dy, t in ((0, -1, 4), (-1, 0, 4), (1, 0, 3), (-1, 1, 3), (1, 1, 2)):
        f.px(x + dx, y + dy, t)
    f.px(x, y, 3)
    c = sp.layer("petal_yellow", outline=False, shading=False)
    c.px(x, y, 3)
    c.px(x, y + 1, 1)


def berry(sp, x, y):
    """Kleine längliche Beere, hängend: Kelch oben (y), Spitze unten."""
    b = sp.layer("wa_erdbeer", shading=False)
    b.px(x, y + 1, LIGHT)
    b.px(x + 1, y + 1, BASE)
    b.px(x, y + 2, BASE)
    b.px(x + 1, y + 2, SHADE)
    b.px(x, y + 3, SHADE)
    s = sp.layer("wa_erdbeer", outline=False, shading=False)
    s.px(x, y + 1, HIGHLIGHT)           # Glanz
    s.px(x + 1, y + 2, LIGHT)           # Nüsschen
    k = sp.layer("leaf", outline=False, shading=False)
    k.px(x, y, LIGHT)
    k.px(x + 1, y, BASE)
    k.px(x - 1, y, BASE)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(11 if stage >= 4 else 8))
    if stage == 1:
        leaf_on_stalk(sp, 15, 28, 15, 24, -100, L=3.0)
    elif stage == 2:
        leaf_on_stalk(sp, 15, 28, 11, 22, -130, L=3.5, bend=0.5)
        leaf_on_stalk(sp, 16, 28, 20, 23, -50, L=3.4, bend=-0.5)
    elif stage == 3:
        leaf_on_stalk(sp, 16, 28, 21, 21, -50, L=3.8, bend=-1)
        leaf_on_stalk(sp, 15, 28, 9, 22, -135, L=3.8, bend=1)
        leaf_on_stalk(sp, 15, 28, 15, 18, -95, L=3.8, bend=-1)
        thin(sp, [(16, 28), (18, 21), (19, 17)])
        blossom(sp, 19, 16, open_=False)
    elif stage == 4:
        # Ausläufer nach rechts
        thin(sp, [(17, 28), (23, 26), (28, 28)], tone=BASE)
        trileaf(sp, 28, 27, -90, 2.4)
        leaf_on_stalk(sp, 15, 28, 6, 21, -150, L=4.0, bend=1)
        leaf_on_stalk(sp, 16, 28, 22, 18, -45, L=4.0, bend=-1)
        leaf_on_stalk(sp, 15, 28, 11, 14, -110, L=4.2, bend=1)
        thin(sp, [(16, 28), (19, 18), (17, 11)])
        thin(sp, [(18, 14), (21, 12)])
        blossom(sp, 17, 10)
        blossom(sp, 21, 11)
        blossom(sp, 19, 14, open_=False)
        leaf_on_stalk(sp, 16, 28, 18, 23, -70, L=3.4)
    else:
        thin(sp, [(17, 28), (24, 25), (30, 28)], tone=BASE)
        trileaf(sp, 29, 27, -95, 2.6)
        leaf_on_stalk(sp, 15, 28, 4, 21, -160, L=4.2, bend=1)
        leaf_on_stalk(sp, 15, 28, 9, 12, -125, L=4.6, bend=2)
        leaf_on_stalk(sp, 16, 28, 17, 7, -85, L=4.6, bend=-2)
        leaf_on_stalk(sp, 16, 28, 25, 13, -40, L=4.4, bend=-1)
        leaf_on_stalk(sp, 16, 28, 13, 21, -105, L=3.6)
        leaf_on_stalk(sp, 16, 28, 21, 22, -60, L=3.4)
        # Fruchtstiele, unter der Last der Beeren nach außen/unten gebogen
        thin(sp, [(15, 27), (10, 17), (5, 16), (4, 18)])
        thin(sp, [(8, 16), (9, 19)])
        berry(sp, 4, 18)
        berry(sp, 9, 19)
        thin(sp, [(17, 27), (23, 17), (28, 17), (29, 19)])
        thin(sp, [(25, 17), (25, 20)])
        berry(sp, 29, 19)
        berry(sp, 25, 20)
        thin(sp, [(16, 27), (19, 18), (21, 15)])
        blossom(sp, 21, 14)
    return sp
