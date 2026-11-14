#!/usr/bin/env python3
"""Erzeugt die App-Icons (Setzling im Topf) unter app/icons/.

Aufruf: python3 -I tools/make_icons.py   (braucht Pillow)
Gezeichnet auf einem 32×32-Raster und nur ganzzahlig hochskaliert.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "app", "icons")

# Farben aus tools/sprites/palette.py
BG = "#f3ead8"
BG2 = "#e9dcc2"
TERRA = ["#4e2620", "#83402e", "#b4603e", "#d8875a", "#eeb284"]
SOIL = ["#2a1c18", "#3e2a22", "#563a2c"]
LEAF = ["#1e3a2c", "#2e5e3c", "#468a48", "#78b45a", "#b4d66c"]
STEM = "#5a8a44"


def rgba(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def ellipse_mask(cx, cy, rx, ry):
    pts = set()
    for y in range(32):
        for x in range(32):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1:
                pts.add((x, y))
    return pts


def draw_shape(img, pts, ramp):
    """Form mit Outline und Licht oben links."""
    for (x, y) in pts:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in pts and 0 <= q[0] < 32 and 0 <= q[1] < 32:
                img.putpixel(q, rgba(ramp[0]))
    for (x, y) in pts:
        tone = 2
        if (x, y - 1) not in pts or (x - 1, y) not in pts:
            tone = 3
        elif (x, y + 1) not in pts or (x + 1, y) not in pts:
            tone = 1
        img.putpixel((x, y), rgba(ramp[tone]))


def icon32(background=True):
    img = Image.new("RGBA", (32, 32), rgba(BG) if background else (0, 0, 0, 0))
    if background:
        for y in range(25, 32):
            for x in range(32):
                img.putpixel((x, y), rgba(BG2))
    # Stiel
    for y in range(12, 21):
        img.putpixel((16, y), rgba(STEM))
    img.putpixel((15, 17), rgba(STEM))
    img.putpixel((17, 15), rgba(STEM))
    # Blätter
    draw_shape(img, ellipse_mask(11.5, 15.5, 4.2, 2.8), LEAF)
    draw_shape(img, ellipse_mask(20.5, 12.5, 4.6, 3.0), LEAF)
    draw_shape(img, ellipse_mask(16.0, 8.0, 2.4, 3.2), LEAF)
    for (x, y) in ((10, 14), (11, 14), (19, 11), (20, 11), (15, 6)):
        img.putpixel((x, y), rgba(LEAF[4]))
    # Topf
    pot = set()
    for x in range(8, 24):
        for y in (20, 21):
            pot.add((x, y))
    for y in range(22, 29):
        inset = (y - 22) // 3 + 1
        for x in range(9 + inset, 23 - inset):
            pot.add((x, y))
    draw_shape(img, pot, TERRA)
    for x in range(9, 23):
        img.putpixel((x, 20), rgba(SOIL[1]))
    for x in (11, 14, 18, 21):
        img.putpixel((x, 20), rgba(SOIL[2]))
    for x in range(9, 23):
        img.putpixel((x, 22), rgba(TERRA[1]))
    return img


def place(size, scale, background=True, bg=BG):
    small = icon32(background)
    big = small.resize((32 * scale, 32 * scale), Image.NEAREST)
    canvas = Image.new("RGBA", (size, size), rgba(bg) if background else (0, 0, 0, 0))
    off = (size - 32 * scale) // 2
    # Hintergrund außerhalb ergänzen: unterer Streifen bis zum Rand
    if background:
        band_top = off + 25 * scale
        for y in range(band_top, size):
            for x in range(size):
                canvas.putpixel((x, y), rgba(BG2))
    canvas.alpha_composite(big, (off, off))
    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)
    icon32().save(os.path.join(OUT, "icon-32.png"))
    place(180, 5).save(os.path.join(OUT, "apple-touch-icon.png"))
    place(192, 6).save(os.path.join(OUT, "icon-192.png"))
    place(512, 16).save(os.path.join(OUT, "icon-512.png"))
    place(512, 12).save(os.path.join(OUT, "icon-maskable-512.png"))  # Inhalt in der Safe-Zone
    print("Icons ->", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
