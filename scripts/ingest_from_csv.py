#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
REMUBRUTA → JSON (v3, estricto con tus reglas)

- Toma: REMUBRUTA.csv y Listado_Legajos.csv exportados desde tu Google Sheet
- Selecciona 10 legajos con historia más larga (o usa la lista manual)
- Enmascara NOMBRE y APELLIDO (y Jefe si se puede machear)
- **Respeta EXACTAMENTE** períodos e importes
- **Regla clave**: en el **primer período** de cada legajo, fuerza igualdad de
  Bancos, IPC, Alyc y Alchemy con el **Sueldo Bruto** (si en el CSV no es así).
  (Esto solo ajusta la PRIMERA FILA; el resto queda intocado)
- Siempre graficamos **Sueldo** en todos los escenarios (incl. Bandas)
"""
import csv, json, os, sys, re, random
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
DATA_DIR = os.path.join(ROOT, "data")

REMUBRUTA_CSV = os.environ.get("REMUBRUTA_CSV", os.path.join(ROOT, "REMUBRUTA.csv"))
LEGAJOS_CSV   = os.environ.get("LEGAJOS_CSV",   os.path.join(ROOT, "Listado_Legajos.csv"))
OUTPUT_COLABS = os.path.join(DATA_DIR, "colaboradores.json")
OUTPUT_SERIES = os.path.join(DATA_DIR, "remubruta.json")

# Si querés fijar los 10 legajos exactos:
LEGajos_SELECCIONADOS = []  # e.g. ["11","20","26",...]

# Alias pools
NOMBRES = ["Agustin","Belen","Carlos","Daniela","Esteban","Florencia","Gonzalo","Hernan","Ivana","Joaquin",
           "Karina","Leandro","Micaela","Nicolas","Olivia","Pablo","Romina","Santiago","Tamara","Ulises",
           "Valentina","Walter","Ximena","Yamil","Zoe"]
APELLIDOS = ["Rivas","Duarte","Mena","Paz","Silva","Acosta","Ibarra","Quiroga","Roldan","Benitez",
             "Cano","Delgado","Esquivel","Ferreyra","Gimenez","Herrera","Iglesias","Juarez","Kaufman","Luna",
             "Martinez","Navarro","Ortega","Peralta","Quinteros","Ramos","Sosa","Torres","Urquiza","Vega","Wagner","Zuniga"]

def norm(s): return re.sub(r"\s+"," ", (s or "")).strip()

def detect_columns(header):
    h_l = [norm(x).lower() for x in header]
    def idx(keys):
        for i, col in enumerate(h_l):
            for k in keys:
                if k in col:
                    return i
        return -1
    return {
        "legajo": idx(["legajo","legajo_id","id"]),
        "periodo": idx(["periodo","fecha","mes"]),
        "sueldo": idx(["bruto","sueldo","remu","basico"]),
        "banco": idx(["banco","bancos"]),
        "ipc": idx(["ipc"]),
        "alyc": idx(["alyc"]),
        "alchemy": idx(["alchemy"]),
        "min": idx(["min"]),
        "mid": idx(["mid","mediano","medio"]),
        "max": idx(["max"]),
    }

def read_remubruta(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    header, data = rows[0], rows[1:]
    cols = detect_columns(header)
    for k in ("legajo","periodo","sueldo"):
        if cols[k] < 0:
            raise SystemExit(f"REMUBRUTA.csv: falta columna obligatoria '{k}'")
    series = defaultdict(list)
    for r in data:
        if not any(r): continue
        leg = norm(r[cols["legajo"]])
        per = norm(r[cols["periodo"]])
        def get(col):
            j = cols[col]
            if j<0: return None
            v = norm(r[j]).replace("$","").replace(".","").replace(",",".")
            try:
                return float(v)
            except:
                return None
        row = {
            "periodo": per,
            "sueldo": get("sueldo") or 0,
            "banco": get("banco") or 0,
            "ipc": get("ipc") or 0,
            "alyc": get("alyc") or 0,
            "alchemy": get("alchemy") or 0,
            "min": get("min") or 0,
            "mid": get("mid") or 0,
            "max": get("max") or 0,
        }
        series[leg].append(row)
    # Orden
    for k in list(series.keys()):
        series[k].sort(key=lambda x: x["periodo"])
    return dict(series)

def read_legajos(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    header, data = rows[0], rows[1:]
    hmap = {norm(h).lower(): i for i,h in enumerate(header)}
    def col(*names):
        for n in names:
            i = hmap.get(norm(n).lower())
            if i is not None: return i
        return -1
    idx = {
        "legajo": col("Legajo","Legajo_ID","ID","Legajo Id"),
        "nombre": col("Nombre","Nombres"),
        "apellido": col("Apellido","Apellidos"),
        "sector": col("Sector","SECTOR","Sector propuesto","SECTOR PROPUESTO"),
        "area": col("Área","Area","AREA","CentroDeCostos_Descripcion","Área propuesto"),
        "jefe": col("Jefe","JEFE","Jefe directo","Jefe PROPUESTO"),
        "rango": col("Puesto","PUESTO","Puestos_Descripcion"),
        "antig": col("ANTIGUEDAD","Antigüedad","Antig en Alchemy"),
        "nivel_salarial": col("Nivel Salarial","Banda","Posición Comparada"),
    }
    cat = {}
    for r in data:
        if not any(r): continue
        def g(k):
            j=idx[k]; return norm(r[j]) if j>=0 and j<len(r) else ""
        leg = g("legajo")
        cat[leg] = {
            "legajo": leg,
            "nombre": g("nombre"),
            "apellido": g("apellido"),
            "sector": g("sector"),
            "area": g("area"),
            "jefe": g("jefe"),
            "rango": g("rango"),
            "ANTIGUEDAD": g("antig"),
            "Nivel Salarial": g("nivel_salarial")
        }
    return cat

def alias_pool(n):
    random.seed(20240825)
    pairs = [(a,b) for a in NOMBRES for b in APELLIDOS]
    random.shuffle(pairs)
    return pairs[:n]

def normalize_first_period_equal(row0):
    """Ajusta SOLO el primer periodo: banco/ipc/alyc/alchemy = sueldo (si difieren o faltan)"""
    base = row0.get("sueldo") or 0
    for k in ("banco","ipc","alyc","alchemy"):
        v = row0.get(k, 0) or 0
        if abs(v - base) > 0.01:
            row0[k] = base
    # Si no vienen min/mid/max, no tocamos bandas; si vienen 0, derivamos como proporción del sueldo
    if not row0.get("min"): row0["min"] = round(base * 0.9, 2)
    if not row0.get("mid"): row0["mid"] = round(base * 1.0, 2)
    if not row0.get("max"): row0["max"] = round(base * 1.15,2)
    return row0

def main():
    series = read_remubruta(REMUBRUTA_CSV)
    catalogo = read_legajos(LEGAJOS_CSV)

    # Elegimos 10 con más historia si no se fijaron
    if LEGajos_SELECCIONADOS:
        legs = [str(x) for x in LEGajos_SELECCIONADOS if str(x) in series]
    else:
        legs = sorted(series.keys(), key=lambda k: len(series[k]), reverse=True)[:10]

    # Normalizar primer periodo (igualdad contra Sueldo)
    for leg in legs:
        if not series[leg]: continue
        series[leg][0] = normalize_first_period_equal(series[leg][0])

    # Alias de colaboradores y jefes (si se puede)
    pairs = alias_pool(len(legs))
    alias_by_leg = {leg: f"{nom} {ape}" for (leg,(nom,ape)) in zip(legs, pairs)}
    alias_by_name = {}  # para jefes que vengan por nombre (si coinciden con alguien aliasado, usamos mismo alias)
    for leg in legs:
        real = catalogo.get(leg, {}).get("nombre","") + " " + catalogo.get(leg, {}).get("apellido","")
        real = norm(real)
        if real: alias_by_name[real] = alias_by_leg[leg]

    colaboradores = []
    for leg in legs:
        meta = catalogo.get(leg, {})
        alias = alias_by_leg[leg]
        nombre, apellido = alias.split(" ", 1)
        jefe_real = norm(meta.get("jefe",""))
        jefe_alias = alias_by_name.get(jefe_real, jefe_real)  # si el jefe está entre los 10, queda aliasado; sino se deja texto
        col = {
            "legajo": leg,
            "nombre": nombre,
            "apellido": apellido,
            "nombreCompleto": alias,
            "sector": meta.get("sector",""),
            "area": meta.get("area",""),
            "jefe": jefe_alias,
            "rango": meta.get("rango",""),
            "ANTIGUEDAD": meta.get("ANTIGUEDAD",""),
            "Nivel Salarial": meta.get("Nivel Salarial",""),
            "nivel": 0
        }
        colaboradores.append(col)

    # Guardar
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUTPUT_COLABS, "w", encoding="utf-8") as f:
        json.dump(colaboradores, f, ensure_ascii=False, indent=2)
    out_series = {leg: series[leg] for leg in legs}
    with open(OUTPUT_SERIES, "w", encoding="utf-8") as f:
        json.dump(out_series, f, ensure_ascii=False, indent=2)

    print("OK | legajos:", ", ".join(legs))
    print("Generado:", OUTPUT_COLABS, "y", OUTPUT_SERIES)

if __name__ == "__main__":
    main()
