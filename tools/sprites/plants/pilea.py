"""Pilea (Ufopflanze) – Pflanzenhandlung.

Runde, flache, glänzende Blätter („Münzen“) auf langen, dünnen Stielen. Der
Stiel setzt mittig unter dem Blatt an (schildförmig) – an der Oberseite sieht
man dort einen hellen Punkt. Ab Stufe 3 ein kurzes Stämmchen, untere Blätter
hängen an langen Stielen nach außen; Stufe 5 mit Ableger („Kindel“) am Topfrand.
"""
REGION = "pflanzenhandlung"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import stem


def coin(sp, cx, cy, r, squash=0.8, ramp="ph_pilea"):
    """Rundes Schildblatt (Pixelmitten, leicht eckige Superellipse = runde Pixelscheibe).

    squash < 0.65: flache Untertasse von der Seite; sonst eher von oben gesehen.
    Glanz oben links."""
    lay = sp.layer(ramp)
    ry = max(1.0, r * squash)
    for y in range(int(cy - ry - 1), int(cy + ry) + 2):
        for x in range(int(cx - r - 1), int(cx + r) + 2):
            dx, dy = abs(x + 0.5 - cx) / r, abs(y + 0.5 - cy) / ry
            if dx ** 2.3 + dy ** 2.3 <= 1.0:
                lay.px(x, y)
    # Einzelpixel-Zipfel entfernen (sonst spitze Outline)
    for _ in range(2):
        for q in list(lay.pixels):
            n = sum((q[0] + dx, q[1] + dy) in lay.pixels for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if n <= 1 and len(lay.pixels) > 4:
                lay.erase(*q)
    if r >= 2.4 and squash >= 0.65:
        ov = sp.layer(ramp, outline=False, shading=False)
        xs = sorted(lay.pixels)
        top = min(y for _, y in xs)
        left = min(x for x, _ in xs)
        for p in ((left + 1, top + 1), (left + 2, top + 1)) if r >= 3 else ((left + 1, top + 1),):
            if p in lay.pixels:
                ov.px(*p, HIGHLIGHT)
    return lay


def petiole(sp, x0, y0, x1, y1, bend=0.0):
    s = sp.layer("stem", outline=False, shading=False)
    mx, my = (x0 + x1) / 2 + bend, (y0 + y1) / 2 - abs(bend) * 1.2
    s.curve([(x0, y0), (mx, my), (x1, y1)], tone=BASE)
    return s


# Blätter: (Stielansatz x, y, Blattmitte x, y, Radius, Stauchung, Stielbiegung)
# Reihenfolge = hinten -> vorn
STAGES = {
    1: dict(trunk=None, leaves=[
        (15.5, SOIL_Y, 12.5, 19.5, 2.2, 0.85, -0.5),
        (15.5, SOIL_Y, 18.5, 18.5, 2.0, 0.85, 0.5),
    ]),
    2: dict(trunk=None, leaves=[
        (15, SOIL_Y, 11, 17.5, 2.6, 0.85, -1),
        (16, SOIL_Y, 20, 15.5, 2.8, 0.85, 1),
        (15.5, SOIL_Y, 15.5, 20.5, 1.7, 0.85, 0),
    ]),
    3: dict(trunk=(15.5, 19), leaves=[
        (15.5, 19, 14, 10.5, 3.0, 0.82, -1),
        (15.5, 20, 8, 15, 3.0, 0.8, -1.5),
        (15.5, 20, 22.5, 13.5, 3.2, 0.8, 1.5),
        (15.5, 21, 24, 20.5, 2.3, 0.78, 1),
        (15.5, 19, 18, 18.5, 2.0, 0.85, 0),
    ]),
    4: dict(trunk=(15.5, 15), leaves=[
        (15.5, 15, 12.5, 6.5, 3.2, 0.82, -1),
        (15.5, 16, 21.5, 8, 3.2, 0.8, 1),
        (15.5, 18, 6, 12.5, 3.3, 0.78, -2),
        (15.5, 19, 25.5, 15, 3.1, 0.78, 2),
        (15.5, 20, 6, 20.5, 2.5, 0.74, -1.5),
        (15.5, 17, 19, 13.5, 2.4, 0.85, 0.5),
        (15.5, 15, 15.5, 11, 1.8, 0.85, 0),
    ]),
    5: dict(trunk=(15.5, 12), pup=True, leaves=[
        (15.5, 12, 12.5, 4.5, 3.4, 0.82, -1),
        (15.5, 13, 21, 5.5, 3.2, 0.82, 1),
        (15.5, 15, 6, 9.5, 3.4, 0.78, -2),
        (15.5, 16, 25.5, 11.5, 3.3, 0.78, 2),
        (15.5, 18, 4, 17, 2.8, 0.74, -2.5),
        (15.5, 19, 27.5, 18.5, 2.6, 0.74, 2.5),
        (15.5, 15, 11, 14, 2.5, 0.85, -0.5),
        (15.5, 16, 20.5, 15.5, 2.5, 0.85, 0.5),
        (15.5, 12, 16.5, 9.5, 2.0, 0.85, 0),
    ]),
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    plan = STAGES[stage]
    if plan.get("pup"):
        petiole(sp, 11, SOIL_Y, 10, 20.5, -0.3)
        petiole(sp, 11.5, SOIL_Y, 12.5, 21.5, 0.3)
    if plan["trunk"]:
        tx, ty = plan["trunk"]
        stem(sp, tx - 0.5, SOIL_Y, tx - 0.5, ty, thick=2)
    for (sx, sy, cx, cy, r, sq, b) in plan["leaves"]:
        petiole(sp, sx, sy, cx, cy, b)
        coin(sp, cx, cy, r, sq)
    if plan.get("pup"):
        coin(sp, 10, 20.5, 1.7, 0.85)
        coin(sp, 13, 21.5, 1.4, 0.85)
    return sp
