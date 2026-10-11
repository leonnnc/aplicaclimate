/* Prueba del servidor estático (rutas, tipos, 404 y bloqueo de traversal) */
'use strict';

const http = require('http');
const path = require('path');
const os = require('os');
const { start } = require('../scripts/static-server.js');

const root = path.join(__dirname, '..');

const CASES = [
  { path: '/', status: 200, type: 'text/html' },
  { path: '/css/styles.css', status: 200, type: 'text/css' },
  { path: '/js/app.js', status: 200, type: 'text/javascript' },
  { path: '/vendor/leaflet/leaflet.js', status: 200, type: 'text/javascript' },
  { path: '/vendor/leaflet/images/layers.png', status: 200, type: 'image/png' },
  { path: '/manifest.webmanifest', status: 200, type: 'application/manifest+json' },
  { path: '/icons/', status: 404 },
  { path: '/no-existe.txt', status: 404 },
  // Traversal codificado: sobrevive a la normalización de la URL y lo corta el guard del servidor
  { path: '/..%2fpackage.json', status: 403 },
  // Traversal con segmentos reales: la propia URL lo normaliza a /package.json, nunca escapa
  { path: '/../package.json', status: 200, type: 'application/json' }
];

function request(port, reqPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: port, path: reqPath, method: 'GET' }, (res) => {
      res.resume();
      res.on('end', () => resolve(res));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  console.log('Servidor estático · ' + os.platform() + '\n');
  const info = await start(root, { port: 0 });
  let fails = 0;

  for (const c of CASES) {
    const res = await request(info.port, c.path);
    const type = String(res.headers['content-type'] || '');
    const okStatus = res.statusCode === c.status;
    const okType = !c.type || type.indexOf(c.type) === 0;
    const ok = okStatus && okType;
    if (!ok) fails++;
    console.log('  ' + (ok ? '[ok]   ' : '[FALLA] ') + c.path + ' → ' + res.statusCode +
      (okStatus ? '' : ' (esperado ' + c.status + ')') +
      ' · ' + type + (okType ? '' : ' (esperado ' + c.type + ')'));
  }

  // Contenido del archivo protegido: no debe salir del directorio servido
  const leak = await request(info.port, '/..%2f..%2fpackage.json');
  const leaked = leak.statusCode === 200;
  if (leaked) fails++;
  console.log('  ' + (leaked ? '[FALLA] ' : '[ok]   ') + '/..%2f..%2fpackage.json → ' + leak.statusCode +
    ' (no se filtró ningún archivo fuera de la carpeta servida)');

  await info.close();
  console.log('\n' + (fails ? fails + ' comprobación(es) fallaron.' : 'Todo correcto.') + '\n');
  process.exit(fails ? 1 : 0);
})().catch((err) => {
  console.error('Error en la prueba: ' + err.message);
  process.exit(1);
});
