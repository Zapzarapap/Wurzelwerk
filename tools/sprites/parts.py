"""Wiederverwendbare Bauteile: Töpfe, Blattformen, Bodenbüschel."""
import math

from pixel import Sprite, Layer, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE, HOLE

SOIL_Y = 24  # Oberkante der Erde im Standardtopf


def pot(sp: Sprite, ramp="terracotta", soil=True):
    """Standard-Tontopf, unten mittig. Erde-Oberkante bei y=SOIL_Y."""
    body = sp.layer(ramp)
    for y in range(26, 31):
        inset = (y - 26) // 2
        body.rect(10 + inset, y, 21 - inset, y)
    rim = sp.layer(ramp)
    rim.rect(9, 24, 22, 25)
    if soil:
        s = sp.layer("soil", outline=False, shading=False)
        s.rect(11, 24, 20, 24, tone=SHADE)
    return body, rim


def ground_tuft(sp: Sprite, ramp="moss", cx=15.5, y=30, w=6):
    """Kleiner Boden-/Grasbüschel für Pflanzen ohne Topf."""
    g = sp.layer(ramp)
    g.ellipse(cx, y, w, 1.6)
    return g


def leaf_frame(bx, by, angle, x, y):
    """Pixel (x,y) in Blattkoordinaten (u entlang, v quer) umrechnen."""
    dx, dy = x - bx, y - by
    ca, sa = math.cos(angle), math.sin(angle)
    u = dx * ca + dy * sa
    v = -dx * sa + dy * ca
    return u, v


def heart_leaf(lay: Layer, bx, by, angle_deg, L, W, splits=(), notch=True, midrib=True,
               lit=LIGHT, dark=BASE, vein=None):
    """Herzförmiges Blatt (Monstera, Alocasia …).

    bx,by: Ansatzpunkt am Stiel; angle_deg: Richtung zur Blattspitze
    (0 = rechts, -90 = oben); L: Länge; W: halbe Breite; splits: Liste
    von t-Werten (0..1) für Monstera-Schlitze (als dunkle Linien).
    Die zum Licht (oben links) zeigende Blatthälfte wird heller.
    """
    a = math.radians(angle_deg)
    ca, sa = math.cos(a), math.sin(a)
    lit_sign = 1 if (sa - ca) > 0 else -1

    def width(t):
        val = max(0.0, t + 0.22) ** 0.85 * max(0.0, 1 - t) ** 1.15
        return W * val / 0.52

    r = int(L + W + 2)
    for y in range(int(by - r), int(by + r) + 1):
        for x in range(int(bx - r), int(bx + r) + 1):
            u, v = leaf_frame(bx, by, a, x + 0.5, y + 0.5)
            t = u / L
            if t < -0.22 or t > 1 or abs(v) > width(t):
                continue
            if notch and t < 0.08 and abs(v) < W * 0.28:
                continue
            tone = ("a", lit if v * lit_sign > 0 else dark)
            for tk in splits:
                du = u - (tk * L + 0.55 * abs(v))
                edge = abs(v) / max(width(t), 0.01)
                if edge > 0.72 and abs(du) < 0.9:
                    tone = HOLE          # Kerbe am Rand: durchsichtig
                elif edge > 0.3 and abs(du) < 0.62:
                    tone = OUTLINE       # Schlitz nach innen: dunkle Linie
            lay.px(x, y, tone)

    if midrib and L >= 7:
        for i in range(1, int(L * 0.85)):
            p = (round(bx + ca * i - 0.5), round(by + sa * i - 0.5))
            if p in lay.pixels and lay.pixels[p] not in (OUTLINE, HOLE):
                lay.px(*p, vein if vein is not None else HIGHLIGHT)


def stalk(sp: Sprite, x0, y0, x1, y1, bend=0.0, ramp="stem", tone=SHADE):
    """Dünner Stiel ohne Outline (1 px)."""
    s = sp.layer(ramp, outline=False, shading=False)
    mx, my = (x0 + x1) / 2 + bend, (y0 + y1) / 2
    s.curve([(x0, y0), (mx, my), (x1, y1)], tone=tone)
    return s


def dome(lay: Layer, cx, cy, rx, ry, tone=None):
    """Obere Hälfte einer Ellipse (Pilzhut). cy = Unterkante."""
    for y in range(math.floor(cy - ry), math.floor(cy) + 1):
        for x in range(math.floor(cx - rx), math.ceil(cx + rx) + 1):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1.0:
                lay.px(x, y, tone)


def meadow_ground(sp: Sprite, cx=15.5, w=7):
    """Kleiner Grashügel als Fuß für Wiesenpflanzen."""
    g = sp.layer("moss")
    g.ellipse(cx, 30.2, w, 1.7)
    return g


def forest_ground(sp: Sprite, cx=15.5, w=8):
    """Moospolster als Fuß für Waldpflanzen."""
    g = sp.layer("moss")
    g.ellipse(cx, 30.0, w, 2.0)
    for dx in (-w + 2, -2, 3, w - 3):
        g.px(cx + dx, 27.6, ("a", 3))
    return g
