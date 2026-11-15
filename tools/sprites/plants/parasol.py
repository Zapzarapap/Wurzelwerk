"""Parasol (Riesenschirmling) – Wald. Junge Fruchtkörper als „Trommelschlegel“: eiförmiger,
geschlossener dunkelbrauner Hut auf schlankem, braun genattertem Stiel mit Knolle.
Ab Stufe 4 ein großer, flach aufgespannter Schirm: hell beige mit groben braunen
Schuppen, dunklem Buckel in der Mitte, cremefarbene Lamellen und ein dicker Ring am Stiel."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import forest_ground
from parts_wald import GROUND

SC = "wa_parasol"   # braune Schuppen / junger Hut / Natterung
HUT = "wa_parhut"   # helle Huthaut


def stem(sp, x, top, w=2, bulb=1.5, ground=GROUND):
    """Schlanker Stiel mit knolligem Fuß und brauner Natterung (Zickzackbänder)."""
    st = sp.layer("cream")
    x0 = round(x - w / 2)
    for y in range(top, ground + 1):
        st.rect(x0, y, x0 + w - 1, y)
    # Knolle
    by = ground - 1
    k = sp.layer("cream")
    kc = x0 + (w - 1) / 2
    k.ellipse(kc, by + 0.3, w / 2 + bulb * 0.6, 1.2)
    nat = sp.layer(SC, outline=False, shading=False)
    H = ground - 2 - top
    if H >= 5:
        for y in range(top + 2, ground - 2):
            for i in range(w):
                if (y + i * 2) % 4 == 0 or ((y + i * 2) % 4 == 1 and i == w - 1):
                    nat.px(x0 + i, y, LIGHT if (y + i * 2) % 4 == 0 else BASE)
    return st


def ring(sp, x, y, w):
    r = sp.layer("cream")
    x0 = round(x - w / 2)
    r.rect(x0 - 1, y, x0 + w, y)
    r.px(x0 - 1, y + 1, SHADE)
    r.px(x0 + w, y + 1, SHADE)
    return r


def drumstick(sp, x, top, cap_rx, cap_ry, w=2, ground=GROUND, cracks=0):
    """Junger, geschlossener Fruchtkörper: Eihut auf Stiel. top = Hutoberkante."""
    cap_bot = top + round(cap_ry * 2)
    stem(sp, x, cap_bot - 1, w=w, bulb=1.2 if w <= 2 else 1.6, ground=ground)
    c = sp.layer(SC)
    x0 = round(x - w / 2)
    cx = x0 + w / 2                       # Mittelachse in Pixelkanten-Koordinaten
    c.ellipse(cx - 0.5, top + cap_ry - 0.5, cap_rx, cap_ry)
    # helle Stellen: die braune Haut reißt am Rand zu Schuppen auf
    for (x_, y_) in list(c.pixels):
        rel_y = (y_ - top) / (2 * cap_ry)
        rel_x = (x_ + 0.5 - cx) / cap_rx
        if cracks and rel_y > 0.4 and (x_ * 3 + y_ * 2) % 5 == 0:
            c.px(x_, y_, ("a", HIGHLIGHT))
        elif cracks > 1 and rel_y > 0.65 and (x_ + y_) % 2 == 0:
            c.px(x_, y_, ("a", LIGHT))
    hl = sp.layer(SC, outline=False, shading=False)
    p = (math.floor(cx - cap_rx * 0.4), math.floor(top + cap_ry * 0.5))
    if p in c.pixels:
        hl.px(*p, LIGHT)
    return c


def umbrella(sp, x, cap_y, rx, ry, w=3, ground=GROUND, ring_y=None):
    """Aufgespannter Schirm. cap_y = Unterkante des Huts (Lamellen)."""
    stem(sp, x, cap_y, w=w, bulb=1.8, ground=ground)
    if ring_y is not None:
        ring(sp, x, ring_y, w)
    x0 = round(x - w / 2)
    cx = x0 + w / 2
    # Lamellen: helles Band unter dem Hut
    g = sp.layer("cream", shading=False)
    for xx in range(math.floor(cx - rx) + 2, math.ceil(cx + rx) - 2):
        g.px(xx, cap_y, BASE if abs(xx + 0.5 - cx) > w / 2 + 0.5 else SHADE)
    # Hut: flach gewölbter Schirm mit Buckel, Rand leicht herabgebogen
    cap = sp.layer(HUT)
    for y in range(cap_y - math.ceil(ry) - 1, cap_y):
        for xx in range(math.floor(cx - rx), math.ceil(cx + rx) + 1):
            d = abs(xx + 0.5 - cx) / rx
            if d > 1:
                continue
            h = 1.2 + (ry - 1.2) * (0.72 * (1 - d ** 2) ** 0.55 + 0.28 * max(0.0, 1 - (d / 0.2) ** 2))
            if cap_y - 0.5 - y <= h:
                cap.px(xx, y)
    # Licht oben links auf der Huthaut
    for (xx, y) in list(cap.pixels):
        if (xx, y - 1) not in cap.pixels and xx + 0.5 < cx:
            cap.px(xx, y, LIGHT if xx + 0.5 < cx - rx * 0.25 else ("a", LIGHT))
    # Schuppen: braune Flecken in versetzten Reihen, zur Mitte dichter und dunkler,
    # dunkler Buckel in der Mitte
    sc = sp.layer(SC, outline=False, shading=False)
    ytop = min(y for (_, y) in cap.pixels)
    for (xx, y) in cap.pixels:
        d = abs(xx + 0.5 - cx) / rx
        dist = math.hypot((xx + 0.5 - cx) / (rx * 0.2), (y - ytop) / 2.2)
        if dist < 1.0:                       # dunkler Buckel (rundliche Kuppe)
            sc.px(xx, y, BASE if (xx + 0.5 < cx and y == ytop) else SHADE)
            continue
        if dist < 1.6 and (xx + y) % 2 == 0:  # dichte Schuppen um den Buckel
            sc.px(xx, y, BASE)
            continue
        row = cap_y - y
        k = (xx + row * 2) % 4
        if k == 0 and (xx, y + 1) in cap.pixels or (k == 1 and d < 0.55 and row % 2 == 0
                                                     and (xx, y + 1) in cap.pixels):
            sc.px(xx, y, BASE if xx + 0.5 < cx else SHADE)
        elif k == 0 and d > 0.85:
            sc.px(xx, y, LIGHT)
    return cap


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(11 if stage >= 4 else 8))
    if stage == 1:
        drumstick(sp, 16, 21, 2.0, 2.4, w=2)
    elif stage == 2:
        drumstick(sp, 16, 15, 2.4, 3.2, w=2)
    elif stage == 3:
        drumstick(sp, 16, 7, 3.4, 4.6, w=2, cracks=2)
        drumstick(sp, 23, 21, 2.0, 2.4, w=2)
    elif stage == 4:
        umbrella(sp, 14, 12, 9.5, 4.4, w=2, ring_y=16)
        drumstick(sp, 24, 15, 2.4, 3.2, w=2, cracks=1)
    else:
        umbrella(sp, 15, 9, 14.3, 6.0, w=3, ring_y=14)
        drumstick(sp, 26, 17, 2.4, 3.2, w=2, cracks=1)
    return sp
