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


def chili_pod(sp: Sprite, ramp, x, y, L, bend=0.0, W=3, cap="leaf_deep"):
    """Schlanke, hängende Chilischote mit klarer Form: oben W px breit, läuft spitz zu.

    Spalten fest schattiert (links hell, Mitte Grundton, rechts Schatten), damit
    die Schote auch auf Laub klar lesbar bleibt. (x,y) = Mitte der Oberkante.
    """
    lay = sp.layer(ramp, shading=False)
    for i in range(L):
        t = i / max(L - 1, 1)
        w = W if t < 0.45 else (2 if t < 0.8 else 1)
        if W == 2:
            w = 2 if t < 0.7 else 1
        cxx = x + bend * t * t
        left = math.floor(cxx - w / 2 + 0.5)
        for k in range(w):
            if w == 1:
                tone = BASE
            elif k == 0:
                tone = LIGHT
            elif k == w - 1:
                tone = SHADE
            else:
                tone = BASE
            lay.px(left + k, y + i, tone)
    left0 = math.floor(x - W / 2 + 0.5)
    lay.px(left0, y + 1, HIGHLIGHT)
    if L >= 7:
        lay.px(left0, y + 2, HIGHLIGHT)
    if cap:
        c = sp.layer(cap, outline=False, shading=False)
        for px in range(left0, left0 + W):
            c.px(px, y, BASE)
        c.px(round(x - 0.5) if W % 2 == 0 else round(x), y - 1, LIGHT)
    return lay


def lobed_leaf(lay: Layer, cx, cy, R, lobes=5, depth=0.1, rot=-math.pi / 2, flat=0.9,
               sinus=0.38, veins=True, sharp=1.0):
    """Handförmig gelapptes Blatt mit Blattgrund-Einbuchtung (Kürbis, Melone, Zucchini).

    rot: Richtung der Mittellappen-Spitze; der Stiel setzt gegenüber an.
    depth: Lappentiefe (Kürbis flach ~0.1, Melone tief ~0.35).
    sharp > 1 macht die Lappen spitzer (Buchten breiter).
    Gibt die Pixelmenge zurück.
    """
    r_max = int(R + 2)
    shape = set()
    base_th = rot + math.pi
    for y in range(int(cy - r_max), int(cy + r_max) + 1):
        for x in range(int(cx - r_max), int(cx + r_max) + 1):
            dx, dy = x + 0.5 - cx, (y + 0.5 - cy) / flat
            r = math.hypot(dx, dy)
            th = math.atan2(dy, dx)
            c = math.cos(lobes * (th - rot))
            # Lappen: c=1 Spitze, c=-1 Bucht
            k = ((c + 1) / 2) ** sharp
            lim = R * (1 - depth + depth * (2 * k - 1))
            # Blattgrund ausgespart (Stielbucht)
            dth = math.atan2(math.sin(th - base_th), math.cos(th - base_th))
            if sinus and abs(dth) < sinus and r > R * 0.25:
                continue
            if r <= lim:
                shape.add((x, y))
    for (x, y) in shape:
        dx, dy = x + 0.5 - cx, (y + 0.5 - cy)
        lit = (dx + dy) < -0.1 * R
        lay.px(x, y, ("a", LIGHT if lit else BASE))
    if veins:
        for kk in range(lobes):
            th = rot + 2 * math.pi * kk / lobes
            dth = math.atan2(math.sin(th - base_th), math.cos(th - base_th))
            if abs(dth) < 2.0:  # nur Mittel- und die beiden oberen Seitenadern
                continue
            for i in range(1, int(R * 0.72)):
                p = (math.floor(cx + math.cos(th) * i), math.floor(cy + math.sin(th) * i * flat))
                if p in shape and lay.pixels.get(p) not in (OUTLINE, HOLE):
                    lay.px(*p, HIGHLIGHT if lay.pixels[p] == ("a", LIGHT) else LIGHT)
    return shape


