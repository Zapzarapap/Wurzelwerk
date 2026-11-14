"""Zunderschwamm – Wald. Alter Baumstumpf mit konsolen-/hufförmigen, gestuften Baumpilzen
(grau-braun, Zuwachszonen als Bänder, helle cremefarbene Wachstumskante). Je Stufe mehr
und größere Konsolen."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import forest_ground
from parts_wald import stump, GROUND

F = "wa_zunder"
X0, X1, TOP = 11, 20, 10     # Stumpf


def bracket(sp, x, y, w, h, side):
    """Hufförmige, gestufte Konsole. (x,y): Ansatz oben am Stammrand; w: wie weit sie
    absteht; h: Höhe; side: -1 links, 1 rechts, 0 vorn (symmetrisch).
    Aufgebaut aus übereinanderliegenden Zuwachs-Stufen: oben schmal und dunkler (alt),
    unten am weitesten vorstehend mit heller, cremefarbener Wachstumskante."""
    lay = sp.layer(F, shading=False)
    n = max(1, min(3, round(h / 2.5) + 1))
    rows = h + 1
    tier_of = lambda r: min(n - 1, r * n // rows)
    pts = {}
    for r in range(rows):
        k = tier_of(r)
        ext = w * (0.5 + 0.5 * (k + 1) / n)
        first = r == 0 or tier_of(r - 1) != k
        last = r == rows - 1 or tier_of(r + 1) != k
        e = ext - (0.9 if first and ext > 2 else 0)          # Stufenkante gerundet
        if last and k < n - 1 and ext > 2:
            e -= 0.6
        if side == 0:
            xs = range(math.floor(x - e + 0.5), math.ceil(x + e - 0.5))
        else:
            xs = [x + u * side for u in range(0, max(1, round(e)) + 1)]
        xs = list(xs)
        for i, xx in enumerate(xs):
            outer = (i == len(xs) - 1) if side == 1 else (i == 0) if side == -1 else (i in (0, len(xs) - 1))
            if first:
                tone = LIGHT if k < n - 1 else HIGHLIGHT
            elif last and k < n - 1:
                tone = SHADE
            else:
                tone = BASE if k < n - 1 else LIGHT
            if k == 0 and not first:
                tone = SHADE if last else BASE
            pts[(xx, y + r)] = (tone, k, outer, last)
    for (p, (tone, k, outer, last)) in pts.items():
        lay.px(*p, tone)
    # cremefarbene Wachstumskante: Außenkante + Unterseite der untersten Stufe
    edge = sp.layer("cream", outline=False, shading=False)
    for (p, (tone, k, outer, last)) in pts.items():
        if k == n - 1 and (outer or last) and p[0] != x:
            edge.px(*p, LIGHT if (last and not outer) else BASE)
    return lay


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(12 if stage >= 4 else 10))
    stump(sp, X0, X1, TOP, low=True)
    if stage == 1:
        bracket(sp, X1, 20, 2, 1, 1)
    elif stage == 2:
        bracket(sp, X1, 18, 3, 2, 1)
        bracket(sp, X0, 22, 2, 1, -1)
    elif stage == 3:
        bracket(sp, X1, 16, 5, 3, 1)
        bracket(sp, X0, 20, 4, 3, -1)
        bracket(sp, 15.5, 24, 2.5, 1, 0)
    elif stage == 4:
        bracket(sp, X1, 14, 7, 4, 1)
        bracket(sp, X1, 22, 4, 2, 1)
        bracket(sp, X0, 17, 6, 4, -1)
        bracket(sp, 15, 22, 4, 2, 0)
    else:
        bracket(sp, X1, 12, 9, 6, 1)
        bracket(sp, X1, 22, 6, 3, 1)
        bracket(sp, X0, 15, 8, 5, -1)
        bracket(sp, X0, 24, 4, 2, -1)
        bracket(sp, 15, 20, 5, 3, 0)
    return sp
