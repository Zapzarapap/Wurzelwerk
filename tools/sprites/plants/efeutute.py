"""Efeutute (Pothos, Epipremnum aureum) – Pflanzenhandlung.

Kleine herzförmige, grün-gelb panaschierte Blätter (cremegelbe Streifen und
Sprenkel). Oben ein lockerer Blattschopf, darunter lange Ranken, die über den
Topfrand hängen; die Blätter sitzen wechselständig an der Ranke und hängen mit
der Spitze nach außen/unten. Stufe 5: Ranken reichen fast bis zum Rahmenboden.
"""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem


def _bez(pts, t):
    p = list(pts)
    while len(p) > 1:
        p = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(p, p[1:])]
    return p[0]


def heart(sp, bx, by, ang, L, W, seed):
    """Pothos-Blatt: Herzform mit Spitze, gelbe Panaschierung als Streifen/Sprenkel."""
    def var(c):
        if c.t < 0.05 or c.t > 0.95 or L < 3.5:
            return None
        if c.edge:
            return None
        # schräge Streifen von der Mittelrippe zum Rand, je Blatt verschoben
        z = math.sin((c.u * 0.7 - abs(c.v) * 0.9) * 1.6 + seed * 1.7)
        z += 0.5 * math.sin(c.v * 2.3 + seed * 0.7)
        if z > 0.45 - 0.3 * (seed % 3 == 0):
            return LIGHT if c.v < 0 else BASE
        return None

    leaf(sp, "ph_pothos", bx, by, ang, L, W, "heart", bend=0,
         overlays=[("ph_pothos_var", var)], midrib=SHADE if L >= 5 else None)


# Hängende Blätter an den Ranken als handgesetzte Herzen (Spitze nach unten),
# damit sie auch bei 1× klar als Herzblatt lesbar sind. "V": gelbe Panaschierung.
HEART_BIG = ["XX.XX",
             "XXXXX",
             ".XXX.",
             "..X.."]
HEART_TILT_L = [".XX.X",
                "XXXXX",
                "XXXX.",
                "XX...",
                "X...."]
HEART_SMALL = ["X.X",
               "XXX",
               ".X."]
VAR_SPOTS = [((0, 1), (1, 1)), ((3, 1), (2, 2)), ((1, 0), (1, 1), (2, 1)), ((3, 0), (3, 1)), ((1, 2),)]


