/* Modo desarrollo / vista previa: sirve la app por HTTP.
   Uso:
     node scripts/serve.js                      → raíz del proyecto en 127.0.0.1:4173
     node scripts/serve.js 4174 dist            → carpeta dist/ (build de producción)
     node scripts/serve.js 8080 dist 0.0.0.0    → accesible desde el celular en la red local

   npm run dev      = raíz del proyecto
   npm run preview  = build:web + dist/ en 4174
   npm run dev:lan  = raíz del proyecto en 8080, accesible desde otros dispositivos */
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { start } = require('./static-server.js');

const projectRoot = path.join(__dirname, '..');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const rootArg = process.argv[3] || process.env.ROOT || '';
const host = process.argv[4] || process.env.HOST || '127.0.0.1';
const root = rootArg ? path.resolve(projectRoot, rootArg) : projectRoot;

if (!fs.existsSync(root)) {
  console.error('No existe la carpeta a servir: ' + root);
  if (rootArg) console.error('Tip: ejecuta primero  npm run build:web');
  process.exit(1);
}

/* Direcciones IPv4 locales, para saber qué URL abrir en el teléfono */
function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach((name) => {
    (ifaces[name] || []).forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) out.push({ name: name, address: net.address });
    });
  });
  return out;
}

start(root, { port: port, host: host }).then((info) => {
  const exposed = host === '0.0.0.0' || host === '::';
  console.log('');
  console.log('  AplicaClimate listo en:  ' + (exposed ? 'http://127.0.0.1:' + info.port + '/' : info.url));
  console.log('  Carpeta servida:     ' + root);
  if (exposed) {
    const nets = lanAddresses();
    if (nets.length) {
      console.log('  Desde el celular (misma red Wi-Fi):');
      nets.forEach((n) => console.log('    http://' + n.address + ':' + info.port + '/   (' + n.name + ')'));
    } else {
      console.log('  No se detectaron direcciones IPv4 de red local.');
    }
    console.log('  Nota: la geolocalización y el service worker solo funcionan en HTTPS o localhost.');
  }
  console.log('  Detén el servidor con Ctrl + C');
  console.log('');
}).catch((err) => {
  console.error('No se pudo iniciar el servidor:', err.message);
  process.exit(1);
});
