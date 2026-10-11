# AplicaClimate

App de clima sobre mapa: **toca cualquier punto del mapa y ves el clima muy detallado de ese lugar**, con recomendaciones de **qué ropa ponerte** según frío/calor, lluvia, viento y UV. Guarda lugares con nombre propio, tiene zoom, búsqueda, y funciona como app de **escritorio (Windows)** y **móvil (Android)** desde un mismo código.

- Sin API keys, sin registro, sin servidor propio.
- Un solo código web → web (PWA) + escritorio (Electron) + Android (Capacitor).

---

## 1. Qué hace

**Mapa**
- Leaflet con 4 mapas base: Oscuro (Esri Dark Gray Base + etiquetas), Calles (OSM), Relieve (OpenTopoMap) y Satélite (Esri World Imagery).
- Zoom, paneo, lectura de coordenadas en vivo mientras mueves el cursor.
- Clic en cualquier punto → marca arrastrable + carga de datos.
- Búsqueda por nombre, dirección o `lat, lon` (Nominatim, con respaldo en Open-Meteo Geocoding).
- Botón 📍 "Mi ubicación".
- Clic en el mapa = "apuntar" un punto; puedes ponerle **nombre** y **guardarlo**.

**Clima detallado** (Open-Meteo, modelo horario, zona horaria automática)
- Ahora: temperatura, sensación térmica, condición con icono, máx/mín del día.
- Métricas: viento + dirección, ráfagas, humedad, punto de rocío, presión, nubosidad, visibilidad, índice UV (con etiqueta Bajo→Extremo), precipitación, nieve, probabilidad de lluvia en 6 h, amanecer y atardecer.
- Calidad del aire: AQI europeo + PM2.5, PM10, O₃, NO₂, SO₂, CO.
- Próximas 24 horas (hora a hora, con icono día/noche según amanecer/atardecer).
- Próximos 7 días con rango térmico, lluvia, UV y viento.
- Avisos automáticos: tormenta, lluvia fuerte, niebla, ráfagas fuertes, visibilidad reducida, golpe de calor, hipotermia, congelación.

**Qué ponerte** (motor de vestimenta, `js/clothing.js`)
- 9 bandas de temperatura efectiva: Calor extremo → Frío extremo, cada una con recomendaciones por capa (parte superior, inferior, calzado, capa exterior, accesorios).
- Ajusta la recomendación según **actividad** (tranquila / normal / activa / deporte) y **sensibilidad personal** (friolento/a · normal · caluroso/a).
- Suma capas y consejos por lluvia, nieve, viento, UV alto, humedad y si es de noche.
- Frase resumen rápida tipo: *"Manga larga + jeans + casaca ligera o rompevientos + impermeable."*

**Lugares guardados**
- Guarda puntos con nombre; se almacenan en el dispositivo (localStorage).
- Lista con temperatura actual de cada lugar (una sola petición para todos).
- Renombrar, eliminar, **exportar/importar JSON** para respaldar o pasar a otro dispositivo.

**UI**
- Español, tema claro/oscuro, unidades °C·km/h ↔ °F·mph.
- Responsive: panel lateral en escritorio, *bottom sheet* plegable en móvil.

---

## 2. Requisitos

- Node.js 18 o superior (probado con Node 22).
- Python 3 con Pillow **solo** si quieres regenerar los iconos (`pip install pillow`).
- Para Android: Android Studio + JDK 17.
- Conexión a internet (los tiles del mapa y los datos de clima son online).

---

## 3. Ejecutar en el navegador (desarrollo)

```bash
npm install          # instala Leaflet (única dependencia de la app)
npm run dev          # sirve en http://127.0.0.1:4173
```

Abre `http://127.0.0.1:4173`.

**Probar desde el celular** (misma red Wi-Fi):

```bash
npm run dev:lan      # sirve en todas las interfaces, puerto 8080
```

Al arrancar imprime la dirección IP local que debes abrir en el teléfono (por ejemplo `http://192.168.1.25:8080/`). Ten en cuenta que por HTTP normal, en una IP de red, el navegador del celular **no** concederá geolocalización ni registrará el service worker: eso requiere HTTPS o `localhost`. El resto de la app funciona con normalidad.

