"""Glühmoos – Wald (selten). Moospolster mit türkis leuchtenden Glühpilzen (glow-Ebenen)."""
REGION = "wald"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import forest_ground
from parts_wald import glowshroom


def mound(sp, blobs, speckle_seed=3):
    m = sp.layer("wa_moos")
    for (cx, cy, rx, ry) in blobs:
        m.ellipse(cx, cy, rx, ry)
    # Moostextur
    t = sp.layer("wa_moos", outline=False, shading=False)
    import random
    r = random.Random(speckle_seed)
    pts = sorted(m.pixels)
    for (x, y) in pts:
        if (x, y - 1) in m.pixels and (x, y + 1) in m.pixels and r.random() < 0.22:
            t.px(x, y, LIGHT if r.random() < 0.55 else SHADE)
    return m


def top_y(m, x):
    ys = [y for (px, y) in m.pixels if px == round(x)]
    return min(ys) if ys else 28


def spore(sp, x, y, tone=HIGHLIGHT):
    g = sp.layer("wa_glow", glow=True, outline=False, shading=False)
    g.px(x, y, tone)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(11 if stage >= 4 else 8))
    if stage == 1:
        m = mound(sp, [(15.5, 28, 4.5, 2.4)])
        glowshroom(sp, 15, top_y(m, 15) + 1, 2, 1.6)
    elif stage == 2:
        m = mound(sp, [(14.5, 27.5, 6, 3), (19.5, 28, 3.5, 2.2)])
        glowshroom(sp, 13, top_y(m, 13) + 1, 3, 1.8)
        glowshroom(sp, 18, top_y(m, 18) + 1, 2, 1.5)
    elif stage == 3:
        m = mound(sp, [(14, 26.5, 8, 4), (21, 27.5, 5, 3)])
        glowshroom(sp, 10, top_y(m, 10) + 1, 4, 2.4)
        glowshroom(sp, 16, top_y(m, 16) + 1, 6, 2.8)
        glowshroom(sp, 21, top_y(m, 21) + 1, 3, 2.0)
        spore(sp, 13, 17)
    elif stage == 4:
        m = mound(sp, [(15, 26, 10, 5), (23, 27, 5, 3.4), (8, 27.3, 4.5, 3)])
        glowshroom(sp, 9, top_y(m, 9) + 1, 4, 2.2)
        glowshroom(sp, 14, top_y(m, 14) + 1, 8, 3.0)
        glowshroom(sp, 20, top_y(m, 20) + 1, 5, 2.5)
        glowshroom(sp, 24, top_y(m, 24) + 1, 3, 1.9)
        spore(sp, 11, 13)
        spore(sp, 19, 10, LIGHT)
        spore(sp, 22, 15)
    else:
        m = mound(sp, [(15.5, 25, 12, 6.5), (6, 27.5, 5, 3.6), (26, 27, 5, 3.8), (21, 22.5, 6, 4)])
        glowshroom(sp, 6, top_y(m, 6) + 1, 4, 2.2)
        glowshroom(sp, 11, top_y(m, 11) + 1, 8, 3.2)
        glowshroom(sp, 17, top_y(m, 17) + 1, 11, 3.6)
        glowshroom(sp, 23, top_y(m, 23) + 1, 6, 2.6)
        glowshroom(sp, 27, top_y(m, 27) + 1, 3, 1.9)
        glowshroom(sp, 14, top_y(m, 14) + 1, 3, 1.8)
        glowshroom(sp, 20, top_y(m, 20) + 1, 4, 2.0)
        spore(sp, 8, 11)
        spore(sp, 14, 6, LIGHT)
        spore(sp, 22, 9)
        spore(sp, 25, 14, LIGHT)
        spore(sp, 4, 17, LIGHT)
    return sp
