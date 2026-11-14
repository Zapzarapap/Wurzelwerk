"""Venusfliegenfalle – Pflanzenhandlung.

Flache Rosette aus geflügelten Blattstielen, an deren Ende je eine zweiklappige
Falle sitzt: außen gelbgrün, innen rot, am Rand lange helle Zähnchen (Wimpern).
Frühe Stufen: kleine, geschlossene Fallen. Ab Stufe 4 große, weit offene
Fallen, Stufe 5 zusätzlich ein hoher Blütenstiel mit weißen Blüten.
"""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import stem

CX = 15.5
BASE_Y = 23.5


def _frame(cx, cy, tilt):
    t = math.radians(tilt)
    A = (math.cos(t), math.sin(t))      # Achse (Mittelrippe)
    U = (math.sin(t), -math.cos(t))     # „oben“ = Öffnungsrichtung
    def local(x, y):
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        return dx * A[0] + dy * A[1], dx * U[0] + dy * U[1]
    def screen(u, w):
        return (math.floor(cx + u * A[0] + w * U[0]), math.floor(cy + u * A[1] + w * U[1]))
    return local, screen


def trap(sp, cx, cy, rx, ry, tilt=0.0, openness=1.0):
    """Falle, halb von der Seite: Mittelrippe entlang der Achse, Öffnung nach „oben“ (tilt dreht).

    Hinten die weit aufgeklappte Klappe mit roter Innenseite und grünem Rand,
    vorn die untere Klappe (grüne Außenseite). Zähnchen stehen am oberen Rand
    ab und ragen von der vorderen Lippe ins rote Maul.
    openness 0 = geschlossene Hülse."""
    local, screen = _frame(cx, cy, tilt)
    R = int(rx + ry + 3)
    box = [(x, y) for y in range(int(cy - R), int(cy + R) + 1) for x in range(int(cx - R), int(cx + R) + 1)]
    if openness < 0.5:
        pod = sp.layer("ph_vft")
        for (x, y) in box:
            u, w = local(x, y)
            if (u / rx) ** 2 + (w / ry) ** 2 <= 1:
                pod.px(x, y)
        seam = sp.layer("ph_vft_red", outline=False, shading=False)
        for i in range(-int(rx) + 1, int(rx)):
            q = screen(i + 0.5, 0.0)
            if q in pod.pixels:
                seam.px(*q, BASE)
        return pod
    ryb, ryf = ry, max(1.2, ry * 0.42)
    back = sp.layer("ph_vft")
    for (x, y) in box:
        u, w = local(x, y)
        if w >= -0.5 and (u / rx) ** 2 + (w / ryb) ** 2 <= 1:
            back.px(x, y)
    red = sp.layer("ph_vft_red", outline=False, shading=False)
    for (x, y) in back.pixels:
        u, w = local(x, y)
        e = (u / (rx - 0.7)) ** 2 + (w / (ryb - 0.8)) ** 2
        if e <= 1:
            red.px(x, y, SHADE if w < 1.2 else (LIGHT if (e < 0.3 and w > ryb * 0.4) else BASE))
    front = sp.layer("ph_vft")
    for (x, y) in box:
        u, w = local(x, y)
        if w <= -0.2 and (u / rx) ** 2 + (w / ryf) ** 2 <= 1:
            front.px(x, y)
    teeth = sp.layer("ph_vft", outline=False, shading=False)
    # Wimpern am oberen Rand: radial nach außen
    n = max(4, int(rx * 1.6))
    for i in range(n + 1):
        ang = math.pi * (0.06 + 0.88 * i / n)
        eu, ew = -math.cos(ang) * rx, math.sin(ang) * ryb
        for d in (1.6, 2.5):
            nu, nw = -math.cos(ang), math.sin(ang)
            q = screen(eu + nu * d, ew + nw * d)
            if q not in back.pixels and q not in front.pixels:
                teeth.px(*q, HIGHLIGHT if d > 2 else LIGHT)
    # Zähnchen der vorderen Lippe ragen ins Maul
    for u in [k + 0.5 for k in range(-int(rx) + 1, int(rx) - 1, 2)]:
        q = screen(u, 0.9)
        if q in back.pixels:
            teeth.px(*q, HIGHLIGHT)
    return back


def petiole(sp, x0, y0, x1, y1, bend=0.0):
    """Geflügelter Blattstiel: 2 px breit, kein Outline."""
    return stem(sp, x0, y0, x1, y1, bend=bend, ramp="ph_vft", thick=2)


# Fallen: (Stielfuß dx, Fallenmitte x, y, rx, ry, Neigung, Öffnung, Stielbiegung)
# Reihenfolge = hinten -> vorn
STAGES = {
    1: [(0, 13, 20.5, 1.8, 1.0, -30, 0.0, 0),
        (0.5, 18, 20, 1.6, 0.9, 25, 0.0, 0)],
    2: [(-0.5, 11.5, 18.5, 2.4, 1.2, -35, 0.0, -0.5),
        (0.5, 19.5, 18, 2.4, 1.2, 30, 0.0, 0.5),
        (0, 15.5, 19.5, 1.8, 0.9, 0, 0.0, 0)],
    3: [(-1, 9.5, 18, 3.0, 3.6, -30, 1.0, -1),
        (1, 21.5, 17, 3.0, 3.6, 25, 1.0, 1),
        (0, 15, 13, 2.4, 1.2, -5, 0.0, 0),
        (0.5, 18, 21, 1.8, 0.9, 20, 0.0, 0)],
    4: [(-0.5, 14, 11, 3.5, 4.4, -10, 1.0, -0.5),
        (-1, 7, 17, 3.3, 4.2, -35, 1.0, -1),
        (1, 24, 15.5, 3.3, 4.2, 30, 1.0, 1),
        (0.5, 20.5, 21, 2.2, 1.1, 15, 0.0, 0.5),
        (-0.5, 11.5, 21.5, 1.8, 1.0, -20, 0.0, 0)],
    5: [(-0.5, 11.5, 9, 3.6, 4.6, -15, 1.0, -0.5),
        (0.5, 20.5, 10, 3.5, 4.4, 18, 1.0, 0.5),
        (-1, 5.5, 16.5, 3.4, 4.2, -40, 1.0, -1),
        (1, 26, 17, 3.2, 4.0, 40, 1.0, 1),
        (-0.5, 10.5, 22, 2.4, 1.2, -20, 0.0, -0.5),
        (0.5, 17, 18.5, 2.2, 1.1, 10, 0.0, 0)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    if stage == 5:
        # Blütenstiel weit über die Fallen hinaus (schützt Bestäuber) mit weißen Blüten
        stem(sp, 16.5, SOIL_Y, 27, 2.5, bend=2)
        for (fx, fy) in ((27, 2.5), (29, 4.5)):
            f = sp.layer("petal_white")
            f.ellipse(fx, fy, 1.3, 1.1)
            c = sp.layer("ph_vft", outline=False, shading=False)
            c.px(int(fx), int(fy), BASE)
    for (dx, hx, hy, rx, ry, tilt, op, bend) in STAGES[stage]:
        # Stiel endet am hinteren Ende der Mittelrippe
        t = math.radians(tilt)
        side = -1 if hx < CX else 1
        ex, ey = hx - side * rx * 0.8 * math.cos(t), hy + ry * 0.2 - side * rx * 0.8 * math.sin(t)
        petiole(sp, CX + dx, SOIL_Y, ex, ey, bend=bend)
        trap(sp, hx, hy, rx, ry, tilt, op)
    return sp
