"""Farn – Wald. Wedel rollen sich in frühen Stufen spiralförmig auf."""
REGION = "wald"

from pixel import Sprite
from parts import forest_ground
from parts_wald import frond, crozier


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp)
    if stage == 1:
        crozier(sp, "wa_fern", 15.5, 28, 16, 22, 2.2, direction=1, bend=-1)
    elif stage == 2:
        crozier(sp, "wa_fern", 14, 28, 12, 20, 2.3, direction=-1, bend=1)
        crozier(sp, "wa_fern", 17, 28, 19, 22, 2.0, direction=1, bend=-1)
    elif stage == 3:
        crozier(sp, "wa_fern", 13, 28, 9, 17, 2.4, direction=-1, bend=-2)
        frond(sp, "wa_fern", [(16, 28), (18, 22), (22, 18), (25, 19)], 2.0, curl_r=2.6, direction=1)
        crozier(sp, "wa_fern", 15, 28, 15, 15, 2.2, direction=1, bend=1)
    elif stage == 4:
        frond(sp, "wa_fern", [(14, 28), (9, 21), (5, 14), (9, 9)], 1.9, curl_r=2.6, direction=1)
        frond(sp, "wa_fern", [(16, 28), (21, 22), (26, 17), (28, 19)], 2.2, curl_r=2.4, direction=1)
        frond(sp, "wa_fern", [(15, 28), (13, 20), (14, 13), (18, 9)], 2.1, curl_r=2.6, direction=1)
        crozier(sp, "wa_fern", 17, 28, 20, 22, 1.8, direction=1, bend=1)
    else:
        frond(sp, "wa_fern", [(15, 28), (11, 16), (10, 8), (16, 4)], 2.3, curl_r=2.6, direction=1)
        frond(sp, "wa_fern", [(16, 28), (22, 18), (24, 9), (28, 10)], 2.0, curl_r=2.4, direction=1)
        frond(sp, "wa_fern", [(14, 28), (7, 22), (2, 16), (1, 24)], 2.2)
        frond(sp, "wa_fern", [(17, 28), (23, 25), (29, 21), (30, 28)], 2.0)
        frond(sp, "wa_fern", [(15, 28), (12, 22), (8, 21), (7, 27)], 1.8)
        frond(sp, "wa_fern", [(16, 28), (19, 21), (19, 16), (23, 17)], 2.2, curl_r=2.2, direction=1)
        crozier(sp, "wa_fern", 15.5, 28, 14, 19, 2.2, direction=-1, bend=-1)
    return sp
