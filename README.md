# People Review — Demo Anon
Proyecto de demostración *100% estático* para Vercel, con 10 colaboradores ficticios.

## Qué es
Replica la interfaz de **People Review** (búsqueda, ficha, matriz 9-Box y gráficos de remuneraciones)
pero con datos inventados para preservar identidades.

## Estructura
```
/index.html        → UI principal (sin Apps Script)
/app.js            → Lógica y gráficos (Chart.js)
/data/colaboradores.json
/data/remuneraciones.json
/vercel.json       → Enrutamiento estático (opcional)
```

## Cómo publicar en Vercel
1. Subí esta carpeta a un repo en GitHub (p. ej. `people-review-demo`).
2. En Vercel → **New Project** → Importar el repo.
3. Framework: **Other**. Directorio raíz: `/`. Comando de build: **(vacío)**. Output: `/`.
4. Deploy.

> También podés probar localmente abriendo `index.html` con un servidor estático (por CORS).
> Por ejemplo con Python:
> ```bash
> python3 -m http.server 8080
> # Abrí http://localhost:8080
> ```
