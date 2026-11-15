"""Sukkulente (Echeverie) – Pflanzenhandlung.

Handgezeichnete Pixel-Stempel statt berechneter Formen: jedes Blatt ist ein
kleines Zeichen-Raster mit festen Tönen und bekommt eine eigene Ebene (also
eine eigene Outline), damit die dicken, spitzen Blätter klar voneinander
getrennt bleiben. Leicht schräg von oben gesehen: außen große, dunklere
blaugrüne Blätter, innen kleinere, hellere, die sich um ein helles Herz
schließen. Spitzen zart rosa. Ab Stufe 4 sitzen kleine Ableger-Rosetten am
Topfrand. Kein Blütenstiel.

Stempel-Zeichen: a/b/c/f = Schatten/Basis/Licht/Glanz der Blattrampe,
l = Licht, h = Glanz, p/q = Rosa (Basis/Licht), . = leer.
Rampen: ph_echev_dk (Außenblätter), ph_echev_in (Innenblätter, heller,
weichere Outline), ph_echev_pup (Ableger: hell mit dunkler Outline),
ph_echev_pink (Spitzen) – siehe palette_pflanzenhandlung.py.
"""
REGION = "pflanzenhandlung"

from pixel import Sprite, SHADE, BASE, LIGHT, HIGHLIGHT
from parts import pot

T = {"a": SHADE, "b": BASE, "c": LIGHT, "l": LIGHT, "f": HIGHLIGHT, "h": HIGHLIGHT}
PK = {"p": BASE, "q": LIGHT}
OUT, MID = "ph_echev_dk", "ph_echev_in"


def mir(rows):
    w = max(len(r) for r in rows)
    return [r.ljust(w, ".")[::-1] for r in rows]


def stamp(sp, rows, x0, y0, ramp, dim=False):
    lay = sp.layer(ramp, shading=False)
    pk = sp.layer("ph_echev_pink", outline=False, shading=False)
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == ".":
                continue
            x, y = x0 + i, y0 + j
            if ch in T:
                t = T[ch]
                if dim and ch == "c" and j > 0:   # rechte Seite liegt etwas im Schatten
                    t = BASE
                lay.px(x, y, t)
            else:
                lay.px(x, y, BASE)
                pk.px(x, y, PK[ch])


# ---------- große Außenblätter ----------
L_W = ["...ccccc.",
       ".ccfcccbb",
       "pqbbbbbbb",
       "..bbbbbbb",
       "...aaaaa."]
L_NW = ["p.......",
        ".qcc....",
        ".cfccc..",
        "..cbbbb.",
        "..cbbbbb",
        "...bbbbb",
        "....aaa."]
L_S = ["cccccccb",
       "cfccbbbb",
       ".bbbbbba",
       "..abbqa.",
       "......p."]
# ---------- mittlere Außenblätter ----------
m_W = ["..cccc",
       ".cfccb",
       "pqbbbb",
       "..aaaa"]
m_NW = ["p.....",
        ".qcc..",
        ".cfcbb",
        "..cbbb",
        "...bbb"]
m_SW = ["..cccc",
        ".cfcbb",
        "qbbbba",
        "pa...."]
m_S = ["cccccb",
       "cfcbbb",
       ".bbqba",
       "....p."]
# ---------- kleine Außenblätter ----------
t_W = ["..ccc",
       "pqfcb",
       "..bbb"]
t_S = ["cccb",
       "bbqb",
       "..p."]
# ---------- Innenblätter (heller) ----------
M_N = ["..q..",
       ".lhl.",
       ".lhll",
       "lllll",
       ".bbb."]
M_NW = ["q......",
        ".lhl...",
        ".lhlll.",
        "..lllll",
        "...bbbb"]
M_S = ["llllll",
       "lhllll",
       ".lllb.",
       "..lb..",
       "..b..."]
s_N = [".q.",
       "lhl",
       "lll",
       ".b."]
