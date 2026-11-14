"""Bauteile der Pflanzenhandlung: biegbares Blatt mit Mustern (Adern, Streifen, Flecken), Stiele."""
import math
from types import SimpleNamespace

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE, HOLE
from parts import SOIL_Y


def _norm(f, n=200):
    m = max(f(i / n) for i in range(n + 1))
    return lambda t: f(t) / m


# name -> (t_min, Breitenprofil 0..1, Kerbe an der Basis als Anteil von W)
PROFILES = {
    "heart": (-0.22, _norm(lambda t: max(0, t + 0.22) ** 0.85 * max(0, 1 - t) ** 1.15), 0.28),
    "round": (-0.02, _norm(lambda t: max(0, (t + 0.02) * (1 - t)) ** 0.5), 0.0),
    "arrow": (-0.15, _norm(lambda t: max(0, t + 0.15) ** 0.6 * max(0, 1 - t) ** 1.3), 0.34),
    "lance": (0.0, _norm(lambda t: math.sin(math.pi * min(1, max(0, t)) ** 0.85) ** 0.9), 0.0),
    "spoon": (0.0, _norm(lambda t: max(0, t) ** 0.9 * max(0, 1 - t ** 2.2)), 0.0),
}


def _spine(bx, by, a0, db, L, tmin, ds=0.25):
    """Blattachse als Liste (s, x, y, Winkel). s<0: gerade nach hinten."""
    pts = []
    n_back = int(-tmin * L / ds) + 1 if tmin < 0 else 0
    for i in range(n_back, 0, -1):
        s = -i * ds
        pts.append((s, bx + math.cos(a0) * s, by + math.sin(a0) * s, a0))
    x, y = bx, by
    for i in range(int(L / ds) + 2):
        s = i * ds
        ang = a0 + db * s / L
        pts.append((s, x, y, ang))
        x += math.cos(ang) * ds
        y += math.sin(ang) * ds
    return pts


def leaf(sp: Sprite, ramp, bx, by, ang, L, W, shape="heart", bend=0.0, wave=0.0, wfreq=1.9,
         splits=(), lit=LIGHT, dark=BASE, overlays=(), midrib=None):
    """Blatt mit gebogener Achse.

    ang: Richtung der Spitze in Grad (0 rechts, -90 oben); bend: Winkeländerung
    bis zur Spitze (positiv = kippt im Uhrzeigersinn, also rechts nach unten);
    wave: Amplitude eines welligen Rands; overlays: Liste (Rampe, fn(c)->Ton|None),
    wird in dieser Reihenfolge über das Blatt gelegt. midrib: Tonindex der Mittelrippe.
    Gibt (Ebene, Zellen) zurück.
    """
    tmin, prof, notch = PROFILES[shape]
    a0, db = math.radians(ang), math.radians(bend)
    spine = _spine(bx, by, a0, db, L, tmin)
    xs = [p[1] for p in spine]
    ys = [p[2] for p in spine]
    r = W + wave + 2
    lay = sp.layer(ramp)
    cells = {}
    for y in range(int(min(ys) - r), int(max(ys) + r) + 1):
        for x in range(int(min(xs) - r), int(max(xs) + r) + 1):
            px, py = x + 0.5, y + 0.5
            best = min(spine, key=lambda p: (p[1] - px) ** 2 + (p[2] - py) ** 2)
            s, sx, sy, a = best
            ca, sa = math.cos(a), math.sin(a)
            dx, dy = px - sx, py - sy
            u = s + dx * ca + dy * sa
            v = -dx * sa + dy * ca
            t = u / L
            if t < tmin or t > 1:
                continue
            p = prof(t)
            w = W * p + (wave * math.sin(u * wfreq) * min(1.0, p * 4) if wave else 0)
            if w <= 0.05 or abs(v) > w:
                continue
            if t < 0.1 and abs(v) < W * notch:
                continue
            lit_sign = 1 if (sa - ca) > 0 else -1
            tone = ("a", lit if v * lit_sign > 0 else dark)
            edge = abs(v) / max(w, 0.01)
            for tk in splits:
                du = u - (tk * L + 0.55 * abs(v))
                if edge > 0.72 and abs(du) < 0.9:
                    tone = HOLE
                elif edge > 0.3 and abs(du) < 0.62:
                    tone = OUTLINE
            lay.px(x, y, tone)
            cells[(x, y)] = SimpleNamespace(x=x, y=y, t=t, u=u, v=v, vn=edge, w=w, L=L, W=W, edge=False)
    for (x, y), c in cells.items():
        c.edge = any((x + dx, y + dy) not in cells for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    skip = {p for p, tn in lay.pixels.items() if tn in (HOLE, OUTLINE)}
    if midrib is not None and L >= 7:
        overlays = [(ramp, lambda c, m=midrib: m if abs(c.v) <= 0.5 and 0.02 < c.t < 0.88 else None)] + list(overlays)
    for oramp, fn in overlays:
        ov = sp.layer(oramp, outline=False, shading=False)
        for p, c in cells.items():
            if p in skip:
                continue
            tn = fn(c)
            if tn is not None:
                ov.px(p[0], p[1], tn)
    return lay, cells


# --- Mustergeneratoren (fn(c) -> Ton | None) -----------------------------------

def rib(tone=BASE, width=0.55, t0=0.0, t1=0.9):
    return lambda c: tone if abs(c.v) <= width and t0 <= c.t <= t1 else None


def laterals(us, slope=0.9, tone=BASE, w=0.6, min_v=0.4, t1=1.0):
    """Seitenadern: starten bei u0 an der Mittelrippe und laufen schräg nach vorn/außen."""
    def f(c):
        av = abs(c.v)
        if av < min_v or c.t > t1:
            return None
        for u0 in us:
            if c.u >= u0 and abs(av - (c.u - u0) * slope) <= w:
                return tone
        return None
    return f


def rim(tone=SHADE, vn=0.78):
    return lambda c: tone if c.vn >= vn and c.t > 0.05 else None


def combine(*fns):
    """Erste passende Funktion gewinnt."""
    def f(c):
        for fn in fns:
            r = fn(c)
            if r is not None:
                return r
        return None
    return f


# --- Stiele ---------------------------------------------------------------------

def stem(sp: Sprite, x0, y0, x1, y1, bend=0.0, ramp="stem", thick=1):
    """Stiel als Kurve; thick=2: zweiter Pixel rechts daneben (dunkler) für kräftige Stiele."""
    s = sp.layer(ramp, outline=False, shading=False)
    mx, my = (x0 + x1) / 2 + bend, (y0 + y1) / 2
    if thick >= 2:
        s2 = sp.layer(ramp, outline=False, shading=False)
        s2.curve([(x0 + 1, y0), (mx + 1, my), (x1 + 1, y1)], tone=SHADE)
        s.curve([(x0, y0), (mx, my), (x1, y1)], tone=BASE)
        # linker Pixel soll oben liegen -> Ebene s nach hinten tauschen
        sp.layers.remove(s2)
        sp.layers.insert(sp.layers.index(s), s2)
    else:
        s.curve([(x0, y0), (mx, my), (x1, y1)], tone=SHADE)
    return s
