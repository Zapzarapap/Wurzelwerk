"""Bauteile für die Blumenwiese: Strahlenblüten, Ährenblüten, Rosenblüte, Blattlinien."""
import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import heart_leaf, stalk


def star_flower(sp, ramp, x, y, r_in, r_out, n, ysc=0.85, rot=0.0, p=0.8, valley=0.55):
    """Strahlenblüte (Gänseblümchen, Sonnenblume, Gerbera, Nelke) als Stern mit n Blütenblättern.

    Die Täler zwischen den Blättern bekommen dunkle Linien. ysc staucht in y (Blüte leicht von oben).
    """
    lay = sp.layer(ramp)

    def rad(th):
        return r_in + (r_out - r_in) * (0.5 + 0.5 * math.cos(n * (th - rot))) ** p

    def inside(px, py):
        dx, dy = px - x, (py - y) / ysc
        return math.hypot(dx, dy) <= rad(math.atan2(dy, dx))

    R = int(r_out) + 2
    lay.shape(inside, int(x - R), int(y - R), int(x + R), int(y + R))
    if valley:
        v = sp.layer(ramp, outline=False, shading=False)
        for k in range(n):
            th = rot + (k + 0.5) * 2 * math.pi / n
            d = r_in * 0.7
            while d <= r_in + (r_out - r_in) * valley:
                q = (int(math.floor(x + math.cos(th) * d)), int(math.floor(y + math.sin(th) * d * ysc)))
                if q in lay.pixels:
                    v.px(q[0], q[1], SHADE)
                d += 0.5
    return lay


def seed_disc(sp, ramp, x, y, rx, ry, outline=True):
    """Körbchen-Mitte mit Samen-Muster (Schachbrett)."""
    lay = sp.layer(ramp, outline=outline, shading=False)
    lay.ellipse(x, y, rx, ry, tone=BASE)
    for (px, py) in list(lay.pixels):
        if (px + py) % 2 == 0:
            lay.pixels[(px, py)] = SHADE
        elif px + 0.5 < x and py + 0.5 < y:
            lay.pixels[(px, py)] = LIGHT
    return lay


def spike(sp, ramp, x0, y0, x1, y1, w=1.7, step=2.0, bend=0.0):
    """Lavendel-Ähre: Kette kleiner Blütenquirle von unten (x0,y0) nach oben (x1,y1)."""
    lay = sp.layer(ramp)
    length = math.hypot(x1 - x0, y1 - y0)
    n = max(2, int(length / step))
    for i in range(n + 1):
        t = i / n
        cx = x0 + (x1 - x0) * t + bend * 4 * t * (1 - t)
        cy = y0 + (y1 - y0) * t
        rx = w * (1 - 0.4 * t) * (0.65 if i == n else 1.0)
        lay.ellipse(cx, cy, rx + (0.55 if i % 2 else 0.0), 1.3)
    # Lichtpunkte
    hl = sp.layer(ramp, outline=False, shading=False)
    for i in range(1, n):
        t = i / n
        cx = x0 + (x1 - x0) * t + bend * 4 * t * (1 - t)
        cy = y0 + (y1 - y0) * t
        q = (int(math.floor(cx - 0.8)), int(math.floor(cy - 0.8)))
        if q in lay.pixels:
            hl.px(q[0], q[1], HIGHLIGHT if i % 2 else LIGHT)
    return lay


def rose_bloom(sp, ramp, x, y, r):
    """Rosenblüte von vorn: Kelch mit spiralig eingerollten Blütenblättern (konzentrische Windungen)."""
    ry = r * 0.88
    b = sp.layer(ramp)
    b.ellipse(x, y, r, ry)
    # leichte Blütenblatt-Zacken am oberen Rand
    if r >= 4:
        b.erase(int(math.floor(x - r * 0.35)), int(math.floor(y - ry)))
        b.erase(int(math.floor(x + r * 0.45)), int(math.floor(y - ry)))
    fill = sp.layer(ramp, outline=False, shading=False)
    ring = sp.layer(ramp, outline=False, shading=False)
    for (f, ox, oy, skip, inner) in ((0.76, 0.12, 0.14, (-2.7, -1.5), LIGHT), (0.44, -0.12, -0.04, (0.3, 1.5), BASE)):
        rr, rry = r * f, ry * f
        cx, cy = x + ox * r, y + oy * r
        for (px, py) in b.pixels:
            dx, dy = (px + 0.5 - cx) / rr, (py + 0.5 - cy) / rry
            d = math.hypot(dx, dy)
            if d < 0.78:
                fill.px(px, py, inner)
            if 0.78 <= d <= 1.15 and not (skip[0] < math.atan2(dy, dx) < skip[1]):
                ring.px(px, py, SHADE)
    ring.px(int(math.floor(x - 0.2)), int(math.floor(y + 0.2)), SHADE)
    hl = sp.layer(ramp, outline=False, shading=False)
    hl.px(int(math.floor(x - r * 0.55)), int(math.floor(y - ry * 0.55)), HIGHLIGHT)
    return b


def narrow_leaf(sp, ramp, bx, by, angle, L, W=1.2):
    """Schmales Lanzettblatt (Lilie, Gänseblümchen-Rosette)."""
    return heart_leaf(sp.layer(ramp), bx, by, angle, L, W, notch=False, midrib=False)


