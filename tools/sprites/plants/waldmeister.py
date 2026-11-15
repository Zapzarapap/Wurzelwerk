"""Waldmeister – Wald. Lockerer Teppich aufrechter Stängel; die schmalen, spitzen Blätter
stehen in Quirlen (6–8 je Etage) und bilden von schräg oben gesehen kleine Sterne,
mehrere Etagen übereinander. Stufe 4 weiße Knospen, Stufe 5 lockere Trugdolden
winziger weißer, vierzähliger Sternblüten."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import forest_ground

L_RAMP = "wa_meister"


def stem(sp, x0, y0, x1, y1):
    s = sp.layer("stem", outline=False, shading=False)
    s.line(x0, y0, x1, y1, tone=BASE)
    return s


def whorl(sp, x, y, L=4.0, n=7, rot=0.0, squash=0.34):
    """Blattquirl als Stern: n schmale, spitze Blätter radial um den Stängel, von schräg
    vorn gesehen (vertikal gestaucht). Wie die Farnwedel ohne Outline: feine 1-px-Strahlen,
    im Mittelteil 2 px breit; hintere (lichtzugewandte) Blätter hell, vordere dunkler.
    Die Lücken zwischen den Strahlen machen den Stern lesbar."""
    lay = sp.layer(L_RAMP, outline=False, shading=False)
    leaves = []
    for k in range(n):
        a = math.radians(rot + k * 360.0 / n)
        leaves.append((math.sin(a), a))
    # hintere zuerst, vordere darüber
    for s_, a in sorted(leaves):
        dx, dy = math.cos(a), math.sin(a) * squash
        nrm = math.hypot(dx, dy) or 1
        ux, uy = dx / nrm, dy / nrm
        ln = L * (0.55 + 0.45 * nrm)
        front = s_ > 0.3
        back = s_ < -0.3
        if back:
            body, tip = (LIGHT if ux < 0.3 else BASE), HIGHLIGHT
        elif front:
            body, tip = (BASE if ux < 0 else SHADE), (LIGHT if ux < 0 else BASE)
        else:
            body, tip = (LIGHT if ux < 0 else BASE), (HIGHLIGHT if ux < 0 else LIGHT)
        steps = int(ln * 3) + 1
        for i in range(1, steps + 1):
            f = i / steps
            px_, py_ = x + 0.5 + ux * ln * f, y + 0.5 + uy * ln * f
            p = (math.floor(px_), math.floor(py_))
            lay.px(*p, tip if f > 0.8 else body)
            if 0.3 < f < 0.65 and ln >= 3.5:
                # Blattmitte 2 px breit (zur Unterseite hin dunkler)
                q = (math.floor(px_ - uy * 0.8), math.floor(py_ + ux * 0.8))
                if q[1] >= p[1] and q not in lay.pixels:
                    lay.px(*q, SHADE if not back else BASE)
    lay.px(round(x), round(y), OUTLINE)
    return lay


def bud(sp, x, y):
    b = sp.layer("petal_white", shading=False)
    b.px(x, y, LIGHT)
    b.px(x + 1, y + 1, BASE)


def cyme(sp, x, y, spots, buds=False):
    """Lockere Trugdolde: kleines grünes Polster aus Blütenstielchen (mit Outline),
    darauf winzige weiße Blütchen ohne Outline -> zartes weißes Wölkchen.
    spots: (dx, dy, big) relativ zur Stängelspitze; big = Blütchen als kleines Kreuz."""
    st = sp.layer("stem", outline=False, shading=False)
    pad = sp.layer(L_RAMP, outline=False, shading=False)
    for (dx, dy, big) in spots:
        st.line(x, y, x + dx, y + dy + 1, tone=BASE)
        for ex, ey in ((0, 0), (0, -1), (-1, 0), (1, 0), (0, 1)):
            q = (x + dx + ex, y + dy + ey)
            if q not in pad.pixels:
                pad.px(*q, OUTLINE if ey > 0 or ex > 0 else SHADE)
    f = sp.layer("petal_white", outline=False, shading=False)
    for (dx, dy, big) in spots:
        if buds:
            f.px(x + dx, y + dy, HIGHLIGHT)
            f.px(x + dx - 1, y + dy, BASE)
            continue
        f.px(x + dx, y + dy, HIGHLIGHT)
        if big:
            f.px(x + dx - 1, y + dy, LIGHT)
            f.px(x + dx + 1, y + dy, BASE)
            f.px(x + dx, y + dy - 1, HIGHLIGHT)
            f.px(x + dx, y + dy + 1, BASE)
    c = sp.layer("petal_yellow", outline=False, shading=False)
    for (dx, dy, big) in spots:
        if big and not buds:
            c.px(x + dx, y + dy, HIGHLIGHT)


def plant(sp, x0, top_x, top_y, whorls, flower=None, buds=()):
    """Ein Stängel von (x0, 28) bis (top_x, top_y); whorls: Liste (t, L, rot) entlang
    des Stängels (t = 0 Fuß, 1 Spitze), von unten nach oben gezeichnet."""
    stem(sp, x0, 28, top_x, top_y)
    for (t, L, rot) in whorls:
        wx = round(x0 + (top_x - x0) * t)
        wy = round(28 + (top_y - 28) * t)
        whorl(sp, wx, wy, L=L, rot=rot, n=(6 if L < 3 else 8 if L >= 3.6 else 7))
    if buds:
        cyme(sp, top_x, top_y, buds, buds=True)
    if flower:
        cyme(sp, top_x, top_y, flower)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(12 if stage >= 4 else 9 if stage == 3 else 8))
    if stage == 1:
        plant(sp, 15, 15, 23, [(1.0, 3.6, 15)])
    elif stage == 2:
        plant(sp, 19, 20, 25, [(1.0, 3.2, 40)])
        plant(sp, 14, 13, 19, [(0.5, 4.0, 10), (1.0, 2.8, 30)])
    elif stage == 3:
        plant(sp, 22, 24, 20, [(0.45, 4.0, 25), (1.0, 3.0, 5)])
        plant(sp, 9, 7, 21, [(0.5, 3.8, 50), (1.0, 2.8, 20)])
        plant(sp, 15, 15, 11, [(0.3, 4.6, 0), (0.66, 4.0, 25), (1.0, 2.8, 45)])
    elif stage == 4:
        plant(sp, 25, 26, 17, [(0.4, 4.2, 15), (0.82, 3.2, 40)], buds=[(0, -2, 0), (1, -1, 0)])
        plant(sp, 6, 5, 18, [(0.4, 4.0, 40), (0.85, 3.0, 10)])
        plant(sp, 13, 12, 8, [(0.27, 4.8, 10), (0.6, 4.2, 35), (0.88, 3.0, 5)],
              buds=[(-1, -2, 0), (1, -2, 0), (0, -3, 0)])
        plant(sp, 19, 19, 12, [(0.33, 4.6, 30), (0.72, 3.4, 0)], buds=[(0, -2, 0), (2, -1, 0)])
    else:
        plant(sp, 26, 27, 16, [(0.38, 4.2, 30), (0.8, 3.2, 0)],
              flower=[(-1, -2, 1), (2, -2, 1), (0, -4, 1)])
        plant(sp, 5, 4, 15, [(0.38, 4.2, 10), (0.78, 3.2, 40)],
              flower=[(-2, -2, 1), (1, -2, 1), (-1, -4, 1)])
        plant(sp, 12, 11, 7, [(0.26, 5.0, 20), (0.56, 4.4, 0), (0.84, 3.2, 30)],
              flower=[(-3, -2, 1), (0, -2, 1), (3, -2, 1), (-1, -5, 1), (2, -5, 1)])
        plant(sp, 20, 20, 10, [(0.3, 4.8, 5), (0.66, 3.8, 35)],
              flower=[(-2, -2, 1), (1, -2, 1), (3, -3, 1), (0, -5, 1)])
        plant(sp, 16, 16, 25, [(1.0, 3.6, 10)])
    return sp
