/* AplicaClimate — proceso principal de Electron (app de escritorio)
   Sirve la app por HTTP local para que fetch, geolocalización y service worker
   se comporten igual que en un navegador (file:// los bloquea). */
'use strict';

const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');
const { start } = require('../scripts/static-server.js');

const ROOT = path.join(__dirname, '..');

let win = null;
let serverInfo = null;

async function createWindow() {
  serverInfo = await start(ROOT, { port: 0 });
  console.log('[AplicaClimate] servidor local: ' + serverInfo.url);

  win = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 420,
    minHeight: 560,
    backgroundColor: '#0b1220',
    title: 'AplicaClimate',
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  win.once('ready-to-show', () => {
    win.show();
    console.log('[AplicaClimate] ventana lista.');
  });

  win.webContents.on('did-fail-load', (event, code, desc, url) => {
    console.error('[AplicaClimate] fallo al cargar ' + url + ' (' + code + ': ' + desc + ')');
  });

  win.webContents.on('render-process-gone', (event, details) => {
    console.error('[AplicaClimate] el proceso de render se cerró: ' + details.reason);
  });

  // Electron 44 entrega un objeto de evento con level/message
  win.webContents.on('console-message', (event) => {
    if (event && (event.level === 'warning' || event.level === 'error')) {
      console.error('[renderer:' + event.level + '] ' + event.message);
    }
  });

  win.loadURL(serverInfo.url);

  // Enlaces externos (atribución de mapas, etc.) en el navegador del sistema
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => { win = null; });
}

function buildMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        { label: 'Recargar', accelerator: 'F5', click: () => win && win.reload() },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollo' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Fuentes de datos',
          click: () => shell.openExternal('https://open-meteo.com/')
        },
        {
          label: 'Atribución de mapas (OpenStreetMap)',
          click: () => shell.openExternal('https://www.openstreetmap.org/copyright')
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Evita que se abran dos instancias de la app
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // La app solo pide geolocalización y notificaciones; se conceden sin diálogo del sistema.
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
      callback(permission === 'geolocation' || permission === 'notifications');
    });

    buildMenu();
    createWindow().catch((err) => {
      console.error('[AplicaClimate] no se pudo crear la ventana: ' + err.message);
      app.quit();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (serverInfo) { serverInfo.close(); serverInfo = null; }
  app.quit();
});

app.on('before-quit', () => {
  if (serverInfo) { serverInfo.close(); serverInfo = null; }
});
