"""Buschwindröschen – Wald. Lockerer Frühlingsteppich: dünne Stängel, auf halber Höhe ein
Quirl aus drei handförmig tief geteilten Blättern (schmale, gezackte Zipfel), darüber
je eine einzelne Blüte mit 6 weißen, außen zart rosa angehauchten Blütenblättern und
gelber Mitte. Junge Triebe kommen hakenförmig gebogen mit nickender Knospe aus dem Boden."""
REGION = "wald"

import math
from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT, OUTLINE
from parts import forest_ground, leaf_frame
from parts_wald import bezier

PET = "wa_anemone"
LEAF = "leaf"

VARIANTS = {
    "weiss": None,
    "rosa": {"wa_anemone": "petal_pink"},
}


def thin(sp, pts, tone=SHADE, ramp="stem"):
    s = sp.layer(ramp, outline=False, shading=False)
    prev = None
    for (x, y) in bezier(pts, 60):
        p = (round(x), round(y))
        if p != prev:
            s.px(*p, tone)
            prev = p
    return s


def leaf_whorl(sp, x, y, L=4.0, rot=0.0, squash=0.5):
    """Drei handförmig geteilte Blätter (je 3 schmale Zipfel), waagerecht ausgebreitet,
    von schräg oben gesehen. Jedes Blatt eine Ebene, damit die Outlines sie trennen."""
    for k, (off, lf) in enumerate(((-150, 0.95), (-30, 1.0), (85, 0.8))):
        a0 = math.radians(rot + off)
        lay = sp.layer(LEAF)
        dirx, diry = math.cos(a0), math.sin(a0) * squash
        nrm = math.hypot(dirx, diry) or 1
        base_ang = math.degrees(math.atan2(diry, dirx))
        Lk = L * 1.15 * lf * (0.6 + 0.4 * nrm)
        for (z, zl, zw) in ((-42, 0.78, 0.62), (0, 1.0, 0.72), (42, 0.78, 0.62)):
            a = math.radians(base_ang + z * (0.6 + 0.4 * nrm))
            ln = Lk * zl
            r = int(ln + 3)
            for yy in range(int(y - r), int(y + r) + 1):
                for xx in range(int(x - r), int(x + r) + 1):
                    u, v = leaf_frame(x + 0.5, y + 0.5, a, xx + 0.5, yy + 0.5)
                    if u < 0.2 or u > ln:
                        continue
                    w = zw * math.sin(math.pi * min(1.0, (u / ln) ** 0.8)) ** 0.8 + 0.1
                    # gezähnte Spitzenhälfte
                    if u > ln * 0.55 and int(u * 1.6) % 2 == 1:
                        w += 0.35   # Zähnchen seitlich
                    if abs(v) <= w:
                        lit = (xx + 0.5 - x) < 0 or (yy + 0.5 - y) < -0.5
                        lay.px(xx, yy, ("a", LIGHT if lit else BASE))
        # dunkle Mittelader
        for i in range(1, int(Lk * 0.7)):
            p = (math.floor(x + 0.5 + math.cos(math.radians(base_ang)) * i),
                 math.floor(y + 0.5 + math.sin(math.radians(base_ang)) * i))
            if p in lay.pixels:
                lay.px(*p, SHADE)


def flower(sp, x, y, r=2.6, tilt=0.8, rot=0.0):
    """Offene Blüte, leicht schräg von vorn: 6 Blütenblätter als Ellipsen, je eigene Ebene
    nicht nötig – eine Ebene, Trennlinien zwischen den Blütenblättern als Schattenpixel,
    Außenseite unten rosa angehaucht; gelbe Mitte mit Staubgefäßen."""
    f = sp.layer(PET, shading=False)
    cx, cy = x + 0.5, y + 0.5
    petals = []
    for k in range(6):
        a = math.radians(rot + k * 60 + 30)
        petals.append((cx + math.cos(a) * r * 0.55, cy + math.sin(a) * r * 0.55 * tilt, a))
    R = int(r + 2)
    for yy in range(int(y - R), int(y + R) + 1):
        for xx in range(int(x - R), int(x + R) + 1):
            px_, py_ = xx + 0.5, yy + 0.5
            best = None
            for (pcx, pcy, a) in petals:
                du, dv = px_ - pcx, (py_ - pcy) / tilt
                u = du * math.cos(a) + dv * math.sin(a)
                v = -du * math.sin(a) + dv * math.cos(a)
                q = (u / (r * 0.6)) ** 2 + (v / (r * 0.42)) ** 2
                if q <= 1.0 and (best is None or q < best[0]):
                    best = (q, a, u)
            if best is None:
                continue
            q, a, u = best
            sx, sy = math.cos(a), math.sin(a)
            if q > 0.55 and u < 0 and False:
                continue
            if sy > 0.4:
                tone = BASE if q < 0.6 else SHADE       # untere Blütenblätter: rosa Schimmer
            elif sx < 0 and sy < 0.2:
                tone = HIGHLIGHT
            else:
                tone = LIGHT
            f.px(xx, yy, tone)
    # Trennlinien zwischen Blütenblättern (am Rand)
    for k in range(6):
        a = math.radians(rot + k * 60)
        p = (math.floor(cx + math.cos(a) * r * 0.95), math.floor(cy + math.sin(a) * r * 0.95 * tilt))
        if p in f.pixels and r >= 2.4:
            f.px(*p, SHADE if math.sin(a) > -0.3 else BASE)
    c = sp.layer("petal_yellow", outline=False, shading=False)
    c.px(x, y, LIGHT)
    if r >= 2.4:
        c.px(x + 1, y, BASE)
        c.px(x, y + 1, BASE)
        c.px(x + 1, y + 1, SHADE)
        c.px(x, y, HIGHLIGHT)


