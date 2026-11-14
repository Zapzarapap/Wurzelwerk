"""Bauteile für Waldpflanzen."""
import math

from pixel import Sprite, Layer, OUTLINE, SHADE, BASE, LIGHT, HIGHLIGHT, HOLE
from parts import dome, leaf_frame

GROUND = 28


def bulb_stem(sp, ramp, cx, y0, y1, hw_top, hw_max, hw_foot, t_max=0.7, lean=0.0):
    """Bauchiger Stiel (Steinpilz): oben schmaler, unten dick, am Fuß wieder etwas schmaler."""
    lay = sp.layer(ramp)
    y0, y1 = round(y0), round(y1)
    H = max(y1 - y0, 1)
    for y in range(y0, y1 + 1):
        t = (y - y0) / H
        if t <= t_max:
            hw = hw_top + (hw_max - hw_top) * math.sin(t / t_max * math.pi / 2)
        else:
            hw = hw_max + (hw_foot - hw_max) * ((t - t_max) / (1 - t_max)) ** 1.4
        c = cx + lean * t
        for x in range(math.floor(c - hw - 1), math.ceil(c + hw) + 2):
            if abs(x + 0.5 - c) <= hw:
                lay.px(x, y)
    return lay


def oval_leaf(sp, ramp, bx, by, ang, L, W):
    """Kleines ovales Blatt (Heidelbeere)."""
    a = math.radians(ang)
    lay = sp.layer(ramp)
    r = int(L + W + 2)
    pts = []
    for y in range(int(by - r), int(by + r) + 1):
        for x in range(int(bx - r), int(bx + r) + 1):
            u, v = leaf_frame(bx, by, a, x + 0.5, y + 0.5)
            if 0 <= u <= L and abs(v) <= W * math.sin(math.pi * (u / L) ** 0.8) + 0.05:
                pts.append((x, y))
    if not pts:
        return lay
    mean = sum(x + y for x, y in pts) / len(pts)
    for (x, y) in pts:
        lay.px(x, y, ("a", LIGHT if x + y < mean - 0.5 else BASE))
    return lay


def ivy_leaf(sp, bx, by, ang, L, ramp="wa_ivy", veins=True):
    """Efeublatt: dreilappig-spitz, mit hellen Adern."""
    a = math.radians(ang)
    lay = sp.layer(ramp)
    lobes = [(0.0, 1.0, 0.24), (-62.0, 0.64, 0.18), (62.0, 0.64, 0.18)]
    pts = set()
    r = int(L + 3)
    for y in range(int(by - r), int(by + r) + 1):
        for x in range(int(bx - r), int(bx + r) + 1):
            for (off, lf, hwf) in lobes:
                u, v = leaf_frame(bx, by, a + math.radians(off), x + 0.5, y + 0.5)
                ll = L * lf
                if 0 <= u <= ll and abs(v) <= L * hwf * math.sin(math.pi * min(1.0, (u / ll) ** 0.7 * 0.97 + 0.02)) + 0.2:
                    pts.add((x, y))
                    break
    if not pts:
        return lay
    mean = sum(x + y for x, y in pts) / len(pts)
    for (x, y) in pts:
        lay.px(x, y, ("a", LIGHT if x + y < mean - 0.5 else BASE))
    if veins and L >= 5:
        for (off, lf, hwf) in lobes:
            aa = a + math.radians(off)
            for i in range(1, int(L * lf * 0.8)):
                p = (round(bx + math.cos(aa) * i - 0.5), round(by + math.sin(aa) * i - 0.5))
                if p in lay.pixels and lay.pixels[p] not in (OUTLINE, HOLE):
                    lay.px(*p, HIGHLIGHT if i > 1 else BASE)
    return lay


def spiral_pts(x, y, heading_deg, curl_r, turn=2.3 * math.pi, direction=1, shrink=0.8):
    """Punkte einer eingerollten Spitze (Farn). Startet bei (x,y) in Richtung heading."""
    pts = [(x, y)]
    h = math.radians(heading_deg)
    total = 0.0
    ds = 0.4
    S = curl_r * turn * 0.55
    s = 0.0
    while total < turn and len(pts) < 200:
        k = 1.0 / (curl_r * max(0.2, 1 - shrink * s / S))
        h += direction * k * ds
        total += k * ds
        x += math.cos(h) * ds
        y += math.sin(h) * ds
        s += ds
        pts.append((x, y))
    return pts


def bezier(ctrl, n=80):
    out = []
    for i in range(n + 1):
        t = i / n
        p = list(ctrl)
        while len(p) > 1:
            p = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(p, p[1:])]
        out.append(p[0])
    return out


