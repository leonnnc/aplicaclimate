# QA ClimaMapa (http://127.0.0.1:4173/) — navegador integrado (built-in)

Fecha: 2026-10-11 · Punto probado: Lima, Perú (-12.0460, -77.0306) · Datos: Open-Meteo

## Resumen: 12 PASS / 1 PASS con salvedad (punto 10, control brújula oculto en escritorio)

| # | Punto | Resultado |
|---|-------|-----------|
| 1 | Pantalla de inicio | **PASS** |
| 2 | Bug "Cargando…" persistente | **PASS** |
| 3 | Nombres en el mapa (país/ciudad) | **PASS** |
| 4 | Zoom hasta nivel de calle | **PASS** (máx z=19) |
| 5 | Nombre del lugar visible (etiqueta + chip) | **PASS** |
| 6 | Panel de clima (datos sin clic) | **PASS** |
| 7 | Maniquí de vestimenta | **PASS** (imagen carga) |
| 8 | Sección "Más datos" | **PASS** |
| 9 | Detalle por día (desplegable) | **PASS** |
| 10 | Brújula y herramientas | **PASS parcial** — herramientas OK; brújula del mapa oculta tras el panel en escritorio, visible/funcional en móvil |
| 11 | Sin conexión | **PASS** |
| 12 | Errores de consola | **PASS** (ninguno) |
| 13 | Capturas | **PASS** (6/6 + extras) |

## Detalle

### 1. Pantalla de inicio — PASS
Muestra logo 🌦️, título "ClimaMapa", subtítulo, barra de progreso que avanza hasta "Todo listo", y la lista de comprobaciones: Almacenamiento local · Conexión a internet (En línea) · Ubicación (GPS) · Brújula/orientación · Vibración · Compartir del sistema · Mantener pantalla activa · Caché sin conexión · Zona horaria del equipo (America/Bogota) · Pronósticos guardados. Botón "Entrar ahora" presente. Se ocultó sola: `.intro` con `display:none` y el mapa quedó visible. **No se queda pegada.**

### 2. Aviso "Cargando…" — PASS
Tras esperar 12 s con la app cargada: 0 elementos con spinner visible, 0 textos "cargando", `document.getAnimations().length = 0`. No hay aviso persistente.

### 3. Nombres en el mapa — PASS
- Zoom país/región (z≈5): Colombia, Venezuela, Ecuador, Perú (Lima, Ica, Arequipa, Trujillo, Cusco, Puno), Bolivia, Brasil, Chile, Paraguay.
- Zoom ciudad (z≈12): Lima, Callao, Miraflores, San Isidro, Barranco, Santiago de Surco, San Borja, La Molina, Comas, etc.
- Búsqueda "Lima, Peru" devuelve sugerencias.
- **No aparece ningún texto "API KEY REQUIRED"** (tiles son de `tile.openstreetmap.org`).

### 4. Zoom y calles — PASS
Zoom máximo = **19** (el botón "+" queda deshabilitado). A z=19 se distinguen calles y sus nombres: Jirón Belisario Flores, Avenida Arequipa, Jirón Leon Velarde, Avenida Juan Pardo de Zela, Jirón Manuel Candamo, Pasaje Comercio, etc. No hay imagen borrosa ni límite previo.

### 5. Nombre del lugar — PASS
- Etiqueta sobre el marcador: **"Lima · 25° · Parcialmente nublado"**.
- Chip sobre el mapa: **"📍 Lima · Lima, Perú"**.
Ambos con texto real (no "—").

### 6. Panel de clima (sin clic) — PASS
Selección automática del centro del mapa (Lima, 158 m s. n. m., 12:45 local America/Lima, chip "✔ Actualizado hace unos segundos" + botones Renombrar / Guardado ✓ / Actualizar).
Temperatura **25 °C**, Parcialmente nublado, Sensación 26°, máx 28°/mín 22°; Viento **15 km/h S** con brújula gráfica SVG; Ráfagas 44 km/h; Humedad 68 %; Punto de rocío 18°; Presión 1,013 hPa; Nubosidad 64 %; Visibilidad 28–32 km; Índice UV 9.8 (Muy alto); Precipitación 0.00 mm; Nieve 0.0 cm; Prob. lluvia (6 h) 2 %; Amanecer 05:45; Atardecer 18:04; Lluvia hoy 0.2 mm; Zona horaria GMT-5. Franja de **24 horas** con valor de viento bajo cada hora. Lista de **7 días** ("Hoy"…"Sábado" con %lluvia, mm, UV y viento).

### 7. Maniquí de vestimenta — PASS
Imagen `assets/outfits/calido.png` → naturalWidth/Height 320×320, `complete:true` (carga real, no icono roto). Tarjeta "👕 Qué ponerte" con badge "🌤️ Cálido": título **"Ropa de clima cálido · 25°"**, resumen "Manga corta + pantalón ligero + capa muy fina." y chips "Gorra de visera (al mediodía)", "Gafas de sol", "Protector solar si estarás al sol", "Protector solar 50+ (reaplicar cada 2 h)". Se ve la figura con ropa de verano.

