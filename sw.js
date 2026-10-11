/* AplicaClimate — service worker.
   Estrategia:
   - Shell de la app (HTML, CSS, JS, iconos, ilustraciones): red primero, con
     respaldo en caché para poder abrir sin conexión.
   - Tiles del mapa: caché primero con cupo limitado, para que la zona ya vista
     siga viéndose sin conexión.
   - Datos meteorológicos y geocodificación: nunca se cachean aquí (la app guarda
     su propia copia del pronóstico en localStorage). */
var VERSION = 'v3';
var CACHE = 'aplicaclimate-' + VERSION;
var TILE_CACHE = 'aplicaclimate-tiles-' + VERSION;
var TILE_HOSTS = [
  'tile.openstreetmap.org',
  'tile.opentopomap.org',
  'server.arcgisonline.com'
];
var TILE_LIMIT = 400;

var SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/util.js',
  'js/weather.js',
  'js/clothing.js',
  'js/places.js',
  'js/app.js',
  'vendor/leaflet/leaflet.js',
  'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/marker-icon.png',
  'vendor/leaflet/images/marker-shadow.png',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'assets/outfits/verano.png',
  'assets/outfits/calido.png',
  'assets/outfits/templado.png',
  'assets/outfits/frio.png',
  'assets/outfits/extremo.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(SHELL.map(function (url) {
        // un archivo ausente no debe romper la instalación
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k === CACHE || k === TILE_CACHE) return null;
        return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Recorta la caché de tiles a las últimas TILE_LIMIT entradas */
function trimTiles() {
  caches.open(TILE_CACHE).then(function (cache) {
    cache.keys().then(function (keys) {
      if (keys.length <= TILE_LIMIT) return;
      var extra = keys.length - TILE_LIMIT;
      for (var i = 0; i < extra; i++) cache.delete(keys[i]);
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  /* ---- Tiles del mapa: caché primero ---- */
  if (TILE_HOSTS.indexOf(url.hostname) >= 0) {
    event.respondWith(
      caches.open(TILE_CACHE).then(function (cache) {
        return cache.match(req).then(function (cached) {
          if (cached) return cached;
          return fetch(req).then(function (res) {
            if (res && res.ok) {
              cache.put(req, res.clone());
              trimTiles();
            }
            return res;
          });
        });
      })
    );
    return;
  }

  /* ---- Datos y geocodificación: siempre a la red ---- */
  if (url.origin !== self.location.origin) return;

  /* ---- Shell de la app: red primero, caché como respaldo ---- */
  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('index.html');
        return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
