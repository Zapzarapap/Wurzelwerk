"""Tannensetzling – Wald. Junge Weißtanne: Stufe 1 Keimling mit sternförmigem Nadelkranz,
dann ein schlankes, kegelförmiges Bäumchen aus übereinanderliegenden Astetagen (obere
Etagen überdecken die unteren), Stufe 5 mit zwei aufrechten jungen Zapfen."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE, rng
from parts import forest_ground

N = "wa_tanne"


def trunk(sp, x, y0, y1, w=2):
    t = sp.layer("wood")
    t.rect(x, y0, x + w - 1, y1)
    return t


def tier(sp, cx, top, bot, hw, seed, droop=1.0, shade_top=0):
    """Eine Astetage: breites, nach unten hängendes Dreieck mit gezackter Unterkante
    (Nadelspitzen, außen tiefer hängend). cx Mitte, top Spitze, bot Unterkante,
    hw halbe Breite unten. shade_top: so viele Zeilen oben liegen im Schatten der
    darüberliegenden Etage."""
    r = rng(seed)
    lay = sp.layer(N)
    H = max(bot - top, 1)
    teeth = {}
    for x in range(math.floor(cx - hw) - 2, math.ceil(cx + hw) + 3):
        d = min(1.0, abs(x + 0.5 - cx) / max(hw, 1))
        z = 0 if (x * 7 + seed) % 3 else -1        # Zacken
        teeth[x] = bot + droop * d ** 2 * 1.6 + z
    for y in range(top, math.ceil(bot + droop * 1.6) + 1):
        t = (y - top + 0.6) / H
        half = hw * min(1.0, t) ** 0.8 + 0.3
        for x in range(math.floor(cx - half), math.ceil(cx + half) + 1):
            if abs(x + 0.5 - cx) <= half and y <= teeth.get(x, bot):
                lay.px(x, y)
    if hw >= 4:
        ly = round(bot + droop * 1.2)
        for sx in (-1, 1):
            ex = math.floor(cx + sx * (hw + 0.6))
            if (ex - sx, ly - 1) in lay.pixels or (ex - sx, ly) in lay.pixels:
                lay.px(ex, ly - 1)
                if hw >= 8:
                    lay.px(ex + sx, ly)
    for (x, y) in list(lay.pixels):
        rel = (x + 0.5 - cx) / max(hw, 1)
        depth = teeth.get(x, bot) - y          # Abstand zur Unterkante
        if y < top + shade_top and depth > 1:
            tone = SHADE                        # verschattet von der Etage darüber
        elif depth < 1:
            tone = HIGHLIGHT if rel < -0.15 else (LIGHT if rel < 0.45 else BASE)
        elif depth < 2:
            tone = LIGHT if rel < 0.3 else BASE
        else:
            tone = LIGHT if rel < -0.45 else (BASE if rel < 0.5 else SHADE)
            # vereinzelte Nadelbüschel-Striche
            if (x * 3 + y * 5 + seed) % 7 == 0 and rel > -0.45:
                tone = SHADE
        lay.px(x, y, tone)
    return lay


def needle_star(sp, x, y, L=3):
    """Keimling: Kranz aus feinen Keimnadeln, sternförmig ausgebreitet (1 px, ohne Outline)."""
    lay = sp.layer(N, outline=False, shading=False)
    for ang, ln in ((-178, L), (-148, L), (-118, L - 1), (-62, L - 1), (-32, L), (-4, L), (160, 2), (24, 2)):
        a = math.radians(ang)
        for i in range(1, ln + 1):
            p = (round(x + math.cos(a) * i), round(y + math.sin(a) * i * 0.75))
            lay.px(*p, LIGHT if math.cos(a) < 0 else BASE)
    lay.px(x, y, SHADE)
    return lay


def cone(sp, x, y, h=4):
    """Aufrechter junger Tannenzapfen (Weißtanne: stehend), x,y = Fuß, 2 px breit."""
    c = sp.layer("wa_zapfen", shading=False)
    for i in range(h):
        c.px(x, y - i, LIGHT if i else BASE)
        c.px(x + 1, y - i, BASE if i else SHADE)
    c.px(x, y - h + 1, HIGHLIGHT)
    c.erase(x + 1, y - h + 1)
    for i in range(1, h - 1, 2):
        c.px(x + 1, y - i, SHADE)   # Schuppenkerben


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(10 if stage >= 4 else 8))
    if stage == 1:
        st = sp.layer("stem", outline=False, shading=False)
        st.line(15, 27, 15, 24, tone=SHADE)
        needle_star(sp, 15, 23, L=3)
        b = sp.layer(N)
        b.px(15, 22, LIGHT)
    elif stage == 2:
        trunk(sp, 15, 25, 28)
        tier(sp, 15.8, 20, 25, 4.6, 3, shade_top=0)
        tier(sp, 16.2, 15, 21, 2.8, 5, droop=0.5)
    elif stage == 3:
        trunk(sp, 15, 24, 28)
        tier(sp, 15.6, 18, 24, 6.6, 2, shade_top=3)
        tier(sp, 16.4, 13, 19, 4.6, 7, shade_top=2)
        tier(sp, 16.0, 8, 14, 2.6, 4, droop=0.5)
    elif stage == 4:
        trunk(sp, 15, 23, 28)
        tier(sp, 15.6, 16, 24, 9.0, 1, shade_top=4)
        tier(sp, 16.4, 12, 19, 7.0, 6, shade_top=3)
        tier(sp, 15.8, 8, 14, 4.8, 9, shade_top=2)
        tier(sp, 16.2, 3, 9, 2.6, 2, droop=0.5)
    else:
        trunk(sp, 15, 23, 28, w=3)
        tier(sp, 16.2, 17, 24, 12.0, 4, droop=1.4, shade_top=4)
        tier(sp, 15.6, 13, 20, 9.4, 8, shade_top=3)
        tier(sp, 16.4, 9, 15, 7.0, 3, shade_top=3)
        tier(sp, 15.8, 5, 10, 4.6, 5, shade_top=2)
        tier(sp, 16.2, 1, 5, 2.4, 1, droop=0.4)
        cone(sp, 11, 12, 4)
        cone(sp, 19, 8, 3)
    return sp
