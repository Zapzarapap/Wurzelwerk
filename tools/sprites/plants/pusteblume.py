"""Pusteblume (Löwenzahn) – Blumenwiese. Stufe 1–3 gezähnte Blattrosette,
Stufe 4 gelbe Blüte, Stufe 5 weiße Pusteblumen-Kugeln und eine gelbe Blüte."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import leaf_frame, stalk, meadow_ground
from parts_blumenwiese import stamp

BY = 29
X = {"c": ("bw_russet", SHADE)}

PUFF = {
    "L": ["..h.h.h..",
          ".hhlhlhh.",
          "hhlhlhllh",
          ".lhlblhl.",
          "hlhbcbllb",
          ".lhlblbl.",
          "hllblllbs",
          ".lllbbls.",
          "..b.s.s.."],
    "M": [".h.h.h.",
          "hhlhlhl",
          ".lhbll.",
          "hlbcbls",
          ".lhbbl.",
          "lllblbs",
          ".b.s.s."],
    # halb verblasen: Lücken, einzelne Schirmchen fehlen
    "G": ["...h.h...",
          ".h.hlh.h.",
          "..hlhll..",
          "hhlhblhlh",
          ".lhbcbll.",
          "hllbblllb",
          "..llbls..",
          ".l.lbl.s.",
          "...b.s..."],
}


def toothed_leaf(sp, bx, by, ang, L, W, teeth=4):
    """Löwenzahnblatt: lanzettlich mit nach hinten gerichteten Zähnen (Sägeform)."""
    lay = sp.layer("leaf")
    a = math.radians(ang)
    lit_sign = 1 if (math.sin(a) - math.cos(a)) > 0 else -1
    r = int(L + W + 2)
    for y in range(int(by - r), int(by + r) + 1):
        for x in range(int(bx - r), int(bx + r) + 1):
            u, v = leaf_frame(bx, by, a, x + 0.5, y + 0.5)
            t = u / L
            if t < 0 or t > 1:
                continue
            base_w = W * (0.35 + 0.65 * math.sin(math.pi * min(1.0, t * 1.15)) ** 0.7)
            saw = (t * teeth + (0.0 if v > 0 else 0.5)) % 1.0
            w = base_w * (0.45 + 0.55 * saw) if t > 0.12 else base_w * 0.45
            if abs(v) <= max(0.5, w):
                lay.px(x, y, ("a", LIGHT if v * lit_sign > 0 else BASE))
    # Mittelrippe hell
    for i in range(1, int(L * 0.85)):
        p = (round(bx + math.cos(a) * i - 0.5), round(by + math.sin(a) * i - 0.5))
        if p in lay.pixels:
            lay.px(*p, HIGHLIGHT)
    return lay


ROSETTE = {
    1: [(14, -172, 6.5, 1.9, 3), (17, -8, 6.5, 1.9, 3), (16, -100, 4.5, 1.5, 2)],
    2: [(13, -170, 8.5, 2.3, 4), (18, -12, 8.5, 2.3, 4), (14, -130, 6.5, 2.0, 3), (17, -55, 6.5, 2.0, 3)],
    3: [(12, -170, 9, 2.5, 4), (19, -12, 9, 2.5, 4), (14, -135, 8, 2.3, 4), (18, -48, 8, 2.3, 4), (16, -95, 6, 2.0, 3)],
    4: [(12, -172, 10, 2.6, 4), (19, -10, 10, 2.6, 4), (14, -140, 8.5, 2.4, 4), (18, -42, 8.5, 2.4, 4), (16, -98, 6, 2.0, 3)],
    5: [(12, -174, 10.5, 2.7, 5), (19, -8, 10.5, 2.7, 5), (14, -145, 9, 2.4, 4), (18, -38, 9, 2.4, 4), (15, -105, 6.5, 2.0, 3)],
}


HEAD = {
    "L": ["..h.h.h..",
          ".hlhlhlh.",
          "hlhlhlhll",
          "lhlhYhlbl",
          "hlhlYlbbs",
          ".lblbbbs.",
          "..s.b.s.."],
    "M": [".h.h.h.",
          "hlhlhll",
          "lhlYhbl",
          "hlhlbbs",
          ".lbbbs.",
          "..s.s.."],
}


def yellow(sp, x, y, size="L"):
    """Gelber Löwenzahn-Korb: dicht gefüllt, fransig, unten grüne Hüllblätter."""
    h = len(HEAD[size])
    stamp(sp, x, y + h / 2 + 0.3, ["lbs"], "leaf")
    stamp(sp, x, y, HEAD[size], "bw_dandelion", {"Y": ("bw_dandelion", HIGHLIGHT)})


def pstem(sp, x0, x1, y1, bend=0.0):
    stalk(sp, x0, BY - 1, x1, y1, bend=bend, ramp="stem", tone=LIGHT)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    meadow_ground(sp)
    if stage == 3:
        pstem(sp, 16, 17, 22)  # geschlossene Knospe
    elif stage == 4:
        pstem(sp, 15, 13, 14, bend=-1)
        pstem(sp, 17, 21, 21, bend=1)
    elif stage == 5:
        pstem(sp, 15, 11, 9, bend=-1.5)
        pstem(sp, 17, 22, 5, bend=1)
        pstem(sp, 16, 18, 18, bend=0.5)
    for (bx, ang, L, W, n) in ROSETTE[stage]:
        toothed_leaf(sp, bx, BY, ang, L, W, n)
    if stage == 3:
        stamp(sp, 17.5, 20.5, ["lb", "bs", "lb"], "leaf")
    elif stage == 4:
        stamp(sp, 21.5, 19.5, ["lb", "bs", "lb"], "leaf")
        yellow(sp, 13.5, 11.5)
    elif stage == 5:
        stamp(sp, 22.5, 5.5, PUFF["L"], "bw_puff", X)
        stamp(sp, 11.5, 9.5, PUFF["G"], "bw_puff", X)
        yellow(sp, 18.5, 16.5, "M")
    return sp
