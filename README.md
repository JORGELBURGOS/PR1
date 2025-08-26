
# People Review — REMUBRUTA desde Google Sheets (CSV, v3, **estricto**)

**Objetivo:** demo 100% offline que usa **tus valores reales** de *REMUBRUTA* y *Listado Legajos*
(10 colaboradores con nombres alias). Reglas que se cumplen:

- Los **periodos e importes** son exactamente los de tu hoja (nada inventado).
- En el **primer mes** de cada legajo, **Bancos/IPC/Alyc/Alchemy = Sueldo Bruto** (si no lo estaban, se corrige SOLO esa fila).
- En **Bandas**, SIEMPRE se compara contra **Sueldo Bruto** (el gráfico muestra Sueldo + MIN/MID/MAX).
- Escenarios disponibles: **Mercado** (Bancos, IPC, Alyc), **Bandas** (MIN/MID/MAX), **Alchemy** (Sueldo vs Alchemy).

## Uso

1. En Google Sheets, exportá estas pestañas como CSV:
   - `REMUBRUTA` → `REMUBRUTA.csv`
   - `Listado Legajos` → `Listado_Legajos.csv`
2. Ponelos en la **raíz** del proyecto.
3. Elegí legajos (opcional): editá `scripts/ingest_from_csv.py` y completá `LEGajos_SELECCIONADOS = [...]`.
   - Sino, el script toma **los 10 con más historia**.
4. Corré la ingesta:
   ```bash
   cd scripts
   python3 ingest_from_csv.py
   ```
   Salida: `data/colaboradores.json` y `data/remubruta.json`.
5. Local:
   ```bash
   python3 -m http.server
   # abrir http://localhost:8000
   ```
6. Vercel: Importá repo → Framework “Other” → Build vacío → Output `/`.

### Helper (opcional)
Listado de legajos por longitud de historia:
```bash
cd scripts
python3 list_legajos_by_history.py
```

### Alias de jefes
Si el **jefe** pertenece a los 10 seleccionados (o su nombre aparece mapeado), se aliasa también para no filtrar identidades.
