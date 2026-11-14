"""Maiglöckchen – Wald. Zwei breite, aufrechte Blätter mit Scheide am Grund; ein
bogig überhängender Stiel mit nickenden weißen Glöckchen (selten rosa)."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import forest_ground
from parts_wald import blade_leaf, bezier, _arc, _at

VARIANTS = {
    "weiss": None,
    "rosa": {"petal_white": "petal_pink"},
}

LEAF = "leaf"
BELL = "petal_white"


def raceme(sp, ctrl, bells):
    """Blütenstiel (1 px) + Glöckchen. bells: Liste (bx, size) mit bx = x-Position am oberen Stielbogen, size 0 = grüne Knospe, 1 = kleine Glocke, 2 = große Glocke."""
    path = bezier(ctrl, 200)
    seg = _arc(path)
    st = sp.layer("stem", outline=False, shading=False)
    prev = None
    for (x, y) in path:
        p = (round(x), round(y))
        if p != prev:
            st.px(*p, SHADE)
            prev = p
    for (bx, size) in bells:
        # Punkt auf dem oberen/absteigenden Teil des Stiels mit x ≈ bx
        i0 = len(path) // 3
        x, y = min(path[i0:], key=lambda q: abs(q[0] - bx))
        x, y = round(x), round(y)
        # kurzes Blütenstielchen nach unten
        ped = sp.layer("stem", outline=False, shading=False)
        ped.px(x, y + 1, SHADE)
        by = y + 2
        if size == 2:
            ped.px(x, y + 2, SHADE)
            by = y + 3
        if size == 0:
            b = sp.layer("stem")
            b.px(x, by, LIGHT)
            continue
        b = sp.layer(BELL, shading=False)
        if size == 1:
            b.px(x, by, HIGHLIGHT)
            b.px(x, by + 1, LIGHT)
        else:
            b.px(x, by, HIGHLIGHT)
            b.px(x - 1, by + 1, HIGHLIGHT)
            b.px(x, by + 1, HIGHLIGHT)
            b.px(x + 1, by + 1, LIGHT)
            b.px(x - 1, by + 2, LIGHT)
            b.px(x, by + 2, BASE)         # Glockenmündung
            b.px(x + 1, by + 2, LIGHT)


def sheath(sp, cx, cy, rx):
    """Helle, rosa-cremefarbene Blattscheide am Grund (typisch für Maiglöckchen)."""
    s = sp.layer("cream")
    s.ellipse(cx, cy + 0.3, rx, 1.0)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(10 if stage >= 4 else 8))
    if stage == 1:
        # eingerollte, spitze Blatttüte
        blade_leaf(sp, LEAF, [(16, 28), (16, 25), (17, 21)], 1.4, base_w=0.9, rib=False)
        sheath(sp, 16.5, 27.2, 1.7)
    elif stage == 2:
        blade_leaf(sp, LEAF, [(16, 28), (17, 22), (19, 16)], 2.2, base_w=0.6)
        blade_leaf(sp, LEAF, [(15, 28), (15, 23), (14, 19)], 1.6, base_w=0.8, rib=False)
        sheath(sp, 16, 27.4, 1.7)
    elif stage == 3:
        raceme(sp, [(16, 27), (17, 20), (20, 17)], [(19, 0), (20, 0)])
        blade_leaf(sp, LEAF, [(16, 28), (16, 21), (14, 13)], 2.9, base_w=0.5, veins=1)
        blade_leaf(sp, LEAF, [(15, 28), (12, 22), (8, 17)], 2.8, base_w=0.5, veins=1)
    elif stage == 4:
        blade_leaf(sp, LEAF, [(16, 28), (17, 19), (15, 11), (12, 6)], 3.3, base_w=0.4, veins=1)
        raceme(sp, [(16, 27), (17, 11), (24, 9), (28, 14)],
               [(20, 2), (25, 1), (28, 0)])
        blade_leaf(sp, LEAF, [(15, 28), (11, 22), (6, 18), (3, 16)], 3.2, base_w=0.4, veins=1)
    else:
        blade_leaf(sp, LEAF, [(16, 28), (17, 18), (15, 9), (12, 3)], 3.6, base_w=0.4, veins=1)
        raceme(sp, [(16, 27), (17, 6), (25, 3), (30, 13)],
               [(19, 2), (24, 2), (28, 1), (30, 0)])
        blade_leaf(sp, LEAF, [(15, 28), (10, 22), (5, 17), (2, 15)], 3.5, base_w=0.4, veins=1)
        # kleines drittes Blatt vorn rechts
        blade_leaf(sp, LEAF, [(17, 28), (20, 25), (23, 23)], 1.8, base_w=0.5, rib=False)
    return sp