s_NW = ["q....",
        ".hll.",
        ".llll",
        "..bbb"]
s_S = ["lllll",
       "lhllb",
       ".lb.."]
CORE = [".hh.",
        "hhhh",
        "hhhl",
        ".hl."]
CORE_S = [".h.",
          "hhh",
          ".l."]
# ---------- Ableger ----------
PUP_SIDE = ["..cc",
            "pqcb",
            "..bb"]
PUP_MID = [".q.",
           "lhl",
           "lbl"]
PUP = "ph_echev_pup"


def offset(x, y, flip=False):
    """Ableger-Rosette, ca. 9×5 inkl. Outline; (x, y) = linke obere Ecke."""
    l, r = (PUP_SIDE, x), (mir(PUP_SIDE), x + 4)
    return [(l[0], l[1], y + 1, PUP, False), (r[0], r[1], y + 1, PUP, True),
            (PUP_MID, x + 2, y, PUP, False)]


def stage1():
    return [(t_W, 10, 21, OUT, False), (mir(t_W), 17, 21, OUT, True),
            (s_N, 14, 19, MID, False), (CORE_S, 14, 21, MID, False)]


def stage2():
    return [(m_NW, 9, 17, OUT, False), (mir(m_NW), 17, 17, OUT, True),
            (t_W, 8, 20, OUT, False), (mir(t_W), 19, 21, OUT, True),
            (t_S, 14, 22, OUT, False),
            (s_N, 14, 16, MID, False),
            (s_S, 13, 20, MID, False), (CORE_S, 14, 18, MID, False)]


def stage3():
    return [(m_NW, 7, 14, OUT, False), (mir(m_NW), 19, 13, OUT, True),
            (m_W, 5, 18, OUT, False), (mir(m_W), 20, 18, OUT, True),
            (m_SW, 8, 21, OUT, False), (mir(m_SW), 18, 21, OUT, True),
            (m_S, 13, 22, OUT, False),
            (s_N, 14, 12, MID, False),
            (s_NW, 10, 14, MID, False), (mir(s_NW), 17, 14, MID, True),
            (s_S, 13, 19, MID, False), (CORE, 14, 15, MID, False)]


def stage4():
    return [(L_NW, 6, 12, OUT, False), (mir(L_NW), 18, 11, OUT, True),
            (L_W, 3, 17, OUT, False), (mir(L_W), 20, 17, OUT, True),
            (m_SW, 8, 21, OUT, False), (mir(m_SW), 18, 21, OUT, True),
            (m_S, 13, 22, OUT, False),
            (M_N, 13, 10, MID, False),
            (M_NW, 8, 13, MID, False), (mir(M_NW), 17, 13, MID, True),
            (s_S, 13, 19, MID, False), (CORE, 14, 15, MID, False)] + offset(20, 22)


def stage5():
    return [(L_NW, 5, 10, OUT, False), (mir(L_NW), 19, 9, OUT, True),
            (L_W, 2, 15, OUT, False), (mir(L_W), 21, 16, OUT, True),
            (m_SW, 8, 21, OUT, False), (mir(m_SW), 18, 20, OUT, True),
            (L_S, 12, 21, OUT, False),
            (M_N, 13, 8, MID, False),
            (M_NW, 7, 11, MID, False), (mir(M_NW), 17, 11, MID, True),
            (s_NW, 10, 16, MID, False), (mir(s_NW), 16, 15, MID, True),
            (M_S, 12, 17, MID, False), (CORE, 14, 13, MID, False)] + offset(6, 21) + offset(19, 22)


STAGES = {1: stage1, 2: stage2, 3: stage3, 4: stage4, 5: stage5}


def draw(stage: int) -> Sprite:
    sp = Sprite()
    pot(sp, "ph_pot_cream")
    for rows, x, y, ramp, dim in STAGES[stage]():
        stamp(sp, rows, x, y, ramp, dim)
    return sp
