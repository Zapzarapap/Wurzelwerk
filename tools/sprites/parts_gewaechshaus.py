"""Bauteile für die Region Gewächshaus: Beet, Rankstäbe, Blätter, Früchte."""
import math

from pixel import Sprite, Layer, OUTLINE, SHADE, BASE, LIGHT, HIGHLIGHT, HOLE
from parts import heart_leaf, stalk

SOIL_Y = 27  # hier setzen die Stiele im Beet an


def greenhouse_ground(sp: Sprite):
    """Erdbeet mit Holzkante, Fuß endet bei y=31 (Outline)."""
    soil = sp.layer("gh_earth")
    soil.ellipse(15.5, 27.6, 10.6, 2.5)
    tex = sp.layer("gh_earth", outline=False, shading=False)
    for (x, y, t) in ((8, 27, LIGHT), (11, 28, SHADE), (13, 26, LIGHT), (19, 28, LIGHT),
                      (22, 27, SHADE), (24, 28, LIGHT), (17, 26, SHADE), (7, 28, SHADE)):
        if (x, y) in soil.pixels:
            tex.px(x, y, t)
    board = sp.layer("wood")
    board.rect(5, 29, 26, 30)
    seam = sp.layer("wood", outline=False, shading=False)
    for x in (11, 20):
        seam.px(x, 29, SHADE)
        seam.px(x, 30, SHADE)
    return soil, board


def stake(sp: Sprite, x, y_top, y_bot=28, ramp="wood"):
    """Rankstab: 2 px breit, links hell, rechts dunkler; oben angespitzt."""
    s = sp.layer(ramp, outline=False, shading=False)
    for y in range(y_top + 1, y_bot + 1):
        s.px(x, y, LIGHT)
        s.px(x + 1, y, BASE)
    s.px(x, y_top, HIGHLIGHT)
    return s


def bar(sp: Sprite, x0, x1, y, ramp="wood"):
    """Querstrebe (1 px) für Rankgitter."""
    b = sp.layer(ramp, outline=False, shading=False)
    for x in range(x0, x1 + 1):
        b.px(x, y, BASE)
    return b


def tie(sp: Sprite, x, y, w=3):
    """Kleine Bindeschnur."""
    t = sp.layer("cream", outline=False, shading=False)
    for i in range(w):
        t.px(x + i, y, BASE)
    return t


def winding_stem(sp: Sprite, x0, y_top, y_bot=SOIL_Y, amp=1.0, freq=0.5, ramp="stem", phase=0.0):
    s = sp.layer(ramp, outline=False, shading=False)
    pts = []
    for y in range(y_bot, y_top - 1, -1):
        x = round(x0 + amp * math.sin((y_bot - y) * freq + phase))
        s.px(x, y, BASE)
        pts.append((x, y))
    return s, pts


def round_leaf(lay: Layer, cx, cy, R, lobes=5, depth=0.2, rot=-math.pi / 2, flat=1.0, veins=True):
    """Rundes, gelapptes Blatt (Melone, Kürbis, Gurke). Licht von oben links."""
    r_max = int(R + 2)
    shape = set()
    for y in range(int(cy - r_max), int(cy + r_max) + 1):
        for x in range(int(cx - r_max), int(cx + r_max) + 1):
            dx, dy = x + 0.5 - cx, (y + 0.5 - cy) / flat
            r = math.hypot(dx, dy)
            th = math.atan2(dy, dx)
            lim = R * (1 - depth + depth * math.cos(lobes * (th - rot)))
            if r <= lim:
                shape.add((x, y))
                lit = (dx + dy * flat) < -0.12 * R
                lay.px(x, y, ("a", LIGHT if lit else BASE))
    if veins:
        for k in range(lobes):
            th = rot + 2 * math.pi * k / lobes
            for i in range(1, int(R * 0.72)):
                p = (round(cx - 0.5 + math.cos(th) * i), round(cy - 0.5 + math.sin(th) * i * flat))
                if p in shape and lay.pixels.get(p) not in (OUTLINE, HOLE):
                    lay.px(*p, HIGHLIGHT)
    return shape


def compound_leaf(sp: Sprite, ramp, bx, by, d, L, rise, droop, n, size, stem_ramp="stem"):
    """Gefiedertes Blatt (Tomate): Blattstiel + n Fiederblättchen. d=-1 links, +1 rechts."""
    ex, ey = bx + d * L, by - rise + droop
    stalk(sp, bx, by, ex, ey, bend=0, ramp=stem_ramp)
    for i in range(1, n + 1):
        t = i / n
        px = bx + d * L * t
        py = by - rise * t + droop * t * t
        off = -1.6 if i % 2 else 1.6
        s = size * (0.85 + 0.3 * t) if i < n else size * 1.2
        lay = sp.layer(ramp)
        lay.ellipse(px, py + (0 if i == n else off), s * 1.0, s * 0.78)
    return None


def fruit_ball(sp: Sprite, ramp, cx, cy, rx, ry, gloss=True):
    f = sp.layer(ramp)
    f.ellipse(cx, cy, rx, ry)
    if gloss:
        g = sp.layer(ramp, outline=False, shading=False)
        gx, gy = round(cx - rx * 0.5 - 0.5), round(cy - ry * 0.5 - 0.5)
        g.px(gx, gy, HIGHLIGHT)
        g.px(gx + 1, gy, LIGHT) if rx >= 2.5 else None
    return f