def frond(sp, ramp, ctrl, W, curl_r=0.0, direction=1, bare=0.16):
    """Farnwedel als schmale, gebogene Klinge mit leicht gezacktem Rand, dunkler Mittelrippe
    und Fieder-Strichen. curl_r > 0: Spitze ist noch eingerollt."""
    lay = sp.layer(ramp)
    path = bezier(ctrl, 160)
    seglen = [0.0]
    for a_, b_ in zip(path, path[1:]):
        seglen.append(seglen[-1] + math.hypot(b_[0] - a_[0], b_[1] - a_[1]))
    Ltot = seglen[-1]
    curl = []
    if curl_r > 0:
        dx, dy = path[-1][0] - path[-2][0], path[-1][1] - path[-2][1]
        curl = spiral_pts(path[-1][0], path[-1][1], math.degrees(math.atan2(dy, dx)), curl_r,
                          turn=1.9 * math.pi, direction=direction, shrink=0.7)
    pix = {}
    for i in range(len(path)):
        s_ = seglen[i]
        x0, y0 = path[i]
        j, k = min(i + 1, len(path) - 1), max(i - 1, 0)
        tx, ty = path[j][0] - path[k][0], path[j][1] - path[k][1]
        n = math.hypot(tx, ty) or 1
        tx, ty = tx / n, ty / n
        nx, ny = -ty, tx
        rel = (s_ / Ltot - bare) / (1 - bare)
        w = 0.0
        if rel > 0:
            span = 0.62 if curl_r > 0 else 0.97
            w = W * math.sin(math.pi * min(1.0, rel * span + 0.02)) ** 0.8
        weff = w * (1.0 if int(s_ / 1.8) % 2 == 0 else 0.7)
        pix[(round(x0), round(y0))] = SHADE
        tick = (s_ % 2.4) < 0.7
        d = 0.5
        while d <= weff + 0.01:
            for sg in (-1, 1):
                p = (round(x0 + nx * d * sg), round(y0 + ny * d * sg))
                lit = (nx + ny) * sg < 0
                if p not in pix:
                    t = ("a", LIGHT if lit else BASE)
                    if tick and 0.9 <= d <= weff - 0.3 and w >= 1.6:
                        t = SHADE if not lit else BASE
                    pix[p] = t
            d += 0.5
    for (x, y) in curl:
        pix.setdefault((round(x), round(y)), SHADE)
    for p, t in pix.items():
        lay.px(*p, t)
    return lay


def crozier(sp, ramp, x0, y0, x1, y1, curl_r, direction=1, bend=0.0):
    """Eingerollter Farnwedel: Stiel + Spirale, 1 px Linie mit Outline."""
    lay = sp.layer(ramp)
    mx, my = (x0 + x1) / 2 + bend, (y0 + y1) / 2
    path = bezier([(x0, y0), (mx, my), (x1, y1)], 40)
    dx, dy = path[-1][0] - path[-2][0], path[-1][1] - path[-2][1]
    hd = math.degrees(math.atan2(dy, dx))
    pts = path + spiral_pts(x1, y1, hd, curl_r, turn=2.0 * math.pi, direction=direction, shrink=0.75)
    prev = None
    for (x, y) in pts:
        cur = (round(x), round(y))
        if cur != prev:
            lay.px(*cur, ("a", BASE))
            prev = cur
    return lay


def glowshroom(sp, x, base, h, rx, ramp="wa_glow"):
    """Kleiner Glühpilz (leuchtet nachts); alles auf glow-Ebenen."""
    top = base - h
    st = sp.layer(ramp, glow=True, outline=(h >= 4), shading=False)
    sw = 2 if h >= 4 else 1
    for y in range(round(top), round(base) + 1):
        for i in range(sw):
            st.px(round(x - sw / 2 + 0.5) + i, y, LIGHT)
    cap = sp.layer(ramp, glow=True)
    dome(cap, x, top + 1, rx, max(1.5, rx * 0.75))
    hl = sp.layer(ramp, glow=True, outline=False, shading=False)
    cx, cy = round(x - rx * 0.4), round(top + 1 - max(1.5, rx * 0.75) * 0.6)
    if (cx, cy) in cap.pixels:
        hl.px(cx, cy, HIGHLIGHT)
    return cap


def _arc(path):
    seg = [0.0]
    for a_, b_ in zip(path, path[1:]):
        seg.append(seg[-1] + math.hypot(b_[0] - a_[0], b_[1] - a_[1]))
    return seg


