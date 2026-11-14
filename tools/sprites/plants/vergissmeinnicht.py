"""Vergissmeinnicht – Blumenwiese. Niedriges, rundes Polster aus kleinen ovalen
Blättern, übersät mit winzigen hellblauen Blüten mit gelbem Auge; junge
Knospen sind rosa."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, rng
from parts import heart_leaf, stalk, meadow_ground

VARIANTS = {
    "blau": None,
    "rosa": {"bw_skyblue": "petal_pink"},
    "weiss": {"bw_skyblue": "bw_white"},
}

BY = 29

# Polster je Stufe: (Breite/2, Höhe, Blattzahl)
CUSHION = {
    1: (3.0, 3.5, 0),
    2: (5.5, 4.5, 9),
    3: (8.0, 6.0, 13),
    4: (10.0, 7.5, 17),
    5: (12.0, 9.0, 22),
}
# Blütendolden: (x, y, Anzahl Blüten); Knospen (x, y)
CLUSTERS = {
    2: [],
    3: [(12, 21, 2), (19, 20, 3)],
    4: [(9, 21, 3), (15, 17, 4), (21, 19, 3), (25, 24, 2), (6, 25, 2)],
    5: [(7, 20, 3), (12, 15, 4), (18, 13, 4), (23, 17, 4), (26, 23, 2), (4, 25, 2), (16, 21, 3), (21, 24, 2)],
}
BUDS = {2: [(13, 25), (18, 24), (15, 23)], 3: [(15, 24), (10, 25), (20, 25)], 4: [(12, 23), (18, 22)], 5: [(9, 24), (24, 21), (14, 25)]}
# Lage der Einzelblüten in einer Dolde (Pluszeichen 3×3, berühren sich zu einem Büschel)
OFFS = [(0, 0), (2, 1), (-2, 1), (1, -2), (-1, 3)]


def sprout(sp):
    for (bx, ang, L) in ((15, -140, 3.5), (17, -40, 3.5), (16, -95, 4.5)):
        heart_leaf(sp.layer("leaf"), bx, BY, ang, L, 1.4, notch=False, midrib=False)


def in_dome(x, y, rx, h):
    dx, dy = (x - 15.5) / rx, (BY + 0.5 - y) / h
    return dx * dx + dy * dy <= 1.0 and y <= BY


def cushion(sp, rx, h, n_leaves, seed):
    """Polster: Grundkuppel + kleine ovale Blätter, die über den Rand ragen (bucklige Kontur)."""
    r = rng(seed)
    mass = sp.layer("leaf")
    mass.shape(lambda x, y: in_dome(x, y, rx - 1.8, h - 1.8), 0, 0, 31, BY)
    for i in range(n_leaves):
        th = math.pi * (0.03 + 0.94 * (i + r.random() * 0.5) / n_leaves)
        cx = 15.5 - math.cos(th) * (rx - 0.6)
        cy = BY + 0.5 - math.sin(th) * (h - 0.3)
        mass.ellipse(cx, cy, 1.6 + r.random() * 0.7, 1.1 + r.random() * 0.3)
    det = sp.layer("leaf", outline=False, shading=False)
    for _ in range(n_leaves * 2):
        x, y = 15.5 + (r.random() * 2 - 1) * rx, BY - r.random() * h
        q = (int(x), int(y))
        if q in mass.pixels and (q[0], q[1] - 1) in mass.pixels and (q[0], q[1] - 2) in mass.pixels:
            det.px(q[0], q[1], LIGHT if x < 15.5 else SHADE)
    return mass


def cluster(sp, x, y, n):
    """Dolde aus n winzigen Blüten (Pluszeichen) mit gelbem Auge, gemeinsame Outline."""
    pet = sp.layer("bw_skyblue", shading=False)
    eyes = []
    for (dx, dy) in OFFS[:n]:
        cx, cy = x + dx, y + dy
        pet.px(cx, cy - 1, HIGHLIGHT)
        pet.px(cx - 1, cy, LIGHT)
        pet.px(cx + 1, cy, BASE)
        pet.px(cx, cy + 1, BASE)
        pet.px(cx, cy, LIGHT)
        eyes.append((cx, cy))
    # Kanten unten rechts dunkler
    for (px, py) in list(pet.pixels):
        if (px + 1, py) not in pet.pixels and (px, py + 1) not in pet.pixels:
            pet.pixels[(px, py)] = SHADE
    eye = sp.layer("petal_yellow", outline=False, shading=False)
    for (cx, cy) in eyes:
        eye.px(cx, cy, LIGHT)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp, w=7 if stage < 4 else 9)
    rx, h, nl = CUSHION[stage]
    if stage == 1:
        sprout(sp)
        return sp
    for (x, y, n) in CLUSTERS[stage]:
        stalk(sp, x, y + 2, 15.5 + (x - 15.5) * 0.5, BY - 2, ramp="leaf", tone=BASE)
    cushion(sp, rx, h, nl, seed=stage * 13)
    bud = sp.layer("petal_pink", outline=False, shading=False)
    for (x, y) in BUDS[stage]:
        bud.px(x, y, LIGHT)
    for (x, y, n) in sorted(CLUSTERS[stage], key=lambda c: c[1]):
        cluster(sp, x, y, n)
    return sp
