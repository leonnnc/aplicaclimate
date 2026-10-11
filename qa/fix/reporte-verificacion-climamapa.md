# Verificación ClimaMapa (http://127.0.0.1:4173/) — Navegador integrado (built-in)

Fecha: 2026-10-11 · Navegador: built-in (in-app), targetId `tab-iab-1`
Nota SW: la primera carga sirvió assets desde el Service Worker antiguo (`climamapa-v2`).
Se desregistró el SW, se limpiaron cachés y se recargó con caché deshabilitada antes de evaluar.
Todas las mediciones y capturas corresponden al estado FRESCO.

---

## Punto 1 — Mapa oscuro (era crítico): **PASS**

Capa "Oscuro" seleccionada en el control de capas (radio "Oscuro", menú con Oscuro/Calles/Relieve/Satélite).

Evidencia objetiva (DOM / red):
- Hosts de tiles: `server.arcgisonline.com` = **56/56** tiles.
- Servicios Esri detectados: `Canvas/World_Dark_Gray_Base` **+** `Canvas/World_Dark_Gray_Reference` (capa de etiquetas).
- Peticiones a CARTO (`carto` / `basemaps`): **0** (log de red vacío).
- Texto "API KEY REQUIRED" en el DOM/página: **NO** (`containsApiKeyText: false`).
- Atribución de Leaflet: "Base: Tiles © Esri, Etiquetas: Tiles © Esri".

Evidencia visual (mapa real oscuro con costas, ríos, vialidad y nombres):
- Zoom de ciudad (Lima): se ven distritos y calles — Callao, San Martín de Porres, Rímac, Lima,
  Breña, La Victoria, Miraflores, San Miguel, La Perla, Surquillo, etc.
- Zoom amplio: Pacific Ocean, línea de costa, Huacho, Huaral/Chancay, San Vicente de Cañete, etc.
- En ninguna vista aparece el texto "API KEY REQUIRED".

Capturas:
- `C:\Users\leonn\Documents\web\climate\qa\fix\evidencia-1-mapa-oscuro-ciudad.png`
- `C:\Users\leonn\Documents\web\climate\qa\fix\evidencia-1-mapa-oscuro-zoom-ciudad.png`
- `C:\Users\leonn\Documents\web\climate\qa\fix\evidencia-1-mapa-oscuro-zoom-amplio.png`

---

## Punto 2 — Desbordamiento en móvil: **PASS**

Viewport emulado a **390 px** de ancho (device emulation iPhone 14 → 390×844; verificado:
`window.innerWidth = 390`, `visualViewport.width = 390`, `matchMedia(max-width:420px) = true`).

Valores medidos exactos (viewport 390 px):
- `document.documentElement.scrollWidth` = **390**
- `window.innerWidth` = **390**
- `document.body.scrollWidth` = 390 · `documentElement.clientWidth` = 390
- **scrollWidth (390) <= innerWidth (390) → sin desbordamiento.**
  (Contraste: antes de la corrección `scrollWidth` era 429.)

Visibilidad de controles de la barra superior (bounding rects, todos con right <= 390):
| Control | left | right | ancho | visible |
|---|---|---|---|---|
| Buscador | 37 | 244 | 207 | Sí |
| 📍 | 249 | 279 | 30 | Sí |
| ⭐ | 285 | 315 | 30 | Sí |
| Unidades | 319/321 | 347 | 26–28 | Sí |
| 🌙/☀️ (tema) | 353 | 383 | 30 | Sí |
- Todos los controles están **completamente visibles, sin recorte** (el botón de tema 🌙 queda
  dentro del viewport: 353–383).
- Etiqueta corta de unidades: **"°C"** (ancho 28 px) tras alternar; también **"°F"** (ancho 26 px)
  en modo imperial. No muestra "°C · km/h" a 390 px (esa etiqueta larga es solo de escritorio).

Capturas:
- `C:\Users\leonn\Documents\web\climate\qa\fix\evidencia-2-movil-390-full.png` (página móvil completa)
- `C:\Users\leonn\Documents\web\climate\qa\fix\evidencia-2-header-movil-390.png` (barra superior, °F)
- `C:\Users\leonn\Documents\web\climate\qa\fix\evidencia-2-header-movil-390-celsius.png` (barra superior, °C)
- (descartada) `evidencia-2-movil-390-DESCARTADA-preReload.png`: captura previa a la limpieza del SW, no usada.

---

## Punto 3 — Regresión flujo principal: **PASS**

### Clic en el mapa → panel
Clic sobre el mapa (1440×900) en (-11.9668, -77.9068) → el panel se actualizó:
- Encabezado "Perú", temperatura "23°C / Nublado", sensación 25°, métricas (Viento 20 km/h SSE,
  Ráfagas, Humedad 80 %, Punto de rocío, Presión, Nubosidad, Visibilidad, Índice UV, Precipitación…).
- Tarjeta "👕 Qué ponerte" presente, con chips de indumentaria (14+ chips: Parte superior/inferior,
  Calzado, Capa exterior, Accesorios).
- Secciones "⏱️ Próximas 24 horas" y "📅 Próximos 7 días" presentes.

### Buscador "Lima, Peru"
Se escribió "Lima, Peru"; apareció el desplegable de sugerencias y se eligió "Lima — Lima, Perú".
El panel resultó:
- Encabezado **"Lima"**, coords **-12.0460, -77.0306**, temperatura **25°C "Parcialmente nublado"**.
- Métricas presentes (Viento 16 km/h S, Ráfagas 43 km/h, Humedad 66 %, Presión 1,013 hPa, UV 9.8…).
- "👕 Qué ponerte" con chips (16), "Próximas 24 horas" y "Próximos 7 días" presentes.

Captura:
- `C:\Users\leonn\Documents\web\climate\qa\fix\evidencia-3-panel-lima.png`

### Errores de consola / excepciones
- ANTES de interactuar: mensajes de consola `[]` · excepciones JS `[]`
- DESPUÉS de interactuar (clic + búsqueda): mensajes de consola `[]` · excepciones JS `[]`
- Resultado: **sin errores**.

---

## Resumen
| Punto | Resultado |
|---|---|
| 1. Mapa oscuro (Esri World Dark Gray Base + Reference, sin "API KEY REQUIRED") | **PASS** |
| 2. Móvil 390 px (scrollWidth 390 <= innerWidth 390, controles visibles, etiqueta "°C") | **PASS** |
| 3. Regresión flujo principal (clic mapa, panel, Qué ponerte, 24 h, 7 días, búsqueda Lima) | **PASS** |
Errores de consola/excepciones: **sin errores**.
