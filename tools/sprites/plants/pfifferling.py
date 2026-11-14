"""Pfifferling – Wald. Dottergelb, flacher Trichter mit welligem, leicht eingerolltem Rand,
Leisten laufen den kurzen Stiel hinab; locker in kleinen Gruppen."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import forest_ground
from parts_wald import GROUND

R = "wa_pfiffer"


def chanterelle(sp, x, rx, h, ground=GROUND, lean=0.0, wave=0, flip=False):
    """x: Mitte am Boden; rx: halbe Hutbreite; h: Gesamthöhe (Boden bis Hutrand)."""
    top = ground - h
    sw = max(0.8, rx * 0.28)            # halbe Stielbreite oben
    funnel = max(2, round(h * 0.62))     # Trichter-Höhe
    body = sp.layer(R)
    cx_at = lambda y: x + lean * (ground - y) / max(h, 1)
    for y in range(top, ground + 1):
        t = (y - top) / funnel
        if t <= 1:
            hw = sw + (rx - sw) * (1 - t) ** 1.05
        else:
            hw = sw + 0.25 * (y - top - funnel) / max(1, h - funnel)
        c = cx_at(y)
        for xx in range(math.floor(c - hw - 1), math.ceil(c + hw) + 2):
            if abs(xx + 0.5 - c) <= hw:
                body.px(xx, y)
    # welliger Rand: oben einzelne Pixel entfernen/ergänzen, Ränder hängen etwas herab
    c0 = cx_at(top)
    xs = sorted(px for (px, py) in body.pixels if py == top)
    for i, px in enumerate(xs):
        if rx >= 2.5 and (i + wave) % 4 == 2 and 1 < i < len(xs) - 2:
            body.erase(px, top)
    if rx >= 3:
        # Rand rundet sich nach außen-unten: oberste Ecken weg
        body.erase(xs[0], top)
        body.erase(xs[-1], top)
    # Trichteröffnung: flache dunklere Mulde in der Mitte der Oberkante
    dip = sp.layer(R, outline=False, shading=False)
    if rx >= 2.5:
        hw_in = rx * 0.55
        for px in range(math.floor(c0 - hw_in), math.ceil(c0 + hw_in)):
            if (px, top) in body.pixels and (px, top - 1) not in body.pixels:
                dip.px(px, top, SHADE if rx >= 4 else BASE)
        for px in range(math.floor(c0 - hw_in * 0.5), math.ceil(c0 + hw_in * 0.5)):
            if rx >= 4.5 and (px, top + 1) in body.pixels:
                dip.px(px, top + 1, SHADE)
        # helle Lippe vorn
        for px in range(math.floor(c0 - rx + 1), math.ceil(c0 + rx - 1)):
            yy = top + (2 if rx >= 4.5 else 1)
            if (px, yy) in body.pixels and abs(px + 0.5 - c0) > hw_in * 0.5 - 0.5:
                dip.px(px, yy, LIGHT if px < c0 else BASE)
    # Leisten: schräg zum Stiel zusammenlaufend
    rid = sp.layer(R, outline=False, shading=False)
    if rx >= 3:
        y_start = top + (3 if rx >= 4.5 else 2)
        for k, f in enumerate((-0.6, -0.15, 0.3, 0.7)):
            if rx < 4 and k in (0, 3):
                continue
            for y in range(y_start, min(top + funnel + 2, ground - 1)):
                t = (y - y_start) / max(1, top + funnel + 1 - y_start)
                c = cx_at(y)
                px = round(c + f * (rx - 1) * (1 - t) + f * sw * t - 0.5)
                if (px, y) in body.pixels:
                    rid.px(px, y, SHADE if f > -0.5 else BASE)
    # Glanz oben links
    hl = sp.layer(R, outline=False, shading=False)
    if rx >= 2.5:
        hl.px(xs[1] if rx < 3 else xs[2], top, HIGHLIGHT)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(11 if stage >= 4 else 8))
    if stage == 1:
        chanterelle(sp, 15.5, 2.0, 3)
    elif stage == 2:
        chanterelle(sp, 17, 3.0, 5, lean=0.5)
        chanterelle(sp, 11.5, 1.8, 3, lean=-0.3)
    elif stage == 3:
        chanterelle(sp, 18.5, 4.6, 8, lean=1.0)
        chanterelle(sp, 10, 3.2, 5, lean=-0.8, wave=1)
        chanterelle(sp, 24, 1.8, 3, wave=2)
    elif stage == 4:
        chanterelle(sp, 17.5, 6.0, 10, lean=1.0)
        chanterelle(sp, 7.5, 4.0, 6, lean=-1.2, wave=1)
        chanterelle(sp, 25.5, 3.0, 5, lean=0.8, wave=2)
        chanterelle(sp, 12, 1.8, 3)
    else:
        chanterelle(sp, 10, 7.0, 13, lean=-1.2)
        chanterelle(sp, 23, 5.2, 10, lean=1.2, wave=1)
        chanterelle(sp, 3.5, 2.6, 4, lean=-0.6, wave=2)
        chanterelle(sp, 17, 3.0, 5, wave=3)
        chanterelle(sp, 28.5, 2.0, 3, wave=1)
    return sp