def leaf_line(sp, x0, y0, x1, y1, bend=0.0, ramp="leaf_sage", tone=BASE):
    """Schmales Blatt als 1-px-Linie (Kornblume, Lavendel, Nelke)."""
    return stalk(sp, x0, y0, x1, y1, bend=bend, ramp=ramp, tone=tone)


# --- Handgezeichnete Pixel-Stempel ---------------------------------------
STAMP_TONES = {"o": OUTLINE, "s": SHADE, "b": BASE, "l": LIGHT, "h": HIGHLIGHT}


def stamp(sp, x, y, art, ramp, extra=None, outline=True, flip=False, out_ramp=None):
    """Kleines handgezeichnetes Motiv (Blütenkopf, Glocke …) pixelgenau setzen.

    art:   Liste gleich langer Strings, Mitte des Motivs landet auf (x, y).
           o/s/b/l/h = Ton der Hauptrampe, '.' oder ' ' = leer.
    extra: {zeichen: (rampe, ton)} für weitere Materialien (Blütenmitte, Flecken …).
           Diese Pixel gehören zur Silhouette (gemeinsame Outline), werden aber
           in ihrer eigenen Rampe gefärbt.
    flip:  horizontal spiegeln (für Abwechslung bei symmetrischen Motiven).
    out_ramp: Rampe, deren Outline-Farbe die Silhouette bekommt (Standard: ramp).
    """
    extra = extra or {}
    h, w = len(art), max(len(r) for r in art)
    x0, y0 = int(round(x - w / 2)), int(round(y - h / 2))
    sil = sp.layer(out_ramp or ramp, outline=outline, shading=False)
    layers = {}
    for j, row in enumerate(art):
        for i, ch in enumerate(row):
            if ch in ". ":
                continue
            px = x0 + ((w - 1 - i) if flip else i)
            py = y0 + j
            if ch in STAMP_TONES:
                if out_ramp and out_ramp != ramp:
                    sil.px(px, py, BASE)
                    if ramp not in layers:
                        layers[ramp] = sp.layer(ramp, outline=False, shading=False)
                    layers[ramp].px(px, py, STAMP_TONES[ch])
                else:
                    sil.px(px, py, STAMP_TONES[ch])
            elif ch in extra:
                r, t = extra[ch]
                sil.px(px, py, BASE)
                if r not in layers:
                    layers[r] = sp.layer(r, outline=False, shading=False)
                layers[r].px(px, py, t)
    return sil


def ray_flower(sp, ramp, x, y, R, rc, n, ysc=0.9, rot=0.0, notch=0.2, groove=0.1, inner_dark=1.0):
    """Klare Strahlenblüte (Gerbera, Sonnenblume): n Zungenblüten mit Kerben an
    den Spitzen und dunklen Rillen dazwischen, Licht von oben links.

    (x, y) ist die Blütenmitte in Pixelkoordinaten (Pixelmitte = x + 0.5).
    rc: Radius der Mitte (wird hier nicht gezeichnet, nur die Zone um sie abgedunkelt).
    """
    lay = sp.layer(ramp, shading=False)
    Ri = int(R) + 2
    for py in range(int(y - Ri), int(y + Ri) + 1):
        for px in range(int(x - Ri), int(x + Ri) + 1):
            dx, dy = px + 0.5 - x, (py + 0.5 - y) / ysc
            d = math.hypot(dx, dy)
            if d > R:
                continue
            f = (n * (math.atan2(dy, dx) / (2 * math.pi)) + rot) % 1.0
            edge = min(f, 1 - f)
            if d > R - 1.4 and edge < notch:
                continue
            lit = -(dx + dy) / max(d, 0.01)
            tone = LIGHT if lit > 0.3 else (SHADE if lit < -0.45 else BASE)
            if edge < groove and d > rc + 0.6:
                tone = SHADE if tone >= BASE else OUTLINE
            if d < rc + inner_dark:
                tone = min(tone, BASE) - (1 if d < rc + 0.5 else 0)
            if lit > 0.75 and d > R * 0.6 and edge > 0.38:
                tone = HIGHLIGHT
            lay.px(px, py, max(OUTLINE, tone))
    return lay


def eye(sp, x, y, rc, ysc=0.9, ramp="dark", ring=None):
    """Dunkle Blütenmitte mit Lichtpunkt oben links, optional Pollenring (ring=Rampe)."""
    c = sp.layer(ramp, shading=False)
    Ri = int(rc) + 2
    for py in range(int(y - Ri), int(y + Ri) + 1):
        for px in range(int(x - Ri), int(x + Ri) + 1):
            dx, dy = px + 0.5 - x, (py + 0.5 - y) / ysc
            d = math.hypot(dx, dy)
            if d <= rc:
                lit = -(dx + dy) / max(d, 0.01)
                c.px(px, py, LIGHT if (d > rc - 1 and lit > 0.4) else (SHADE if (d > rc - 1 and lit < -0.4) else BASE))
    hx, hy = int(math.floor(x - rc * 0.45)), int(math.floor(y - rc * 0.45 * ysc))
    c.px(hx, hy, HIGHLIGHT)
    if ring:
        r = sp.layer(ring, outline=False, shading=False)
        for (px, py) in list(c.pixels):
            dx, dy = px + 0.5 - x, (py + 0.5 - y) / ysc
            if rc - 1.0 < math.hypot(dx, dy) <= rc and (px + py) % 2 == 0:
                r.px(px, py, LIGHT if dx + dy < 0 else BASE)
    return c