def calyx(sp: Sprite, x, y, w=3, ramp="leaf_deep"):
    """Grüner Kelch auf Frucht: w px breit bei Zeile y, dazu Stielpunkt darüber."""
    c = sp.layer(ramp, outline=False, shading=False)
    for i in range(w):
        c.px(x + i, y, BASE)
    c.px(x + w // 2, y - 1, SHADE)
    return c


def flower(sp: Sprite, x, y, ramp="petal_yellow", center="petal_orange"):
    """Kleine Blüte (Plus-Form, 3x3), Mitte etwas dunkler."""
    f = sp.layer(ramp)
    for (dx, dy) in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
        f.px(x + dx, y + dy)
    c = sp.layer(center, outline=False, shading=False)
    c.px(x, y, BASE)


def tendril(sp: Sprite, pts, ramp="stem"):
    t = sp.layer(ramp, outline=False, shading=False)
    t.curve(pts, tone=LIGHT)
    return t


def hanging_pod(sp: Sprite, ramp, x, y, L, W, bend=0.0, cap=True):
    """Hängende, spitz zulaufende Schote (Chili). (x,y) = Mitte der Oberkante."""
    lay = sp.layer(ramp)
    for i in range(L):
        t = i / max(L - 1, 1)
        w = max(1, round(W * (1 - t ** 1.4) + 0.2))
        cxx = x + bend * t * t
        left = math.floor(cxx - w / 2 + 0.5)
        for px in range(left, left + w):
            lay.px(px, y + i)
    if cap:
        c = sp.layer("leaf_deep", outline=False, shading=False)
        left = math.floor(x - W / 2 + 0.5)
        for px in range(left, left + W):
            c.px(px, y, BASE)
        c.px(round(x), y - 1, SHADE)
    g = sp.layer(ramp, outline=False, shading=False)
    g.px(math.floor(x - W / 2 + 0.5), y + 1, HIGHLIGHT)
    return lay


def meridians(sp: Sprite, ramp, cx, cy, rx, ry, ks, tone=BASE, outline=False):
    """Längsstreifen (Meridiane) auf einer runden Frucht. ks: Positionen -1..1."""
    lay = sp.layer(ramp, outline=outline, shading=False)
    for k in ks:
        for y in range(math.floor(cy - ry), math.ceil(cy + ry) + 1):
            dyn = (y + 0.5 - cy) / ry
            if abs(dyn) >= 1:
                continue
            x = cx + k * rx * math.sqrt(1 - dyn * dyn)
            lay.px(round(x - 0.5), y, tone)
    return lay


def striped_fruit(sp: Sprite, ramp, stripe_ramp, cx, cy, rx, ry, ks, stem=True):
    """Gestreifte Melone."""
    f = sp.layer(ramp)
    f.ellipse(cx, cy, rx, ry)
    # Streifen nur dort, wo die Frucht ist
    st = sp.layer(stripe_ramp, outline=False, shading=False)
    for k in ks:
        for y in range(math.floor(cy - ry), math.ceil(cy + ry) + 1):
            dyn = (y + 0.5 - cy) / ry
            if abs(dyn) >= 1:
                continue
            x = round(cx + k * rx * math.sqrt(1 - dyn * dyn) - 0.5)
            if (x, y) in f.pixels:
                # nicht auf den äußersten Randpixeln, damit die Kontur lesbar bleibt
                if (x - 1, y) in f.pixels and (x + 1, y) in f.pixels and (x, y - 1) in f.pixels and (x, y + 1) in f.pixels:
                    st.px(x, y, SHADE)
    hl = sp.layer(ramp, outline=False, shading=False)
    gx, gy = round(cx - rx * 0.5 - 0.5), round(cy - ry * 0.55 - 0.5)
    hl.px(gx, gy, HIGHLIGHT)
    hl.px(gx + 1, gy, LIGHT)
    hl.px(gx, gy + 1, LIGHT)
    if stem:
        s = sp.layer("stem", outline=False, shading=False)
        top = math.floor(cy - ry)
        s.px(round(cx - 0.5), top - 1, SHADE)
        s.px(round(cx - 0.5), top, SHADE)
        s.px(round(cx + 0.5), top - 2, SHADE)
    return f


def ribbed_fruit(sp: Sprite, ramp, cx, cy, rx, ry, ks=(-0.7, -0.3, 0.3, 0.7), stem=True):
    """Gerippter Kürbis mit Holzstiel."""
    f = sp.layer(ramp)
    f.ellipse(cx, cy, rx, ry)
    g = sp.layer(ramp, outline=False, shading=False)
    for k in ks:
        for y in range(math.floor(cy - ry) + 1, math.ceil(cy + ry)):
            dyn = (y + 0.5 - cy) / ry
            if abs(dyn) >= 0.92:
                continue
            x = round(cx + k * rx * math.sqrt(1 - dyn * dyn) - 0.5)
            if (x, y) in f.pixels and (x - 1, y) in f.pixels and (x + 1, y) in f.pixels:
                g.px(x, y, SHADE)
                if k < 0.2 and (x - 1, y) in f.pixels and (x - 2, y) in f.pixels:
                    g.px(x - 1, y, LIGHT)
    hl = sp.layer(ramp, outline=False, shading=False)
    gx, gy = round(cx - rx * 0.55 - 0.5), round(cy - ry * 0.5 - 0.5)
    hl.px(gx, gy, HIGHLIGHT)
    hl.px(gx + 1, gy - 1, LIGHT) if False else None
    if stem:
        top = math.floor(cy - ry)
        s = sp.layer("wood")
        big = rx >= 6
        sx0 = round(cx - 0.5)
        s.rect(sx0 - (1 if big else 0), top - (3 if big else 2), sx0, top)
        s.px(sx0 + 1, top - (3 if big else 2))
    return f
