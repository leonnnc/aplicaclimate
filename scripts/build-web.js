/* Copia los archivos web a dist/ (carpeta que se publica en hosting y que usa
   Capacitor como webDir). Al terminar comprueba que ningún recurso referenciado
   desde index.html falte.
   Uso: node scripts/build-web.js  →  npm run build:web  */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');

const ITEMS = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'css',
  'js',
  'vendor',
  'icons',
  'assets'
];

/* No se publican los mapas de depuración ni el build de fuentes de Leaflet:
   la app usa vendor/leaflet/leaflet.js y leaflet.css. */
const SKIP = [/\.map$/i, /leaflet-src\./i];

function skipped(name) {
  return SKIP.some(function (re) { return re.test(name); });
}

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copy(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) copy(path.join(src, entry), path.join(dest, entry));
  } else {
    if (skipped(path.basename(src))) return;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}

/* Recursos locales referenciados por index.html (ignora URLs externas y anclas) */
function missingReferences() {
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  const re = /(?:src|href)\s*=\s*"([^"]+)"/g;
  const missing = [];
  let m;
  while ((m = re.exec(html))) {
    const ref = m[1];
    if (/^(https?:)?\/\//i.test(ref) || ref.startsWith('data:') || ref.startsWith('#')) continue;
    if (!fs.existsSync(path.join(out, ref))) missing.push(ref);
  }
  return missing;
}

rmrf(out);
fs.mkdirSync(out, { recursive: true });

let copied = 0;
for (const item of ITEMS) {
  const src = path.join(root, item);
  if (!fs.existsSync(src)) continue;
  copy(src, path.join(out, item));
  copied++;
}

const missing = missingReferences();
const size = (dirSize(out) / 1024 / 1024).toFixed(2);

console.log('build:web → dist/  (' + copied + ' elementos, ' + size + ' MB)');

if (missing.length) {
  console.error('ERROR: faltan recursos referenciados por index.html:');
  missing.forEach(function (r) { console.error('  - ' + r); });
  process.exit(1);
}

console.log('Comprobación de recursos de index.html: todo presente.');