### 8. Más datos — PASS
Se abre al tocarla y muestra valores reales: Radiación solar 945 W/m², Radiación directa 692 W/m², Nivel de congelación 5,320 m, Humedad del suelo 16 %, Temp. del suelo (6 cm) 31°, Evapotranspiración 0.60 mm, Espesor de nieve 0 cm, Visibilidad mín. (12 h) 12 km, Nubes baja/media/alta 72/0/0 %, Horas de sol hoy 8.8 h, Duración del día 12.3 h, Horas con lluvia 2 h, Presión superficial 995 hPa. Además Calidad del aire (PM2.5 12.9, PM10 55.8, O₃ 67, NO₂ 1, SO₂ 2, CO 139 µg/m³).

### 9. Detalle por día — PASS
Al tocar "Hoy" se despliega tabla hora a hora (Hora/Temp/Lluvia/Viento/UV; filas 00:00–22:00 con iconos y valores). Al tocarla de nuevo se cierra (desaparecen las filas horarias).

### 10. Brújula y herramientas — PASS parcial
- "🧭 Herramientas del dispositivo" lista cada herramienta con estado: Almacenamiento local·Disponible, Conexión a internet·Disponible, Ubicación (GPS)·Disponible, Brújula/orientación·Disponible, Vibración·Disponible, Compartir del sistema·Con avisos, Mantener pantalla activa·Disponible, Caché sin conexión·Disponible, Zona horaria del equipo (America/Bogota)·Disponible, Pronósticos guardados·Con avisos.
- Botones **Compartir / Copiar coordenadas / Activar brújula / Pantalla activa** existen y son clicables ("Activar brújula" cambió a "Desactivar brújula" al pulsar, sin errores).
- Control circular de brújula en el mapa (`.leaflet-control-compass`): **en móvil** está arriba a la derecha y es visible/clicable (al pulsarlo no se rompe nada y no hay errores, aunque no hay sensor en escritorio). **En escritorio (1400×900)** el control queda en x≈1350, dentro de la zona del panel de clima (x 1000–1400), por lo que el panel lo tapa y `elementFromPoint` devuelve la pestaña del panel → **no es alcanzable con ratón en escritorio**. Incidencia menor de layout.

### 11. Sin conexión — PASS
Simulado con emulación de red "Offline" + recarga: la app **abre igual** (service worker), el panel muestra **"📴 Sin conexión · datos del 11/10/2026 12:56 p. m."** y el aviso "Estás viendo el pronóstico guardado del 11/10/2026 12:56 p. m. (hace 4 min), con los 7 días completos. Se actualizará solo cuando vuelva la conexión." Los **7 días** y todas las métricas siguen visibles. Los tiles del mapa se mostraron desde caché (no gris), lo cual es correcto cuando el tile ya está cacheado.

### 12. Errores — PASS
No se registró **ningún** error de consola ni excepción JS en la carga ni tras interactuar (búsqueda, zoom, Más datos, detalle de día, cambiar de herramienta, offline/online). Lista de errores vacía en todas las comprobaciones.

### 13. Capturas (rutas absolutas)
- (a) Pantalla de inicio: `C:\Users\leonn\Documents\web\climate\qa\v2\01_splash.png`
- (b) Escritorio, mapa a zoom de ciudad + panel: `C:\Users\leonn\Documents\web\climate\qa\v2\02_desktop_map.png`
- (c) Tarjeta "Qué ponerte" con maniquí: `C:\Users\leonn\Documents\web\climate\qa\v2\13c_outfit.png`
- (d) "Más datos" abierto: `C:\Users\leonn\Documents\web\climate\qa\v2\04_masdatos.png`
- (e) Vista móvil ~390×844 (panel inferior + brújula): `C:\Users\leonn\Documents\web\climate\qa\v2\13e_mobile.png`
- (f) Detalle de un día desplegado: `C:\Users\leonn\Documents\web\climate\qa\v2\06_day_detail.png`
- Extras: `03a_country_zoom.png` (zoom país), `03b_street_zoom.png` (zoom calle z19), `07_tools.png` (herramientas), `11_offline.png` (sin conexión).

## Nota técnica sobre capturas
El navegador integrado entrega la captura de viewport a tamaño fijo de ventana (**1920×1080**); `resize`/emulación de dispositivo sí cambian el layout de la página (innerWidth 1400/390 verificado por DOM) pero no el tamaño de la captura de viewport. Las capturas por recorte de elemento SÍ reflejan el layout activo, por eso la vista móvil (e) se obtuvo como recorte del contenedor del mapa a 390×844 (incluye el panel inferior y la brújula arriba a la derecha). Vista de escritorio (b) corresponde al layout a 1400×900.


---

# Addendum — Re-verificación punto 10 (fix CSS controles esquina derecha)

