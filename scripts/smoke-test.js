/* Verificación rápida de los servicios externos que usa AplicaClimate.
   Uso: node scripts/smoke-test.js [lat] [lon]        →  npm run smoke  */
'use strict';

const lat = Number(process.argv[2] || -12.0464);
const lon = Number(process.argv[3] || -77.0428);
const UA = 'AplicaClimate/0.1 (verificación local; +https://open-meteo.com)';

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
const BDC = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

const CURRENT = ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day', 'precipitation',
  'rain', 'showers', 'snowfall', 'weather_code', 'cloud_cover', 'pressure_msl', 'surface_pressure',
  'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'];
const HOURLY = ['temperature_2m', 'apparent_temperature', 'precipitation_probability', 'precipitation',
  'weather_code', 'wind_speed_10m', 'wind_gusts_10m', 'uv_index', 'relative_humidity_2m', 'dew_point_2m', 'visibility'];
const DAILY = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'apparent_temperature_max',
  'apparent_temperature_min', 'sunrise', 'sunset', 'uv_index_max', 'precipitation_sum',
  'precipitation_probability_max', 'wind_speed_10m_max', 'wind_gusts_10m_max'];

let failures = 0;

function ok(name, detail) {
  console.log('  [ok]   ' + name + (detail ? ' — ' + detail : ''));
}
function bad(name, detail) {
  failures++;
  console.log('  [FALLA] ' + name + (detail ? ' — ' + detail : ''));
}
function checkKeys(block, keys, label) {
  const missing = keys.filter((k) => !(k in block));
  if (missing.length) bad(label, 'faltan: ' + missing.join(', '));
  else ok(label, keys.length + ' variables');
}
function get(url, headers) {
  return fetch(url, { headers: Object.assign({ Accept: 'application/json' }, headers || {}) });
}

async function main() {
  console.log('\nAplicaClimate · smoke test  (' + lat + ', ' + lon + ')\n');

  // 1. Pronóstico
  try {
    const url = FORECAST + '?latitude=' + lat + '&longitude=' + lon +
      '&current=' + CURRENT.join(',') + '&hourly=' + HOURLY.join(',') +
      '&daily=' + DAILY.join(',') + '&timezone=auto&forecast_days=7';
    const res = await get(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.reason || 'error de API');
    ok('Open-Meteo forecast', data.timezone + ', elevación ' + data.elevation + ' m');
    checkKeys(data.current, CURRENT, 'current');
    checkKeys(data.hourly, HOURLY, 'hourly');
    checkKeys(data.daily, DAILY, 'daily');
    ok('Datos ahora', data.current.temperature_2m + ' °C, sensación ' + data.current.apparent_temperature +
      ' °C, código WMO ' + data.current.weather_code);
    ok('Serie horaria', data.hourly.time.length + ' horas · ' + data.daily.time.length + ' días');
    ok('Ventana de pronóstico', data.hourly.time[0] + ' → ' + data.hourly.time[data.hourly.time.length - 1]);
  } catch (e) {
    bad('Open-Meteo forecast', e.message);
  }

  // 2. Calidad del aire
  try {
    const url = AIR + '?latitude=' + lat + '&longitude=' + lon +
      '&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide&timezone=auto';
    const data = await (await get(url)).json();
    if (data.error) throw new Error(data.reason || 'error de API');
    ok('Open-Meteo air quality', 'AQI europeo ' + data.current.european_aqi + ', PM2.5 ' + data.current.pm2_5 + ' µg/m³');
  } catch (e) {
    bad('Open-Meteo air quality', e.message);
  }

  // 3. Múltiples puntos en una petición (lista de lugares guardados)
  try {
    const url = FORECAST + '?latitude=' + lat + ',' + (lat + 0.5) + '&longitude=' + lon + ',' + (lon + 0.5) +
      '&current=temperature_2m,apparent_temperature,weather_code,is_day&timezone=auto';
    const data = await (await get(url)).json();
    if (!Array.isArray(data)) throw new Error('no devolvió un arreglo');
    ok('Open-Meteo multi-punto', data.length + ' ubicaciones en una sola petición');
  } catch (e) {
    bad('Open-Meteo multi-punto', e.message);
  }

  // 4. Geocodificación (principal y respaldos)
  try {
    const res = await get(NOMINATIM + '/reverse?lat=' + lat + '&lon=' + lon + '&format=jsonv2&zoom=14&accept-language=es',
      { 'User-Agent': UA, Referer: 'http://127.0.0.1:4173/' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    ok('Nominatim reverse (principal)', (data.display_name || '').slice(0, 70));
  } catch (e) {
    bad('Nominatim reverse (principal)', e.message);
  }

  try {
    const res = await get(NOMINATIM + '/search?q=Lima%20Peru&format=jsonv2&limit=3&accept-language=es',
      { 'User-Agent': UA, Referer: 'http://127.0.0.1:4173/' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    ok('Nominatim search (principal)', data.length + ' resultados para «Lima Peru»');
  } catch (e) {
    bad('Nominatim search (principal)', e.message);
  }

  try {
    const data = await (await get(GEOCODE + '?name=Lima&count=3&language=es&format=json')).json();
    const n = data.results ? data.results.length : 0;
    if (!n) throw new Error('sin resultados');
    ok('Respaldo búsqueda (Open-Meteo Geocoding)', n + ' resultados · ' + data.results[0].name);
  } catch (e) {
    bad('Respaldo búsqueda (Open-Meteo Geocoding)', e.message);
  }

  try {
    const data = await (await get(BDC + '?latitude=' + lat + '&longitude=' + lon + '&localityLanguage=es')).json();
    if (!data || !(data.city || data.locality)) throw new Error('sin localidad');
    ok('Respaldo inverso (BigDataCloud)', (data.city || data.locality) + ', ' + data.countryName);
  } catch (e) {
    bad('Respaldo inverso (BigDataCloud)', e.message);
  }

  // 5. Tiles del mapa
  const tiles = [
    ['OSM', 'https://tile.openstreetmap.org/6/20/30.png'],
    ['CARTO oscuro', 'https://a.basemaps.cartocdn.com/dark_all/6/20/30.png'],
    ['OpenTopoMap', 'https://a.tile.opentopomap.org/6/20/30.png'],
    ['Esri satélite', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/6/30/20']
  ];
  for (const [name, url] of tiles) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      ok('Tile ' + name, res.status + ' · ' + (res.headers.get('content-type') || '?'));
    } catch (e) {
      bad('Tile ' + name, e.message);
    }
  }

  console.log('\n' + (failures ? failures + ' comprobación(es) fallaron.' : 'Todo correcto.') + '\n');
  process.exit(failures ? 1 : 0);
}

main();