def stamp(sp, x, y, pat, seed, mirror=False):
    """Herzblatt-Stempel; (x, y) = Ansatz (Mitte der Kerbe oben)."""
    w = len(pat[0])
    ox = x - w // 2
    lay = sp.layer("ph_pothos")
    cells = []
    for dy, row in enumerate(pat):
        for dx, ch in enumerate(row):
            if ch != ".":
                xx = ox + (w - 1 - dx if mirror else dx)
                lay.px(xx, y + dy)
                cells.append((xx, y + dy))
    if len(pat) >= 4:
        ov = sp.layer("ph_pothos_var", outline=False, shading=False)
        for (dx, dy) in VAR_SPOTS[seed % len(VAR_SPOTS)]:
            q = (ox + (w - 1 - dx if mirror else dx), y + dy)
            if q in lay.pixels:
                ov.px(*q, LIGHT if dx < w // 2 else BASE)
    return lay


def vine(sp, pts, leaves, seed=0):
    """Ranke als 1-px-Linie; leaves: (t, Seite ±1, Länge, halbe Breite, Winkeloffset)."""
    lay = sp.layer("ph_vine", outline=False, shading=False)
    lay.curve(pts, tone=BASE, steps=60)
    out = []
    # gleichmäßig nach Bogenlänge verteilen
    samp = [_bez(pts, i / 200) for i in range(201)]
    acc = [0.0]
    for (xa, ya), (xb, yb) in zip(samp, samp[1:]):
        acc.append(acc[-1] + math.hypot(xb - xa, yb - ya))
    for i, (t, side, size) in enumerate(leaves):
        target = t * acc[-1]
        j = min(range(201), key=lambda k: abs(acc[k] - target))
        x, y = samp[j]
        out.append((round(x) + side, round(y), side, size, seed * 7 + i))
    return out


# Blattschopf: (Stielfuß x, Ansatz x, y, Winkel, Länge, halbe Breite, Stielbiegung)
# Ranken: (Kontrollpunkte, [(t, Seite, L, W, Winkeloffset), ...])
STAGES = {
    1: dict(crown=[(15, 13.5, 19, -150, 4.5, 2.1, 0.5),
                   (16.5, 18, 19.5, -30, 4.0, 1.9, -0.5)],
            vines=[]),
    2: dict(crown=[(15, 13, 17.5, -160, 5.5, 2.5, 0.5),
                   (16.5, 18.5, 17, -25, 5.5, 2.5, -0.5),
                   (15.5, 15.5, 19.5, -100, 4.0, 1.9, 0)],
            vines=[([(10.5, 23), (7, 21.5), (7, 26)],
                    [(1.0, 0, "s")])]),
    3: dict(crown=[(14.5, 13, 14.5, -150, 6.5, 2.9, 1),
                   (17, 18.5, 14, -35, 6.5, 2.9, -1),
                   (15.5, 16, 17.5, -100, 5.0, 2.3, 0)],
            vines=[([(10, 22.5), (5, 20.5), (6, 28)],
                    [(0.35, -1, "b"), (1.0, 0, "s")]),
                   ([(21, 22.5), (25.5, 21), (25.5, 25)],
                    [(1.0, 0, "s")])]),
    4: dict(crown=[(14, 12.5, 13.5, -150, 6.5, 2.9, 1),
                   (17.5, 19, 12.5, -30, 6.5, 2.9, -1),
                   (15.5, 16, 15.5, -105, 5.5, 2.5, 0),
                   (16.5, 19.5, 19, 10, 4.8, 2.2, 0)],
            vines=[([(12, 21), (3, 15), (4.5, 29)],
                    [(0.3, -1, "b"), (0.58, 1, "t"), (0.82, -1, "b"), (1.0, 0, "s")]),
                   ([(20, 21.5), (28, 18), (26.5, 27)],
                    [(0.4, 1, "b"), (0.74, -1, "t"), (1.0, 0, "s")])]),
    5: dict(crown=[(14, 12, 11.5, -140, 7.0, 3.1, 1),
                   (17.5, 19.5, 11, -38, 7.0, 3.1, -1),
                   (15.5, 16, 14.5, -100, 6.0, 2.7, 0),
                   (17, 20.5, 18.5, -8, 5.5, 2.5, -1),
                   (14.5, 12, 18.5, 178, 5.0, 2.3, 1),
                   (16, 17, 21, 70, 4.0, 1.9, 0)],
            vines=[([(12, 20), (0, 12), (3.5, 30)],
                    [(0.22, 1, "b"), (0.42, -1, "b"), (0.6, 1, "t"), (0.8, -1, "b"), (1.0, 0, "s")]),
                   ([(19.5, 21), (31, 14), (27, 30)],
                    [(0.3, -1, "b"), (0.52, 1, "b"), (0.72, -1, "t"), (1.0, 0, "s")]),
                   ([(14, 23), (11, 25), (12.5, 29)],
                    [(0.45, -1, "s"), (1.0, 0, "b")])]),
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp, "ph_pot_sage")
    plan = STAGES[stage]
    # hintere Ranken (seitlich) zuerst, damit der Schopf vorn liegt
    vleaves = []
    for k, (pts, lvs) in enumerate(plan["vines"]):
        vleaves.append(vine(sp, pts, lvs, k))
    for (sx, bx, by, ang, L, W, sb) in plan["crown"]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb, ramp="ph_vine")
    for i, (sx, bx, by, ang, L, W, sb) in enumerate(plan["crown"]):
        heart(sp, bx, by, ang, L, W, 40 + i)
    for lv in vleaves:
        for (x, y, side, size, seed) in lv:
            if size == "s":
                stamp(sp, x, y, HEART_SMALL, seed)
            elif size == "t":
                stamp(sp, x - side, y, HEART_TILT_L, seed, mirror=side > 0)
            else:
                stamp(sp, x, y, HEART_BIG, seed, mirror=side > 0)
    return sp
