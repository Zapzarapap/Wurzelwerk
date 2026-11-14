#!/usr/bin/env python3
"""Scannt art/sprites und schreibt app/data/sprites.json.

Aufruf (aus dem Repo-Root oder von überall):  python3 -I tools/build_manifest.py

Dateikonvention: art/sprites/<region>/<art>/stage<N>[_<variante>][_glow].png

Ausgabe pro Art:
  region    – Regionsordner
  stages    – vorhandene Stufen (sortiert)
  variants  – vorhandene Farbvarianten (ohne Standard), sortiert
  default   – ob es Dateien ohne Variante gibt (stage<N>.png)
  files     – alle Dateinamen ohne .png (inkl. _glow), damit die App
              ohne 404-Versuche weiß, was existiert
  glow      – Liste der Dateien, die eine Leucht-Maske haben
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, "art", "sprites")
OUT = os.path.join(ROOT, "app", "data", "sprites.json")

PAT = re.compile(r"^stage(\d+)(?:_([a-z0-9_]+))?$")


def scan():
    species = {}
    if not os.path.isdir(SPRITES):
        return species
    for region in sorted(os.listdir(SPRITES)):
        rdir = os.path.join(SPRITES, region)
        if not os.path.isdir(rdir):
            continue
        for art in sorted(os.listdir(rdir)):
            adir = os.path.join(rdir, art)
            if not os.path.isdir(adir):
                continue
            stages, variants, files, glow = set(), set(), [], []
            has_default = False
            for fn in sorted(os.listdir(adir)):
                if not fn.endswith(".png"):
                    continue
                stem = fn[:-4]
                is_glow = stem.endswith("_glow")
                m = PAT.match(stem[:-5] if is_glow else stem)
                if not m:
                    continue
                stage, variant = int(m.group(1)), m.group(2)
                files.append(fn[:-4])
                if is_glow:
                    glow.append(fn[:-4 - len("_glow")])
                    continue
                stages.add(stage)
                if variant:
                    variants.add(variant)
                else:
                    has_default = True
            if not stages:
                continue
            if art in species:
                print(f"Warnung: Art {art!r} in mehreren Regionen, nehme {species[art]['region']}", file=sys.stderr)
                continue
            species[art] = {
                "region": region,
                "stages": sorted(stages),
                "variants": sorted(variants),
                "default": has_default,
                "files": files,
                "glow": glow,
            }
    return species


def main():
    species = scan()
    data = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "species": species,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    n_files = sum(len(s["files"]) for s in species.values())
    print(f"{len(species)} Arten, {n_files} Dateien -> {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