Pruebas incluidas:

```bash
npm test             # servidor local: rutas, tipos MIME, 404 y bloqueo de traversal
npm run smoke        # servicios externos: clima, geocodificación y tiles
```

---

## 4. App de escritorio (Windows, Electron)

```bash
npm run desktop:install     # instala electron + electron-builder (una sola vez)
npm run desktop             # abre la app
npm run desktop:build       # genera los instalables en release/
```

Artefactos generados en `release/`:

| Archivo | Qué es |
|---|---|
| `AplicaClimate Setup 0.1.0.exe` | Instalador NSIS: elegís carpeta, crea accesos directos en escritorio y menú inicio |
| `AplicaClimate 0.1.0.exe` | Versión **portátil**: se ejecuta sin instalar nada |
| `win-unpacked/` | App sin empaquetar (para depurar) |

La ventana de escritorio sirve la app por HTTP en un puerto libre de `127.0.0.1` (no usa `file://`), así que `fetch`, geolocalización y service worker se comportan igual que en Chrome.

> Notas: en escritorio, "Mi ubicación" depende del proveedor de geolocalización de Chromium, que puede requerir la variable `GOOGLE_API_KEY`. Si no está disponible, usa el buscador (funciona siempre). Para poner tu nombre o empresa como editor del instalador, edita el campo `author` de `package.json` y vuelve a compilar. Si Windows bloquea el ejecutable, mira §13.

---

## 5. App móvil (Android, Capacitor)

```bash
npm run cap:install      # instala @capacitor/cli, core y android
npm run build:web        # copia la app web a dist/
npm run cap:add          # crea el proyecto Android (una sola vez)
npm run cap:sync         # build:web + cap sync
npm run cap:open         # abre Android Studio
npm run cap:run          # compila e instala en un dispositivo/emulador conectado
```

En Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.

Antes de compilar, añade los permisos de ubicación en `android/app/src/main/AndroidManifest.xml` (fuera de `<application>`):

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

Iconos de la app: `icons/icon-1024.png` es la imagen base. Puedes generar los recursos de Android automáticamente con:

```bash
npx @capacitor/assets generate --android --iconBackgroundColor "#0b1220" --iconBackgroundColorDark "#0b1220"
```

---

## 6. Modo web (build y despliegue)

La app es 100 % estática: no necesita backend, base de datos ni variables de entorno.

```bash
npm run build:web     # genera dist/ con todo lo necesario
npm run preview       # build:web + sirve dist/ en http://127.0.0.1:4174 (prueba del build real)
```

`dist/` contiene: `index.html`, `css/`, `js/`, `vendor/leaflet/`, `icons/`, `manifest.webmanifest` y `sw.js` (~0,36 MB en total). El script excluye los mapas de depuración y el build de fuentes de Leaflet, y **valida** que todo recurso referenciado por `index.html` exista en `dist/`, fallando el build si falta algo.

### Publicar

Sube **el contenido de `dist/`** tal cual a cualquier hosting estático:

| Hosting | Cómo |
|---|---|
| Netlify | Arrastra la carpeta `dist` al panel, o `netlify deploy --dir=dist --prod` |
| Vercel | `vercel deploy dist --prod`, o arrastra la carpeta |
| GitHub Pages | Copia el contenido de `dist/` a la rama `gh-pages` |
| Cloudflare Pages / Firebase Hosting | Publica `dist/` como directorio raíz |

Requisitos del hosting:

- **HTTPS obligatorio** (o `localhost`): la geolocalización y el service worker no funcionan en contexto no seguro.
- `index.html` debe estar en la raíz del sitio publicado. La app usa rutas **relativas**, así que también funciona dentro de un subdirectorio (`https://midominio.com/clima/`).
- No hacen falta reglas de reescritura ni CORS: es una sola página y las API (Open-Meteo, Nominatim, tiles) se llaman directamente desde el navegador.

### Instalar como app (PWA)

Con la web ya publicada en HTTPS:

