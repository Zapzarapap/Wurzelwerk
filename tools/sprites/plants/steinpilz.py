"""Steinpilz – Wald. Brauner Hut, dicker bauchiger Stiel."""
REGION = "wald"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import dome, forest_ground
from parts_wald import bulb_stem, GROUND


def porcini(sp, x, cap_y, rx, ry, lean=0.0, ground=GROUND, bright=()):
    """cap_y = Unterkante des Huts."""
    H = ground - cap_y
    stem = bulb_stem(sp, "cream", x, cap_y, ground, hw_top=max(1.2, rx * 0.34), hw_max=max(1.6, rx * 0.6),
                     hw_foot=max(1.2, rx * 0.46), t_max=0.78, lean=lean)
    # helles Röhrenband unter dem Hut
    pores = sp.layer("cream", shading=False)
    pores.rect(round(x - rx) + 1, cap_y, round(x + rx) - 2, cap_y, tone=HIGHLIGHT)
    cap = sp.layer("wa_stein")
    dome(cap, x, cap_y - 1, rx, ry)
    # helle Stelle oben links, dunklerer Rand rechts
    hl = sp.layer("wa_stein", outline=False, shading=False)
    for (dx, dy, t) in ((-0.35, 0.25, HIGHLIGHT), (-0.15, 0.15, LIGHT), (-0.55, 0.45, LIGHT)):
        px, py = round(x + dx * rx), round(cap_y - 1 - ry + dy * ry * 1.6)
        if (px, py) in cap.pixels:
            hl.px(px, py, t)
    # Stielnetz: ein paar helle Punkte
    # Stielnetz: feines helles Netz im oberen Stieldrittel, dunkle Schattenseite rechts
    net = sp.layer("cream", outline=False, shading=False)
    if rx >= 4:
        for (px, py) in stem.pixels:
            if cap_y + 1 < py < cap_y + 1 + H * 0.45 and (px + 2 * py) % 4 == 0 \
                    and (px - 1, py) in stem.pixels and (px + 1, py) in stem.pixels:
                net.px(px, py, LIGHT)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(11 if stage >= 4 else 8))
    if stage == 1:
        b = sp.layer("cream")
        b.ellipse(15.5, 27.2, 1.5, 1.6)
        c = sp.layer("wa_stein")
        dome(c, 15.5, 25.6, 2.2, 1.6)
    elif stage == 2:
        bulb_stem(sp, "cream", 15.5, 24, GROUND, 1.2, 2.0, 1.3)
        c = sp.layer("wa_stein")
        dome(c, 15.5, 23.5, 3.2, 2.5)
        h = sp.layer("wa_stein", outline=False, shading=False)
        h.px(13, 21, HIGHLIGHT)
    elif stage == 3:
        porcini(sp, 15.5, 22, 5.2, 3.8)
    elif stage == 4:
        porcini(sp, 14.5, 19, 7, 5, lean=0.5)
        porcini(sp, 23.5, 26, 2.8, 2.2, ground=28)
    else:
        porcini(sp, 22.5, 22, 5.2, 3.6, lean=0.6)
        porcini(sp, 5.5, 25, 3.0, 2.4, lean=-0.3)
        porcini(sp, 13.5, 17, 9, 6.2, lean=-0.8)
    return sp
