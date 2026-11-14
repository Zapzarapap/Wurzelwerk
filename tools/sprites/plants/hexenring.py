"""Hexenring – Wald (selten). Kreis kleiner lila Pilze auf einem Moosfleck, schräg von oben
gesehen. Stufe 1 nur ein paar Pilze, Stufe 5 geschlossener Ring mit leuchtenden Sporen
(glow-Ebenen) und leicht leuchtenden Hutlichtern."""
REGION = "wald"

import math
import random
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import dome

CX = 15.5
# Ringgröße je Stufe: (rx, ry, cy)
RING = {1: (6.5, 3.0, 25.5), 2: (8.5, 4.0, 24.8), 3: (10.0, 5.2, 23.6), 4: (11.0, 6.2, 22.6), 5: (11.6, 7.0, 21.8)}

# Reihenfolge, in der die Pilze erscheinen (Winkel in Grad, 90 = vorn)
ANGLES = {
    1: [130, 55, 205],
    2: [130, 60, 95, 200, 10],
    3: [135, 90, 45, 0, 180, 230, 310],
    4: [105, 75, 135, 45, 165, 15, 195, 345, 250, 290],
    5: [105, 75, 135, 45, 165, 15, 195, 345, 225, 315, 255, 285],
}


def moss_patch(sp, stage):
    RX, RY, CY = RING[stage]
    m = sp.layer("wa_moos")
    rx, ry = RX + 3.0, RY + 2.0
    m.ellipse(CX, CY + 0.8, rx, ry)
    t = sp.layer("wa_moos", outline=False, shading=False)
    r = random.Random(7)
    for (x, y) in sorted(m.pixels):
        dx, dy = (x + 0.5 - CX) / RX, (y + 0.5 - CY) / RY
        d = math.hypot(dx, dy)
        if abs(d - 1) < 0.22 and stage >= 2:
            t.px(x, y, SHADE)                      # dunkler, sattgrüner Ringstreifen
        elif r.random() < 0.18 and (x, y - 1) in m.pixels:
            t.px(x, y, LIGHT if r.random() < 0.6 else SHADE)
    return m


def shroom(sp, x, y, s, glow=False):
    """Kleiner Pilz mit Fußpunkt (x,y); s = 0 klein … 2 groß."""
    h = (2, 3, 5)[s]
    rx = (1.2, 1.7, 2.3)[s]
    st = sp.layer("cream", outline=(s >= 1), shading=False)
    for yy in range(y - h + 1, y + 1):
        st.px(x, yy, LIGHT)
    cap = sp.layer("wa_hexe")
    dome(cap, x + 0.5, y - h + 1, rx, max(1.2, rx * 0.75))
    hl = sp.layer("wa_spore" if glow else "wa_hexe", glow=glow, outline=False, shading=False)
    top = min(py for (_, py) in cap.pixels)
    hx = x if rx < 2 else x - 1
    if (hx, top) in cap.pixels:
        hl.px(hx, top, HIGHLIGHT if not glow else LIGHT)


def spore(sp, x, y, tone=HIGHLIGHT, big=False):
    g = sp.layer("wa_spore", glow=True, outline=False, shading=False)
    g.px(x, y, tone)
    if big:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            g.px(x + dx, y + dy, SHADE)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    moss_patch(sp, stage)
    RX, RY, CY = RING[stage]
    pts = []
    for k, ang in enumerate(ANGLES[stage]):
        a = math.radians(ang)
        x = CX + RX * math.cos(a)
        y = CY + RY * math.sin(a)
        front = math.sin(a)                         # -1 hinten … 1 vorn
        s = 2 if front > 0.5 else (1 if front > -0.5 else 0)
        if stage <= 2:
            s = min(s, 1)
        if k % 4 == 3 and s > 0:
            s -= 1                                   # nicht alle gleich groß
        pts.append((round(y), round(x - 0.5), s, k))
    for (y, x, s, k) in sorted(pts):
        shroom(sp, x, y, s, glow=(stage >= 4 and k % 3 == 0))
    # Sporen schweben über dem Ring
    if stage >= 3:
        sp_pts = {3: [(13, 15), (19, 13)],
                  4: [(10, 14), (17, 11), (22, 15), (14, 8)],
                  5: [(9, 12), (15, 9), (21, 11), (12, 4), (19, 3), (25, 7), (6, 16), (16, 15), (27, 15)]}[stage]
        for i, (x, y) in enumerate(sp_pts):
            spore(sp, x, y, HIGHLIGHT if i % 2 == 0 else LIGHT, big=(stage == 5 and i in (1, 4)))
    return sp