- **Chrome / Edge (escritorio o Android)**: menú del navegador → *Instalar app* (o el icono de instalar de la barra de direcciones). Queda con su icono propio, en ventana independiente y sin barra del navegador.
- **iPhone / iPad**: Safari → Compartir → *Añadir a pantalla de inicio*.

`sw.js` cachea el shell (HTML, CSS, JS, Leaflet e iconos) con estrategia de **red primero**, por lo que las actualizaciones se ven al instante y la app abre sin conexión; los datos de clima y los tiles siempre requieren internet.

---

## 7. Estructura del proyecto

```
climate/
├─ index.html                     estructura de la interfaz
├─ css/styles.css                 tema claro/oscuro, panel lateral y bottom sheet móvil
├─ js/
│  ├─ util.js                     almacenamiento, formato de fechas/números, brújula, colores por temperatura
│  ├─ weather.js                  Open-Meteo (pronóstico, multi-punto, aire) + Nominatim + respaldos
│  ├─ clothing.js                 motor de recomendación de vestimenta (bandas y reglas)
│  ├─ places.js                   lugares guardados, exportar/importar
│  └─ app.js                      mapa Leaflet, búsqueda, panel, renderizado
├─ vendor/leaflet/                Leaflet 1.9.4 (local, sin CDN)
├─ icons/                         icono SVG + PNG (192, 512, 1024, maskable)
├─ scripts/
│  ├─ static-server.js            servidor estático reutilizado por dev y Electron
│  ├─ serve.js                    npm run dev / preview / dev:lan
│  ├─ build-web.js                npm run build:web (genera y valida dist/)
│  ├─ test-server.js              npm test (pruebas del servidor local)
│  ├─ smoke-test.js               npm run smoke (verifica APIs, geocodificación y tiles)
│  └─ make_icons.py               npm run icons (regenera PNG con Pillow)
├─ electron/main.js               ventana de escritorio + menú
├─ electron-builder.json          empaquetado Windows (salida en release/)
├─ electron-builder.fresh.json    empaquetado Windows con salida en release-build/ (alternativa)
├─ capacitor.config.json          empaquetado Android (webDir: dist)
├─ manifest.webmanifest           PWA
├─ sw.js                          service worker (red primero, respaldo en caché)
├─ dist/                          build web generado (se publica)
├─ release/                       instalables de Windows generados
└─ release-build/                 build alternativo (carpeta de salida limpia)
```

---

## 8. Personalizar

- **Ropa**: en `js/clothing.js` están las bandas (`BANDS`) con sus prendas por capa y las reglas de lluvia/viento/UV. Cambiar un texto o un umbral de temperatura no requiere tocar nada más.
- **Mapas base**: añade una entrada en `BASEMAPS` (`js/app.js`) con `layers: [{ url, options }]`, `maxZoom` y `attribution`.
- **Colores y tamaños**: variables CSS en `:root` y `html[data-theme="light"]` (`css/styles.css`).
- **Unidades**: `state.unit` en `js/app.js` (`metric` | `imperial`) controla solo la presentación; el motor de vestimenta siempre calcula en métrico.

---

## 9. Fuentes de datos y atribución