def _at(path, seg, s):
    """Punkt + Einheitstangente bei Bogenlänge s."""
    s = max(0.0, min(s, seg[-1]))
    i = 1
    while i < len(seg) - 1 and seg[i] < s:
        i += 1
    a_, b_ = path[i - 1], path[i]
    L = (seg[i] - seg[i - 1]) or 1e-6
    f = (s - seg[i - 1]) / L
    x, y = a_[0] + (b_[0] - a_[0]) * f, a_[1] + (b_[1] - a_[1]) * f
    tx, ty = (b_[0] - a_[0]) / L, (b_[1] - a_[1]) / L
    return x, y, tx, ty


def pinnate_frond(sp, ramp, ctrl, W, depth=0, curl_r=0.0, direction=1, bare=0.16,
                  spacing=2.8, fwd=0.8, sag=0.0):
    """Gefiederter Farnwedel: 1-px-Mittelrippe + einzelne Fiederblättchen als kurze
    schräge Striche (zur Spitze hin geneigt), beidseitig um 1 px versetzt, Lücken
    dazwischen, keine durchgehende Outline. Länge der Fiedern lanzettlich: an Basis
    und Spitze kurz, im unteren Drittel am längsten.
    depth: 0 = vorn (hell), 1 = Mitte, 2 = hinten (dunkel) – damit Überlappungen lesbar bleiben.
    sag: Fiedern hängen zusätzlich nach unten (für überhängende Wedel).
    curl_r > 0: Spitze noch eingerollt (junger Wedel)."""
    lay = sp.layer(ramp, outline=False, shading=False)
    path = bezier(ctrl, 300)
    seg = _arc(path)
    Ltot = seg[-1]
    lit_t, dk_t, rib_t, tip_t = [(LIGHT, BASE, SHADE, HIGHLIGHT),
                                 (BASE, SHADE, SHADE, LIGHT),
                                 (SHADE, SHADE, OUTLINE, BASE)][depth]
    pix = {}

    def put(p, t, force=False):
        if force or p not in pix:
            pix[p] = t

    s0 = bare * Ltot
    span = Ltot - s0 - (0.5 if curl_r <= 0 else 0.0)
    for sg in (-1, 1):
        s = s0 + (0.0 if sg == -1 else spacing * 0.5)
        while s < Ltot - 0.6:
            rel = (s - s0) / max(span, 1)
            if curl_r > 0:
                ln = W * math.sin(math.pi * min(1.0, 0.12 + rel * 0.62)) ** 0.7
            else:
                ln = W * math.sin(math.pi * min(1.0, 0.14 + rel * 0.86)) ** 0.65
            x0, y0, tx, ty = _at(path, seg, s)
            nx, ny = -ty * sg, tx * sg
            dx, dy = nx + tx * fwd, ny + ty * fwd + sag
            n = math.hypot(dx, dy) or 1
            dx, dy = dx / n, dy / n
            lit = (dx + dy) < 0.05
            base_t = lit_t if lit else dk_t
            # Fieder als schmale Ellipse (Flächenfüllung -> saubere Pixelform)
            hl = max(0.8, ln / 2 + 0.25)
            hw = 1.0 if ln >= 2.2 else 0.75
            cx, cy = x0 + dx * (hl + 0.35), y0 + dy * (hl + 0.35)
            for yy in range(math.floor(cy - hl - 2), math.ceil(cy + hl + 2)):
                for xx in range(math.floor(cx - hl - 2), math.ceil(cx + hl + 2)):
                    ux, uy = xx + 0.5 - cx, yy + 0.5 - cy
                    u, v = ux * dx + uy * dy, -ux * dy + uy * dx
                    if (u / hl) ** 2 + (v / hw) ** 2 <= 1.0:
                        tip = u > hl - 1.0 and ln >= 3.5 and lit
                        put((xx, yy), tip_t if tip else base_t)
            s += spacing
    for i in range(len(path)):
        put((round(path[i][0]), round(path[i][1])), rib_t, force=True)
    if curl_r > 0:
        dx, dy = path[-1][0] - path[-6][0], path[-1][1] - path[-6][1]
        curl = spiral_pts(path[-1][0], path[-1][1], math.degrees(math.atan2(dy, dx)), curl_r,
                          turn=1.9 * math.pi, direction=direction, shrink=0.7)
        for (cx, cy) in curl:
            put((round(cx), round(cy)), rib_t, force=True)
    for p, t in pix.items():
        lay.px(*p, t)
    return lay


