#!/usr/bin/env python3
# Lista legajos ordenados por longitud de historia en REMUBRUTA.csv
import csv, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PATH = os.environ.get("REMUBRUTA_CSV", os.path.join(ROOT, "REMUBRUTA.csv"))
def norm(s): return re.sub(r"\s+"," ", (s or "")).strip()
with open(PATH, newline="", encoding="utf-8-sig") as f:
    rows = list(csv.reader(f))
header, data = rows[0], rows[1:]
# detectar columnas
h = [norm(x).lower() for x in header]
def idx(keys):
    for i, col in enumerate(h):
        for k in keys:
            if k in col: return i
    return -1
i_leg = idx(["legajo","legajo_id","id"])
i_per = idx(["periodo","fecha","mes"])
d={}
for r in data:
    if not any(r): continue
    leg = norm(r[i_leg]) if i_leg>=0 else ""
    if leg: d.setdefault(leg, set()).add(norm(r[i_per]))
pairs = sorted([(k,len(v)) for k,v in d.items()], key=lambda x: x[1], reverse=True)
for k,c in pairs:
    print(f"{k},{c}")
