REGION = "pflanzenhandlung"

from pixel import Sprite
from parts import pot, heart_leaf, stalk, SOIL_Y

# (Stielfuß x, Blattansatz x, y, Winkel, Länge, halbe Breite, Schlitze)
STAGES = {
    1: [(15, 15, 20, -100, 6, 3.6, ())],
    2: [(15, 12, 19, -135, 7, 4.2, ()),
        (16, 19, 18, -50, 7, 4.2, ())],
    3: [(15, 10, 19, -155, 8, 5.0, (0.55,)),
        (16, 21, 18, -30, 8, 5.0, (0.55,)),
        (15, 15, 15, -95, 8, 5.0, (0.6,))],
    4: [(14, 8, 19, -168, 9, 5.4, (0.4, 0.72)),
        (17, 23, 18, -15, 9, 5.4, (0.4, 0.72)),
        (15, 12, 14, -125, 9, 5.4, (0.4, 0.72)),
        (16, 19, 13, -58, 9, 5.4, (0.4, 0.72))],
    5: [(14, 8, 19, -170, 9, 5.6, (0.3, 0.55, 0.8)),
        (17, 23, 18, -12, 9, 5.6, (0.3, 0.55, 0.8)),
        (14, 10, 13, -135, 10, 5.8, (0.3, 0.55, 0.8)),
        (17, 21, 12, -48, 10, 5.8, (0.3, 0.55, 0.8)),
        (15, 15, 10, -92, 9, 5.6, (0.3, 0.55, 0.8))],
}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp)
    leaves = STAGES[stage]
    for (sx, bx, by, ang, L, W, splits) in leaves:
        stalk(sp, sx, SOIL_Y, bx, by, bend=(bx - sx) * -0.3)
    for (sx, bx, by, ang, L, W, splits) in leaves:
        heart_leaf(sp.layer("leaf_deep"), bx, by, ang, L, W, splits)
    return sp