def pumpkin_fruit(sp: Sprite, ramp, cx, cy, rx, ry, ribs=5, dimple=0.22, stem_ramp="stem",
                  stem_dx=1):
    """Flacher, gerippter Kürbis mit eingesenktem Stielansatz. cy = Mitte."""
    f = sp.layer(ramp, shading=False)
    for y in range(math.floor(cy - ry) - 1, math.ceil(cy + ry) + 1):
        for x in range(math.floor(cx - rx) - 1, math.ceil(cx + rx) + 1):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            if abs(dx) ** 2.3 + abs(dy) ** 2 > 1:
                continue
            # Delle oben in der Mitte
            if dy < 0 and dy < -1 + dimple * max(0.0, 1 - abs(dx) / 0.38):
                continue
            f.px(x, y, BASE)
    pts = set(f.pixels)
    rows = {}
    for (x, y) in pts:
        rows.setdefault(y, []).append(x)
    ks = [math.sin(math.pi * (i / ribs - 0.5)) for i in range(1, ribs)]
    for y, xs in rows.items():
        x0, x1 = min(xs), max(xs)
        mid, half = (x0 + x1 + 1) / 2, (x1 - x0 + 1) / 2
        dy = (y + 0.5 - cy) / ry
        for x in xs:
            u = (x + 0.5 - mid) / half
            tone = BASE
            if u < -0.35 and dy < 0.45:
                tone = LIGHT
            if u > 0.6 or dy > 0.65:
                tone = SHADE
            if (x, y + 1) not in pts:
                tone = SHADE
            f.px(x, y, tone)
        if dy < -0.8:
            continue
        for k in ks:
            gx = math.floor(mid + k * half * 0.92)
            if x0 < gx < x1 and dy < 0.75 and (gx, y + 1) in pts:
                f.px(gx, y, OUTLINE if (gx + 0.5 - mid) / half > 0.55 and dy < 0.5 else SHADE)
                if k < 0.3 and dy < 0.4 and (gx + 1, y) in pts and gx + 1 < x1:
                    f.px(gx + 1, y, LIGHT)
    # Glanz auf dem linken oberen Segment
    hx, hy = round(cx - rx * 0.55 - 0.5), round(cy - ry * 0.45 - 0.5)
    if (hx, hy) in pts:
        f.px(hx, hy, HIGHLIGHT)
    if (hx, hy + 1) in pts:
        f.px(hx, hy + 1, LIGHT)
    # kurzer, kräftiger Stiel, leicht zur Seite gebogen
    top = min(y for (x, y) in pts if abs(x + 0.5 - cx) < 1.2)
    s = sp.layer(stem_ramp)
    sx = math.floor(cx)
    s.px(sx, top, BASE)
    s.px(sx, top - 1, LIGHT)
    s.px(sx + stem_dx, top - 1, BASE)
    s.px(sx + stem_dx, top - 2, LIGHT)
    return f


