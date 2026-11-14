"""Monstera – Pflanzenhandlung. Überarbeitet: unregelmäßig, überlappend, hängende Blätter."""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, HOLE, OUTLINE
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem, uv_to_xy


class CutSprite(Sprite):
    """Sprite, das nach dem Rendern einzelne Outline-Pixel wieder öffnet (Schlitzenden am Blattrand)."""

    def __init__(self):
        super().__init__()
        self.cuts = []  # (Ebenen-Index, Pixelmenge)

    def render(self, variant=None):
        img, glow = super().render(variant)
        for li, pix in self.cuts:
            later = set()
            for lay in self.layers[li + 1:]:
                pts = set(lay.pixels)
                later |= pts
                if lay.outline:
                    later |= {(x + dx, y + dy) for (x, y) in pts for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))}
            sub = Sprite(self.w, self.h)
            sub.layers = self.layers[:li]
            under, uglow = Sprite.render(sub, variant)
            for p in pix:
                if p not in later and 0 <= p[0] < self.w and 0 <= p[1] < self.h:
                    img.putpixel(p, under.getpixel(p))
                    glow.putpixel(p, uglow.getpixel(p))
        return img, glow


def cut_slits(sp, lay, cells, geom, L, W, ts, depth=0.55, slope=0.3, holes=True):
    """Monstera-Schlitze: durchsichtige, 1 px breite Einschnitte vom Rand Richtung Mittelrippe.

    ts: Positionen (Anteil von L) an der Mittelrippe; jeder Schlitz läuft schräg
    nach außen Richtung Spitze und öffnet den Rand (auch die Outline dort).
        holes: zusätzlich kleine Fenster nahe der Mittelrippe zwischen den Schlitzen.
    """
    ring = set()
    for tk in ts:
        u0 = tk * L
        for sgn in (1, -1):
            for i in range(0, 60):
                f = i / 59
                v = sgn * (W * (1 - depth) + f * (W * depth + 2.2))
                u = u0 + slope * abs(v)
                x, y = geom(u, v)
                q = (math.floor(x), math.floor(y))
                c = cells.get(q)
                if c is None:
                    if abs(v) > W * 0.6 and any((q[0] + dx, q[1] + dy) in cells for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                        ring.add(q)  # Outline am Rand öffnen
                    if abs(v) > W * 0.6:
                        break
                    continue
                if c.t > 0.93:
                    continue
                lay.px(*q, HOLE)
    if holes and len(ts) >= 2:
        for a, b in zip(ts, ts[1:]):
            um = (a + b) / 2 * L
            for sgn in (1, -1):
                x, y = geom(um + 0.6, sgn * W * 0.3)
                q = (math.floor(x), math.floor(y))
                if q in cells and not cells[q].edge:
                    lay.px(*q, HOLE)
    sp.cuts.append((sp.layers.index(lay), ring))

# Reihenfolge = Zeichenreihenfolge (hinten -> vorn).
# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, Schlitze, Stielbiegung)
STAGES = {
    1: [(15.5, 15.5, 19.5, -92, 5.5, 3.2, 0, (), 0)],
    2: [(14.5, 11.5, 18, -145, 7, 4.0, -16, (), 1),
        (17, 19.5, 19.5, -60, 5, 2.9, 8, (), -1)],
    3: [(15, 14.5, 13.5, -100, 8, 4.5, 6, (0.55,), 1),
        (14, 8, 19, -170, 7, 4.1, -28, (0.6,), 1),
        (16.5, 22, 17, -28, 6.5, 3.9, 28, (0.6,), -1),
        (16, 17.5, 19.5, -72, 4.5, 2.6, 0, (), 0)],
    4: [(15, 12.5, 11.5, -102, 8.5, 4.7, 8, (0.42, 0.72), 1),
        (16.5, 21.5, 13.5, -52, 6.5, 3.9, 6, (0.5,), -1),
        (14, 8.5, 17.5, -168, 8, 4.6, -30, (0.42, 0.72), 1.5),
        (17, 23, 20, -12, 7, 4.2, 36, (0.45, 0.75), -1),
        (15.5, 15.5, 19, -80, 4.8, 2.7, 0, (), 0)],
    5: [(15, 12.5, 11, -100, 9, 4.9, 8, (0.38, 0.68), 1),
        (16.5, 22, 12.5, -48, 7, 4.0, 6, (0.45, 0.75), -1.5),
        (14.5, 9, 16, -165, 8.5, 4.8, -32, (0.38, 0.68), 2),
        (17.5, 23, 19, -10, 8, 4.5, 40, (0.38, 0.68), -1),
        (15.5, 11, 20, -135, 5.5, 3.2, -20, (0.55,), 1),
        (15, 16.5, 18, -76, 5, 2.8, 0, (), 0)],
}


def draw(stage: int) -> Sprite:
    sp = CutSprite()
    pot(sp)
    for (sx, bx, by, ang, L, W, bend, splits, sb) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb)
        lay, cells = leaf(sp, "leaf_deep", bx, by, ang, L, W, "heart", bend=bend, midrib=4)
        if splits:
            cut_slits(sp, lay, cells, uv_to_xy(bx, by, ang, L, bend), L, W, splits,
                      depth=0.58, holes=False)
    return sp
