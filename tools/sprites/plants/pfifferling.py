"""Pfifferling – Wald. Dottergelb, trichterförmig, gewellter Rand, meist Gruppe."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import forest_ground
from parts_wald import GROUND


def chanterelle(sp, x, top, rx, lean=0.0, ground=GROUND, wave=0):
    """Trichter: oben breiter, gewellter Rand mit Delle, nach unten verjüngt zum Stiel."""
    H = max(ground - top, 2)
    stem_hw = max(0.9, rx * 0.26)
    rx = rx * 1.2
    body = sp.layer("wa_pfiffer")
    for y in range(top, ground + 1):
        t = (y - top) / H
        hw = stem_hw + (rx - stem_hw) * max(0.0, 1 - t / 0.5) ** 0.9
        if y == top:
            hw *= 0.9
        c = x + lean * t
        for xx in range(math.floor(c - hw - 1), math.ceil(c + hw) + 2):
            if abs(xx + 0.5 - c) <= hw:
                body.px(xx, y)
    # gewellter Rand: ein paar Zacken in der obersten Reihe herausnehmen
    xs = sorted(px for (px, py) in body.pixels if py == top)
    for i, px in enumerate(xs):
        if rx >= 2.5 and (i + wave) % 3 == 1 and 0 < i < len(xs) - 1:
            body.erase(px, top)
    # Delle im Trichter
    dip = sp.layer("wa_pfiffer", outline=False, shading=False)
    if rx >= 2.5:
        for px in range(round(x - rx * 0.6), round(x + rx * 0.6)):
            if (px, top + 1) in body.pixels:
                dip.px(px, top + 1, SHADE)
            if rx >= 5 and (px, top + 2) in body.pixels and abs(px + 0.5 - x) < rx * 0.35:
                dip.px(px, top + 2, BASE)
    # Leisten (Schein-Lamellen) am Trichter
    rid = sp.layer("wa_pfiffer", outline=False, shading=False)
    if rx >= 3:
        for k, dx in enumerate((-0.45, 0.1, 0.55)):
            px = round(x + dx * rx + lean * 0.5)
            for y in range(top + 2, min(top + 2 + int(rx * 0.7) + 1, ground - 1)):
                if (px, y) in body.pixels:
                    rid.px(px, y, SHADE if k != 0 else LIGHT)
    hl = sp.layer("wa_pfiffer", outline=False, shading=False)
    if rx >= 2.5 and (round(x - rx * 0.7), top) in body.pixels:
        hl.px(round(x - rx * 0.7), top, HIGHLIGHT)
        hl.px(round(x - rx * 0.4), top, LIGHT)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(11 if stage >= 4 else 8))
    if stage == 1:
        chanterelle(sp, 15.5, 25, 2.2, ground=28)
    elif stage == 2:
        chanterelle(sp, 18, 23, 2.8, lean=1.0)
        chanterelle(sp, 11.5, 25, 2.0, lean=-0.6, ground=28)
    elif stage == 3:
        chanterelle(sp, 19.5, 19, 3.8, lean=1.5)
        chanterelle(sp, 10.5, 21, 3.2, lean=-1.2, wave=1)
        chanterelle(sp, 15, 24, 2.3, ground=28)
    elif stage == 4:
        chanterelle(sp, 21, 14, 4.8, lean=2.0)
        chanterelle(sp, 9.5, 17, 4.4, lean=-2.0, wave=1)
        chanterelle(sp, 15.5, 21, 3.8, lean=0.5, wave=2)
        chanterelle(sp, 24.5, 24, 2.4, lean=1.0, ground=28)
    else:
        chanterelle(sp, 22, 8, 5.8, lean=2.4)
        chanterelle(sp, 8.5, 11, 5.2, lean=-2.4, wave=1)
        chanterelle(sp, 15.5, 17, 4.6, lean=0.6, wave=2)
        chanterelle(sp, 26.5, 20, 3.2, lean=1.4, wave=1)
        chanterelle(sp, 4.5, 22, 2.8, lean=-1.0)
        chanterelle(sp, 20.5, 24, 2.4, wave=2, lean=-0.4)
    return sp
