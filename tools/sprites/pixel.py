"""Kleines Pixel-Art-Werkzeug für Wurzelwerk.

Grundidee: Jedes Objekt (Blatt, Topf, Stiel, Hut …) wird als eigene *Ebene*
auf ein Pixelraster gezeichnet. Jede Ebene hat eine Farbrampe aus der
Palette (outline, shade, base, light). Beim Rendern bekommt jede Ebene
automatisch:
  * Licht von oben links (light), Schatten unten rechts (shade)
  * eine farbige Outline in der dunkelsten Rampenfarbe
So bleiben alle Sprites im selben Stil, egal wer sie zeichnet.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field

from PIL import Image

from palette import RAMPS, hex_to_rgba

# Tonstufen innerhalb einer Rampe
OUTLINE, SHADE, BASE, LIGHT, HIGHLIGHT = 0, 1, 2, 3, 4
HOLE = "hole"  # gehört zur Form, wird aber nicht gezeichnet (z. B. Monstera-Schlitze)


@dataclass
class Layer:
    ramp: str
    pixels: dict = field(default_factory=dict)  # (x, y) -> fester Ton oder None (= auto)
    outline: bool = True
    shading: bool = True
    glow: bool = False  # leuchtet nachts (kommt in die Leucht-Maske)

    # --- Grundformen -------------------------------------------------------
    def px(self, x, y, tone=None):
        self.pixels[(int(x), int(y))] = tone

    def erase(self, x, y):
        self.pixels.pop((int(x), int(y)), None)

    def rect(self, x0, y0, x1, y1, tone=None):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.px(x, y, tone)

    def ellipse(self, cx, cy, rx, ry, tone=None):
        for y in range(math.floor(cy - ry), math.ceil(cy + ry) + 1):
            for x in range(math.floor(cx - rx), math.ceil(cx + rx) + 1):
                dx = (x - cx) / max(rx, 0.01)
                dy = (y - cy) / max(ry, 0.01)
                if dx * dx + dy * dy <= 1.0:
                    self.px(x, y, tone)

    def line(self, x0, y0, x1, y1, tone=None):
        """Pixelgenaue Linie (Bresenham)."""
        x0, y0, x1, y1 = round(x0), round(y0), round(x1), round(y1)
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            self.px(x0, y0, tone)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def curve(self, pts, tone=None, steps=40):
        """Quadratische/kubische Bezier-Kurve als Pixelstrich."""
        def bez(t):
            p = list(pts)
            while len(p) > 1:
                p = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(p, p[1:])]
            return p[0]
        prev = None
        for i in range(steps + 1):
            x, y = bez(i / steps)
            cur = (round(x), round(y))
            if prev and cur != prev:
                self.line(*prev, *cur, tone)
            prev = cur
        if prev:
            self.px(*prev, tone)

    def shape(self, inside, x0, y0, x1, y1, tone=None):
        """Alles füllen, wofür inside(x, y) True liefert."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if inside(x + 0.5, y + 0.5):
                    self.px(x, y, tone)


class Sprite:
    def __init__(self, w=32, h=32):
        self.w, self.h = w, h
        self.layers: list[Layer] = []

    def layer(self, ramp, **kw) -> Layer:
        lay = Layer(ramp, **kw)
        self.layers.append(lay)
        return lay

    # ----------------------------------------------------------------------
    def render(self, variant: dict | None = None):
        """Gibt (Bild, Leucht-Maske) zurück.

        variant: Palettentausch, z. B. {"petal_red": "petal_pink"}.
        """
        variant = variant or {}
        img = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        glow = Image.new("L", (self.w, self.h), 0)
        occupied = {}  # (x,y) -> Layer-Index

        for li, lay in enumerate(self.layers):
            ramp = RAMPS[variant.get(lay.ramp, lay.ramp)]
            pts = {p for p in lay.pixels if 0 <= p[0] < self.w and 0 <= p[1] < self.h}
            if not pts:
                continue

            # 1) Outline um die Ebene herum (auch über ältere Ebenen drüber)
            if lay.outline:
                ring = set()
                for (x, y) in pts:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        q = (x + dx, y + dy)
                        if q not in pts and 0 <= q[0] < self.w and 0 <= q[1] < self.h:
                            ring.add(q)
                for q in ring:
                    img.putpixel(q, hex_to_rgba(ramp[OUTLINE]))
                    occupied[q] = li
                    glow.putpixel(q, 255 if lay.glow else 0)

            # 2) Füllung mit automatischem Licht/Schatten
            for (x, y) in pts:
                tone = lay.pixels[(x, y)]
                if tone == HOLE:
                    continue  # Loch: durchsichtig, aber ohne Outline
                auto_base = None
                if tone is None:
                    auto_base = BASE
                elif isinstance(tone, tuple):  # ("a", t): Auto-Schattierung um Basiston t
                    auto_base = tone[1]
                if auto_base is not None:
                    tone = auto_base
                    if lay.shading:
                        top = (x, y - 1) not in pts
                        left = (x - 1, y) not in pts
                        bottom = (x, y + 1) not in pts
                        right = (x + 1, y) not in pts
                        if (top or left) and not (bottom or right):
                            tone = auto_base + 1
                        elif (bottom or right) and not (top or left):
                            tone = auto_base - 1
                tone = max(0, min(tone, len(ramp) - 1))
                img.putpixel((x, y), hex_to_rgba(ramp[tone]))
                occupied[(x, y)] = li
                glow.putpixel((x, y), 255 if lay.glow else 0)
        return img, glow


def save_sheet(frames, path, scale=8, bg="#f3ead8", gap=2, label_rows=None):
    """Mehrere Bilder nebeneinander, hochskaliert – zur Vorschau."""
    rows = frames if isinstance(frames[0], list) else [frames]
    w = max(len(r) for r in rows)
    fw, fh = rows[0][0].size
    sheet = Image.new("RGBA", ((fw + gap) * w + gap, (fh + gap) * len(rows) + gap), hex_to_rgba(bg))
    for ri, r in enumerate(rows):
        for ci, f in enumerate(r):
            sheet.alpha_composite(f, (gap + ci * (fw + gap), gap + ri * (fh + gap)))
    sheet = sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST)
    sheet.save(path)
    return sheet


def rng(seed):
    return random.Random(seed)
