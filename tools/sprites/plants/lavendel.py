"""Lavendel – Blumenwiese. Buschiger graugrüner Unterbau aus Nadelblättern, darüber
lange kahle Stiele mit Blütenquirlen in Etagen (unten mit Lücken, oben dichter)."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import stamp

VARIANTS = {
    "lila": None,
    "weiss": {"bw_lavender": "bw_white"},
    "rosa": {"bw_lavender": "petal_pink"},
}

BY = 29

# Blütenquirle: breit unten, schmal oben, Spitze als kleines Knöpfchen
WHORL = {
    3: ["hlb", "lbs"],
    2: ["hl", "bs"],
    1: ["l", "s"],
}


def spike(sp, x, y_top, tiers, base_x=None, base_y=BY - 3, bend=0.0):
    """Stiel von (base_x, base_y) bis zur Ähre, Ähre aus Quirlen. tiers: [(breite, lücke danach)] von unten."""
    h = sum(2 + g for (_, g) in tiers)
    y_bot = y_top + h
    bx = x if base_x is None else base_x
    stalk(sp, bx, base_y, x, y_bot, bend=bend, ramp="leaf_sage", tone=SHADE)
    stalk(sp, x, y_bot, x, y_top + 1, ramp="leaf_sage", tone=SHADE)
    y = y_bot
    for (w, gap) in tiers:
        art = WHORL[w]
        stamp(sp, x + (0.5 if w % 2 else 0.0) + (0 if w > 1 else 0.5) - (0 if w % 2 else 0), y - 1, art, "bw_lavender")
        y -= 2 + gap


def bush(sp, n, spread, height):
    """Niedriger, runder Busch: viele schmale graugrüne Blättchen als eine Masse
    (nur außen Outline), innen helle und dunkle Nadel-Striche."""
    mass = sp.layer("leaf_sage")
    det = sp.layer("leaf_sage", outline=False, shading=False)
    for i in range(n):
        t = (i + 0.5) / n
        ang = -172 + 164 * t + (8 if i % 2 else -8)
        L = height * (0.55 + 0.45 * math.sin(math.pi * t)) * (0.8 if i % 3 == 1 else 1.0)
        bx = 15.5 + (t - 0.5) * spread
        heart_leaf(mass, bx, BY, ang, L, 1.1, notch=False, midrib=False)
        a = math.radians(ang)
        tone = HIGHLIGHT if (i % 3 == 0 and math.cos(a) < 0.3) else (LIGHT if i % 3 != 2 else SHADE)
        for k in range(2, int(L) - 1):
            det.px(int(math.floor(bx + math.cos(a) * k)), int(math.floor(BY + math.sin(a) * k)), tone)


# Ähren je Stufe: (x, Spitze y, Quirle, Fuß x, Biegung)
TALL = [(3, 3), (3, 3), (3, 1), (2, 1), (2, 0), (1, 0)]
MID = [(3, 3), (3, 2), (2, 1), (2, 0), (1, 0)]
SHORT = [(3, 3), (2, 1), (2, 0), (1, 0)]
TINY = [(2, 2), (2, 0), (1, 0)]

SPIKES = {
    3: [(16, 9, TINY, 16, 0)],
    4: [(15, 3, MID, 15, 0), (21, 7, SHORT, 17, 1), (10, 8, SHORT, 14, -1)],
    5: [(15, 2, TALL, 15, 0), (21, 3, MID, 17, 1), (9, 5, MID, 14, -1),
        (26, 9, SHORT, 18, 1.5), (5, 11, SHORT, 13, -1.5)],
}
BUSH = {1: (5, 5, 4), 2: (8, 9, 6), 3: (10, 12, 7), 4: (12, 15, 8), 5: (14, 18, 9)}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    for (x, yt, tiers, fx, bend) in sorted(SPIKES.get(stage, []), key=lambda s: abs(s[0] - 15.5), reverse=True):
        spike(sp, x, yt, tiers, base_x=fx, bend=bend)
    n, spread, height = BUSH[stage]
    bush(sp, n, spread, height)
    return sp