def serrated_oval(lay: Layer, cx, cy, rx, ry, ang=0.0, teeth=True, vein=True):
    """Ovales Blättchen mit gezähntem Rand (Erdbeere). ang in Grad = Richtung der Spitze."""
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    pts = set()
    R = int(max(rx, ry) + 2)
    for y in range(int(cy - R), int(cy + R) + 1):
        for x in range(int(cx - R), int(cx + R) + 1):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            u = dx * ca + dy * sa
            v = -dx * sa + dy * ca
            if (u / rx) ** 2 + (v / ry) ** 2 <= 1:
                pts.add((x, y))
    for (x, y) in pts:
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        lay.px(x, y, ("a", LIGHT if dx + dy < -0.3 else BASE))
    if teeth:
        # Zähne: jeden zweiten Randpixel der vorderen Blatthälfte wegnehmen,
        # die Outline folgt dann als Zackenkante
        cut = []
        for (x, y) in pts:
            edge = sum((x + ex, y + ey) not in pts for ex, ey in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if edge == 1 and (x + y) % 2 == 0 and (dx * ca + dy * sa) > rx * 0.25:
                cut.append((x, y))
        for p in cut:
            lay.erase(*p)
            pts.discard(p)
    if vein:
        for i in range(0, int(rx)):
            p = (math.floor(cx - ca * 0.3 + ca * i * 0.8), math.floor(cy - sa * 0.3 + sa * i * 0.8))
            if p in pts:
                lay.px(*p, HIGHLIGHT if i < rx * 0.5 else LIGHT)
    return pts


def trifoliate(sp: Sprite, ramp, x, y, ang, size=2.6, spread=52):
    """Dreiteiliges Blatt: Mittelblättchen in Richtung ang, zwei seitliche schräg darunter.
    (x,y) = Ende des Blattstiels."""
    out = []
    for da, k, s in ((-spread, 0.88, 0.9), (spread, 0.88, 0.9), (0, 1.0, 1.0)):
        a = math.radians(ang + da)
        d = size * k * 0.95
        lay = sp.layer(ramp)
        serrated_oval(lay, x + math.cos(a) * d, y + math.sin(a) * d, size * s, size * s * 0.72, ang + da)
        out.append(lay)
    return out


BERRY_BIG = ["XXXX.", "XXXXX", "XXXXX", "XXXXX", ".XXX.", "..X.."]
BERRY_MID = ["XXXX", "XXXX", "XXXX", ".XX.", ".X.."]
BERRY_SMALL = ["XXX", "XXX", ".X."]
SEEDS = {5: ((3, 1), (1, 3), (3, 3), (2, 4)), 4: ((2, 1), (1, 3)), 3: ((1, 1),)}


def strawberry(sp: Sprite, ramp, x, y, tpl=BERRY_BIG, seeds=True, calyx_ramp="leaf_deep"):
    """Erdbeere nach Schablone; (x,y) = linke obere Ecke. Nüsschen als helle Punkte."""
    rows = [r.replace(".", " ") for r in tpl]
    if len(tpl[0]) == 5:
        rows[0] = ".XXX."
    lay = sp.layer(ramp, shading=False)
    pts = []
    for j, row in enumerate(tpl):
        for i, ch in enumerate(row):
            if ch == "X":
                pts.append((x + i, y + j))
    W = len(tpl[0])
    for (px, py) in pts:
        i, j = px - x, py - y
        tone = BASE
        if i == 0 or (j <= 1 and i == 1):
            tone = LIGHT
        if i == W - 1 or (px + 1, py) not in pts or (px, py + 1) not in pts:
            tone = SHADE
        lay.px(px, py, tone)
    if (x + 1, y + 1) in pts:
        lay.px(x + 1, y + 1, HIGHLIGHT)
    if seeds:
        sd = sp.layer("petal_yellow", outline=False, shading=False)
        for (i, j) in SEEDS.get(W, ()):
            if (x + i, y + j) in pts:
                sd.px(x + i, y + j, LIGHT if i < W / 2 else BASE)
    c = sp.layer(calyx_ramp, outline=False, shading=False)
    for i in range(-1, W + 1):
        if i % 2 == (0 if W % 2 else 1) or i in (-1, W):
            c.px(x + i, y, BASE if i not in (-1, W) else SHADE)
    c.px(x + W // 2, y - 1, LIGHT)
    return lay


def small_bloom(sp: Sprite, x, y, ramp="petal_white", center="petal_yellow"):
    """Fünfzählige Blüte (Erdbeere): 3x3 mit gelber Mitte, mit Outline."""
    f = sp.layer(ramp)
    for (dx, dy) in ((0, -1), (-1, 0), (1, 0), (-1, 1), (1, 1), (0, 0)):
        f.px(x + dx, y + dy, LIGHT if dx <= 0 and dy <= 0 else BASE)
    c = sp.layer(center, outline=False, shading=False)
    c.px(x, y, BASE)
    return f


PEPPER_BIG = [".XXXXX.", "XXXXXXX", "XXXXXXX", "XXXXXXX", "XXXXXXX", "XXXXXXX", ".XX.XX."]
PEPPER_MID = [".XXX.", "XXXXX", "XXXXX", "XXXXX", "XXXXX", "XX.XX"]
PEPPER_SMALL = [".XX.", "XXXX", "XXXX", "XXXX", ".XX."]


def bell_pepper(sp: Sprite, ramp, x, y, tpl=PEPPER_BIG, calyx_ramp="leaf_deep", lean=1):
    """Glänzende Paprika (Blockform, unten gelappt). (x,y) = linke obere Ecke des Körpers.
    lean: Richtung, in die der Stiel oben abknickt (-1/1)."""
    W = len(tpl[0])
    pts = {(x + i, y + j) for j, r in enumerate(tpl) for i, c in enumerate(r) if c == "X"}
    lay = sp.layer(ramp, shading=False)
    crease = W // 2 + 1 if W >= 5 else None
    for (px, py) in pts:
        i, j = px - x, py - y
        tone = BASE
        if i == 0 or (px - 1, py) not in pts:
            tone = LIGHT
        if (px + 1, py) not in pts or (px, py + 1) not in pts:
            tone = SHADE
        if crease is not None and i == crease and 1 < j < len(tpl) - 1:
            tone = SHADE
        lay.px(px, py, tone)
    # Glanzstreifen
    for j in range(1, max(2, len(tpl) - 3)):
        if (x + 1, y + j) in pts:
            lay.px(x + 1, y + j, HIGHLIGHT if j <= 2 else LIGHT)
    # Kelch + kräftiger Stiel
    c = sp.layer(calyx_ramp, outline=False, shading=False)
    mid = x + (W - 1) // 2
    for i in range(-1, 2):
        c.px(mid + i, y, BASE if i else LIGHT)
    c.px(mid, y - 1, LIGHT)
    c.px(mid + lean, y - 2, BASE)
    return lay


def eggplant(sp: Sprite, ramp, x, y, L=10, W=5, bend=0.0, calyx_ramp="gh_eggplant_leaf"):
    """Hängende, glänzende Aubergine (oben schmal, unten bauchig) mit Kelchkappe.
    (x,y) = Mitte der Oberkante."""
    lay = sp.layer(ramp, shading=False)
    rows = []
    for i in range(L):
        t = (i + 0.5) / L
        hw = W / 2 * (0.4 + 0.6 * min(1.0, t / 0.62) ** 0.9)
        if t > 0.74:
            k = (t - 0.74) / 0.26
            hw *= math.sqrt(max(0.0, 1 - k * k)) * 0.85 + 0.15
        c = x + bend * t * t
        left, right = math.floor(c - hw + 0.5), math.floor(c + hw - 0.5)
        if right < left:
            right = left
        rows.append((y + i, left, right))
    pts = {(px, py) for (py, l, r) in rows for px in range(l, r + 1)}
    for (py, l, r) in rows:
        for px in range(l, r + 1):
            tone = BASE
            if px == l:
                tone = LIGHT
            if px == r or (px, py + 1) not in pts:
                tone = SHADE
            lay.px(px, py, tone)
    for (py, l, r) in rows[2:int(L * 0.65)]:
        if r - l >= 2:
            lay.px(l + 1, py, HIGHLIGHT if py - y < L * 0.45 else LIGHT)
    # Kelchkappe: etwas breiter als der Fruchthals, mit Zipfeln nach unten
    c = sp.layer(calyx_ramp)
    l0, r0 = rows[0][1], rows[0][2]
    for px in range(l0 - 1, r0 + 2):
        c.px(px, y, LIGHT if px <= l0 else BASE)
    c.px(l0 - 1, y + 1, BASE)
    c.px(r0 + 1, y + 1, SHADE)
    c.px((l0 + r0) // 2, y + 1, BASE)
    c.px(l0, y + 2, BASE)
    c.px((l0 + r0) // 2, y - 1, LIGHT)
    c.px((l0 + r0) // 2, y - 2, BASE)
    return lay


def star_bloom(sp: Sprite, x, y, ramp="petal_purple", center="petal_yellow"):
    """Sternförmige, nickende Blüte (Aubergine): 3x3-Kreuz mit Ecken, gelbe Staubbeutel."""
    f = sp.layer(ramp)
    for (dx, dy) in ((0, -1), (-1, 0), (1, 0), (0, 1), (-1, -1), (1, 1), (0, 0)):
        f.px(x + dx, y + dy, LIGHT if dx + dy < 0 else BASE)
    c = sp.layer(center, outline=False, shading=False)
    c.px(x, y, LIGHT)
    return f


TRUMPET_BIG = [".X.X.X.", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."]
TRUMPET_SMALL = ["X.X.X", "XXXXX", ".XXX.", "..X.."]


def trumpet_bloom(sp: Sprite, x, y, tpl=TRUMPET_BIG, ramp="petal_yellow", throat="petal_orange"):
    """Große, nach oben offene Trichterblüte (Zucchini). (x,y) = linke obere Ecke."""
    f = sp.layer(ramp, shading=False)
    W = len(tpl[0])
    for j, row in enumerate(tpl):
        for i, ch in enumerate(row):
            if ch == "X":
                tone = BASE
                if j <= 1 and i < W // 2:
                    tone = LIGHT
                if j >= 2 and i > W // 2:
                    tone = SHADE
                f.px(x + i, y + j, tone)
    t = sp.layer(throat, outline=False, shading=False)
    for i in range(W // 2 - 1, W // 2 + 2):
        t.px(x + i, y + 1, BASE if i != W // 2 else SHADE)
    if W >= 7:
        f.px(x + 1, y + 1, HIGHLIGHT)
    return f


def lying_squash(sp: Sprite, ramp, x0, x1, yc, h=3.6, stem_left=True, speckle=True,
                 blossom=True):
    """Liegende Zucchini (waagerechter Zylinder). Stielende schmaler; am Blütenende ein
    Rest der gelben Blüte. yc = Mittellinie."""
    lay = sp.layer(ramp, shading=False)
    L = x1 - x0
    pts = set()
    for x in range(x0, x1 + 1):
        t = (x - x0) / max(L, 1)
        if not stem_left:
            t = 1 - t
        r = h / 2 * (0.72 + 0.28 * min(1.0, t / 0.35))
        if t > 0.9:
            r *= 0.8
        for y in range(math.floor(yc - r + 0.5), math.floor(yc + r + 0.5)):
            pts.add((x, y))
    for (x, y) in pts:
        tone = BASE
        if (x, y - 1) not in pts:
            tone = LIGHT
        if (x, y + 1) not in pts:
            tone = SHADE
        lay.px(x, y, tone)
    if speckle:
        for (x, y) in sorted(pts):
            if (x, y - 1) in pts and (x, y + 1) in pts and (x * 3 + y) % 5 == 0:
                lay.px(x, y, LIGHT)
    # Glanz oben
    top = min(y for (x, y) in pts)
    for x in range(x0 + 2, x1 - 2, 3):
        if (x, top) in pts:
            lay.px(x, top, HIGHLIGHT)
    sx = x0 - 1 if stem_left else x1 + 1
    st = sp.layer("stem", shading=False)
    st.px(sx, math.floor(yc) - 1, LIGHT)
    st.px(sx, math.floor(yc), BASE)
    if blossom:
        bx = x1 + 1 if stem_left else x0 - 1
        b = sp.layer("petal_yellow", shading=False)
        b.px(bx, math.floor(yc) - 1, LIGHT)
        b.px(bx, math.floor(yc), SHADE)
    return lay


def ribbon_leaf(sp: Sprite, ramp, pts, wide=0.55, steps=60):
    """Langes, bandförmiges Blatt (Mais) entlang einer Bezier-Kurve.
    Die ersten `wide` Anteile sind 2 px breit (Oberseite hell), danach 1 px bis zur Spitze."""
    def bez(t):
        p = list(pts)
        while len(p) > 1:
            p = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(p, p[1:])]
        return p[0]
    lay = sp.layer(ramp, shading=False)
    prev = None
    for i in range(steps + 1):
        t = i / steps
        x, y = bez(t)
        cur = (math.floor(x), math.floor(y))
        if cur == prev:
            continue
        prev = cur
        lay.px(cur[0], cur[1], LIGHT if t < wide else BASE)
        if t < wide:
            lay.px(cur[0], cur[1] + 1, BASE if t < wide * 0.6 else SHADE)
    # Gerade Strecken mit Lücken vermeiden: Bresenham zwischen Stützpunkten
    return lay


def corn_stalk(sp: Sprite, x, y_top, y_bot=SOIL_Y, ramp="gh_corn_leaf", nodes=()):
    """Maisstängel, 2 px breit, mit dunkleren Knoten."""
    s = sp.layer(ramp, shading=False)
    for y in range(y_top, y_bot + 1):
        s.px(x, y, LIGHT)
        s.px(x + 1, y, BASE)
    for ny in nodes:
        if y_top < ny <= y_bot:
            s.px(x, ny, BASE)
            s.px(x + 1, ny, SHADE)
    return s


def corn_tassel(sp: Sprite, x, y_top, branches=((-4, 3), (4, 3), (-3, 5), (3, 5)), spike=5,
                ramp="gh_corn_tassel"):
    """Fahne: Mittelähre + seitlich bogig überhängende Ästchen mit Ährchen-Punkten.
    x = Spalte der Mittelähre, y_top = Spitze. branches: (dx Ende, Ansatz-Tiefe).
    Ohne Outline, dafür kräftige Töne, damit sie fein und luftig bleibt."""
    t = sp.layer(ramp, outline=False, shading=False)
    for i in range(spike):
        t.px(x, y_top + i, LIGHT if i % 2 == 0 else SHADE)
        if i % 2 == 0 and 0 < i < spike - 1:
            t.px(x - 1, y_top + i, BASE)
    for (dx, depth) in branches:
        y0 = y_top + depth
        d = 1 if dx > 0 else -1
        n = abs(dx)
        for k in range(1, n + 1):
            yy = y0 - (1 if 1 < k < n else 0) + (1 if k == n else 0)
            t.px(x + d * k, yy, LIGHT if k % 2 else SHADE)
            if k == n:
                t.px(x + d * k, yy + 1, BASE)
    return t


def corn_ear(sp: Sprite, x, y_bot, H=8, lean=1, husk="gh_corn_husk", kernel="gh_corn_kernel",
             silk="gh_corn_silk"):
    """Maiskolben, schräg vom Stängel abstehend: gelbe Körner (Schachbrett), unten und an
    der Seite grüne Hüllblätter, oben braune Seide. (x, y_bot) = Ansatz am Stängel;
    lean = Richtung (+1 rechts, -1 links)."""
    rows = []
    for i in range(H):
        t = i / (H - 1)
        cx = x + lean * (0.8 + t * 2.0)
        w = 2 if (t < 0.1 or t > 0.88) else 3
        left = math.floor(cx - w / 2 + 0.5)
        rows.append((y_bot - i, left, w, t))
    k = sp.layer(kernel, shading=False)
    for (y, left, w, t) in rows:
        if t < 0.2:
            continue
        for j in range(w):
            tone = LIGHT if (j + y) % 2 == 0 else BASE
            if j == w - 1 and w == 3:
                tone = BASE if (j + y) % 2 == 0 else SHADE
            k.px(left + j, y, tone)
    y, left, w, t = rows[-1]
    k.px(left, y, HIGHLIGHT)
    h = sp.layer(husk, shading=False)
    for (y, left, w, t) in rows:
        if t <= 0.3:
            for j in range(w):
                h.px(left + j, y, LIGHT if j == 0 else (SHADE if j == w - 1 else BASE))
        elif t < 0.62:
            # Hüllblatt-Streifen an der dem Stängel zugewandten Seite
            side = left if lean > 0 else left + w - 1
            h.px(side, y, BASE if lean > 0 else SHADE)
    # aufgeschlagene Hüllblattspitze nach außen
    y0, left0, w0, _ = rows[2]
    h.px(left0 + (w0 if lean > 0 else -1), y0 - 1, LIGHT)
    s = sp.layer(silk, outline=False, shading=False)
    y, left, w, t = rows[-1]
    tip = left + (w - 1 if lean > 0 else 0)
    s.px(tip, y - 1, BASE)
    s.px(tip + lean, y - 2, LIGHT)
    s.px(tip + lean, y - 1, SHADE)
    s.px(tip + 2 * lean, y - 1, BASE)
    return k


# --- Wurzelgemüse, Salat, Erbsen, Kräuter -----------------------------------------------

def feather_frond(sp: Sprite, ramp, x0, y0, x1, y1, bend=0.0, pinna=2.0, rachis="stem",
                  start=0.45, gap=2):
    """Fein gefiederter Wedel (Karotte): langer, nackter Blattstiel als Bogen von (x0,y0) zur
    Spitze (x1,y1); erst ab `start` sitzen wechselständige Fiedern (alle `gap` px, Seite
    wechselnd), die zur Spitze kleiner werden. Eine Ebene mit Outline; durch den Abstand der
    Fiedern bleiben Lücken -> luftige, spitzenartige Silhouette."""
    mx, my = (x0 + x1) / 2 + bend, (y0 + y1) / 2
    pts = [(x0, y0), (mx, my), (x1, y1)]

    def bez(t):
        a = (pts[0][0] + (pts[1][0] - pts[0][0]) * t, pts[0][1] + (pts[1][1] - pts[0][1]) * t)
        b = (pts[1][0] + (pts[2][0] - pts[1][0]) * t, pts[1][1] + (pts[2][1] - pts[1][1]) * t)
        return a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t

    # Stützpunkte gleichmäßig in Pixeln entlang der Kurve
    samples = [bez(i / 200) for i in range(201)]
    arc = [0.0]
    for a, b in zip(samples, samples[1:]):
        arc.append(arc[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    total = arc[-1]

    def at(s):
        for i in range(1, len(arc)):
            if arc[i] >= s:
                return samples[i], (samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1])
        return samples[-1], (samples[-1][0] - samples[-2][0], samples[-1][1] - samples[-2][1])

    lay = sp.layer(ramp)
    s0 = total * start
    side = 1 if (x1 - x0) >= 0 else -1
    s = s0
    while s < total - 0.5:
        (px, py), (dx, dy) = at(s)
        d = math.hypot(dx, dy) or 1
        dx, dy = dx / d, dy / d
        f = (s - s0) / max(total - s0, 1)
        L = pinna * (1.0 - 0.6 * f)
        for sd in ((side,) if f > 0.15 else (side, -side)):
            nx, ny = -dy * sd, dx * sd
            for k in range(1, int(round(L)) + 1):
                fx = px + nx * k + dx * k * 0.7
                fy = py + ny * k + dy * k * 0.7
                lay.px(math.floor(fx), math.floor(fy), ("a", LIGHT if (nx + ny) < 0 else BASE))
        side = -side
        s += gap
    # beblätterter Teil der Mittelrippe gehört zur Wedel-Ebene
    s = s0
    while s <= total:
        (px, py), _ = at(s)
        lay.px(math.floor(px), math.floor(py), ("a", BASE))
        s += 0.5
    (ex, ey), _ = at(total)
    lay.px(math.floor(ex), math.floor(ey), ("a", LIGHT))
    # nackter Blattstiel unten
    r = sp.layer(rachis, outline=False, shading=False)
    s = 0.0
    while s < s0:
        (px, py), _ = at(s)
        r.px(math.floor(px), math.floor(py), BASE)
        s += 0.5
    return lay


def root_shoulder(sp: Sprite, ramp, x, y_soil, w, h):
    """Rübenkopf, der aus der Erde schaut: w px breit, h px über y_soil sichtbar,
    oben gewölbt; (x = linke Kante). Nur der sichtbare Teil wird gezeichnet."""
    lay = sp.layer(ramp, shading=False)
    for j in range(h):
        y = y_soil - j
        inset = 1 if (j == h - 1 and w >= 3) else 0
        for i in range(inset, w - inset):
            tone = BASE
            if i == inset:
                tone = LIGHT
            if i == w - 1 - inset:
                tone = SHADE
            lay.px(x + i, y, tone)
    lay.px(x + 1, y_soil - h + 1 + (0 if w < 3 else 0), HIGHLIGHT)
    return lay


def ruffled_leaf(lay: Layer, cx, cy, rx, ry, ang=0.0, waves=11, amp=0.07, vein=True):
    """Rundliches Blatt mit gewelltem, gekräuseltem Rand (Salat). ang in Grad = Richtung
    der Blattspitze (vom Ansatz weg). Der Rand zur Spitze hin bekommt eine Kräusel-Textur
    (abwechselnd helle und dunkle Pixel). Gibt die Pixelmenge zurück."""
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    pts = set()
    R = int(max(rx, ry) * (1 + amp) + 2)
    for y in range(int(cy - R), int(cy + R) + 1):
        for x in range(int(cx - R), int(cx + R) + 1):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            u = dx * ca + dy * sa
            v = -dx * sa + dy * ca
            th = math.atan2(v / ry, u / rx)
            r = math.hypot(u / rx, v / ry)
            k = max(0.0, math.cos(th))
            lim = 1 + amp * k * math.cos(waves * th)
            if r <= lim:
                pts.add((x, y))
    # gekräuselte Silhouette: an der vorderen Kante jeden dritten Randpixel wegnehmen
    if rx >= 2.8:
        cut = []
        for (x, y) in pts:
            edge = sum((x + ex, y + ey) not in pts for ex, ey in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if edge >= 1 and (x + y) % 3 == 0 and (dx * ca + dy * sa) > rx * 0.15:
                cut.append((x, y))
        for p in cut:
            pts.discard(p)
    for (x, y) in pts:
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        lit = dx + dy < -0.15 * (rx + ry)
        lay.px(x, y, ("a", LIGHT if lit else BASE))
    # Kräuselrand: Pixel direkt innerhalb der Kante, vordere Blatthälfte
    for (x, y) in pts:
        nb = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        if all(q in pts for q in nb):
            inner2 = all((x + ex, y + ey) in pts for ex in (-2, 2) for ey in (0,)) and \
                all((x, y + ey) in pts for ey in (-2, 2))
            if inner2:
                continue
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dx * ca + dy * sa > rx * 0.1:
                lay.px(x, y, SHADE if (x + 2 * y) % 3 == 0 else (HIGHLIGHT if (x + 2 * y) % 3 == 1 and dx + dy < 0 else LIGHT))
    if vein:
        L = int(rx * 1.5)
        for i in range(L):
            p = (math.floor(cx - ca * rx * 0.75 + ca * i), math.floor(cy - sa * rx * 0.75 + sa * i))
            if p in pts and lay.pixels.get(p) not in (SHADE,):
                lay.px(*p, LIGHT if i < L * 0.6 else ("a", BASE))
    return pts


def brushwood(sp: Sprite, x0, y_bot, x1, y_top, twigs=(), ramp="wood"):
    """Reisig-Zweig als Rankhilfe: leicht schräger Hauptzweig (1 px, ohne Outline) von
    (x0,y_bot) nach (x1,y_top), dazu kurze Seitenzweige twigs = [(t, dx, dy)] (t = Höhe
    0..1 entlang des Zweigs, dx/dy = Länge). Links heller als rechts."""
    s = sp.layer(ramp, outline=False, shading=False)
    s.line(x0, y_bot, x1, y_top, BASE)
    for y in range(y_top, y_bot + 1, 3):
        t = (y_bot - y) / max(y_bot - y_top, 1)
        x = round(x0 + (x1 - x0) * t)
        s.px(x, y, LIGHT)
    for (t, dx, dy) in twigs:
        bx = x0 + (x1 - x0) * t
        by = y_bot - (y_bot - y_top) * t
        s.line(round(bx), round(by), round(bx + dx), round(by + dy), SHADE)
    s.px(x1, y_top, LIGHT)
    return s


def pea_bloom(sp: Sprite, x, y, ramp="petal_white", calyx_ramp="gh_pea"):
    """Erbsenblüte von der Seite: rundes Fähnchen oben (3 px), Schiffchen darunter,
    kleiner grüner Kelch. (x,y) = Mitte des Fähnchens."""
    f = sp.layer(ramp)
    for (dx, dy, t) in ((-1, -1, LIGHT), (0, -1, HIGHLIGHT), (1, -1, BASE), (-1, 0, LIGHT),
                        (0, 0, BASE), (1, 0, BASE), (0, 1, SHADE), (1, 1, BASE)):
        f.px(x + dx, y + dy, t)
    c = sp.layer(calyx_ramp, outline=False, shading=False)
    c.px(x - 1, y + 1, BASE)
    return f


def pea_pod(sp: Sprite, ramp, x, y, L=6, bend=0.0, peas=True):
    """Hängende, flache Erbsenschote: 2 px breit, unten abgerundet mit kleinem Spitzchen,
    Erbsen als helle Wölbungen. (x,y) = linke obere Ecke, bend = seitlicher Schwung unten."""
    lay = sp.layer(ramp, shading=False)
    cols = []
    for i in range(L):
        t = i / max(L - 1, 1)
        xx = x + round(bend * t * t)
        cols.append((xx, y + i))
        lay.px(xx, y + i, LIGHT)
        lay.px(xx + 1, y + i, BASE)
    if peas:
        for i in range(1, L - 1, 2):
            xx, yy = cols[i]
            lay.px(xx, yy, HIGHLIGHT)
            lay.px(xx + 1, yy + 1, SHADE)
    xx, yy = cols[-1]
    lay.erase(xx, yy)
    lay.px(xx + 1, yy, SHADE)
    c = sp.layer("gh_pea", outline=False, shading=False)
    c.px(x, y - 1, BASE)
    c.px(x + 1, y - 1, SHADE)
    return lay


def needle_sprig(sp: Sprite, ramp, x0, y0, x1, y1, bend=0.0, bare=0.25, dense=1.0):
    """Nadeliger Zweig (Rosmarin) im Fischgrätmuster: dunkle Zweigachse von (x0,y0) zur
    Spitze (x1,y1), daran schmale Nadeln (2 px), schräg nach oben, wechselständig links
    und rechts. Ohne Outline, damit jede Nadel einzeln lesbar bleibt; Licht von links.
    Gibt (Ebene, Liste der Achsenpunkte) zurück."""
    mx, my = (x0 + x1) / 2 + bend, (y0 + y1) / 2
    pts = []
    n = int(max(abs(x1 - x0), abs(y1 - y0)) * 3) + 2
    for i in range(n + 1):
        t = i / n
        a = (x0 + (mx - x0) * t, y0 + (my - y0) * t)
        b = (mx + (x1 - mx) * t, my + (y1 - my) * t)
        p = (math.floor(a[0] + (b[0] - a[0]) * t), math.floor(a[1] + (b[1] - a[1]) * t))
        if not pts or pts[-1] != p:
            pts.append(p)
    lay = sp.layer(ramp, outline=False, shading=False)
    L = len(pts)
    for i, (x, y) in enumerate(pts):
        t = i / max(L - 1, 1)
        lay.px(x, y, OUTLINE if t < 0.85 else SHADE)
        if t < bare:
            continue
        f = (t - bare) / max(1 - bare, 0.01)
        long_ = dense >= 1.0 and 0.1 < f < 0.8
        # wechselständig: gerade Zeilen links, ungerade rechts (+ kurze Gegen-Nadel)
        if i % 2 == 0:
            lay.px(x - 1, y, LIGHT)
            if long_:
                lay.px(x - 2, y - 1, HIGHLIGHT)
            lay.px(x + 1, y, SHADE)
        else:
            lay.px(x + 1, y, BASE)
            if long_:
                lay.px(x + 2, y - 1, LIGHT)
            lay.px(x - 1, y, BASE)
    x, y = pts[-1]
    lay.px(x, y - 1, LIGHT)
    lay.px(x, y, BASE)
    return lay, pts
