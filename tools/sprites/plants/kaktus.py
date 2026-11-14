"""Kaktus (Säulenkaktus) – Pflanzenhandlung. Rippen, Stacheln, ab Stufe 4 Seitenarm-Ansatz, Stufe 5 Seitenarm und rosa Blüte."""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot

VARIANTS = {
    "rosa": None,
    "gelb": {"petal_pink": "petal_yellow"},
}

CX = 15.5
BOTTOM = 23


def column(sp, cx, top, rx, bottom=BOTTOM, ribs=(-0.55, 0.5), spines=True):
    """Säule mit Kuppel oben, Rippenlinien und Stachelpunkten."""
    col = sp.layer("ph_cactus")
    dome_cy = top + rx
    col.ellipse(cx, dome_cy, rx, rx * 0.95)
    col.rect(math.floor(cx - rx + 0.5), math.floor(dome_cy), math.floor(cx + rx - 0.5), bottom)
    rb = sp.layer("ph_cactus", outline=False, shading=False)
    sk = sp.layer("cream", outline=False, shading=False)
    for f in ribs:
        for y in range(int(top) + 1, bottom + 1):
            if y < dome_cy:
                k = math.sqrt(max(0.0, 1 - ((dome_cy - y - 0.5) / rx) ** 2))
            else:
                k = 1.0
            x = math.floor(cx + f * rx * k)
            if (x, y) in col.pixels:
                rb.px(x, y, SHADE)
    # Rippenkamm: helle Linie in der Mitte
    for y in range(int(top) + 2, bottom + 1):
        x = math.floor(cx - 0.4 * rx * 0.0 - 0.5 + 0.5)
        if (x, y) in col.pixels:
            rb.px(x, y, LIGHT)
    if spines:
        for i, y in enumerate(range(int(dome_cy) , bottom, 3)):
            xs = [x for (x, yy) in col.pixels if yy == y]
            if not xs:
                continue
            lo, hi = min(xs), max(xs)
            if i % 2 == 0:
                sk.px(lo - 1, y, HIGHLIGHT)
                sk.px(hi + 1, y + 1, HIGHLIGHT)
            else:
                sk.px(hi + 1, y, HIGHLIGHT)
                sk.px(lo - 1, y + 1, HIGHLIGHT)
            # Areolen auf den Rippen
            for f in ribs:
                x = math.floor(cx + f * rx)
                if (x, y) in col.pixels:
                    sk.px(x, y, HIGHLIGHT)
    return col


def arm(sp, x0, y_elbow, x1, top, rx=1.6):
    """Seitenarm: waagerecht aus der Säule, dann senkrecht nach oben."""
    a = sp.layer("ph_cactus")
    a.rect(int(x0), y_elbow - 1, int(x1), y_elbow + 1)
    cx = x1 + 0.5
    a.rect(int(x1 - rx + 0.5), int(top + rx), int(x1 + rx - 0.5), y_elbow + 1)
    a.ellipse(cx + 0.0, top + rx, rx, rx * 0.95)
    r = sp.layer("ph_cactus", outline=False, shading=False)
    for y in range(int(top) + 2, y_elbow):
        r.px(int(x1), y, SHADE)
    sk = sp.layer("cream", outline=False, shading=False)
    sk.px(int(x1 + rx + 0.5), int(top + rx + 2), HIGHLIGHT)
    sk.px(int(x1 - rx - 0.5), int(top + rx + 4), HIGHLIGHT)
    sk.px(int(x1), int(top + rx + 1), HIGHLIGHT)
    sk.px(int(x1), int(top + rx + 4), HIGHLIGHT)


def flower(sp, cx, cy):
    p = sp.layer("petal_pink")
    p.ellipse(cx, cy, 2.5, 1.6)
    p.erase(int(cx - 0.5), int(cy - 1.6))
    c = sp.layer("petal_yellow", outline=False, shading=False)
    c.px(int(cx - 0.5), int(cy - 0.5), BASE)
    c.px(int(cx + 0.5), int(cy - 0.5), LIGHT)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    if stage == 1:
        col = sp.layer("ph_cactus")
        col.ellipse(CX, 22.0, 2.7, 2.3)
        rb = sp.layer("ph_cactus", outline=False, shading=False)
        rb.px(15, 21, SHADE); rb.px(15, 22, SHADE); rb.px(15, 20, LIGHT)
        sk = sp.layer("cream", outline=False, shading=False)
        sk.px(12, 21, HIGHLIGHT); sk.px(19, 22, HIGHLIGHT)
    elif stage == 2:
        column(sp, CX, 17, 2.5, ribs=(-0.5, 0.45))
    elif stage == 3:
        column(sp, CX, 13, 3.0)
    elif stage == 4:
        arm(sp, 17, 19, 22, 16, rx=1.3)  # kleiner Seitentrieb (Ansatz)
        column(sp, CX, 8, 3.3)
    else:
        arm(sp, 17, 19, 24, 11, rx=1.6)
        column(sp, CX, 6, 3.5)
        flower(sp, CX, 4.6)
    return sp
