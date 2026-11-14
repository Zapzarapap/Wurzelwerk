"""Butterpilz – Wald. Gelbbraun-schleimig glänzender Hut, Ring am Stiel."""
REGION = "wald"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import dome, forest_ground
from parts_wald import bulb_stem, GROUND


def butter(sp, x, cap_y, rx, ry, stem_hw, ring=True, lean=0.0, ground=GROUND):
    H = ground - cap_y
    bulb_stem(sp, "cream", x, cap_y, ground, stem_hw, stem_hw + 0.4, stem_hw + 0.1, t_max=0.5, lean=lean)
    if ring and H >= 5:
        r = sp.layer("cream")
        ry_ = cap_y + max(3, round(H * 0.42))
        r.ellipse(x + lean * 0.4, ry_, stem_hw + 1.9, 1.3)
    # gelbe Röhren unter dem Hut
    pores = sp.layer("wa_pfiffer", shading=False)
    pores.rect(round(x - rx) + 1, cap_y, round(x + rx) - 2, cap_y, tone=BASE)
    cap = sp.layer("wa_butter")
    dome(cap, x, cap_y - 1, rx, ry)
    # Schleim-Glanz: helle Lichter oben links
    g = sp.layer("wa_butter", outline=False, shading=False)
    gl = sp.layer("cream", outline=False, shading=False)
    top = cap_y - 1 - ry
    for (dx, dy) in ((-0.45, 0.35), (-0.3, 0.25)):
        p = (round(x + dx * rx), round(top + dy * ry * 1.5))
        if p in cap.pixels:
            g.px(*p, HIGHLIGHT)
    p = (round(x - 0.45 * rx), round(top + 0.35 * ry * 1.5))
    if rx >= 4 and p in cap.pixels:
        gl.px(*p, HIGHLIGHT)
    if rx >= 5:
        p2 = (round(x + 0.3 * rx), round(top + 0.5 * ry * 1.5))
        if p2 in cap.pixels:
            g.px(*p2, LIGHT)
    # dunklerer Hutrand rechts unten
    d = sp.layer("wa_butter", outline=False, shading=False)
    for k in range(int(ry * 0.5)):
        p = (round(x + rx - 1.2), round(cap_y - 2 - k))
        if p in cap.pixels:
            d.px(*p, SHADE)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(11 if stage >= 4 else 8))
    if stage == 1:
        b = sp.layer("cream")
        b.ellipse(15.5, 27.2, 1.3, 1.6)
        c = sp.layer("wa_butter")
        dome(c, 15.5, 25.6, 2.4, 1.5)
    elif stage == 2:
        butter(sp, 15.5, 24, 3.4, 2.4, 1.1, ring=False)
    elif stage == 3:
        butter(sp, 15.5, 21, 5.2, 3.0, 1.5, ring=True)
    elif stage == 4:
        butter(sp, 14.5, 18, 7, 3.8, 2.0, lean=0.5)
        butter(sp, 24.5, 25, 2.6, 1.8, 0.9, ring=False)
    else:
        butter(sp, 23.5, 21, 5, 3.0, 1.5, lean=0.5)
        butter(sp, 5.5, 25, 2.8, 1.9, 1.0, ring=False)
        butter(sp, 13.5, 16, 9.5, 4.8, 2.5, lean=-0.6)
    return sp
