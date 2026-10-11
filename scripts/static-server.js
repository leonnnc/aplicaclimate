/* Servidor estático mínimo (sin dependencias) usado por el modo dev y por la app de escritorio.
   Se sirve por HTTP en 127.0.0.1 para que fetch, geolocalización y service worker
   funcionen igual que en un navegador (evita las restricciones de file://). */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function send(res, status, body, headers) {
  const h = Object.assign({ 'Cache-Control': 'no-store' }, headers || {});
  res.writeHead(status, h);
  res.end(body);
}

function createServer(root) {
  const base = path.resolve(root);

  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return send(res, 405, 'Método no permitido');
    }

    let pathname;
    try {
      // WHATWG URL en lugar del url.parse() heredado
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname || '/');
    } catch (e) {
      return send(res, 400, 'Solicitud inválida');
    }

    let target = path.resolve(path.join(base, pathname));
    if (target !== base && !target.startsWith(base + path.sep)) {
      return send(res, 403, 'Acceso denegado');
    }

    fs.stat(target, (err, stat) => {
      if (!err && stat.isDirectory()) target = path.join(target, 'index.html');

      fs.readFile(target, (err2, data) => {
        if (err2) {
          // fallback de SPA
          if (path.extname(target) === '') {
            const index = path.join(base, 'index.html');
            return fs.readFile(index, (e3, html) => {
              if (e3) return send(res, 404, 'No encontrado');
              send(res, 200, html, { 'Content-Type': MIME['.html'] });
            });
          }
          return send(res, 404, 'No encontrado: ' + pathname);
        }
        const type = MIME[path.extname(target).toLowerCase()] || 'application/octet-stream';
        const headers = { 'Content-Type': type, 'Content-Length': data.length };
        if (req.method === 'HEAD') {
          res.writeHead(200, headers);
          return res.end();
        }
        send(res, 200, data, headers);
      });
    });
  });
}

/** Arranca el servidor. port 0 = puerto libre automático. */
function start(root, options) {
  const opts = options || {};
  const host = opts.host || '127.0.0.1';
  const server = createServer(root);
  const requestedPort = opts.port == null ? 4173 : opts.port;

  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = requestedPort === 0 ? 1 : 12;

    function listen(port) {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
          attempts++;
          listen(port + 1);
          return;
        }
        reject(err);
      });
      server.listen(port, host, () => {
        const actual = server.address().port;
        resolve({
          server,
          port: actual,
          url: 'http://' + host + ':' + actual + '/',
          close: () => new Promise((r) => server.close(() => r()))
        });
      });
    }

    listen(requestedPort);
  });
}

module.exports = { createServer, start, MIME };