Recarga completa: SW desregistrado + caches `climamapa-v3` / `climamapa-tiles-v3` borradas + navegación con caché deshabilitada. Viewport escritorio 1400×900 (`innerWidth=1400`).

## 1. Brújula visible y fuera del panel — PASS
- `compassRect`: **x=948, y=66, w=40, h=40, right=988**.
- `panelRect`: **x=1000, w=400** (borde izquierdo 1000).
- **988 < 1000 → la brújula queda totalmente fuera del panel** (margen de 12 px). `compassOutsidePanel: true`.
- `display:grid, visibility:visible, opacity:1`.
- `document.elementFromPoint(centro)` = `svg` (el propio control: navegador devuelve el `svg` interno dentro de `.leaflet-control-compass`), **no el panel**.
- Clic sobre el centro (968, 86): `hit = svg "N"` → llega a la brújula, no al panel. Tras el clic: sin errores, sin toasts, brújula y panel intactos. **No se rompe nada.**

## 2. Atribución visible en escritorio — PASS
- `attrRect`: **x=791, y=879, w=207, h=21, right=998**.
- **998 < 1000 → fuera del panel**. `attrOutsidePanel: true`.
- `elementFromPoint(centro)` = `DIV.leaflet-control-attribution` (la propia atribución).
- Texto legible: **"Leaflet | © OpenStreetMap"**.

## 3. Atribución en móvil — PASS
Emulación iPhone 14 (390×844, `innerWidth=390`):
- `attrRect`: **x=183, y=232, w=207, h=21, bottom=253**.
- `panelRect` (hoja inferior): **y=253, top=253**.
- **253 ≤ 253 → la atribución queda por encima del borde superior de la hoja inferior**, no detrás. `attrAbovePanel: true`; `elementFromPoint(centro)` = la propia atribución.
- Brújula móvil: `x=340, y=66, right=380` (arriba a la derecha, visible).

## 4. Errores de consola — PASS
**Sin errores** (`errors: []`, log de nivel error vacío) tras la recarga y tras hacer clic en la brújula.

## Captura
- Escritorio 1400 px con brújula y atribución en su nueva posición (ambas visibles fuera del panel):
  `C:\Users\leonn\Documents\web\climate\qa\v2\14_fix_compass_attrib.png`


---

# Addendum 2 — Verificación del renombrado "ClimaMapa" → "AplicaClimate"

Recarga completa (hard reload): SW desregistrado, cachés `climamapa-v3`/`climamapa-tiles-v3` borradas, HTTP cache deshabilitada y navegación forzada. Escritorio 1400×900.

| # | Punto | Resultado | Valor observado |
|---|-------|-----------|-----------------|
| 1 | Nombre en intro | **PASS** | Título intro = **"AplicaClimate"**; subtítulo presente: "Clima detallado y qué ponerte, en cualquier punto del mapa". |
| 2 | Nombre en barra superior | **PASS** | `<span class="brand-text">AplicaClimate</span>` (header: "🌦️ AplicaClimate"). `body` NO contiene "ClimaMapa". |
| 3 | Título de pestaña | **PASS** | `<title>` en HTML = **"AplicaClimate · clima detallado y vestimenta"**. |
| 4 | Manifiesto PWA | **PASS** | `manifest.webmanifest` → `name:"AplicaClimate"`, `short_name:"AplicaClimate"`, `start_url:".", display:"standalone"`. |
| 5 | App sigue funcionando | **PASS** | Mapa + panel cargados sin pantallas vacías: 25 °C, métricas (viento 14 km/h S, ráfagas 39, humedad 67 %, presión 1,012 hPa, nubosidad 100 %, UV 8.7, etc.), franja 24 h, 7 días y "Qué ponerte" con maniquí visible. |
| 6 | Datos guardados intactos | **PASS** | `climamapa.places` = **1 lugar: "Lima QA"** (-12.046, -77.031, 25°). La pestaña "Lugares guardados" lo lista con su ✕. No hay pérdida de datos. |
| 7 | Errores de consola | **PASS** | **Sin errores** (`errors: []`, log nivel error vacío) tras la carga y las interacciones. |
| 8 | Capturas | **PASS** | Intro: `...\21_intro_AplicaClimate.png`; Panel cargado: `...\22_panel_AplicaClimate.png`. |

## Notas de medición
- `index.html`: 0 apariciones de "ClimaMapa", 4 de "AplicaClimate".
- `document.title` devuelto por el harness incluye el prefijo interno de pestaña del navegador integrado ("aw-iab-2 AplicaClimate · …"); el `<title>` real del proyecto es exactamente `AplicaClimate · clima detallado y vestimenta`.
- Claves de almacenamiento internas conservan el prefijo histórico `climamapa.` (p. ej. `climamapa.places`) para no perder datos; no es texto visible de la app.
- La captura de la intro se tomó revelando temporalmente el elemento `.intro` (que el navegador ya había ocultado por su rápido auto-cierre) — solo manipulación de DOM en runtime, sin tocar archivos del proyecto.
