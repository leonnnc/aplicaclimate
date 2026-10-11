

---

# Addendum 8 — Atribución: icono/bandera oculto y peso visual

Recarga completa. Basemap de prueba: **Calles (OSM)**.

## 1. HTML interno exacto de `.leaflet-control-attribution`
```html
<div class="leaflet-control-attribution leaflet-control">
  <a href="https://leafletjs.com" title="A JavaScript library for interactive maps">
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="leaflet-attribution-flag">
      <path fill="#4C7BE1" d="M0 0h12v4H0z"></path>
      <path fill="#FFD500" d="M0 4h12v3H0z"></path>
      <path fill="#E0BC00" d="M0 7h12v1H0z"></path>
    </svg>
    Leaflet
  </a>
  <span aria-hidden="true">|</span> © OpenStreetMap
</div>
```
- El recuadro **azul/amarillo** es el **logo de Leaflet** en SVG: `class="leaflet-attribution-flag"` (azul `#4C7BE1`, amarillo `#FFD500`, amarillo oscuro `#E0BC00`).
- Regla aplicada: `.leaflet-control-attribution .leaflet-attribution-flag { display: none !important; }` → **oculto** ✅ (medido: `getComputedStyle(flag).display === "none"`).
- Con Satélite el texto pasa a "…| Imágenes © Esri, Maxar, Earthstar Geographics".

## 2. Calles (OSM) + hoja REPLEGADA — intersecciones
**654×741** (panel top=589) — ✅ PASS
| Elemento | rect (x1,y1,x2,y2) |
|---|---|
| `#coords` | [10, 550, 126, 579] |
| `.view-place` | [10, 507, 389, 537] |
| `.leaflet-control-attribution` | [514, 562, 654, 579] |

coords/atribución **0×17 = 0 px²** ✅ · chip/atribución **0×0 = 0 px²** ✅ · coords/chip **116×0 = 0 px²** ✅

**390×844** (panel top=692) — ✅ PASS
| Elemento | rect |
|---|---|
| `#coords` | [10, 653, 126, 682] |
| `.view-place` | [10, 613, 236, 640] |
| `.leaflet-control-attribution` | [250, 665, 390, 682] |

coords/atribución **0×17 = 0** ✅ · chip/atribución **0×0 = 0** ✅ · coords/chip **116×0 = 0** ✅

(Extra, 390×844 expandida: `#coords` [10,248,126,277], `.view-place` [10,212,236,239], atribución [250,260,390,277] → también **0** en todos.)

## 3. El nombre de la zona ya no queda bajo el recuadro — ✅ PASS
- 654: chip borde derecho = **389** < atribución borde izquierdo = **514** → no se solapan.
- 390: chip derecho = **236** < atribución izquierdo = **250** → no se solapan.
- Texto del chip: 654 → **"📍 Palm Bay · Condado de Brevard, Florida, Estados Unidos de América"**; 390 → **"📍 Hendry County · Florida, Estados Unidos de América"**.
- Sí termina en puntos suspensivos **por su propio `text-overflow: ellipsis`** (nombre largo): 654 `scrollWidth 417 > clientWidth 377`; 390 `scrollW 302 > clientW 224`. **No es a causa de la atribución** (no hay solape).

## 4. Estilo calculado de la atribución — ✅ PASS
- `background-color`: **rgba(9, 15, 28, 0.66)** (oscuro translúcido) + `backdrop-filter: blur(4px)`
- `color`: **rgba(226, 234, 248, 0.78)**
- `font-size`: **10.5px** (`white-space: normal`, `max-width: calc(100vw − 152px)`)
→ Se ve como una **franja oscura translúcida**, no un cartel blanco. ✅

## 5. Capturas
- `C:\Users\leonn\Documents\web\climate\qa\v2\80_654_streets_collapsed.png`
- `C:\Users\leonn\Documents\web\climate\qa\v2\81_390_streets_collapsed.png`

## 6. Errores de consola
**Sin errores** (`errors: []`).

## Estado final
Basemap **restaurado a Satélite** (como estaba al empezar) y viewport **390×844** (como se encontró).
