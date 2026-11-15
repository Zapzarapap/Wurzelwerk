"""Duftwicke – Blumenwiese. Rankende Pflanze an einem kleinen Holzstab mit Querlatte:
Stängel winden sich am Stab hoch, gefiederte Blattpaare, feine eingerollte Ranken,
Schmetterlingsblüten (großes rundes Fahnenblatt, kleines Schiffchen) in Büscheln
an kurzen Stielen."""
REGION = "blumenwiese"

import math

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import heart_leaf, stalk, meadow_ground
from parts_blumenwiese import stamp

VARIANTS = {
    "rosa": {"petal_red": "petal_pink"},
    "lila": {"petal_red": "petal_purple"},
    "weiss": {"petal_red": "bw_white"},
    "rot": None,
}

BY = 29
PX = 15  # Stab (2 px breit: PX, PX+1)

# Schmetterlingsblüte schräg von der Seite: rundes Fahnenblatt oben, Schiffchen unten (k)
FLOWER = {
    "L": [".lhb.",
          "lhhbs",
          "lhbbs",
          ".kbs.",
          "..s.."],
    "M": [".hb.",
          "lhbs",
          "lhbs",
          ".ks."],
    "S": ["lhb",
          "lbs",
          ".k."],
}
KX = {"k": ("petal_red", HIGHLIGHT)}


def stake_x(stick, y, top):
    """x-Position eines Stabs (unten xb, oben xt) auf Höhe y."""
    xb, xt = stick
    t = (BY - y) / max(1, BY - top)
    return xb + (xt - xb) * t


def stakes(sp, sticks, top):
    """Rankhilfe: ein bis zwei schräge Holzstäbe (Wigwam), oben zusammengebunden."""
    for stick in sticks:
        s = sp.layer("wood")
        for y in range(top, BY + 1):
            x = math.floor(stake_x(stick, y, top) + 0.5)
            s.px(x, y)
            if y > top:
                s.px(x + 1, y)
        hl = sp.layer("wood", outline=False, shading=False)
        for y in range(top + 2, BY, 3):
            hl.px(math.floor(stake_x(stick, y, top) + 0.5), y, LIGHT)
    if len(sticks) > 1:  # Bindung oben
        b = sp.layer("cream", outline=False, shading=False)
        x = math.floor(stake_x(sticks[0], top + 2, top) + 0.5)
        b.px(x, top + 2, BASE)
        b.px(x + 1, top + 2, SHADE)


VINES = []


def vine(sp, stick, y1, amp=2.0, phase=0.0, period=7.0):
    """Windender Stängel um einen Stab (Sinus), bis Höhe y1."""
    VINES.append((stick, y1, amp, phase, period))


def vines(sp, top, front):
    """Hintere Windungen dunkel hinter dem Holz, vordere hell davor."""
    lay = sp.layer("stem", outline=False, shading=False)
    for (stick, y1, amp, phase, period) in VINES:
        for i in range(int((BY - y1) * 3) + 1):
            y = BY - i / 3
            th = (BY - y) / period * 2 * math.pi + phase
            if (math.cos(th) > 0) != front:
                continue
            x = stake_x(stick, y, top) + 0.5 + amp * math.sin(th)
            lay.px(math.floor(x + 0.5), math.floor(y + 0.5), BASE if front else SHADE)


def leaflets(sp, x, y, ang, s=1.0):
    """Blattpaar der Wicke: zwei ovale Fiederblättchen an kurzem Stiel, dazu eine Ranke."""
    a = math.radians(ang)
    ex, ey = x + math.cos(a) * 2 * s, y + math.sin(a) * 2 * s
    stalk(sp, x, y, ex, ey, tone=BASE)
    for d in (-35, 35):
        heart_leaf(sp.layer("leaf"), ex, ey, ang + d, 3.6 * s, 1.5 * s, notch=False, midrib=False)


def tendril(sp, x, y, side=1, n=1):
    """Feine, am Ende eingerollte Ranke."""
    t = sp.layer("stem", outline=False, shading=False)
    pts = [(0, 0), (1, -1), (2, -1), (3, -2), (3, -3), (2, -3)] if n else [(0, 0), (1, -1), (2, -2), (2, -3), (1, -3)]
    for (dx, dy) in pts:
        t.px(round(x) + dx * side, round(y) + dy, LIGHT)


