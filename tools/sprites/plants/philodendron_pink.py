"""Philodendron „Pink Princess“ – Pflanzenhandlung.

Länglich-herzförmige, fast schwarzgrüne Blätter mit kräftiger rosa
Panaschierung: einzelne Blätter halb rosa (eine Blatthälfte), andere mit
rosa Flecken/Sprenkeln, manche ganz dunkel. Rötlich-rosa Blattstiele; die
Blätter hängen mit der Spitze leicht nach außen/unten. Ab Stufe 4 klettert die
Pflanze an einem Moosstab.
"""
REGION = "pflanzenhandlung"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot, SOIL_Y
from parts_pflanzenhandlung import leaf, stem

POLE_X = 15  # Moosstab (2 px)

# Blätter: (Stielfuß x, y, Ansatz x, y, Winkel, Länge, halbe Breite, Biegung, Stielbiegung, Muster)
# Muster: "half" = eine Hälfte rosa, "half2" = andere Hälfte, "splash" = Flecken, "dot" = Sprenkel, "" = dunkel
STAGES = {
    1: dict(pole=None, leaves=[
        (15.5, SOIL_Y, 15, 19.5, -110, 5.0, 2.2, 0, 0.5, "half"),
    ]),
    2: dict(pole=None, leaves=[
        (15, SOIL_Y, 12.5, 18, -140, 6.5, 2.7, -8, 0.5, "splash"),
        (16.5, SOIL_Y, 19, 18.5, -45, 6.0, 2.5, 10, -0.5, "half2"),
    ]),
    3: dict(pole=None, leaves=[
        (15, SOIL_Y, 14, 13.5, -112, 8.0, 3.2, -10, 1, "dot"),
        (14.5, SOIL_Y, 10.5, 18, -160, 7.5, 3.0, -22, 1, "half"),
        (17, SOIL_Y, 20.5, 17, -30, 7.5, 3.0, 22, -1, "splash"),
    ]),
    4: dict(pole=9, leaves=[
        (15, 12, 11, 9.5, -122, 8.5, 3.4, -14, 0, "half"),
        (16, 15, 21, 12, -50, 9.0, 3.5, 18, 0, "splash"),
        (15, 18, 9.5, 17.5, -165, 8.0, 3.2, -22, 0, ""),
        (16, 20, 21.5, 20.5, 2, 7.0, 2.9, 22, 0, "half2"),
        (16, 10, 17.5, 6.5, -72, 6.0, 2.5, 6, 0, "dot"),
    ]),
    5: dict(pole=5, leaves=[
        (15, 8, 11.5, 5.5, -125, 9.0, 3.6, -16, 0, "half"),
        (16, 10, 21, 8, -45, 9.5, 3.7, 20, 0, "splash"),
        (15, 14, 9.5, 12.5, -170, 9.5, 3.6, -24, 0, "dot"),
        (16, 17, 21.5, 16.5, -6, 9.0, 3.5, 26, 0, ""),
        (15, 21, 10, 21, 165, 7.5, 3.0, -16, 0, "half2"),
        (16, 22, 20.5, 22.5, 30, 6.0, 2.5, 14, 0, "splash"),
        (16, 6, 17.5, 3.5, -68, 5.5, 2.3, 4, 0, "dot"),
    ]),
}


def blade(sp, bx, by, ang, L, W, bend, pat, seed):
    lit_sign = -1 if math.cos(math.radians(ang)) >= 0 else 1

    def pink(c):
        if c.t < 0.0 or L < 4:
            return None
        if pat in ("half", "half2"):
            side = lit_sign if pat == "half" else -lit_sign
            if c.v * side > -0.1:
                return LIGHT if side == lit_sign else BASE
            # unregelmäßige Grenze: einzelne Sprenkel über die Mittellinie
            if c.v * side > -1.2 and math.sin(c.u * 2.7 + seed) > 0.6 and not c.edge:
                return BASE
            return None
        if pat == "splash":
            z = math.sin(c.u * 1.3 + seed) + math.sin(c.v * 1.8 - seed * 0.7)
            if z > 0.7:
                return LIGHT if c.v * lit_sign > 0 else BASE
            return None
        if pat == "dot":
            z = math.sin(c.u * 2.9 + c.v * 1.7 + seed * 1.3) * math.sin(c.v * 2.3 - c.u * 0.9 + seed)
            if z > 0.42 and not c.edge:
                return BASE
            return None
        return None

    leaf(sp, "ph_pink_leaf", bx, by, ang, L, W * 1.08, "heart", bend=bend * 0.5, midrib=SHADE if L >= 7 else None,
         overlays=[("ph_pink_var", pink)])


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp, "ph_pot_cream")
    plan = STAGES[stage]
    if plan["pole"] is not None:
        pole = sp.layer("ph_moss_pole")
        pole.rect(POLE_X, plan["pole"], POLE_X + 1, SOIL_Y)
        fuzz = sp.layer("ph_moss_pole", outline=False, shading=False)
        for y in range(plan["pole"] + 1, SOIL_Y, 3):
            fuzz.px(POLE_X + (y // 3) % 2, y, LIGHT)
        # Kletterstamm am Stab
        st = sp.layer("ph_pink_stem", outline=False, shading=False)
        top = min(sy for (_, sy, *_r) in plan["leaves"])
        for y in range(top, SOIL_Y + 1):
            st.px(POLE_X + (1 if (y // 4) % 2 else 0), y, BASE)
    for i, (sx, sy, bx, by, ang, L, W, bend, sb, pat) in enumerate(plan["leaves"]):
        stem(sp, sx, sy, bx, by, bend=sb, ramp="ph_pink_stem")
        blade(sp, bx, by, ang, L, W, bend, pat, i * 1.7 + stage)
    return sp
