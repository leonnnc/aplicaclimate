# Informe QA funcional — ClimaMapa (http://127.0.0.1:4173/)

Navegador: integrado (built-in). Vista escritorio y móvil. Tema oscuro por defecto.
Nota de entorno: las capturas de viewport completo del navegador integrado se generan
siempre a 1920x1080 e ignoran el resize; por eso las capturas exactas 1400x900 y 390x844
se tomaron con recorte por elemento (`.app`), que sí respeta el layout real.

## Resultado por paso (PASS/FAIL)

| # | Paso | Resultado |
|---|------|-----------|
| 1 | Carga de la URL sin pantalla en blanco + captura de errores | **PASS** |
| 2 | Mapa Leaflet con tiles + barra superior con buscador + panel lateral con pestañas "Clima"/"Lugares" | **FAIL** (parcial) — barra y pestañas OK, pero los tiles del mapa NO renderizan (aparecen como "API KEY REQUIRED") |
| 3 | Clic en el mapa → panel de clima completo | **PASS** |
| 4 | Buscar "Lima, Peru" → lista + selección mueve mapa y carga datos | **PASS** |
| 5 | Guardar lugar → diálogo → aparece en pestaña "Lugares" con temperatura | **PASS** |
| 6 | Cambio de unidades °C·km/h → °F·mph y cambio de tema 🌙/☀️ | **PASS** |
| 7 | Revisión de consola al final (errores nuevos) | **PASS** (sin errores) |
| 8 | Capturas escritorio (~1400x900) y móvil (~390x844) | **PASS** |

## Detalle

### Paso 1 — PASS
La página carga (título: "ClimaMapa · clima detallado y vestimenta", UI en español).
- `console.error`: **vacío / sin errores**.
- Excepciones no capturadas (`pageerror`): **ninguna**.
- Mensajes de consola: **ninguno**.

### Paso 2 — FAIL (parcial)
- Barra superior con buscador: **presente** ("Buscar ciudad, dirección o «lat, lon»" + botón Buscar, 📍, ⭐, °C·km/h, 🌙/☀️).
- Panel lateral derecho con pestañas **"Clima"** y **"Lugares"**: **presente**.
- Mapa Leaflet: inicializado, pero **los tiles NO renderizan**. El basemap por defecto (oscuro) usa CARTO `dark_all` (`https://{a,b,c}.basemaps.cartocdn.com/dark_all/...`). Los requests devuelven HTTP 200 pero la imagen es el marcador de agua **"API KEY REQUIRED · carto.com/attribution"** → el mapa se ve como una cuadrícula con ese texto, no como un mapa real.
- Observación: tras cambiar de tema (claro y volver a oscuro), el proveedor cambió a **OpenStreetMap** (`tile.openstreetmap.org`, 200 OK) y los tiles **sí renderizaron correctamente** (se ve Lima/Callao, calles, costa). Es decir, el fallo es del basemap CARTO inicial; la app termina usando OSM.

### Paso 3 — PASS
Clic en el mapa (centro) → se carga el panel de clima con TODO lo requerido:
- Nombre del lugar: "Perú" (clic en punto arbitrario) / "Lima" (tras búsqueda), coordenadas y "0 m / 158 m s. n. m.".
- Temperatura grande: **23 °C** (Perú) / **25 °C** (Lima).
- Condición actual: "Mayormente despejado" / "Parcialmente nublado".
- Rejilla de métricas: Viento, Ráfagas, Humedad, Punto de rocío, Presión, Nubosidad, Visibilidad, Índice UV, Precipitación, Nieve, Prob. lluvia (6 h), Amanecer, Atardecer, Lluvia hoy, Zona horaria. **Ninguna en "—"**.
- Tarjeta **"👕 Qué ponerte"** con banda "Calor/Cálido", selectores Actividad y Sensibilidad al frío, resumen + consejos, y bandas: PARTE SUPERIOR, PARTE INFERIOR, CALZADO, CAPA EXTERIOR, ACCESORIOS. **Sin chips vacíos** (0 chips vacíos).
- Franja **"⏱️ Próximas 24 horas"**: presente (Ahora, 12:00…10:00 con iconos y %).
- Lista **"📅 Próximos 7 días"**: presente, 7 filas (Hoy, Mañana, Martes, Miércoles, Jueves, Viernes, Sábado) con icono, 💧/UV/💨 y máx/mín (p. ej. "77° / 70°"). Completa, sin huecos.
- Extra: tarjeta "🌫️ Calidad del aire" (PM2.5, PM10, O₃, NO₂, SO₂, CO).