def blade_leaf(sp, ramp, ctrl, W, base_w=0.25, power=0.8, rib=True, veins=0, tip=1.0, lit_side=None):
    """Breites, längliches Blatt entlang einer Bezierkurve (Maiglöckchen, Bärlauch).
    W: halbe Breite an der breitesten Stelle; base_w: relative Breite am Grund (Blattscheide);
    veins: Anzahl paralleler heller Längsnerven je Seite; tip: <1 kürzt die Spitze ab.
    Die zum Licht (oben links) zeigende Hälfte wird heller, Mittelrippe dunkel."""
    lay = sp.layer(ramp)
    path = bezier(ctrl, 160)
    seg = _arc(path)
    L = seg[-1]

    def width(t):
        core = math.sin(math.pi * min(1.0, t ** 0.85)) ** power
        return W * max(base_w * (1 - t) ** 2 if t < 0.3 else 0.0, core)

    xs = [p[0] for p in path]
    ys = [p[1] for p in path]
    x0, x1 = int(min(xs) - W - 2), int(max(xs) + W + 2)
    y0, y1 = int(min(ys) - W - 2), int(max(ys) + W + 2)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px, py = x + 0.5, y + 0.5
            best, bi = 1e9, 0
            for i in range(0, len(path), 2):
                d = (path[i][0] - px) ** 2 + (path[i][1] - py) ** 2
                if d < best:
                    best, bi = d, i
            t = seg[bi] / L
            if t > tip:
                continue
            j, k = min(bi + 2, len(path) - 1), max(bi - 2, 0)
            tx, ty = path[j][0] - path[k][0], path[j][1] - path[k][1]
            n = math.hypot(tx, ty) or 1
            tx, ty = tx / n, ty / n
            side = (px - path[bi][0]) * (-ty) + (py - path[bi][1]) * tx  # signed dist
            # Projektion entlang der Achse fürs Spitzen-Ende
            along = (px - path[bi][0]) * tx + (py - path[bi][1]) * ty
            if bi >= len(path) - 2 and along > 0.3:
                continue
            if bi == 0 and along < -0.3:
                continue
            w = width(t)
            if abs(side) > w + 0.05:
                continue
            nx, ny = -ty, tx
            lit = (side * (nx + ny)) < 0 if lit_side is None else (side * lit_side > 0)
            tone = ("a", LIGHT if lit else BASE)
            if veins and w >= 2.0 and 0.12 < t < 0.92:
                for vk in range(1, veins + 1):
                    if abs(abs(side) - w * vk / (veins + 1)) < 0.35:
                        tone = HIGHLIGHT if lit else LIGHT
            lay.px(x, y, tone)
    if rib:
        for i in range(int(len(path) * 0.04), int(len(path) * 0.88)):
            p = (math.floor(path[i][0]), math.floor(path[i][1]))
            if p in lay.pixels:
                lay.px(*p, SHADE)
    return lay


def stump(sp, x0, x1, top, low=False):
    """Stamm (x0..x1) mit Wurzelanlauf. low=True: niedriger Stumpf mit sichtbarer
    Schnittfläche (Jahresringe); sonst abgebrochener Stamm mit gezackter Bruchkante."""
    b = sp.layer("wood")
    for y in range(top, GROUND + 1):
        flare = 2 if y >= GROUND - 1 else (1 if y >= GROUND - 3 else 0)
        b.rect(x0 - flare, y, x1 + flare, y)
    w = x1 - x0 + 1
    if not low:
        # Bruchkante: Zacken, links höher
        prof = [-3, -4, -2, -1, 0, -1, 1, 2, 1, 2]
        for k in range(w):
            c = prof[min(k, len(prof) - 1)]
            if c > 0:
                for y in range(top, top + c):
                    b.erase(x0 + k, y)
            else:
                for y in range(top + c, top):
                    b.px(x0 + k, y)
    r = sp.layer("wood", outline=False, shading=False)
    # Rindenfurchen: senkrechte, unterbrochene dunkle Linien
    for k, x in enumerate(range(x0 + 1, x1 + 1, 2)):
        y = top + 2 + (k * 3) % 4
        while y < GROUND - 1:
            seg = 3 + (k + y) % 3
            for yy in range(y, min(y + seg, GROUND - 1)):
                if (x, yy) in b.pixels:
                    r.px(x, yy, SHADE if yy % 3 else 0)
                    if (x - 1, yy) in b.pixels and x - 1 > x0 and (yy + k) % 2 == 0:
                        r.px(x - 1, yy, LIGHT)
            y += seg + 2
    # Lichtkante links
    for y in range(top + 1, GROUND - 1):
        if (x0, y) in b.pixels and y % 4 != 0:
            r.px(x0, y, LIGHT)
    if low:
        top_face = sp.layer("wa_holz")
        top_face.ellipse((x0 + x1) / 2 + 0.5, top - 0.3, w / 2 - 0.3, 1.2)
        rings = sp.layer("wa_holz", outline=False, shading=False)
        cx = (x0 + x1) / 2 + 0.5
        for dx in range(-1, 1):
            rings.px(round(cx + dx), top, SHADE)
    return b
