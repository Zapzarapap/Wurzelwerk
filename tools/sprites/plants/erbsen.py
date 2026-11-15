"""Erbsen – Gewächshaus. Zwei Ranken klettern an Reisigzweigen hoch: kleine runde,
bläulich-grüne Fiederblättchen, Ranken-Locken, weiße Schmetterlingsblüten; ab Stufe 4
erste, in Stufe 5 viele hängende grüne Schoten."""
REGION = "gewaechshaus"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import stalk
from parts_gewaechshaus import (greenhouse_ground, brushwood, winding_stem, pea_bloom, pea_pod,
                                tendril, SOIL_Y)

VARIANTS = {
    "weiss": None,
    "lila": {"petal_white": "petal_purple"},   # violett blühende Sorten (z. B. Kapuzinererbse)
}

LEAF = "gh_pea"

# Reisig: (x unten, x oben, y oben, Seitenzweige)
TWIGS = {
    2: [(12, 11, 18, [(0.6, -2, -2)]), (20, 21, 19, [(0.5, 2, -2)])],
    3: [(12, 10, 10, [(0.45, -3, -2), (0.8, 2, -3)]),
        (20, 22, 11, [(0.4, 3, -2), (0.75, -2, -3)])],
    4: [(12, 9, 3, [(0.35, -3, -2), (0.65, 3, -3), (0.85, -2, -2)]),
        (20, 23, 3, [(0.3, 3, -2), (0.6, -3, -3), (0.85, 2, -2)])],
    5: [(12, 8, 1, [(0.3, -3, -2), (0.6, 3, -3), (0.9, -3, -2)]),
        (20, 24, 1, [(0.3, 3, -2), (0.55, -3, -3), (0.9, 3, -2)])],
}

# Ranken: (x Mitte, y oben, Phase)
VINES = {
    1: [(15.5, 22, 0.0)],
    2: [(12.5, 17, 0.0), (19.5, 18, 2.0)],
    3: [(11.5, 10, 0.0), (20.5, 11, 2.0)],
    4: [(10.5, 7, 0.0), (21.5, 8, 2.0)],
    5: [(10.0, 5, 0.0), (22.0, 6, 2.0)],
}

FLOWERS = {
    3: [(8, 13), (24, 15)],
    4: [(7, 9), (25, 12), (14, 17)],
    5: [(6, 6), (26, 9), (11, 21)],
}

# Schoten: (x, y, Länge, Schwung)
PODS = {
    4: [(12, 18, 4, 0), (21, 14, 4, 0)],
    5: [(5, 12, 6, -1), (13, 13, 6, -1), (18, 8, 5, 1), (25, 15, 6, 1), (16, 19, 5, 0)],
}


def leaflet_pair(sp, x, y, r, side):
    """Ein Blatt an einem Knoten: kurzer Blattstiel, zwei runde Fiederblättchen
    (oben größer), dazu ein kleines Nebenblatt am Stängel. side = Richtung."""
    stalk(sp, x, y, x + side * 3, y - 2, ramp="stem", tone=BASE)
    for (dx, dy, rr) in ((side * 3.2, -2.6, r), (side * 2.0, 0.4, r * 0.75)):
        l = sp.layer(LEAF)
        l.ellipse(x + dx, y + dy, rr, rr * 0.8)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    greenhouse_ground(sp)
    for (xb, xt, yt, tw) in TWIGS.get(stage, []):
        brushwood(sp, xb, SOIL_Y + 1, xt, yt, tw)
    for vi, (vx, vtop, ph) in enumerate(VINES[stage]):
        _, pts = winding_stem(sp, vx, vtop, amp=1.0 if stage > 1 else 0, freq=0.6, phase=ph)
        r = 1.2 if stage <= 2 else 1.5
        step = 4 if stage >= 3 else 3
        for k, (x, y) in enumerate(pts[2::step]):
            side = 1 if (k + vi) % 2 == 0 else -1
            if stage == 1:
                side = 1 if k % 2 == 0 else -1
            leaflet_pair(sp, x, y, r if k < len(pts) // step - 1 else r * 0.8, side)
        # Ranken-Locke an der Spitze
        x, y = pts[-1]
        if stage >= 2:
            d = -1 if vi == 0 else 1
            tendril(sp, [(x, y), (x + d * 2, y - 2), (x + d * 3, y)])
    if stage >= 3:
        for (vx, vtop, ph) in VINES[stage]:
            for yy in range(vtop + 5, SOIL_Y - 4, 6):
                d = -1 if vx < 16 else 1
                tendril(sp, [(vx + d, yy), (vx + d * 3, yy - 1), (vx + d * 3, yy + 1)])
    for (x, y, L, b) in PODS.get(stage, []):
        pea_pod(sp, "gh_pea_pod", x, y, L, b)
    for (x, y) in FLOWERS.get(stage, []):
        pea_bloom(sp, x, y)
    return sp
