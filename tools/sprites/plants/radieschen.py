"""Radieschen – Gewächshaus. Kleine, aufrechte Rosette aus spatelförmigen, rauen Blättern
auf kurzen Stielen (Keimblätter herzförmig); ab Stufe 4 wölben sich rote, runde Knollen
aus der Erde, in Stufe 5 drei kräftige Knollen nebeneinander."""
REGION = "gewaechshaus"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import stalk
from parts_gewaechshaus import greenhouse_ground, serrated_oval, SOIL_Y

VARIANTS = {
    "rot": None,
    "rosa": {"gh_radish": "gh_radish_pink"},
    "lila": {"gh_radish": "gh_radish_purple"},
    "weiss": {"gh_radish": "gh_radish_white"},
}

LEAF = "leaf"
BULB = "gh_radish"

# Blätter: (Stiel-Start x, Blattmitte x,y, rx, ry, Richtung) – hinten nach vorn
LEAVES = {
    2: [(15, 13, 20, 2.4, 1.6, -115), (16, 19, 21, 2.2, 1.5, -55), (16, 16, 23, 1.6, 1.2, -90)],
    3: [(15, 11, 16, 3.2, 2.0, -120), (16, 20, 15, 3.4, 2.1, -60), (16, 15, 13, 3.0, 1.9, -92),
        (15, 8, 21, 2.8, 1.8, -160), (16, 23, 21, 2.8, 1.8, -20)],
    4: [(15, 10, 13, 3.8, 2.3, -118), (16, 21, 12, 4.0, 2.4, -62), (16, 15, 10, 3.6, 2.2, -95),
        (15, 6, 19, 3.4, 2.1, -158), (16, 25, 18, 3.4, 2.1, -22), (16, 18, 17, 2.8, 1.8, -75)],
    5: [(15, 9, 11, 4.4, 2.6, -120), (16, 22, 10, 4.6, 2.7, -60), (16, 15, 7, 4.2, 2.5, -95),
        (15, 5, 17, 4.0, 2.4, -155), (16, 26, 16, 4.0, 2.4, -25), (15, 12, 16, 3.2, 2.0, -110),
        (16, 19, 15, 3.2, 2.0, -70)],
}

# Knollen in der Erde: (Mitte x, rx, sichtbare Höhe über SOIL_Y)
BULBS = {
    3: [(16.0, 1.5, 2)],
    4: [(13.5, 2.3, 4), (19.0, 2.0, 3)],
    5: [(10.5, 2.5, 4), (16.5, 3.0, 6), (22.5, 2.3, 4)],
}


def cotyledons(sp):
    stalk(sp, 16, SOIL_Y - 1, 16, 23, ramp="stem")
    for (cx, d) in ((13.5, -1), (18.5, 1)):
        l = sp.layer(LEAF)
        l.ellipse(cx, 22.5, 2.2, 1.6)
        l.erase(cx + d * 2.2 - 0.5 * (d > 0) + 0.5 * (d < 0), 22)  # herzförmige Kerbe außen
        l.erase(round(cx + d * 2 - 0.5), 21)


def bulb(sp, cx, rx, h):
    """Runde Knolle, die weit aus der Erde ragt: Kreis mit Unterkante auf SOIL_Y,
    h = sichtbare Höhe (kleiner als 2*rx -> unten leicht in der Erde)."""
    cy = SOIL_Y + 1 - h + rx
    lay = sp.layer(BULB)
    for y in range(math.floor(cy - rx), SOIL_Y + 1):
        for x in range(math.floor(cx - rx - 1), math.ceil(cx + rx) + 1):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / rx
            if dx * dx + dy * dy <= 1.0:
                lay.px(x, y)
    g = sp.layer(BULB, outline=False, shading=False)
    hx, hy = math.floor(cx - rx * 0.4), math.floor(cy - rx * 0.45)
    g.px(hx, hy, HIGHLIGHT)
    if rx >= 2.5:
        g.px(hx + 1, hy, LIGHT)
        g.px(hx, hy + 1, LIGHT)
    return lay


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    if stage == 1:
        cotyledons(sp)
        return sp
    leaves = LEAVES[stage]
    for (sx, cx, cy, rx, ry, ang) in leaves:
        a = math.radians(ang)
        stalk(sp, sx, SOIL_Y - 1, cx - math.cos(a) * rx * 0.8, cy - math.sin(a) * rx * 0.8,
              ramp="stem", tone=BASE)
    for (sx, cx, cy, rx, ry, ang) in leaves:
        serrated_oval(sp.layer(LEAF), cx, cy, rx, ry, ang)
    for (cx, rx, h) in BULBS.get(stage, []):
        bulb(sp, cx, rx, h)
    return sp
