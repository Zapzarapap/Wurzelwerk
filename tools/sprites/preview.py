"""Rendert Pflanzen in alle Stufen und baut Vorschaubilder.

Aufruf: python3 -I tools/sprites/preview.py monstera mohn fliegenpilz
"""
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "plants"))

from pixel import save_sheet  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "art", "sprites")
PREV = os.path.join(ROOT, "art", "preview")


def build(name):
    mod = importlib.import_module(name)
    variants = getattr(mod, "VARIANTS", {None: None})
    region = getattr(mod, "REGION", "misc")
    rows = []
    for vname, vmap in variants.items():
        row = []
        for stage in range(1, 6):
            img, glow = mod.draw(stage).render(vmap)
            d = os.path.join(OUT, region, name)
            os.makedirs(d, exist_ok=True)
            suffix = f"_{vname}" if vname else ""
            img.save(os.path.join(d, f"stage{stage}{suffix}.png"))
            if glow.getbbox():
                glow.save(os.path.join(d, f"stage{stage}{suffix}_glow.png"))
            row.append(img)
        rows.append(row)
    os.makedirs(PREV, exist_ok=True)
    save_sheet(rows, os.path.join(PREV, f"{name}.png"))
    return rows


if __name__ == "__main__":
    for n in sys.argv[1:]:
        build(n)
        print("ok", n)
