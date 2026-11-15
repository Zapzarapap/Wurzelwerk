"""Preiselbeere – Wald. Niedriger, dichter, immergrüner Zwergstrauch: kurze, aufrechte,
bräunliche Triebe, dicht besetzt mit kleinen, ledrigen, dunkelgrünen, glänzenden
ovalen Blättern (Glanzpunkt). Stufe 4 nickende rosa-weiße Glöckchen in Trauben an den
Triebspitzen, Stufe 5 leuchtend scharlachrote Beeren in dichten Trauben.
Gegenüber der Heidelbeere: dunkleres, dichteres Laub, braune statt grüne Zweige,
breiter und niedriger, Beeren rot und in Trauben statt einzeln."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import forest_ground, leaf_frame

LEAF = "wa_preisel"
BERRY = "wa_preibee"
FLOWER = "petal_pink"

VARIANTS = {
    "rosa": None,
    "weiss": {"petal_pink": "petal_white"},
}


def twig(sp, pts):
    s = sp.layer("wood", outline=False, shading=False)
    for a, b in zip(pts, pts[1:]):
        s.line(*a, *b, tone=SHADE)
    return s


def leaf(sp, x, y, ang, L=3.0, W=1.5):
    """Kleines ledriges Oval mit Glanzpunkt (Licht oben links)."""
    a = math.radians(ang)
    lay = sp.layer(LEAF)
    r = int(L + W + 2)
    pts = []
    for yy in range(int(y - r), int(y + r) + 1):
        for xx in range(int(x - r), int(x + r) + 1):
            u, v = leaf_frame(x, y, a, xx + 0.5, yy + 0.5)
            if 0 <= u <= L and abs(v) <= W * math.sin(math.pi * min(1.0, (u / L) ** 0.9 * 0.96 + 0.03)) ** 0.7:
                pts.append((xx, yy))
    if not pts:
        return lay
    mean = sum(px + py for px, py in pts) / len(pts)
    for (px, py) in pts:
        lay.px(px, py, ("a", LIGHT if px + py < mean - 0.6 else BASE))
    # Glanzpunkt: der Pixel ganz oben links
    g = min(pts, key=lambda p: (p[0] + p[1] * 1.3))
    if len(pts) >= 4:
        lay.px(*g, HIGHLIGHT)
    return lay


def shoot(sp, x0, top_x, top_y, leaves, lean=0):
    """Aufrechter Trieb vom Boden bis (top_x, top_y), Blätter wechselständig dicht.
    leaves: Anzahl Blattpaare; Blätter stehen schräg aufwärts ab."""
    twig(sp, [(x0, 28), (top_x, top_y)])
    pts = []
    n = leaves
    for i in range(n):
        t = 0.25 + 0.75 * i / max(n - 1, 1)
        x = x0 + (top_x - x0) * t
        y = 28 + (top_y - 28) * t
        side = -1 if i % 2 == 0 else 1
        ang = -90 + side * (62 - 18 * t) + lean
        L = 3.4 - 0.9 * t
        pts.append((x, y, ang, L))
    # untere zuerst, damit die oberen darüber liegen
    for (x, y, ang, L) in pts:
        leaf(sp, x, y, ang, L, 1.45 if L > 2.8 else 1.2)
    # Endtrieb
    leaf(sp, top_x, top_y + 0.5, -90 + lean * 0.5, 2.4, 1.1)


def bells(sp, x, y, offs):
    """Nickende Glöckchen in einer kurzen Traube an der Triebspitze (x, y).
    offs: (dx, dy) je Glöckchen. Glocke: 2 px breit, 3 px hoch, unten Mündung."""
    st = sp.layer("wood", outline=False, shading=False)
    for (dx, dy) in offs:
        st.line(x, y, x + dx, y + dy - 1, tone=BASE)
    for (dx, dy) in offs:
        f = sp.layer(FLOWER, shading=False)
        bx, by = x + dx, y + dy
        f.px(bx, by, HIGHLIGHT)
        f.px(bx, by + 1, HIGHLIGHT)
        f.px(bx + 1, by + 1, LIGHT)
        f.px(bx, by + 2, LIGHT)
        f.px(bx + 1, by + 2, BASE)
        f.px(bx - 1, by + 2, LIGHT)     # ausgestellter Saum


def cluster(sp, x, y, spots):
    """Dichte Beerentraube. spots: (dx, dy) – jede Beere 2×2 + Outline = runde Kugel,
    eigene Ebene, damit sich Beeren gegenseitig überlappen; Glanzpunkt oben links."""
    st = sp.layer("wood", outline=False, shading=False)
    for (dx, dy) in spots:
        st.line(x, y, x + dx, y + dy - 1, tone=SHADE)
    for (dx, dy) in sorted(spots, key=lambda s: s[1]):
        b = sp.layer(BERRY, shading=False)
        bx, by = x + dx, y + dy
        b.px(bx, by, HIGHLIGHT)
        b.px(bx + 1, by, BASE)
        b.px(bx, by + 1, BASE)
        b.px(bx + 1, by + 1, SHADE)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(12 if stage >= 4 else 10 if stage == 3 else 8))
    if stage == 1:
        shoot(sp, 15, 15, 24, 2)
    elif stage == 2:
        shoot(sp, 14, 13, 22, 3, lean=-6)
        shoot(sp, 17, 18, 23, 2, lean=8)
    elif stage == 3:
        shoot(sp, 10, 8, 21, 3, lean=-10)
        shoot(sp, 20, 22, 20, 3, lean=10)
        shoot(sp, 15, 14, 17, 4, lean=-4)
        shoot(sp, 17, 18, 22, 2, lean=5)
    elif stage == 4:
        shoot(sp, 6, 4, 20, 3, lean=-14)
        shoot(sp, 25, 27, 19, 3, lean=12)
        shoot(sp, 11, 10, 15, 4, lean=-8)
        shoot(sp, 20, 21, 14, 4, lean=6)
        shoot(sp, 15, 15, 11, 5, lean=-2)
        shoot(sp, 17, 18, 21, 2, lean=10)
        shoot(sp, 12, 11, 23, 2, lean=-8)
        bells(sp, 15, 10, [(-3, 1), (1, 1), (-1, 4)])
        bells(sp, 21, 13, [(2, 1), (-1, 3)])
        bells(sp, 4, 19, [(-1, 1), (2, 2)])
        bells(sp, 10, 14, [(-3, 2)])
        bells(sp, 27, 18, [(1, 1)])
    else:
        shoot(sp, 5, 2, 19, 3, lean=-16)
        shoot(sp, 26, 29, 18, 3, lean=14)
        shoot(sp, 10, 8, 13, 4, lean=-10)
        shoot(sp, 21, 23, 12, 4, lean=8)
        shoot(sp, 15, 15, 9, 5, lean=-2)
        shoot(sp, 18, 19, 20, 3, lean=10)
        shoot(sp, 12, 11, 22, 2, lean=-8)
        cluster(sp, 15, 8, [(-3, 1), (0, 1), (-2, 3), (1, 3), (-1, 5)])
        cluster(sp, 23, 11, [(0, 1), (2, 2), (-1, 3), (1, 4)])
        cluster(sp, 8, 12, [(-2, 1), (0, 2), (-3, 3), (-1, 4)])
        cluster(sp, 2, 18, [(-1, 1), (1, 2), (0, 4)])
        cluster(sp, 29, 17, [(-1, 1), (0, 3)])
        cluster(sp, 19, 19, [(1, 1), (-1, 2), (1, 3)])
    return sp
