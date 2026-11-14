#!/usr/bin/env python3
"""Erzeugt App-Icons, Favicons und iOS-Startbilder unter app/icons/.

Aufruf: python3 -I tools/make_icons.py   (braucht Pillow)

Alles wird auf einem 32×32-Raster gezeichnet und nur ganzzahlig hochskaliert:
- icon-32.png / favicon.svg: pixelgenau das 32×32-Bild (nicht herunterskaliert)
- apple-touch-icon (180), icon-192, icon-512, icon-maskable-512
- splash/*.png: Startbilder (Creme, Icon, Pixel-Schriftzug) für gängige iPhones;
  die passenden <link rel="apple-touch-startup-image">-Zeilen stehen in
  app/index.html (Liste: SPLASH unten).
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "app", "icons")

# Farben aus tools/sprites/palette.py
BG = "#f3ead8"
BG2 = "#e6d6b8"
TERRA = ["#4e2620", "#83402e", "#b4603e", "#d8875a", "#eeb284"]
SOIL = ["#2a1c18", "#3e2a22", "#563a2c"]
LEAF = ["#1e3a2c", "#2e5e3c", "#468a48", "#78b45a", "#b4d66c"]
STEM = "#2e5e3c"
INK = "#2e5e3c"

# iPhone-Startbilder: (Breite, Höhe) in Pixeln hochkant, CSS-Breite, CSS-Höhe, DPR
SPLASH = [
    (1320, 2868, 440, 956, 3),  # 16 Pro Max
    (1206, 2622, 402, 874, 3),  # 16 Pro
    (1290, 2796, 430, 932, 3),  # 14/15 Pro Max, 15/16 Plus
    (1179, 2556, 393, 852, 3),  # 14 Pro, 15, 15 Pro, 16
    (1284, 2778, 428, 926, 3),  # 12/13 Pro Max, 14 Plus
    (1170, 2532, 390, 844, 3),  # 12, 13, 14, 12/13 Pro
    (1125, 2436, 375, 812, 3),  # X, XS, 11 Pro, 12/13 mini
    (1242, 2688, 414, 896, 3),  # XS Max, 11 Pro Max
    (828, 1792, 414, 896, 2),  # XR, 11
    (1242, 2208, 414, 736, 3),  # 8 Plus
    (750, 1334, 375, 667, 2),  # SE 2./3. Gen, 8
]


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


def leaf(img, cx, cy, rx, ry, rib):
    """Blatt mit Mittelrippe; rib = Liste von Pixeln der Rippe."""
    draw_shape(img, ellipse_mask(cx, cy, rx, ry), LEAF)
    for p in rib:
        img.putpixel(p, rgba(LEAF[1]))


def icon32(background=True):
    img = Image.new("RGBA", (32, 32), rgba(BG) if background else (0, 0, 0, 0))
    if background:
        for y in range(26, 32):
            for x in range(32):
                img.putpixel((x, y), rgba(BG2))
    # Stiele (vom Topf zu den Blättern)
    for (x, y) in [(16, 20), (16, 19), (16, 18), (16, 17), (16, 16), (16, 15), (16, 14),
                   (15, 19), (14, 18), (13, 17), (12, 16),
                   (17, 18), (18, 17), (19, 16), (20, 15)]:
        img.putpixel((x, y), rgba(STEM))
    # Blätter: groß, leicht asymmetrisch
    leaf(img, 9.0, 13.5, 6.6, 4.2, [(x, 14) for x in range(5, 13)])
    leaf(img, 23.0, 11.5, 6.6, 4.4, [(x, 12) for x in range(19, 28)])
    leaf(img, 15.5, 7.0, 4.2, 5.6, [(15, y) for y in range(4, 12)])
    for (x, y) in ((5, 11), (6, 11), (7, 10), (19, 9), (20, 8), (21, 8), (13, 3), (13, 4)):
        img.putpixel((x, y), rgba(LEAF[4]))
    # Topf: breit und flach (Rand 2 Zeilen, Körper 5 Zeilen)
    pot = set()
    for x in range(8, 24):
        for y in (20, 21):
            pot.add((x, y))
    for y in range(22, 27):
        inset = 1 + (y - 22) // 2
        for x in range(8 + inset, 24 - inset):
            pot.add((x, y))
    draw_shape(img, pot, TERRA)
    for x in range(9, 23):
        img.putpixel((x, 20), rgba(SOIL[1]))
    for x in (11, 14, 18, 21):
        img.putpixel((x, 20), rgba(SOIL[2]))
    img.putpixel((16, 20), rgba(STEM))
    for x in range(9, 23):
        img.putpixel((x, 22), rgba(TERRA[1]))
    return img


def place(size, scale, background=True):
    small = icon32(background)
    big = small.resize((32 * scale, 32 * scale), Image.NEAREST)
    canvas = Image.new("RGBA", (size, size), rgba(BG) if background else (0, 0, 0, 0))
    off = (size - 32 * scale) // 2
    if background:  # unteren Streifen bis zum Rand fortsetzen
        band_top = off + 26 * scale
        canvas.paste(rgba(BG2), (0, band_top, size, size))
    canvas.alpha_composite(big, (off, off))
    return canvas


def favicon_svg(img):
    rects = []
    for y in range(32):
        x = 0
        while x < 32:
            c = img.getpixel((x, y))
            w = 1
            while x + w < 32 and img.getpixel((x + w, y)) == c:
                w += 1
            if c[3]:
                rects.append(f'<rect x="{x}" y="{y}" width="{w}" height="1" fill="#{c[0]:02x}{c[1]:02x}{c[2]:02x}"/>')
            x += w
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">'
            + "".join(rects) + "</svg>\n")


# --- Pixel-Schriftzug für die Startbilder (5×7) ----------------------------
GLYPHS = {
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
    "u": [".....", ".....", "#...#", "#...#", "#...#", "#..##", ".##.#"],
    "r": [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
    "z": [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],
    "e": [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
    "l": ["##.", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
    "w": [".....", ".....", "#...#", "#...#", "#.#.#", "#.#.#", ".#.#."],
    "k": ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
}


def text_image(text, color=INK):
    w = sum(len(GLYPHS[c][0]) + 1 for c in text) - 1
    img = Image.new("RGBA", (w, 7), (0, 0, 0, 0))
    x = 0
    for c in text:
        g = GLYPHS[c]
        for yy, row in enumerate(g):
            for xx, ch in enumerate(row):
                if ch == "#":
                    img.putpixel((x + xx, yy), rgba(color))
        x += len(g[0]) + 1
    return img


def splash(W, H):
    img = Image.new("RGBA", (W, H), rgba(BG))
    k = max(4, (W * 36 // 100) // 32)  # Icon ≈ 36 % der Breite, ganzzahlig
    art = icon32(background=False).resize((32 * k, 32 * k), Image.NEAREST)
    top = H * 40 // 100 - 16 * k
    img.alpha_composite(art, ((W - 32 * k) // 2, top))
    txt = text_image("Wurzelwerk")
    t = max(2, (W * 50 // 100) // txt.width)
    txt = txt.resize((txt.width * t, txt.height * t), Image.NEAREST)
    img.alpha_composite(txt, ((W - txt.width) // 2, top + 32 * k + 6 * t))
    return img.convert("RGB")


def main():
    os.makedirs(OUT, exist_ok=True)
    base = icon32()
    base.save(os.path.join(OUT, "icon-32.png"))
    with open(os.path.join(OUT, "favicon.svg"), "w") as f:
        f.write(favicon_svg(base))
    place(180, 5).save(os.path.join(OUT, "apple-touch-icon.png"))
    place(192, 5).save(os.path.join(OUT, "icon-192.png"))
    place(512, 14).save(os.path.join(OUT, "icon-512.png"))
    place(512, 12).save(os.path.join(OUT, "icon-maskable-512.png"))  # Inhalt in der Safe-Zone
    sd = os.path.join(OUT, "splash")
    os.makedirs(sd, exist_ok=True)
    for (w, h, *_rest) in SPLASH:
        splash(w, h).save(os.path.join(sd, f"splash-{w}x{h}.png"), optimize=True)
    print("Icons ->", os.path.relpath(OUT, ROOT))
    # <link>-Zeilen für index.html
    for (w, h, cw, ch, dpr) in SPLASH:
        print(f'  <link rel="apple-touch-startup-image" href="icons/splash/splash-{w}x{h}.png" '
              f'media="(device-width: {cw}px) and (device-height: {ch}px) and (-webkit-device-pixel-ratio: {dpr}) and (orientation: portrait)">')


if __name__ == "__main__":
    main()