### Paso 4 — PASS
Búsqueda "Lima, Peru" + Enter → aparece lista de resultados; primer ítem "Lima — Lima, Perú".
Al seleccionarlo el mapa se desplaza a Lima (-12.0460, -77.0306) y se cargan los datos
(25 °C, "Parcialmente nublado", 158 m s. n. m., aviso UV muy alto 9).
Observación menor: en el árbol de accesibilidad 3 de los 4 ítems del desplegable aparecen sin texto.

### Paso 5 — PASS
Botón "Guardar" del encabezado → diálogo "Guardar lugar" con campo prellenado ("Lima").
Se escribió "Lima QA" y se confirmó → el botón pasa a **"Guardado ✓"** (deshabilitado).
Pestaña **"Lugares"** → "Lugares guardados" muestra: **"Lima QA · -12.046, -77.031 · 25°"**
(+ botones Exportar/Importar y borrado ✕).

### Paso 6 — PASS
- Unidades: botón "°C · km/h" → "**°F · mph**". Valores cambian: 25 °C→**77 °F**, sensación 28→83°, viento 15→**9 mph**, ráfagas 42→26 mph, visibilidad 28 km→17 mi, precipitación 0.00 mm→0.00 in, punto de rocío 18°→65°.
- Tema: botón 🌙/☀️ → cambia claro/oscuro. Verificado por `data-theme` y fondo: oscuro `rgb(11,18,32)` ↔ claro `rgb(238,242,249)`. Interfaz cambia correctamente.

### Paso 7 — PASS
Revisión final de consola: **sin errores nuevos** (0 `console.error`, 0 excepciones) tras toda la interacción.

### Paso 8 — PASS (capturas)
- Escritorio ~1400x900 (mapa + panel de clima cargado):
  `C:\Users\leonn\Documents\web\climate\qa\02-desktop-1400x900-clima.png`
- Móvil ~390x844 (bottom sheet, con tirador/handle, pestañas y panel de clima):
  `C:\Users\leonn\Documents\web\climate\qa\06-mobile-bottom-sheet.png`
- Capturas adicionales:
  - `C:\Users\leonn\Documents\web\climate\qa\01-desktop-inicial.png` (carga inicial — evidencia de tiles "API KEY REQUIRED")
  - `C:\Users\leonn\Documents\web\climate\qa\03-desktop-lima-buscado.png`
  - `C:\Users\leonn\Documents\web\climate\qa\04-desktop-tema-claro-unidades-f.png`
  - `C:\Users\leonn\Documents\web\climate\qa\05-desktop-tema-oscuro-actual.png`
Nota: las capturas 01/03/04/05 quedaron a 1920x1080 por limitación del capturador; 02 y 06 tienen el tamaño exacto solicitado.

## Errores de consola (literales)
- `console.error`: **sin errores** (vacío).
- Excepciones no capturadas: **ninguna**.
- Consola global (log/warn/error): **vacía**. No apareció ningún error durante la interacción.

## Problemas visuales / de datos detectados
1. **Basemap oscuro roto (crítico):** el mapa inicial usa CARTO `dark_all` que devuelve el placeholder "API KEY REQUIRED" (los requests son 200 pero la imagen no es un mapa). El mapa se ve con esa marca de agua repetida. Solo tras cambiar de tema pasó a tiles OSM correctos.
2. **Solapamiento/posición del zoom:** en escritorio el control de zoom (+, −) y el botón de capas quedan arriba a la izquierda sobre el mapa, sin solaparse con el panel; correcto. En la vista de escritorio inicial hay un cuadro central "Cargando…"/"Consultando clima…" que permanece visible un tiempo largo.
3. **Desbordamiento horizontal en móvil:** a 390 px el documento mide 429 px (`scrollWidth` 429 > 390), lo que recorta el control más a la derecha del encabezado (icono de tema 🌙/☀️) en el borde.
4. **Desplegable de búsqueda:** 3 de 4 resultados no exponen texto en el árbol de accesibilidad (posible problema de render/estructura de esos ítems).
5. **Positivo:** no se observaron métricas en "—", iconos rotos ni chips vacíos en "Qué ponerte".

## Conclusión
La app funciona (flujo de clima, búsqueda, guardado, unidades, tema, layout móvil bottom-sheet)
y no lanza errores de consola. Único fallo funcional relevante: **los tiles del mapa en la
carga inicial (basemap oscuro CARTO) no renderizan** ("API KEY REQUIRED").
