"""Fliegenpilz – Wald."""
REGION = "wald"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import dome, forest_ground

GROUND = 28  # Fuß der Stiele


def mushroom(sp, x, cap_y, rx, ry, stem_w, ring=False, spots=()):
    # Stiel
    st = sp.layer("cream")
    st.rect(round(x - stem_w / 2), cap_y, round(x + stem_w / 2) - 1, GROUND)
    if ring:
        r = sp.layer("cream")
        mid = (cap_y + GROUND) // 2 - 1
        r.rect(round(x - stem_w / 2) - 1, mid, round(x + stem_w / 2), mid + 1)
    # Lamellen (Unterseite)
    g = sp.layer("cream", outline=True, shading=False)
    g.rect(round(x - rx) + 1, cap_y, round(x + rx) - 2, cap_y, tone=SHADE)
    # Hut
    cap = sp.layer("cap_red")
    dome(cap, x, cap_y, rx, ry)
    # Tupfen
    sp_l = sp.layer("cream", outline=False, shading=False)
    for (dx, dy, big) in spots:
        px, py = round(x + dx), round(cap_y - ry + dy)
        if (px, py) in cap.pixels:
            sp_l.px(px, py, HIGHLIGHT)
            if big and (px + 1, py) in cap.pixels:
                sp_l.px(px + 1, py, LIGHT)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp)
    if stage == 1:
        b = sp.layer("cream")
        b.ellipse(15.5, 27, 1.6, 1.8)
        c = sp.layer("cap_red", outline=False, shading=False)
        c.px(15, 25, BASE)
        c.px(16, 25, LIGHT)
    elif stage == 2:
        b = sp.layer("cream")
        b.ellipse(15.5, 25.5, 2.4, 3.2)
        cap = sp.layer("cap_red")
        dome(cap, 15.5, 24.5, 2.6, 2.6)
        s = sp.layer("cream", outline=False, shading=False)
        s.px(14, 23, HIGHLIGHT)
        s.px(16, 22, HIGHLIGHT)
    elif stage == 3:
        mushroom(sp, 15.5, 21, 4.5, 4, 3, spots=((-2, 1, False), (1, 0.5, True), (2.5, 2.5, False), (-0.5, 3, False)))
    elif stage == 4:
        mushroom(sp, 15.5, 17, 6.5, 5, 3, ring=True,
                 spots=((-3, 1.5, True), (1, 0.5, True), (3.5, 2.5, False), (-1, 3.2, False), (-4.5, 4, False), (2, 4, True)))
        b = sp.layer("cream")
        b.ellipse(22.5, 27, 1.4, 1.6)
    else:
        mushroom(sp, 14.5, 14, 9, 4.5, 4, ring=True,
                 spots=((-5, 2, True), (-1, 0.7, True), (3, 1, False), (6, 2.6, True), (-7, 3.5, False),
                        (0, 3, False), (3.5, 3.6, True), (-3, 3.8, False)))
        # kleiner Begleiter
        b = sp.layer("cream")
        b.ellipse(25.5, 26, 1.8, 2.5)
        cap = sp.layer("cap_red")
        dome(cap, 25.5, 25, 2.4, 2.4)
        s = sp.layer("cream", outline=False, shading=False)
        s.px(25, 23, HIGHLIGHT)
    return sp