| Dato | Servicio | Licencia / notas |
|---|---|---|
| Pronóstico, histórico, calidad de aire | [Open-Meteo](https://open-meteo.com/) | Uso gratuito sin API key; datos CC-BY 4.0 |
| Búsqueda y geocodificación inversa | [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap) | ODbL; uso ligero. Respaldos: Open-Meteo Geocoding y BigDataCloud |
| Mapa "Calles" | `tile.openstreetmap.org` | © colaboradores de OpenStreetMap |
| Mapa "Oscuro" | Esri *World Dark Gray Canvas* (Base + Reference) | Tiles © Esri. Sin API key. *Nota: los tiles oscuros de CARTO ahora exigen clave, por eso no se usan.* |
| Mapa "Relieve" | OpenTopoMap | CC-BY-SA |
| Mapa "Satélite" | Esri World Imagery | © Esri, Maxar, Earthstar Geographics |

Si publicas esta app, mantén la atribución visible (Leaflet la muestra en la esquina del mapa) y respeta las políticas de uso de Nominatim (uso ligero y máximo ~1 petición por segundo; la app ya aplica *debounce* y solo consulta al seleccionar o buscar).

---

## 10. Privacidad

- La ubicación se usa solo para consultar el clima y se envía únicamente a Open-Meteo/Nominatim.
- Los lugares guardados y las preferencias viven en el almacenamiento local del dispositivo. No hay backend ni telemetría.

---

## 11. Limitaciones conocidas y siguientes pasos

- Necesita internet para tiles y datos (el shell de la app sí queda cacheado para abrir sin conexión).
- El pronóstico es de modelo global/horario; la resolución en zonas de montaña es limitada.
- "Mi ubicación" en escritorio puede requerir `GOOGLE_API_KEY` (ver §4).
- El mapa oscuro usa tiles de Esri con detalle nativo hasta zoom 16 (se escala por encima de ese nivel).
- En equipos con **Smart App Control** activo, los ejecutables locales sin firma quedan bloqueados (ver §13). El modo desarrollo y el modo web no se ven afectados.
- Próximos pasos sugeridos: alertas por lugar guardado, gráfico de temperatura de 7 días, comparación lado a lado de dos puntos, modo offline con la última consulta guardada, widget de Android, rutas con clima por tramo.

---

## 12. Solución de problemas

**`EBUSY: resource busy or locked, unlink ...asar` al ejecutar `npm run desktop:build`**

Algo del sistema (antivirus o indexador) mantiene abierto un `.asar` dentro de `release\win-unpacked.tmp`. Como esa carpeta es un residuo de un intento anterior, cada compilación nueva intenta borrar un archivo bloqueado y vuelve a fallar en el mismo punto, aunque el código esté bien.

Qué hacer, en orden:

1. Cierra la app si está abierta (una app en ejecución bloquea sus propios archivos).
2. Intenta borrar el residuo:

   ```powershell
   Remove-Item -Recurse -Force release\win-unpacked.tmp
   ```

   Si responde *"El proceso no puede obtener acceso al archivo ... porque está siendo utilizado en otro proceso"*, pasa al punto 3.
3. Compila con una **carpeta de salida nueva**, que no toca el archivo bloqueado. El proyecto ya incluye `electron-builder.fresh.json`, que escribe en `release-build/`:

   ```powershell
   npx electron-builder --win --config electron-builder.fresh.json
   ```

   *(Ojo: `-c.directories.output=...` en la línea de comandos **no** funciona como override; electron-builder lo interpreta como la ruta de un archivo de configuración y falla con `ENOENT`.)*
4. Solución definitiva: excluir la carpeta del proyecto del escaneo en tiempo real (Seguridad de Windows → Protección antivirus y contra amenazas → Administrar la configuración → Exclusiones). Requiere permisos de administrador.

**`spawn UNKNOWN` al final del build, en el paso del instalador NSIS**

Windows bloqueó la ejecución de un ejecutable auxiliar recién extraído. Es el mismo tipo de bloqueo que describe §13 (Control de aplicaciones). El empaquetado (`win-unpacked/`) suele quedar completo y ejecutable; lo que falla es el empaquetado final del instalador.

**`npm run desktop` no abre la ventana**

La app es de instancia única: si ya hay una abierta, la segunda invoca a la primera. Revisa que el log muestre `[AplicaClimate] servidor local: http://127.0.0.1:<puerto>/` y `[AplicaClimate] ventana lista.`; si aparece un `did-fail-load`, el puerto local fue interceptado (proxy, firewall) y conviene probar `npm run dev` en el navegador para aislar el problema.

**El mapa se ve vacío o gris**

Los tiles son online: sin internet el mapa no carga (el resto de la interfaz sí). Si tu red bloquea tiles, en `js/app.js` puedes reemplazar las URL de `BASEMAPS` por las de tu proveedor.

---

## 13. Si Windows bloquea la app ("Control de aplicaciones")

Algunos equipos tienen **Smart App Control** activo, que **impide ejecutar programas sin firma digital reputada**. El síntoma exacto al lanzar el ejecutable es:

> Este comando no se puede ejecutar debido al error: Una directiva de Control de aplicaciones bloqueó este archivo.

Para saber si está activo en tu equipo:

```powershell
Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy' | Select-Object VerifiedAndReputablePolicyState
```

`1` significa que está activo. También se ve en Seguridad de Windows → *Control de aplicaciones y navegador* → Smart App Control.

Qué implica:

- Los ejecutables que genera `npm run desktop:build` **no están firmados** (firmar requiere un certificado de firma de código comercial), así que en ese equipo Windows los bloquea al abrirlos, igual que a cualquier otro programa propio sin firmar.
- En el mismo equipo **sí funcionan**: `npm run desktop` (usa el binario oficial de Electron, firmado por su fabricante) y la app en el navegador (`npm run dev`) o instalada como PWA (§6). Es el camino recomendado mientras Smart App Control esté activo.
- Los ejecutables generados funcionan con normalidad en equipos **sin** Smart App Control.

Opciones, de menor a mayor impacto:

1. **No instalar nada**: usar `npm run desktop` o la PWA. No toca la configuración del sistema.
2. **Firmar el build** con un certificado de firma de código: es la solución "correcta" para distribuir la app a terceros.
3. **Desactivar Smart App Control** desde Seguridad de Windows. Advertencia: según Microsoft, desactivarlo impedía volver a activarlo sin reinstalar Windows; hay reportes recientes de que Windows ya permite alternarlo, pero conviene comprobarlo en tu equipo antes de decidir. No lo hagas a la ligera.

---

## 14. Novedades de la versión 0.2

Todo lo que sigue ya está aplicado y verificado en navegador (sin errores de consola).

**Pantalla de inicio con verificación del equipo**
- Al abrir la app aparece una intro con barra de progreso que, antes de mostrar el mapa: comprueba las herramientas del dispositivo (almacenamiento, conexión, GPS, brújula, vibración, compartir, caché sin conexión, zona horaria y pronósticos guardados), espera a que el mapa cargue sus tiles y descarga el primer pronóstico. Solo entonces se oculta (o antes, si pulsas **Entrar ahora**).

**Corrección importante**
- El aviso "Cargando…" con spinner quedaba visible para siempre: su regla CSS `display: flex` anulaba el atributo `hidden`. Corregido con `[hidden] { display: none !important }` para todos los elementos ocultables.

**Mapa con nombres y calles de verdad**
- El mapa base "Oscuro" ahora usa los tiles de OpenStreetMap invertidos por CSS: se ven países, ciudades, provincias **y nombres de calles**, con detalle nativo hasta **zoom 19** (antes el mapa oscuro se quedaba en zoom 16 sin detalle de calle).

**Saber siempre qué estás viendo**
- El marcador lleva una **etiqueta permanente** con el nombre del lugar y su temperatura.
- Un chip sobre el mapa muestra el **nombre de la zona que estás mirando** (geocodificación inversa del centro, con uso prudente de Nominatim).

**Modo sin conexión con pronóstico de 7 días**
- Cada punto consultado guarda su pronóstico completo (7 días, métricas, extras y calidad del aire) en el dispositivo (hasta 24 puntos).
- Sin conexión, la app abre igual y muestra los datos guardados con el aviso **"📴 Sin conexión · datos del <fecha y hora>"** y el banner que indica de cuándo son. Con conexión: **"✔ Actualizado hace …"**, que se refresca solo cada 10 minutos.
- El service worker ahora también cachea los tiles vistos (hasta 400), así que la zona que ya miraste sigue visible sin internet.

**Maniquí de vestimenta**
- La tarjeta "Qué ponerte" muestra una **ilustración del maniquí con la ropa** correspondiente (5 ilustraciones en `assets/outfits/`: verano, cálido, entretiempo, abrigo y frío extremo), el título de la ropa y los **accesorios concretos** (qué gorra, qué guantes, qué gafas) según el caso.

**Más datos y más detalle**
- Nueva sección **"📊 Más datos"** con 14 variables adicionales: radiación solar y directa, nivel de congelación, tendencia a 3 h, humedad y temperatura del suelo, evapotranspiración, espesor de nieve, visibilidad mínima a 12 h, nubes por capas (baja/media/alta), horas de sol, duración del día, horas con lluvia y presión superficial.
- En la lista de 7 días, **toca un día** para desplegar su detalle hora a hora (hora, icono, temperatura, probabilidad de lluvia, viento y UV).
- La franja de 24 horas ahora incluye el viento de cada hora.

**Brújula y herramientas del equipo**
- **Brújula del viento**: la métrica de viento incluye un dial que apunta a la dirección del viento, además del rumbo en texto.
- **Brújula del mapa** (esquina superior derecha): usa el magnetómetro del equipo al tocarla; en iOS pide permiso. La aguja marca tu rumbo y muestra los grados.
- Sección **"🧭 Herramientas del dispositivo"**: estado de cada capacidad del equipo y acciones de **Compartir**, **Copiar coordenadas**, **Activar brújula** y **Mantener pantalla activa** (útil al aire libre). En móvil además vibra al seleccionar un punto.

**Notas de mantenimiento**
- `npm run build:web` ahora incluye la carpeta `assets/` (el paquete publicable pasa a ~0,82 MB).
- El service worker subió a la versión `v3`; si publicas cambios del shell, sube `VERSION` en `sw.js` para forzar la actualización.
- En pantallas de escritorio, los controles de la esquina derecha del mapa se desplazan 402 px para no quedar bajo el panel (brújula y atribución visibles).

---

## 15. Mantener la app siempre disponible

La app son solo archivos estáticos: lo único que hace falta es **servirlos**. Hay tres formas, de menor a mayor permanencia.

> **Por qué antes se cerraba sola**: los procesos que lanzo yo desde mi entorno de ejecución quedan en segundo plano y se terminan a los **15 minutos**. Es un límite fijo de mi sandbox, no una opción de AplicaClimate ni algo configurable. Por eso la permanencia se resuelve con cualquiera de las tres opciones siguientes, que corren en tu equipo o en internet.

### 1. Doble clic (para el día a día)

Ejecuta **`Iniciar AplicaClimate.bat`** (en la raíz del proyecto): busca Node.js, levanta el servidor en `http://127.0.0.1:4173` y **abre el navegador solo**. El servidor vive mientras esa ventana esté abierta; `Ctrl + C` o cerrarla lo detiene.

### 2. Que arranque sola al iniciar sesión (siempre activa en este equipo)

Crea una tarea programada de Windows a tu nombre, sin necesidad de permisos de administrador. En Node ya instalado en este equipo la ruta es `C:\Program Files\nodejs\node.exe`:

```powershell
schtasks /create /tn "AplicaClimate" /tr "\"C:\Program Files\nodejs\node.exe\" \"C:\Users\leonn\Documents\web\climate\scripts\serve.js\" 4173" /sc onlogon /rl limited /f
```

Se ejecuta sin ventana después de cada inicio de sesión, así que la app queda disponible siempre. Para detenerla o quitarla:

```powershell
schtasks /end /tn "AplicaClimate"      # detener la ejecución actual
schtasks /delete /tn "AplicaClimate" /f   # quitar el inicio automático
```

Para probarla una vez sin esperar al próximo inicio de sesión: `schtasks /run /tn "AplicaClimate"`.

### 3. Publicarla en internet (activa 24/7, desde cualquier equipo)

`npm run build:web` y subir el contenido de `dist/` a Netlify, Vercel, Cloudflare Pages o GitHub Pages (ver §6). Al vivir en la nube no depende de que tu PC esté encendida, y en el celular se puede instalar como PWA desde el navegador.

### Notas

- El `.bat` también sirve como acceso directo: clic derecho → *Enviar a* → *Escritorio (crear acceso directo)*.
- Si el puerto 4173 estuviera ocupado, el servidor informa en la ventana en qué puerto quedó escuchando.
- En un equipo con Smart App Control activo, los ejecutables empaquetados sin firma están bloqueados (§13); por eso estas tres vías son las recomendadas en este equipo.

---

## 16. Novedades de la versión 0.3

**Vestimenta con personaje fotográfico**
- La tarjeta "Qué ponerte" ya no usa ilustraciones vectoriales planas: ahora muestra **fotografías reales del mismo personaje** (estilo urbano) con la ropa cambiada según la temperatura.
- El personaje va **a un lado de la tarjeta y más grande**: 152×203 px en escritorio, 126×168 px en tablet y 116×155 px en móvil, con la descripción y los accesorios al costado.
- Formato **WebP** a propósito, porque son fotografías: cada archivo pesa ~16 KB en lugar de los ~2,9 MB del PNG equivalente (de 14,6 MB a 81 KB en total). Así la app sigue liviana para la web y para el APK.
- Archivos: `assets/outfits/verano.webp`, `calido.webp`, `templado.webp`, `frio.webp`, `extremo.webp`.

**Qué imagen se muestra según la temperatura**

| Banda térmica | Archivo |
|---|---|
| Calor extremo, Calor | `verano.webp` |
| Cálido | `calido.webp` |
| Templado, Fresco | `templado.webp` |
| Frío, Muy frío | `frio.webp` |
| Helado, Frío extremo | `extremo.webp` |

**Cómo cambiar el personaje o la ropa**: reemplazá esos 5 archivos manteniendo los nombres (encuadre vertical 3:4, recomendado 360×480 px o más) y ejecutá `npm run build:web`. No hace falta tocar código: el mapeo banda → imagen está en `js/clothing.js`.

> Nota técnica: el control de recursos de `npm run build:web` detectó que `index.html` todavía apuntaba al PNG antiguo como imagen por defecto y abortó la compilación (código 1) — el fallo era real y se corrigió apuntando al `.webp`. Ese control es la red de seguridad que evita publicar una versión con imágenes rotas.

---

## 17. Novedades de la versión 0.4

**La hoja inferior se repliega de verdad (móvil y ventanas angostas)**

- Antes, al minimizar la hoja, el panel se desplazaba con `translateY(calc(100% - 108px))` —un cálculo frágil que dependía de la altura real del panel— y los elementos flotantes (atribución de los mapas, nombre de la zona y coordenadas) estaban anclados a `66dvh` fijo, así que **no acompañaban a la hoja** y quedaban flotando en medio del mapa.
- Ahora la hoja reduce su altura a un asomo compacto de **152 px** (asa + pestañas + nombre del lugar con sus coordenadas y hora) mediante una transición de altura, y **todo lo que flota se apoya en el borde real de la hoja**, repartido en tres líneas para que no se pisen: aviso del mapa arriba, nombre de la zona en medio, coordenadas abajo (la atribución, a la derecha).
- En pantallas bajas (menos de 620 px de alto) el asomo se reduce a 128 px y los avisos se reacomodan.
- Verificado con mediciones reales en 654×741 y 390×844 px, con la hoja replegada y expandida y con los cuatro mapas base: **todas las intersecciones entre avisos dieron 0 px²**, sin errores de consola.

**Dos correcciones técnicas que conviene registrar**

1. El primer intento usó el combinador de hermanos (`.panel.collapsed ~ .coords`), pero `.panel` es el **último** hijo de `main`, y `~` solo alcanza a los hermanos **posteriores**: ninguna regla coincidía y el fallo pasaba inadvertido. Se resolvió con `:has()` sobre el contenedor —`main.main:has(.panel.collapsed) …`—, que no depende del orden del DOM. Requiere Chrome/WebView 105+; el proyecto ya necesitaba 108+ por `dvh`, así que no agrega requisitos.
2. Con el mapa **Satélite**, la atribución de Esri (una cadena muy larga) se partía en dos líneas a todo el ancho y se montaba sobre el chip de coordenadas: **3364 px² de solape** medidos en pantalla angosta. Se confinó al sector derecho con `max-width: calc(100vw - 152px)`; la atribución sigue legible y ya no se pisa con nada.