def cluster(sp, x, y, side, sizes):
    """Blütenbüschel: Stiel nach außen/oben, Blüten daran versetzt."""
    ex, ey = x + side * 4, y - 3
    stalk(sp, x, y, ex, ey, bend=-side * 0.6, tone=BASE)
    for i, size in enumerate(sizes):
        fx = ex + side * (1.5 + i * 1.5)
        fy = ey - 1 + i * 4
        stamp(sp, fx, fy, FLOWER[size], "petal_red", KX, flip=side < 0)


def frame(sp, sticks, top):
    vines(sp, top, front=False)
    stakes(sp, sticks, top)
    vines(sp, top, front=True)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    VINES.clear()
    meadow_ground(sp, w=9 if stage >= 4 else (8 if stage == 3 else 7))
    if stage == 1:
        st = [(15, 15)]
        vine(sp, st[0], 23, amp=1.4)
        frame(sp, st, 18)
        leaflets(sp, 15, 26, -150, 0.8)
        leaflets(sp, 16, 24, -35, 0.8)
        tendril(sp, 16, 22, 1, 0)
        return sp
    if stage == 2:
        st = [(15, 15)]
        vine(sp, st[0], 17, amp=2.0)
        frame(sp, st, 12)
        leaflets(sp, 14, 27, -160, 0.9)
        leaflets(sp, 17, 24, -25, 0.95)
        leaflets(sp, 14, 20, -150, 0.85)
        tendril(sp, 17, 18, 1)
        return sp
    if stage == 3:
        st = [(11, 15), (20, 15)]
        vine(sp, st[0], 11, amp=1.8)
        vine(sp, st[1], 15, amp=1.8, phase=2.5)
        frame(sp, st, 7)
        leaflets(sp, 10, 27, -165, 1.0)
        leaflets(sp, 21, 26, -15, 1.0)
        leaflets(sp, 12, 21, -150, 0.9)
        leaflets(sp, 19, 19, -30, 0.85)
        leaflets(sp, 15, 28, -95, 0.85)
        tendril(sp, 12, 12, -1)
        tendril(sp, 19, 14, 1, 0)
        cluster(sp, 19, 18, 1, ["M"])
        return sp
    if stage == 4:
        st = [(9, 15), (22, 16)]
        vine(sp, st[0], 6, amp=2.0)
        vine(sp, st[1], 10, amp=2.0, phase=2.5)
        frame(sp, st, 3)
        leaflets(sp, 8, 27, -168, 1.05)
        leaflets(sp, 23, 26, -12, 1.05)
        leaflets(sp, 11, 20, -40, 0.95)
        leaflets(sp, 20, 21, -140, 0.95)
        leaflets(sp, 13, 13, -150, 0.85)
        tendril(sp, 12, 7, -1)
        tendril(sp, 19, 8, 1, 0)
        tendril(sp, 25, 18, 1)
        leaflets(sp, 14, 28, -70, 0.95)
        leaflets(sp, 18, 27, -115, 0.9)
        cluster(sp, 20, 13, 1, ["L", "M"])
        cluster(sp, 11, 17, -1, ["M", "S"])
        return sp
    st = [(8, 15), (23, 16)]
    vine(sp, st[0], 4, amp=2.2)
    vine(sp, st[1], 6, amp=2.2, phase=2.6)
    vine(sp, st[0], 16, amp=2.6, phase=4.0)
    frame(sp, st, 2)
    leaflets(sp, 7, 27, -170, 1.1)
    leaflets(sp, 24, 27, -10, 1.1)
    leaflets(sp, 10, 21, -30, 1.0)
    leaflets(sp, 21, 22, -150, 1.0)
    leaflets(sp, 12, 14, -150, 0.85)
    leaflets(sp, 20, 12, -30, 0.85)
    tendril(sp, 12, 5, -1)
    tendril(sp, 19, 4, 1, 0)
    tendril(sp, 26, 17, 1)
    tendril(sp, 5, 20, -1, 0)
    leaflets(sp, 13, 28, -65, 1.0)
    leaflets(sp, 18, 28, -118, 1.0)
    leaflets(sp, 15, 23, -95, 0.85)
    cluster(sp, 20, 9, 1, ["L", "M"])
    cluster(sp, 12, 10, -1, ["L", "M", "S"])
    cluster(sp, 23, 19, 1, ["M", "S"])
    cluster(sp, 9, 21, -1, ["M"])
    cluster(sp, 15, 17, 1, ["M"])
    return sp
