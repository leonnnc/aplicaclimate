

---

# Addendum 4 — Revisión del replegado de la hoja inferior

Recarga completa (SW desregistrado + cachés `aplicaclimate-v3` borradas + HTTP cache deshabilitada).

## PASO 1 — viewport 654×741

### 1. Mediciones (getBoundingClientRect)
**Hoja EXPANDIDA (clase `panel`):**
| Elemento | valor |
|---|---|
| `.panel` | height **489**, top y=252, bottom=741 |
| `.panel-body` | height **432**, scrollHeight 2247 |
| `.view-place` (#viewPlace) | bottom y=**242** → 499 px desde el fondo |
| `#coords` | bottom y=**242** → 499 px |
| `#mapHint` | bottom y=**242** → 499 px |
| `.leaflet-control-attribution` | bottom y=**242** → 499 px |
| `bottom` CSS de los flotantes | **499.06px** (= 10px + 66dvh; 66%·741=489.06) |

**Hoja REPLEGADA (clase `panel collapsed`, clic en `#sheetHandle`):**
| Elemento | valor |
|---|---|
| `.panel` | height **152**, top y=589 |
| `.panel-body` | height **95** |
| `.view-place` | bottom y=**242** → 499 px (SIN CAMBIO) |
| `#coords` | bottom y=**242** → 499 px (SIN CAMBIO) |
| `#mapHint` | bottom y=**242** → 499 px (SIN CAMBIO) |
| `.leaflet-control-attribution` | bottom y=**242** → 499 px (SIN CAMBIO) |

**Causa raíz (fallo del fix):** las reglas de replegado usan el combinador de hermanos:
`.panel.collapsed ~ .view-place { bottom:112px }`, `.panel.collapsed ~ .coords, .panel.collapsed ~ .map-hint, .panel.collapsed ~ .view-place { bottom:136px }` (esta última sólo en `@media (max-width:900px) and (max-height:620px)`) y `.panel.collapsed ~ #map .leaflet-bottom…`.
En el DOM real `main.main` tiene 6 hijos y **`.panel` es el ÚLTIMO (índice 5)**, mientras que `#viewPlace`=1, `#coords`=2, `#mapHint`=3 y `#map`=4 van **ANTES**. El combinador `~` sólo selecciona hermanos POSTERIORES, así que **ninguna** de esas reglas coincide y los flotantes conservan `bottom: calc(10px + 66dvh)`.
Además, la única regla de atribución replegada está en `@media (max-width:900px) and (max-height:620px)`, y con 741 px de alto no aplica.

### 2. Hoja replegada = 152 px y contenido visible — **PASS**
Mide 152 px y muestra: asa (`#sheetHandle`), pestañas "Clima | Lugares" y el nombre del lugar ("Tulsa"/"Logan County") con coords y hora. No hay botones cortados a medias (la barra Renombrar/Guardar/Actualizar queda por debajo, oculta por `overflow:hidden`).

### 3. Atribución y chips sobre el borde de la hoja — **FAIL**
Replegada, `.leaflet-control-attribution`, `#coords`, `#mapHint` y `.view-place` permanecen a **499 px del fondo (y=242)**, es decir **347 px POR ENCIMA** del borde de la hoja replegada (y=589). Quedan flotando en medio del mapa, no sobre el borde de la hoja.

### 4. Capturas
- Replegada: `C:\Users\leonn\Documents\web\climate\qa\v2\40_sheet_collapsed.png`
- Expandida: `C:\Users\leonn\Documents\web\climate\qa\v2\41_sheet_expanded.png`

### 5. Tocar una pestaña re-expande — **PASS**
Con la hoja replegada, clic en la pestaña "Lugares" (luego "Clima"): `.panel` vuelve a height **489** (y=252), clase `panel`.

### 6. Chip de zona rural — **PASS**
Búsqueda "Logan County, Oklahoma" → chip `#viewPlace` = **"📍 Logan County · Oklahoma, Estados Unidos de América"**. Ya **no repite** el nombre (subtítulo empieza en "Oklahoma", no en "Logan County").

## PASO 2 — viewport 390×844
- Hoja replegada: `.panel` height **152**, y=692; `.panel-body` height **95**.
- Flotantes: bottom y=**277** → **567 px** desde el fondo (= 10px + 66dvh; 66%·844=557.04); eso es **415 px por encima** del borde de la hoja replegada (y=692). Mismo FAIL que en 654×741.
- Captura: `C:\Users\leonn\Documents\web\climate\qa\v2\42_sheet_collapsed_390.png`

## Errores de consola
**Sin errores** (`errors: []`) tras recarga, replegado/expansión, cambio de pestaña y búsqueda.


---

# Addendum 5 — Verificación del re-anclaje con `:has()` (replegado de la hoja)

Recarga completa (SW desregistrado + caché `aplicaclimate-v3` borrada + HTTP cache deshabilitada).

## PASO 1 — 654×741, hoja REPLEGADA (panel y=589, h=152)

### 1. Valores de `bottom` — **PASS**
| Elemento | `bottom` CSS calc. | `rect.bottom` | px desde el fondo |
|---|---|---|---|
| `.view-place` | **162px** | 579 | **162** |
| `#coords` | **162px** | 579 | **162** |
| `#mapHint` | **162px** | 579 | **162** |
| `.leaflet-control-attribution` | `0px`* | 579 | **162** |

\* La atribución es un control Leaflet anclado vía `.leaflet-bottom` (por eso su `bottom` propio es 0), pero su `rect.bottom` queda igualmente a **579** → **162 px** del fondo, 10 px por encima del borde de la hoja (589). ✔ Coincide con lo pedido (~162).

### 2. Sin solapes con la hoja / no en medio del mapa — **PASS**
- Todos a `rect.bottom`=579 < 589 (borde de la hoja) → **ninguno tapado** por la hoja ni flotando en medio del mapa (todos pegados a su borde superior).
- **Atribución vs chip: NO se solapan** → chip `x 10–356`, atribución `x 447–654` (sin intersección).
- **Observación (no pedida):** el chip `#viewPlace` (`x 10–356`) **se solapa con `#coords`** (`x 10–126`): solape **116 × 29 px**; la parte "📍 Logan County ·" del chip queda oculta tras el chip de coordenadas.

### 3. Al EXPANDIR (panel y=252, h=489) — **PASS**
`.view-place`, `#coords`, `#mapHint` y `.leaflet-control-attribution`: todos `rect.bottom`=**242** → **499 px** del fondo (= 10px + 66dvh), 10 px sobre el borde de la hoja expandida.

### 4. Captura (654×741, replegada)
`C:\Users\leonn\Documents\web\climate\qa\v2\50_sheet_collapsed_fixed.png`

## PASO 2 — 390×844, hoja REPLEGADA (panel y=692, h=152)
### 5. Mediciones — **PASS en valores / FAIL en solape**
| Elemento | `bottom` CSS | `rect.bottom` | px desde el fondo |
|---|---|---|---|
| `.view-place` | 162px | 682 | **162** |
| `#coords` | 162px | 682 | **162** |
| `#mapHint` | 162px | 682 | **162** |
| `.leaflet-control-attribution` | 0px* | 682 | **162** |

Todos a 162 px del fondo (10 px sobre la hoja a 692) ✔. **Pero a 390 px de ancho la atribución SÍ se solapa con el chip:** chip `x 10–236` vs atribución `x 183–390` → solape **53 × 21 px**. También persiste el solape `#coords` vs chip (**116 × 27 px**).

## 6. Errores de consola — **PASS**
**Sin errores** (`errors: []`).


---

# Addendum 6 — Verificación de solapes (aviso/hint, chip, coords, atribución)

Recarga completa. Verificado con `browser_act evaluate` (la herramienta de consola quedaba colgada, ver nota al final).

## 654×741 — hoja REPLEGADA (panel top=589)
| Elemento | rect (x1,y1,x2,y2) | px desde el fondo |
|---|---|---|
| `#coords` | [10, 550, 126, 579] | 162 |
| `.view-place` | [10, 507, 389, 537] | 204 |
| `#mapHint` | [164, 447, 491, 501] | 240 |
| `.leaflet-control-attribution` | [260, 558, 654, 579] | 162 |

Intersecciones (ancho×alto / área): coords/chip 0 · chip/atrib 0 · coords/atrib 0 · chip/hint 0 · coords/hint 0 → **todas 0** ✅

## 654×741 — hoja EXPANDIDA (panel top=252)
| Elemento | rect | px desde el fondo |
|---|---|---|
| `#coords` | [10, 213, 126, 242] | 499 |
| `.view-place` | [10, 174, 389, 204] | 537 |
| `#mapHint` | [164, 114, 491, 168] | 573 |
| `.leaflet-control-attribution` | [260, 221, 654, 242] | 499 |

Intersecciones: **todas 0** ✅

## 390×844 — hoja REPLEGADA (panel top=692)
| Elemento | rect | px desde el fondo |
|---|---|---|
| `#coords` | [10, 653, 126, 682] | 162 |
| `.view-place` | [10, 613, 236, 640] | 204 |
| `#mapHint` | [98, 531, 293, 604] | 240 |
| `.leaflet-control-attribution` **(satélite)** | [0, 640, 390, 682] | 162 |
| `.leaflet-control-attribution` **(oscuro/defecto)** | [183, 661, 390, 682] | 162 |

- Con basemap **Satélite** (guardado en el equipo): coords/atribución = **116×29 = 3364 px² ❌** (la atribución "Leaflet | Imágenes © Esri, Maxar, Earthstar Geographics" **se parte en 2 líneas y ocupa todo el ancho 0–390**).
- Con basemap **Oscuro** (el defecto del código: `theme==='dark'?'dark':'streets'`): todas las intersecciones **0** ✅ (atribución 183–390).

## 390×844 — hoja EXPANDIDA (panel top=287)
| Elemento | rect | px desde el fondo |
|---|---|---|
| `#coords` | [10, 248, 126, 277] | 567 |
| `.view-place` | [10, 212, 236, 239] | 605 |
| `#mapHint` | [98, 130, 293, 203] | 641 |
| `.leaflet-control-attribution` **(satélite)** | [0, 235, 390, 277] | 567 |
| `.leaflet-control-attribution` **(oscuro/defecto)** | [183, 256, 390, 277] | 567 |

- Satélite: coords/atrib **3364 px² ❌**, chip/atrib **904 px² (226×4) ❌**.
- Oscuro: **todas 0** ✅.

## Punto 3 — apoyados en el borde de la hoja
La pila tiene 3 líneas: `#mapHint` arriba, `.view-place` en medio, `#coords` (+atribución) abajo. La **línea inferior queda a 10 px del borde** de la hoja en ambos estados (162 px replegada / 499 px expandida desde el fondo = top de la hoja − 10). El chip queda a 48/52 px y el hint a 84/88 px por encima (por diseño, cada uno en su línea). Todos **por encima** del borde, ninguno tapado.

## Capturas
- `C:\Users\leonn\Documents\web\climate\qa\v2\60_floating_collapsed_654.png`
- `C:\Users\leonn\Documents\web\climate\qa\v2\61_floating_collapsed_390.png`

## Errores de consola
**Sin errores** (`errors: []`).

## Nota técnica
La herramienta `browser_console` (Runtime.evaluate) se colgaba (timeout 120 s) en esta carga; se usó `browser_act kind:evaluate` con expresiones **síncronas** para todas las mediciones (las expresiones async también colgaban). El basemap guardado del usuario ("satellite") se cambió temporalmente a "dark" para medir y se **restauró** a "satellite".


---

# Addendum 7 — Atribución Esri (Satélite) confinada al sector derecho

Recarga completa. CSS nuevo verificado: `@media (max-width:900px){ .leaflet-control-attribution { max-width: calc(100vw - 152px); margin-left:auto; line-height:1.25; font-size:10.5px; white-space:normal } }`. Basemap: **Satélite**.

## 1. 390×844 — REPLEGADA (panel top=692) — ✅ PASS
| Elemento | rect (x1,y1,x2,y2) | px del fondo |
|---|---|---|
| `#coords` | [10, 653, 126, 682] | 162 |
| `.view-place` | [10, 613, 236, 640] | 204 |
| `.leaflet-control-attribution` | [152, 656, 390, 682] | 162 |

Intersecciones → coords/atribución **0×26 = 0 px²** ✅ · chip/atribución **84×0 = 0 px²** ✅

## 2. 390×844 — EXPANDIDA (panel top=287) — ✅ PASS
| Elemento | rect | px del fondo |
|---|---|---|
| `#coords` | [10, 248, 126, 277] | 567 |
| `.view-place` | [10, 212, 236, 239] | 605 |
| `.leaflet-control-attribution` | [152, 251, 390, 277] | 567 |

Intersecciones → coords/atribución **0×26 = 0** ✅ · chip/atribución **84×0 = 0** ✅

## 3. Atribución legible y sin tapar el chip — ✅ PASS
- Texto completo: **"Leaflet | Imágenes © Esri, Maxar, Earthstar Geographics"** (2 líneas dentro del max-width 238 px, `font-size:10.5px`, altura 26 px). No cortada a cero.
- Anclada a la derecha (`x 152–390`), el chip de coordenadas queda a la izquierda (`x 10–126`) → **126 < 152**, no lo tapa.

## 4. 654×741 con Satélite — ✅ PASS
EXPANDIDA (panel top=252):
| Elemento | rect | px del fondo |
|---|---|---|
| `#coords` | [10, 213, 126, 242] | 499 |
| `.view-place` | [10, 174, 356, 204] | 537 |
| `.leaflet-control-attribution` | [375, 229, 654, 242] | 499 |
Intersecciones → coords/atribución **0×13 = 0** ✅ · chip/atribución **0×0 = 0** ✅

REPLEGADA (panel top=589):
| Elemento | rect | px del fondo |
|---|---|---|
| `#coords` | [10, 550, 126, 579] | 162 |
| `.leaflet-control-attribution` | [375, 566, 654, 579] | 162 |
`.view-place` estaba oculto (`hidden`, 0×0) en ese momento; aun visible iría en `x 10–356`, y la atribución empieza en `375` → intersección **0** ✅. coords/atribución **0×13 = 0** ✅

## 5. Captura
`C:\Users\leonn\Documents\web\climate\qa\v2\70_390_satellite_collapsed.png`

## 6. Errores de consola
**Sin errores** (`errors: []`).

## Estado final
Basemap dejado en **Satélite** (como estaba) y viewport en **390×844** (como se encontró).

## Nota
El panel se auto-expande solo entre lecturas (la app vuelve a expandir al refrescar); las mediciones de arriba se tomaron tras esperar la transición (`transition: height 0.26s`).
