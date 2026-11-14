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
