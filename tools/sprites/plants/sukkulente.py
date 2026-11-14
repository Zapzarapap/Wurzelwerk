"""Sukkulente (Echeverie) – Pflanzenhandlung. Rosette aus dicken, spitzen Blättern, blaugrün mit rosa Spitzen.

Seitenansicht wie eine geöffnete Rose: äußere Blätter fächern flach nach außen,
innere stehen steiler und kürzer und überdecken die äußeren.
"""
REGION = "pflanzenhandlung"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot
from parts_pflanzenhandlung import leaf, stem

CX, CY = 15.5, 23.5

# Kränze von außen (hinten) nach innen (vorn): (Winkel, Länge, halbe Breite, x-Versatz)
WHORLS = {
    "back":   dict(lit=LIGHT, dark=BASE, items=[(-172, 10.5, 2.7, -1), (-8, 10.5, 2.7, 1), (-150, 12, 3.0, 0), (-30, 12, 3.0, 0)]),
    "mid":    dict(lit=HIGHLIGHT, dark=LIGHT, items=[(-126, 11.5, 3.2, -1), (-54, 11, 3.2, 1), (-98, 12, 3.2, 0)]),
    "inner":  dict(lit=HIGHLIGHT, dark=LIGHT, items=[(-142, 8.5, 2.9, 0), (-38, 8.5, 2.9, 0), (-80, 9, 3.0, 0)]),
    "inner2": dict(lit=HIGHLIGHT, dark=HIGHLIGHT, items=[(-114, 7, 2.8, 0), (-64, 7, 2.8, 0)]),
    "center": dict(lit=HIGHLIGHT, dark=LIGHT, items=[(-90, 5, 2.2, 0)]),
}
STAGE_PLAN = {
    1: (0.42, ["mid", "center"]),
    2: (0.58, ["mid", "inner", "center"]),
    3: (0.74, ["back", "mid", "inner", "center"]),
    4: (0.88, ["back", "mid", "inner", "inner2", "center"]),
    5: (1.05, ["back", "mid", "inner", "inner2", "center"]),
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp, "cream")
    if stage == 5:
        # Blütenstiel mit kleinen Glöckchen, hinter der Rosette
        stem(sp, 17, 17, 25, 6, bend=-3, ramp="ph_echev_pink")
        bells = sp.layer("petal_orange", outline=False, shading=False)
        for (bx_, by_) in ((23, 9), (24, 7), (26, 6)):
            bells.px(bx_, by_, BASE)
            bells.px(bx_, by_ + 1, SHADE)
    sc, names = STAGE_PLAN[stage]
    for name in names:
        wh = WHORLS[name]
        for (ang, L, W, dx) in wh["items"]:
            L2, W2 = max(3.0, L * sc), max(1.5, W * sc)
            tipfn = lambda c: BASE if c.t >= 0.8 else None
            leaf(sp, "ph_echev", CX + dx * sc, CY, ang, L2, W2, "spoon",
                 lit=wh["lit"], dark=wh["dark"], overlays=[("ph_echev_pink", tipfn)])
    return sp
