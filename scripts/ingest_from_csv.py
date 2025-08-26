#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ingesta desde CSVs exportados de Google Sheets:
- REMUBRUTA.csv: series históricas por Legajo y Periodo con columnas
  esperadas (flexibles por nombres): periodo, sueldo/bruto, banco, ipc, alyc, alchemy, min, mid, max.
- Listado_Legajos.csv: catálogo por legajo: Nombre, Apellido, Sector, Área, Jefe (si existe), etc.

Salida:
- data/colaboradores.json (10 legajos con nombres alias y metadatos)
- data/remubruta.json (series exactas por legajo)
"""
import csv, json, os, sys, re, random

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
DATA_DIR = os.path.join(ROOT, "data")

# ------- Configurable -------
REMUBRUTA_CSV = os.environ.get("REMUBRUTA_CSV", os.path.join(ROOT, "REMUBRUTA.csv"))
LEGAJOS_CSV   = os.environ.get("LEGAJOS_CSV",   os.path.join(ROOT, "Listado_Legajos.csv"))
OUTPUT_COLABS = os.path.join(DATA_DIR, "colaboradores.json")
OUTPUT_SERIES = os.path.join(DATA_DIR, "remubruta.json")

# Para elegir 10 legajos: fijar manualmente o auto-top por cantidad de filas
LEGajos_SELECCIONADOS = []  # e.g. ["11","20","26",...]  (strings). Si vacío, selecciona top 10 por cantidad de períodos.

# Pool de alias
NOMBRES = ["Agustin","Belen","Carlos","Daniela","Esteban","Florencia","Gonzalo","Hernan","Ivana","Joaquin",
           "Karina","Leandro","Micaela","Nicolas","Olivia","Pablo","Romina","Santiago","Tamara","Ulises",
           "Valentina","Walter","Ximena","Yamil","Zoe"]
APELLIDOS = ["Rivas","Duarte","Mena","Paz","Silva","Acosta","Ibarra","Quiroga","Roldan","Benitez",
             "Cano","Delgado","Esquivel","Ferreyra","Gimenez","Herrera","Iglesias","Juarez","Kaufman","Luna",
             "Martinez","Navarro","Ortega","Peralta","Quinteros","Ramos","Sosa","Torres","Urquiza","Vega","Wagner","Zuniga"]

def norm(s):
    return re.sub(r"\s+"," ", s or "").strip()

def detect_columns(header):
    # Intento de mapeo flexible por palabras clave
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
    need = ["legajo","periodo","sueldo"]
    for k in need:
        if cols[k] < 0:
            raise SystemExit(f"Columna obligatoria faltante en REMUBRUTA.csv: {k}")
    series = {}
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
        series.setdefault(leg, []).append(row)
    # Orden por periodo (lexicográfico ISO YYYY-MM o YYYY-MM-DD funciona)
    for k in series:
        series[k].sort(key=lambda x: x["periodo"])
    return series

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
    random.seed(12345)
    pairs = [(a,b) for a in NOMBRES for b in APELLIDOS]
    random.shuffle(pairs)
    return pairs[:n]

def main():
    series = read_remubruta(REMUBRUTA_CSV)
    catalogo = read_legajos(LEGAJOS_CSV)

    # Elegir 10 legajos
    if LEGajos_SELECCIONADOS:
        legs = [str(x) for x in LEGajos_SELECCIONADOS if str(x) in series]
    else:
        legs = sorted(series.keys(), key=lambda k: len(series[k]), reverse=True)[:10]

    # Armar alias
    pairs = alias_pool(len(legs))
    map_alias = {}
    for leg, (nom, ape) in zip(legs, pairs):
        map_alias[leg] = f"{nom} {ape}"

    # Construir colaboradores.json (10 items)
    colaboradores = []
    for leg in legs:
        meta = catalogo.get(leg, {"sector":"", "area":"", "jefe":"", "rango":"", "ANTIGUEDAD":"", "Nivel Salarial":""})
        alias = map_alias[leg]
        nombre, apellido = alias.split(" ", 1)
        col = {
            "legajo": leg,
            "nombre": nombre,
            "apellido": apellido,
            "nombreCompleto": alias,
            "sector": meta.get("sector",""),
            "area": meta.get("area",""),
            "jefe": meta.get("jefe",""),  # si querés alias internos de jefes, se puede mapear también
            "rango": meta.get("rango",""),
            "ANTIGUEDAD": meta.get("ANTIGUEDAD",""),
            "Nivel Salarial": meta.get("Nivel Salarial",""),
            "nivel": 0
        }
        colaboradores.append(col)

    # Construir remubruta.json solo con los legajos seleccionados
    out_series = {leg: series[leg] for leg in legs}

    # Guardar
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUTPUT_COLABS, "w", encoding="utf-8") as f:
        json.dump(colaboradores, f, ensure_ascii=False, indent=2)
    with open(OUTPUT_SERIES, "w", encoding="utf-8") as f:
        json.dump(out_series, f, ensure_ascii=False, indent=2)

    print(f"OK | Colaboradores: {len(colaboradores)} → {OUTPUT_COLABS}")
    print(f"OK | Series (legajos): {len(out_series)} → {OUTPUT_SERIES}")
    print("Legajos usados:", ", ".join(legs))

if __name__ == "__main__":
    main()