def side_flower(sp, x, y):
    """Halb offene Blüte von der Seite: Schale aus Blütenblättern, außen rosa."""
    f = sp.layer(PET, shading=False)
    for dx, t in ((-2, LIGHT), (-1, HIGHLIGHT), (0, LIGHT), (1, LIGHT), (2, BASE)):
        f.px(x + dx, y, t)
    for dx, t in ((-1, BASE), (0, BASE), (1, SHADE)):
        f.px(x + dx, y + 1, t)
    c = sp.layer("petal_yellow", outline=False, shading=False)
    c.px(x - 1, y, LIGHT)
    c.px(x, y, BASE)


def bud(sp, x, y):
    """Nickende Knospe: außen rosa."""
    b = sp.layer(PET, shading=False)
    b.px(x, y, LIGHT)
    b.px(x + 1, y, BASE)
    b.px(x, y + 1, BASE)
    b.px(x + 1, y + 1, SHADE)


def plant(sp, x0, fx, fy, whorl_t=0.55, L=4.0, rot=0.0, bend=0.0, kind="open", r=2.6, tilt=0.8):
    """Stängel von (x0, 28) zur Blüte (fx, fy); Blattquirl bei whorl_t."""
    ctrl = [(x0, 28), ((x0 + fx) / 2 + bend, (28 + fy) / 2), (fx, fy + 1)]
    thin(sp, ctrl)
    path = bezier(ctrl, 60)
    wx, wy = path[int((1 - whorl_t) * 0 + whorl_t * 60)]
    leaf_whorl(sp, round(wx), round(wy), L=L, rot=rot)
    if kind == "open":
        flower(sp, fx, fy - 1, r=r, tilt=tilt)
    elif kind == "side":
        side_flower(sp, fx, fy)
    elif kind == "bud":
        bud(sp, fx, fy)


def hook(sp, x, y, h):
    """Junger Trieb: Stängel hakenförmig gebogen, die noch gefalteten Blätter hängen
    als Tütchen an der Biegung, darunter die nickende Knospe."""
    top = y - h
    thin(sp, [(x, 28), (x - 1, top - 1), (x + 3, top)], tone=SHADE)
    l = sp.layer(LEAF)
    for (dx, dy, t) in ((1, 0, LIGHT), (2, 0, LIGHT), (3, 1, BASE), (2, 1, BASE), (1, 1, BASE)):
        l.px(x + dx, top + dy, ("a", t))
    bud(sp, x + 3, top + 2)


def draw(stage: int) -> Sprite:
    sp = Sprite()
    forest_ground(sp, w=(12 if stage >= 4 else 9 if stage == 3 else 8))
    if stage == 1:
        hook(sp, 14, 28, 6)
    elif stage == 2:
        hook(sp, 18, 28, 4)
        plant(sp, 14, 13, 18, whorl_t=0.6, L=3.6, rot=10, kind="bud")
    elif stage == 3:
        plant(sp, 20, 22, 17, whorl_t=0.55, L=3.8, rot=20, bend=1, kind="bud")
        plant(sp, 14, 12, 12, whorl_t=0.6, L=4.4, rot=0, bend=-1, kind="open", r=2.6)
        hook(sp, 9, 28, 3)
    elif stage == 4:
        plant(sp, 7, 5, 16, whorl_t=0.6, L=3.8, rot=30, bend=-1, kind="side")
        plant(sp, 22, 24, 13, whorl_t=0.55, L=4.2, rot=10, bend=1, kind="open", r=2.7)
        plant(sp, 14, 13, 8, whorl_t=0.62, L=4.6, rot=-10, bend=-1, kind="open", r=3.0)
        plant(sp, 18, 18, 19, whorl_t=0.6, L=3.4, rot=40, kind="bud")
    else:
        plant(sp, 26, 28, 15, whorl_t=0.6, L=3.8, rot=30, bend=1, kind="side")
        plant(sp, 6, 4, 14, whorl_t=0.58, L=4.0, rot=0, bend=-1, kind="open", r=2.6)
        plant(sp, 20, 21, 9, whorl_t=0.62, L=4.6, rot=20, bend=1, kind="open", r=3.0)
        plant(sp, 12, 11, 5, whorl_t=0.66, L=4.8, rot=-10, bend=-1, kind="open", r=3.2)
        plant(sp, 16, 16, 18, whorl_t=0.6, L=3.6, rot=50, kind="open", r=2.6, tilt=0.7)
        plant(sp, 9, 9, 21, whorl_t=0.55, L=3.0, rot=20, kind="bud")
    return sp
