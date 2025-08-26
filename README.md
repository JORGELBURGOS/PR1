
# People Review — REMUBRUTA desde Google Sheets (100% Offline)

Este paquete te permite **generar la demo usando los valores reales de tu hoja**:
- Toma **REMUBRUTA** (histórico por período) y **Listado Legajos** (datos del colaborador)
- **Selecciona 10 legajos**, **enmascara nombres y apellidos** (alias) y respeta **exactamente los períodos e importes**
- No usa CDNs ni llamadas externas: queda todo en `/data/*.json`

## Pasos (2 minutos)

1. En tu Google Sheet **abrí** las pestañas:
   - `REMUBRUTA`
   - `Listado Legajos`
2. `Archivo → Descargar → Valores separados por comas (.csv)` de cada pestaña.
3. Guardá los archivos en la raíz del proyecto con estos nombres:
   - `REMUBRUTA.csv`
   - `Listado_Legajos.csv`
4. (Opcional) Si querés elegir manualmente los 10 legajos, abrí `scripts/ingest_from_csv.py` y completá la lista `LEGajos_SELECCIONADOS = ["11","20",...]`.
5. Ejecutá el script de ingesta:
   ```bash
   cd scripts
   python3 ingest_from_csv.py
   ```
   Verás el resultado en:
   - `data/colaboradores.json`
   - `data/remubruta.json`

6. Probá localmente:
   - Con un server estático (por ejemplo): `python3 -m http.server` y abrí `http://localhost:8000`.
7. Deploy a Vercel:
   - Importás el repo, build vacío, output `/`.

## Qué incluye

- `index.html`, `app.js` — Interfaz con **selector de escenario**: Mercado (Bancos, IPC, Alyc), Bandas (MIN/MID/MAX) y Alchemy.
- `scripts/ingest_from_csv.py` — Ingresa desde tus CSVs reales y genera la data exacta.
- `/data/*.json` — Se genera desde tu hoja; **no** se versiona ningún dato real tuyo.

## Notas

- El script mapea columnas por palabras clave. Si algún encabezado difiere mucho, te indico cómo ajustarlo.
- Para **enmascarar también el `Jefe`**, podemos extender el mapeo para que los jefes que aparezcan en `Listado Legajos` también reciban alias consistentes.
