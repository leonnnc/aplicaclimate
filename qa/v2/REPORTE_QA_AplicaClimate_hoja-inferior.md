

---

# Addendum 3 — Fotos del personaje en "Qué ponerte" (webp) y tamaño

> Nota: el texto de la tarea llegó **truncado** (solo se veía el inicio del punto 1; ~1786 caracteres omitidos). Se verificaron los aspectos descritos con evidencia medida.

Recarga completa: SW desregistrado + cachés `aplicaclimate-v3`/`aplicaclimate-tiles-v3` borradas + HTTP cache deshabilitada.

## 1. FOTO VISIBLE — PASS
- En "Qué ponerte" hay un `<figure>` con `<img>`; el src actual es `assets/outfits/calido.webp` (Lima, 24°).
- Es una **fotografía real** (verificada visualmente): mismo personaje urbano, mismo fondo de calle/edificio/auto, con ropa distinta según la temperatura. Ya no son ilustraciones vectoriales planas.
- `naturalWidth/Height` = **360 × 480**, `complete: true`, `object-fit: cover`.

## 2. LAS 5 FOTOS EXISTEN Y CARGA CADA UNA — PASS
| Archivo | HTTP | Tipo | Bytes |
|---|---|---|---|
| `assets/outfits/verano.webp` | 200 | image/webp | 16 626 |
| `assets/outfits/calido.webp` | 200 | image/webp | 15 136 |
| `assets/outfits/templado.webp` | 200 | image/webp | 18 258 |
| `assets/outfits/frio.webp` | 200 | image/webp | 16 380 |
| `assets/outfits/extremo.webp` | 200 | image/webp | 16 660 |

## 3. TAMAÑO DENTRO DE LA TARJETA — medido
- Imagen mostrada: **152 × 203 px** (escritorio, `object-fit:cover`).
- CSS `.outfit-figure img`: regla 1 = **152×203 px**, regla 2 = **104×132 px** (móvil).
- `<figure>`: 353 px de ancho.

## 4. DISTINTA ROPA SEGÚN LA TEMPERATURA — PASS
| Lugar | Temp | Imagen | Título |
|---|---|---|---|
| La Rinconada, Puno | 5° | `extremo.webp` | "Ropa de frío extremo · 5°" |
| Callao | 23° | `templado.webp` | "Ropa de entretiempo · 23°" |
| Lima | 24° | `calido.webp` | "Ropa de clima cálido · 24°" |
| Iquitos, Loreto | 32° | `verano.webp` | "Ropa de verano · 32°" |

Lógica en `js/clothing.js`: `IMAGES = { xheat/heat:'verano', warm:'calido', mild/cool:'templado', cold/verycold:'frio', freezing/extreme:'extremo' }` y en `js/app.js` se aplica `b.image = b.image.replace(/\.png$/i, '.webp')` (por eso el bundle referencia `.png` pero en runtime sirve `.webp`).

## 5. ERRORES DE CONSOLA — PASS
**Sin errores** (`errors: []`, log nivel error vacío) tras carga, búsquedas y cambios de temperatura.

## Capturas
- `C:\Users\leonn\Documents\web\climate\qa\v2\31_outfit_calido.png` (tarjeta "Qué ponerte" con foto, Lima 24°)
- `C:\Users\leonn\Documents\web\climate\qa\v2\32_panel_AplicaClimate.png` (panel completo)
- `C:\Users\leonn\Documents\web\climate\qa\v2\30_outfit_extremo.png` (tarjeta con foto de frío extremo, 5°)
