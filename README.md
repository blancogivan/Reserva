# Reserva

App personal de entrenamiento, descanso y nutrición basada en evidencia.
Web instalable (PWA) servida con GitHub Pages; los datos viven en Supabase protegidos por usuario (RLS).

- `index.html` – la app
- `config.js` – URL del proyecto y clave *publishable* (pública por diseño)
- `supabase.sql` – esquema de la base de datos
- `sw.js`, `manifest.webmanifest`, iconos – instalación y uso sin conexión

## Cómo se construye
El código fuente está en `src/`: `reserva.html` (la app), `nube.js` (sincronización con Supabase) y `cuenta.js` (cuenta, atajo y copias).
`cd src && python3 build.py` genera `index.html`. Tras cada cambio, sube la versión de caché en `sw.js`.
