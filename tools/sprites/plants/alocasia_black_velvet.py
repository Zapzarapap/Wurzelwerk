"""Alocasia Black Velvet – Pflanzenhandlung.

Fast schwarzgrüne, samtige, breit-herzförmige Blätter mit kräftigen weißen
Adern (Mittelrippe + Fischgrät-Seitenadern) und kräftige
hellgrüne Stiele. Der rötliche Neuaustrieb erscheint als junges, noch
eingerolltes Blatt seitlich zwischen den Stielen (nur in manchen Stufen).
"""
REGION = "pflanzenhandlung"

from pixel import Sprite, LIGHT, HIGHLIGHT, BASE, SHADE
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem, veins, herringbone, uv_to_xy

# (Stielfuß x, Ansatz x, Ansatz y, Winkel, Länge, halbe Breite, Biegung, Stielbiegung)
STAGES = {
    1: [(15.5, 15, 19, -100, 6, 3.2, 4, 0.5)],
    2: [(14.5, 11.5, 17.5, -130, 7.5, 3.9, -8, 1),
        (16.5, 20, 19, -45, 6, 3.1, 10, -1)],
    3: [(15, 14, 13.5, -104, 9, 4.6, 6, 1),
        (16.5, 21.5, 17.5, -32, 8, 4.1, 14, -1),
        (14.5, 9.5, 20, -162, 6.5, 3.4, -14, 1)],
    4: [(14.5, 12.5, 11.5, -102, 10, 5.0, 8, 1),
        (16.5, 22, 14.5, -42, 8.5, 4.4, 12, -1),
        (14, 8, 18.5, -165, 8, 4.1, -20, 1)],
    5: [(14.5, 12.5, 10, -100, 11, 5.4, 8, 1),
        (16.5, 22.5, 13, -48, 9.5, 4.8, 10, -1.5),
        (14, 8.5, 17, -162, 9, 4.5, -22, 1.5),
        (17, 24, 20.5, -10, 7, 3.6, 28, -1),
        (15.5, 14.5, 20.5, -120, 5.5, 2.9, -10, 0)],
}

# Junger, eingerollter Austrieb (rötlich): (Fuß x, Spitze x, Spitze y, Biegung) oder None
NEW = {1: None, 2: None, 3: (17, 18.5, 16.5, 0.3), 4: (17.5, 19.5, 15.5, 0.5), 5: (18, 19.5, 15.5, -0.3)}


def shoot(sp, x0, x1, y1, bend):
    """Eingerolltes junges Blatt: schmale, spitze Tüte (unten 2 px, oben 1 px) auf eigenem Stielchen."""
    mx, my = x0 + (x1 - x0) * 0.5, y1 + 4.5
    stem(sp, x0, SOIL_Y, mx, my, bend=bend)
    s = sp.layer("ph_velvet_new")
    s.line(mx, my, x1, y1)
    s.line(mx + 1, my, x1 + 1, y1 + 2)
    hl = sp.layer("ph_velvet_new", outline=False, shading=False)
    hl.px(x1, y1, HIGHLIGHT)
    hl.px(x1, y1 + 1, LIGHT)
    return s


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    new = NEW[stage]
    if new:
        shoot(sp, *new)
    for (sx, bx, by, ang, L, W, bend, sb) in STAGES[stage]:
        stem(sp, sx, SOIL_Y, bx, by, bend=sb, thick=2 if L >= 7 else 1)
        lay, cells = leaf(sp, "ph_velvet", bx, by, ang, L, W, "heart", bend=bend, lit=LIGHT, dark=BASE)
        n = 0 if L < 6 else (1 if L < 8.5 else 2)
        veins(sp, "ph_vein_white", cells, herringbone(L, W, n=n, t0=0.2, t1=0.5, slope=1.0, reach=0.7),
              tone=BASE if L >= 7 else LIGHT, geom=uv_to_xy(bx, by, ang, L, bend))
    return sp

