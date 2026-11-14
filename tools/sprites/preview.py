"""Rendert Pflanzen in alle Stufen und baut Vorschaubilder.

Aufruf: python3 -I tools/sprites/preview.py monstera mohn fliegenpilz

Option --nofoot (oder Umgebungsvariable NOFOOT=1): rendert Gewächshaus-Pflanzen
zusätzlich ohne ihren eigenen Beet-Fuß (greenhouse_ground) und schreibt
stage<N>[_<variante>]_nofoot.png. Die App setzt diese Sprites direkt in die
gezeichneten Beete. Die normalen Sprites werden dabei nicht angefasst.
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


def build(name, nofoot=False):
    mod = importlib.import_module(name)
    if nofoot:
        if not hasattr(mod, "greenhouse_ground"):
            return None  # nur Pflanzen mit eigenem Beet-Fuß
        mod.greenhouse_ground = lambda sp: None
    variants = getattr(mod, "VARIANTS", {None: None})
    region = getattr(mod, "REGION", "misc")
    rows = []
    for vname, vmap in variants.items():
        row = []
        for stage in range(1, 6):
            img, glow = mod.draw(stage).render(vmap)
            d = os.path.join(OUT, region, name)
            os.makedirs(d, exist_ok=True)
            suffix = (f"_{vname}" if vname else "") + ("_nofoot" if nofoot else "")
            img.save(os.path.join(d, f"stage{stage}{suffix}.png"))
            if glow.getbbox():
                glow.save(os.path.join(d, f"stage{stage}{suffix}_glow.png"))
            row.append(img)
        rows.append(row)
    os.makedirs(PREV, exist_ok=True)
    save_sheet(rows, os.path.join(PREV, f"{name}{'_nofoot' if nofoot else ''}.png"))
    return rows


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--nofoot"]
    nofoot = "--nofoot" in sys.argv[1:] or os.environ.get("NOFOOT") == "1"
    for n in args:
        if build(n, nofoot) is None:
            print("übersprungen (kein Beet-Fuß)", n)
        else:
            print("ok", n, "(ohne Fuß)" if nofoot else "")
