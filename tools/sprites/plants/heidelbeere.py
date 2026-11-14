"""Heidelbeere – Wald. Lockerer Zwergstrauch: grüne, kantige Zickzack-Zweige mit kleinen
wechselständigen Blättern; Stufe 4 rosa Krugblüten, Stufe 5 blaue Beeren unter den Zweigen."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import forest_ground, stalk
from parts_wald import oval_leaf

TWIG = "wa_heidel"


def twig(sp, pts, tone=SHADE):
    """Kantiger Zweig als Polylinie (1 px, ohne Outline)."""
    s = sp.layer(TWIG, outline=False, shading=False)
    for a, b in zip(pts, pts[1:]):
        s.line(*a, *b, tone=tone)
    return s


def leaf(sp, x, y, ang, L=3.2):
    oval_leaf(sp, "wa_heidel", x, y, ang, L, 1.35 if L >= 3 else 1.1)


def berry(sp, x, y, r=1.0):
    """Beere: 2×2 (r>=1.3: 3×3) Kern + Outline = runde Kugel, Glanzpunkt oben links."""
    n = 3 if r >= 1.3 else 2
    stalk(sp, x, y - 2, x, y - 1, ramp=TWIG, tone=SHADE)
    b = sp.layer("wa_beere", shading=False)
    for dy in range(n):
        for dx in range(n):
            b.px(x + dx - 1, y + dy, BASE if (dx + dy) < n else SHADE)
    b.px(x - 1, y, HIGHLIGHT if n == 3 else LIGHT)
    if n == 3:
        b.px(x, y, LIGHT)


def flower(sp, x, y):
    """Hängende, krugförmige Blüte: kleines rosa-weißes Glöckchen (1×2 px + Outline)."""
    stalk(sp, x, y - 2, x, y - 1, ramp=TWIG, tone=SHADE)
    f = sp.layer("petal_pink", shading=False)
    f.px(x, y, 4)
    f.px(x, y + 1, 3)


def bush(sp, twigs, leafs, flowers=(), berries=()):
    for t in twigs:
        twig(sp, t)
    for (x, y, ang, L) in sorted(leafs, key=lambda l: l[1]):
        leaf(sp, x, y, ang, L)
    for (x, y) in flowers:
        flower(sp, x, y)
    for b in berries:
        berry(sp, *b)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(10 if stage >= 4 else 8))
    if stage == 1:
        bush(sp, [[(15, 28), (15, 25), (16, 23)]],
             [(15, 25, -150, 3.0), (16, 23, -60, 3.2)])
    elif stage == 2:
        bush(sp, [[(15, 28), (14, 24), (15, 21)], [(14, 25), (18, 22)]],
             [(14, 25, -160, 3.2), (15, 21, -100, 3.2), (18, 22, -30, 3.4), (16, 24, 20, 2.8)])
    elif stage == 3:
        bush(sp, [[(15, 28), (13, 23), (14, 18), (12, 15)],
                  [(14, 24), (19, 20), (21, 16)],
                  [(13, 21), (9, 19)],
                  [(16, 28), (20, 25), (23, 24)]],
             [(12, 15, -110, 3.4), (14, 18, -10, 3.2), (9, 19, -170, 3.4), (11, 21, 150, 2.8),
              (21, 16, -60, 3.4), (18, 21, -110, 3.0), (20, 19, 15, 3.0),
              (23, 24, -20, 3.2), (19, 25, -90, 2.8)])
    elif stage == 4:
        bush(sp, [[(15, 28), (13, 22), (15, 16), (12, 11)],
                  [(14, 24), (8, 20), (5, 16)],
                  [(14, 19), (19, 15), (21, 10)],
                  [(16, 28), (21, 23), (26, 21)],
                  [(9, 21), (6, 22)],
                  [(20, 23), (21, 18)]],
             [(12, 11, -120, 3.6), (15, 15, -20, 3.2), (13, 19, -165, 3.0),
              (5, 16, -110, 3.4), (8, 20, -60, 3.0), (6, 22, 170, 3.0),
              (21, 10, -60, 3.6), (19, 15, -140, 3.0), (20, 14, 10, 3.2),
              (26, 21, -20, 3.4), (23, 22, -90, 3.0), (21, 18, -100, 3.0), (11, 23, 160, 2.8)],
             flowers=[(9, 22), (17, 18), (24, 23), (13, 14), (6, 18), (20, 12), (3, 19)])
    else:
        bush(sp, [[(15, 28), (13, 21), (16, 14), (13, 7)],
                  [(14, 24), (7, 19), (4, 13)],
                  [(14, 17), (20, 13), (22, 7)],
                  [(16, 28), (22, 22), (28, 19)],
                  [(8, 20), (4, 22)],
                  [(21, 22), (23, 16)],
                  [(15, 11), (10, 9)],
                  [(14, 28), (8, 26), (4, 26)]],
             [(13, 7, -120, 3.8), (16, 13, -10, 3.4), (10, 9, -160, 3.4), (12, 18, -170, 3.0),
              (4, 13, -100, 3.6), (7, 19, -50, 3.2), (4, 22, 170, 3.2), (4, 26, -170, 3.0),
              (22, 7, -60, 3.8), (20, 13, -150, 3.2), (21, 12, 10, 3.4), (18, 15, 60, 2.8),
              (28, 19, -20, 3.6), (25, 20, -90, 3.2), (23, 16, -110, 3.2), (24, 21, 30, 2.8),
              (8, 26, -120, 2.8)],
             berries=[(9, 23, 1.3), (6, 16, 1), (18, 18, 1.3), (24, 10, 1), (26, 22, 1.3),
                      (14, 11, 1.3), (11, 14, 1), (21, 25, 1), (16, 22, 1), (3, 17, 1),
                      (19, 8, 1), (8, 11, 1)])
    return sp
