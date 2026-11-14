"""Sukkulente (Echeverie) – Pflanzenhandlung.

Rosette aus dicken, spitzen, blaugrünen Blättern mit rosa Spitzen, leicht von
oben gesehen: Jede Blattlage ist ein Kranz (Ellipse), hinten liegende Blätter
zeigen nach oben, vordere hängen über den Topfrand. Innere Lagen sind kleiner
und stehen steiler, die Mitte ist ein kleiner heller Kegel. Jedes Blatt hat
eine eigene Outline, damit die Lagen lesbar bleiben. Stufe 5 mit Blütenstiel.
"""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot
from parts_pflanzenhandlung import leaf, stem

CX, CY = 15.5, 21.5

# Blätter je Stufe in Zeichenreihenfolge (hinten -> vorn):
# (Winkel, Länge, halbe Breite, Lage 0=außen..1=Mitte, Ansatz-dy)
PLAN = {
    1: [(-135, 3.6, 1.6, 0.0, 0), (-45, 3.6, 1.6, 0.0, 0),
        (-90, 3.0, 1.5, 1.0, -0.5)],
    2: [(-125, 4.6, 2.0, 0.0, 0), (-55, 4.6, 2.0, 0.0, 0),
        (-170, 5.5, 2.1, 0.0, 0.5), (-10, 5.5, 2.1, 0.0, 0.5),
        (-90, 3.8, 1.7, 1.0, -0.5)],
    3: [(-122, 6.0, 2.3, 0.0, 0), (-58, 6.0, 2.3, 0.0, 0),
        (-166, 7.5, 2.5, 0.0, 0.3), (-14, 7.5, 2.5, 0.0, 0.3),
        (162, 6.5, 2.4, 0.2, 1.2), (18, 6.5, 2.4, 0.2, 1.2),
        (-90, 4.6, 2.0, 0.7, -0.5),
        (-90, 2.6, 1.3, 1.0, -1.2)],
    4: [(-132, 7.0, 2.6, 0.0, 0.3), (-50, 7.0, 2.6, 0.0, 0.3),
        (-165, 9.0, 2.8, 0.0, 0.3), (-15, 8.5, 2.8, 0.0, 0.3),
        (164, 7.5, 2.7, 0.2, 1.2), (17, 8.0, 2.7, 0.2, 1.2),
        (-90, 5.4, 2.3, 0.7, -0.5),
        (120, 5.0, 2.4, 0.4, 1.6), (62, 5.0, 2.4, 0.4, 1.6),
        (-90, 3.0, 1.5, 1.0, -1.5)],
    5: [(-132, 8.0, 2.8, 0.0, 0.3), (-50, 8.0, 2.8, 0.0, 0.3),
        (-164, 10.5, 3.0, 0.0, 0.3), (-15, 10.0, 3.0, 0.0, 0.3),
        (165, 9.0, 3.0, 0.2, 1.2), (16, 9.5, 3.0, 0.2, 1.2),
        (-118, 5.5, 2.5, 0.7, -0.3), (-64, 5.5, 2.5, 0.7, -0.3),
        (122, 6.0, 2.7, 0.4, 1.6), (64, 6.0, 2.7, 0.4, 1.6),
        (-90, 3.6, 1.7, 1.0, -1.5)],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp, "cream")
    if stage == 5:
        # Blütenstiel mit kleinen orangeroten Glöckchen, seitlich aus der Rosette
        stem(sp, 20, 18, 26, 6, bend=-2, ramp="ph_echev_pink")
        for (bx_, by_) in ((24, 9), (25.5, 6.5), (27, 4.5)):
            b = sp.layer("petal_orange")
            b.px(bx_, by_)
    for (ang, L, W, inner, dy) in PLAN[stage]:
        lit = HIGHLIGHT if inner >= 0.4 else LIGHT
        dark = LIGHT if inner >= 0.4 else BASE
        tip = lambda c: (BASE if c.t >= 0.8 else (LIGHT if c.t >= 0.68 and c.vn > 0.45 else None))
        leaf(sp, "ph_echev", CX, CY + dy, ang, L, W, "point",
             lit=lit, dark=dark, overlays=[("ph_echev_pink", tip)] if L >= 3 else [])
    return sp
