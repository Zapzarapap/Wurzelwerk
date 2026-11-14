"""Sukkulente (Echeverie) – Pflanzenhandlung.

Dichte, symmetrische Rosette in Schräg-Draufsicht: Jede Blattlage ist ein
Kranz (gestauchte Ellipse mit spitzen Blattenden). Von außen nach innen werden
die Kränze kleiner, höher und heller. Blätter blaugrün mit rosa Spitzen,
feine dunkle Trennlinien und ein Glanzpunkt pro Blatt. Stufe 5: Blütenstiel
mit orangen Glöckchen.
"""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot
from parts_pflanzenhandlung import stem

CX = 15.5
SQ = 0.62

# Kränze: (Blattzahl, Radius, Anhebung, Phase 0..1, Tonindex)
TIERS = {
    1: (22.4, [(3, 2.6, 0.0, 0.0, LIGHT), (1, 1.2, 1.2, 0.0, LIGHT)]),
    2: (21.6, [(5, 4.6, 0.0, 0.0, LIGHT), (3, 2.4, 1.4, 0.5, LIGHT)]),
    3: (20.6, [(6, 6.4, 0.0, 0.0, LIGHT), (5, 4.2, 1.4, 0.5, LIGHT), (3, 2.0, 2.6, 0.2, HIGHLIGHT)]),
    4: (19.8, [(7, 8.2, 0.0, 0.0, LIGHT), (6, 5.8, 1.3, 0.5, LIGHT), (5, 3.8, 2.4, 0.2, LIGHT),
               (3, 1.8, 3.4, 0.6, HIGHLIGHT)]),
    5: (19.4, [(8, 9.8, 0.0, 0.0, LIGHT), (7, 7.2, 1.2, 0.5, LIGHT), (6, 5.0, 2.3, 0.0, LIGHT),
               (5, 3.2, 3.3, 0.5, LIGHT), (3, 1.7, 4.2, 0.2, HIGHLIGHT)]),
}


def edge_dist(prof, x, y):
    """1 = Randpixel, 2 = direkt dahinter, sonst 3."""
    for k in (1, 2):
        for a in range(-k, k + 1):
            for b in range(-k, k + 1):
                if abs(a) + abs(b) <= k and (x + a, y + b) not in prof:
                    return k
    return 3


def tier(sp, cy, n, R, lift, phase, tone):
    cyl = cy - lift
    prof = {}   # (x, y) -> (r_norm, d, ang_idx)
    for y in range(int(cyl - R * SQ - 3), int(cyl + R * SQ + 3)):
        for x in range(int(CX - R - 3), int(CX + R + 3)):
            dx = x + 0.5 - CX
            dy = (y + 0.5 - cyl) / SQ
            r = math.hypot(dx, dy)
            th = math.atan2(dy, dx)
            m = (th / (2 * math.pi) * n + phase) % 1.0
            d = abs(m - 0.5) * 2          # 0 = Blattmitte, 1 = Lücke
            rr = R * (1 - 0.30 * d ** 0.9) if n > 1 else R
            if r <= rr:
                prof[(x, y)] = (r / R, d, int(th / (2 * math.pi) * n + phase + 8 * n))
    body = sp.layer("ph_echev_l")
    for q in prof:
        body.px(q[0], q[1], ("a", tone))
    if n < 2 or R < 2.5:
        return body
    ov = sp.layer("ph_echev_l", outline=False, shading=False)
    pk = sp.layer("ph_echev_pink", outline=False, shading=False)
    for (x, y), (rn, d, idx) in prof.items():
        edge = any((x + a, y + b) not in prof for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if d > 0.93 and 0.5 < rn < 0.75 and not edge and R >= 6:
            ov.px(x, y, SHADE)                 # Trennlinie zwischen Blättern
        elif d < 0.3 and edge_dist(prof, x, y) <= 1 and (y + 0.5 > cyl - 1 or R < 5):
            pk.px(x, y, BASE if (y + 0.5 > cyl - 0.3 or x + 0.5 > CX + 1) else LIGHT)
    # Glanzpunkt je Blatt
    for i in range(n):
        th = ((i + 0.5 - phase) / n) * 2 * math.pi
        gx = CX + math.cos(th) * R * 0.5 - 0.7
        gy = cyl + math.sin(th) * R * 0.5 * SQ - 0.5
        q = (math.floor(gx), math.floor(gy))
        if q in prof and R >= 4.5:
            ov.px(q[0], q[1], HIGHLIGHT)
    return body


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp, "cream")
    cy, tiers = TIERS[stage]
    if stage == 5:
        stem(sp, 17.5, 14, 22.5, 4, bend=-3, ramp="ph_echev_pink")
        for (bx_, by_) in ((21.5, 6.5), (23.5, 4.5), (20.2, 9)):
            b = sp.layer("petal_orange")
            b.rect(int(bx_), int(by_), int(bx_), int(by_) + 1)
    for (n, R, lift, phase, tone) in tiers:
        tier(sp, cy, n, R, lift, phase, tone)
    return sp
