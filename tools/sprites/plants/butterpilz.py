"""Butterpilz – Wald. Flacher, gelbbraun-schleimig glänzender Hut mit kleinem Buckel,
schlanker Stiel mit hängendem Ring (Manschette), gelbe Röhren."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import dome, forest_ground
from parts_wald import GROUND


def butter(sp, x, cap_y, rx, ry, sw, ring=True, lean=0.0, ground=GROUND):
    """cap_y = Unterkante Hut; sw = Stielbreite in px."""
    H = ground - cap_y
    st = sp.layer("cream")
    for y in range(cap_y, ground + 1):
        t = (y - cap_y) / max(H, 1)
        c = x + lean * t
        w = sw + (1 if t > 0.8 and sw >= 2 else 0)
        x0 = round(c - w / 2)
        st.rect(x0, y, x0 + w - 1, y)
    # Stiel oberhalb des Rings gelblich, unten bräunlich gepunktet
    tint = sp.layer("wa_pfiffer", outline=False, shading=False)
    ring_y = cap_y + max(2, round(H * 0.32))
    for y in range(cap_y + 1, ground):
        c = x + lean * (y - cap_y) / max(H, 1)
        for xx in range(round(c - sw / 2), round(c - sw / 2) + sw):
            if y < ring_y and (xx, y) in st.pixels:
                tint.px(xx, y, HIGHLIGHT)

    if ring and H >= 5:
        r = sp.layer("cream")
        c = x + lean * (ring_y - cap_y) / max(H, 1)
        x0 = round(c - sw / 2)
        r.rect(x0 - 1, ring_y, x0 + sw, ring_y, tone=LIGHT)
        r.rect(x0 - 1, ring_y + 1, x0 + sw, ring_y + 1, tone=SHADE)
        if sw >= 2:
            r.px(x0 - 1, ring_y + 2, SHADE)
            r.px(x0 + sw, ring_y + 2, SHADE)
    # gelbe Röhren
    pores = sp.layer("wa_pfiffer", shading=False)
    pores.rect(round(x - rx) + 1, cap_y, round(x + rx) - 2, cap_y, tone=BASE)
    cap = sp.layer("wa_butter")
    dome(cap, x, cap_y - 1, rx, ry)
    # flacher Buckel in der Mitte
    top = min(py for (_, py) in cap.pixels)
    if rx >= 4:
        for xx in range(round(x - rx * 0.3), round(x + rx * 0.2)):
            cap.px(xx, top - 1)
    # nasser Glanz: kurzer heller Bogen oben links + weißer Glanzpunkt
    g = sp.layer("wa_butter", outline=False, shading=False)
    top = min(py for (_, py) in cap.pixels)
    if rx >= 3:
        arc = [(round(x - rx * 0.62), top + 2), (round(x - rx * 0.5), top + 1), (round(x - rx * 0.3), top + 1)]
        if rx >= 6:
            arc += [(round(x - rx * 0.12), top + 1), (round(x - rx * 0.75), top + 3)]
        for p in arc:
            if p in cap.pixels:
                g.px(*p, HIGHLIGHT)
        w = sp.layer("cream", outline=False, shading=False)
        p = (round(x - rx * 0.5), top + 1)
        if rx >= 5 and p in cap.pixels:
            w.px(*p, HIGHLIGHT)
        # zweiter, kleinerer Glanz rechts
        p2 = (round(x + rx * 0.4), top + 2)
        if rx >= 5 and p2 in cap.pixels:
            g.px(*p2, LIGHT)
            g.px(p2[0] + 1, p2[1], LIGHT)
    # Hutrand dunkler (schleimige Huthaut läuft über den Rand)
    d = sp.layer("wa_butter", outline=False, shading=False)
    for xx in range(round(x - rx) + 1, round(x + rx) - 1):
        if (xx, cap_y - 1) in cap.pixels and xx > x:
            d.px(xx, cap_y - 1, SHADE)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(11 if stage >= 4 else 8))
    if stage == 1:
        b = sp.layer("cream")
        b.rect(15, 26, 16, 28)
        c = sp.layer("wa_butter")
        dome(c, 15.5, 25.6, 2.4, 1.6)
    elif stage == 2:
        butter(sp, 15.5, 24, 3.6, 2.2, 2, ring=False)
    elif stage == 3:
        butter(sp, 15.5, 20, 5.6, 2.8, 2)
    elif stage == 4:
        butter(sp, 14.5, 16, 7.6, 3.4, 3, lean=0.4)
        butter(sp, 24.5, 24, 3.0, 1.8, 2, ring=False)
    else:
        butter(sp, 24, 19, 5.2, 2.6, 2, lean=0.6)
        butter(sp, 5.5, 24, 3.0, 1.8, 2, ring=False)
        butter(sp, 13.5, 13, 10, 4.0, 3, lean=-0.6)
    return sp
