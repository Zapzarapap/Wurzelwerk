"""Mohn – Blumenwiese. Farbe wird zufällig aus den natürlichen Farben gewählt."""
REGION = "blumenwiese"

from pixel import Sprite, SHADE, BASE, LIGHT
from parts import heart_leaf, stalk, meadow_ground

VARIANTS = {
    "rot": None,
    "orange": {"petal_red": "petal_orange"},
    "rosa": {"petal_red": "petal_pink"},
    "weiss": {"petal_red": "petal_white"},
}

BASE_Y = 29


def rosette(sp, n, L):
    angles = [-160, -20, -125, -55, -95][:n]
    for i, a in enumerate(angles):
        lay = sp.layer("leaf_sage")
        heart_leaf(lay, 15.5, BASE_Y, a, L - (i % 2), 1.5, notch=False, midrib=False)


def flower(sp, x, y, r):
    """Mohnblüte als offener Kelch, leicht von oben gesehen."""
    ry = r * 0.78
    p = sp.layer("petal_red")
    p.ellipse(x, y, r, ry)
    # gewellter Rand: oben mittig eine kleine Delle
    p.erase(round(x - 0.5), round(y - ry))
    # Innenseite des Kelchs (dunkler) + schwarze Mitte
    inner = sp.layer("petal_red", outline=False, shading=False)
    inner.ellipse(x, y - ry * 0.45, r * 0.62, ry * 0.36, tone=SHADE)
    c = sp.layer("dark", outline=False, shading=False)
    cx, cy = round(x - 0.5), round(y - ry * 0.45 - 0.5)
    c.px(cx, cy, BASE)
    c.px(cx + 1, cy, BASE)
    # Lichtkante unten am Kelch
    hl = sp.layer("petal_red", outline=False, shading=False)
    hl.px(round(x - r * 0.5), round(y + ry * 0.3), LIGHT)


def bud(sp, x, y, hanging=True):
    b = sp.layer("leaf_sage")
    b.ellipse(x, y, 1.3, 2.0)
    return b


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 1:
        rosette(sp, 3, 4)
    elif stage == 2:
        rosette(sp, 4, 5)
        stalk(sp, 16, BASE_Y, 17, 19, bend=1)
        stalk(sp, 17, 19, 19, 21, bend=-1)
        bud(sp, 19, 22)
    elif stage == 3:
        stalk(sp, 15, BASE_Y, 14, 12, bend=-2)
        stalk(sp, 14, 12, 11, 14, bend=-1)
        bud(sp, 11, 15)
        stalk(sp, 16, BASE_Y, 19, 18, bend=2)
        stalk(sp, 19, 18, 21, 20)
        bud(sp, 21, 21)
        rosette(sp, 5, 6)
    elif stage == 4:
        stalk(sp, 15, BASE_Y, 13, 9, bend=-2)
        stalk(sp, 16, BASE_Y, 20, 16, bend=2)
        stalk(sp, 20, 16, 22, 18)
        bud(sp, 22, 19)
        rosette(sp, 5, 6)
        flower(sp, 13, 8, 3.6)
    else:
        stalk(sp, 15, BASE_Y, 12, 7, bend=-2)
        stalk(sp, 16, BASE_Y, 21, 12, bend=2)
        stalk(sp, 15, BASE_Y, 8, 16, bend=-1)
        stalk(sp, 16, BASE_Y, 24, 20, bend=1)
        stalk(sp, 24, 20, 25, 22)
        bud(sp, 25, 23)
        rosette(sp, 5, 6)
        flower(sp, 8, 15, 3.3)
        flower(sp, 21, 11, 3.4)
        flower(sp, 12, 6, 3.8)
    return sp
