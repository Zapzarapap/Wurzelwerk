"""Bonsai – Pflanzenhandlung.

Knorriger Baum mit geschwungenem, sich verjüngendem Stamm, sichtbaren Wurzelansätzen
und wolkenartigen, flachen Laubpolstern. Steht in einer flachen, glasierten
Bonsai-Schale statt im Standardtopf (Fuß endet wie der Topf bei y = 31).
"""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT

SOIL = 26  # Erdoberkante in der Schale


def dish(sp):
    body = sp.layer("ph_bonsai_dish")
    body.rect(6, 27, 25, 29)
    for x in (7, 8, 23, 24):
        body.px(x, 30)
    rim = sp.layer("ph_bonsai_dish")
    rim.rect(5, 26, 26, 26)
    s = sp.layer("soil", outline=False, shading=False)
    s.rect(7, 26, 24, 26, tone=SHADE)
    return body, rim


def _bez(pts, t):
    p = list(pts)
    while len(p) > 1:
        p = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(p, p[1:])]
    return p[0]


def limb(lay, pts, r0, r1, steps=60):
    """Sich verjüngender Ast/Stamm entlang einer Bezier-Kurve (Radius r0 -> r1)."""
    for i in range(steps + 1):
        t = i / steps
        x, y = _bez(pts, t)
        r = r0 + (r1 - r0) * t
        for yy in range(math.floor(y - r), math.ceil(y + r) + 1):
            for xx in range(math.floor(x - r), math.ceil(x + r) + 1):
                if (xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r + 0.15:
                    lay.px(xx, yy)


def pad(sp, cx, cy, rx, ry, seed=0):
    """Wolkenförmiges Laubpolster: flach, oben gewellt, unten fast gerade."""
    lay = sp.layer("leaf_deep")
    for y in range(int(cy - ry - 2), int(cy + ry) + 2):
        for x in range(int(cx - rx - 1), int(cx + rx) + 2):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            # Wellen an der Oberkante (Teilpolster)
            bump = 0.35 * math.cos((x + 0.5 - cx) * 1.25 + seed) if dy < 0 else 0
            if dx * dx + (dy * (1 - bump * 0.6)) ** 2 <= 1.0 and dy <= 0.85:
                lay.px(x, y)
    # Lichttupfer an der Oberseite der Bögen
    ov = sp.layer("leaf_deep", outline=False, shading=False)
    for (x, y) in list(lay.pixels):
        if (x, y - 1) not in lay.pixels and (x + seed) % 3 != 0:
            if (x, y + 1) in lay.pixels:
                ov.px(x, y + 1, LIGHT)
    for (x, y) in list(lay.pixels):
        if (x, y - 1) not in lay.pixels and (x + seed) % 4 == 1:
            ov.px(x, y, HIGHLIGHT)
    return lay


# Je Stufe: Stamm (Kontrollpunkte, r0, r1), Äste [(Kontrollpunkte, r0, r1)], Polster [(cx, cy, rx, ry)]
STAGES = {
    1: dict(trunk=([(15.5, SOIL), (14.5, 23), (16.5, 21)], 1.0, 0.6),
            branches=[],
            pads=[(16.5, 20, 3.2, 1.6)], roots=False, moss=[(13, 25.6, 1.6)]),
    2: dict(trunk=([(15, SOIL), (13, 22), (17.5, 20), (15.5, 16)], 1.4, 0.7),
            branches=[([(16, 20.5), (19, 19.5), (20.5, 19)], 0.6, 0.5)],
            pads=[(20.5, 18.5, 3.4, 1.6), (15.5, 15, 3.6, 1.8)], roots=False, moss=[(11.5, 25.6, 2)]),
    3: dict(trunk=([(14.5, SOIL), (11, 21), (19, 18), (15, 12)], 1.8, 0.8),
            branches=[([(16.5, 18.5), (20, 17.5), (22, 16.5)], 0.8, 0.5),
                      ([(12.5, 21.5), (10, 20.5), (8, 20)], 0.8, 0.5)],
            pads=[(22, 15.5, 4.2, 1.8), (8, 19, 3.8, 1.7), (15, 11, 4.4, 2.0)], roots=True,
            moss=[(10.5, 25.6, 2.2), (20, 25.6, 1.6)]),
    4: dict(trunk=([(14, SOIL), (9.5, 20), (20, 16), (14.5, 8.5)], 2.2, 0.9),
            branches=[([(17, 16.5), (21, 15), (23, 13)], 1.0, 0.5),
                      ([(11.5, 21), (8.5, 19.5), (6, 18.5)], 1.0, 0.5),
                      ([(17.5, 13), (19.5, 11), (19, 9.5)], 0.7, 0.4)],
            pads=[(23, 12.5, 4.6, 2.0), (6.5, 17.5, 4.4, 1.9), (13.5, 7.5, 4.8, 2.2), (20, 9, 3.2, 1.6)],
            roots=True, moss=[(10, 25.6, 2.4), (20.5, 25.6, 2.0)]),
    5: dict(trunk=([(14, SOIL), (8.5, 19), (21.5, 15), (14, 6.5)], 2.6, 0.9),
            branches=[([(17.5, 16), (22, 14), (24.5, 12)], 1.1, 0.5),
                      ([(11, 20.5), (7.5, 19), (5, 17)], 1.1, 0.5),
                      ([(18.5, 11.5), (21, 9.5), (21.5, 7.5)], 0.8, 0.4),
                      ([(14.5, 10), (11, 9.5), (8.5, 10)], 0.7, 0.4)],
            pads=[(24.5, 11.5, 4.8, 2.0), (5.5, 16, 4.6, 2.0), (9, 9.5, 3.6, 1.7),
                  (14, 5.5, 5.2, 2.3), (21.5, 7, 3.6, 1.7)],
            roots=True, moss=[(10, 25.6, 2.6), (21, 25.6, 2.2)]),
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    dish(sp)
    plan = STAGES[stage]
    for (mx, my, mr) in plan["moss"]:
        m = sp.layer("moss")
        m.ellipse(mx, my, mr, 0.8)
    bark = sp.layer("ph_bark")
    pts, r0, r1 = plan["trunk"]
    limb(bark, pts, r0, r1)
    if plan["roots"]:
        bx = pts[0][0]
        limb(bark, [(bx - 1, SOIL - 1), (bx - 3, SOIL - 0.5), (bx - 4.5, SOIL)], 0.9, 0.4)
        limb(bark, [(bx + 1, SOIL - 1), (bx + 3, SOIL - 0.6), (bx + 4, SOIL)], 0.9, 0.4)
    for (bpts, b0, b1) in plan["branches"]:
        limb(bark, bpts, b0, b1)
    # Rindenstruktur: dunkle Längsrisse
    tex = sp.layer("ph_bark", outline=False, shading=False)
    for i in range(6, 54, 7):
        x, y = _bez(pts, i / 60)
        p = (int(x + (0.6 if i % 2 else -0.4)), int(y))
        if p in bark.pixels:
            tex.px(*p, SHADE)
    for k, (cx, cy, rx, ry) in enumerate(plan["pads"]):
        pad(sp, cx, cy, rx, ry, seed=k)
    return sp
