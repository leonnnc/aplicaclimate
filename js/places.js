/* AplicaClimate — lugares guardados (persistencia local + exportar/importar) */
(function () {
  'use strict';

  var NS = (window.CM = window.CM || {});
  var u = NS.util;
  var KEY = 'places';
  var listeners = [];

  function uid() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function list() {
    var rows = u.get(KEY, []);
    if (!Array.isArray(rows)) return [];
    return rows.slice().sort(function (a, b) {
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });
  }

  function save(rows) {
    u.set(KEY, rows);
    emit();
  }

  function add(place) {
    var rows = u.get(KEY, []) || [];
    // evita duplicados exactos (mismo punto en ~120 m)
    var near = rows.find(function (p) {
      return Math.abs(p.lat - place.lat) < 0.0012 && Math.abs(p.lon - place.lon) < 0.0012;
    });
    if (near) {
      near.name = place.name || near.name;
      if (place.notes != null) near.notes = place.notes;
      near.updatedAt = Date.now();
      save(rows);
      return near;
    }
    var item = {
      id: uid(),
      name: (place.name || 'Lugar sin nombre').slice(0, 80),
      lat: place.lat,
      lon: place.lon,
      notes: place.notes || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    rows.push(item);
    save(rows);
    return item;
  }

  function update(id, patch) {
    var rows = u.get(KEY, []) || [];
    var i = rows.findIndex(function (p) { return p.id === id; });
    if (i < 0) return null;
    rows[i] = Object.assign({}, rows[i], patch, { updatedAt: Date.now() });
    save(rows);
    return rows[i];
  }

  function remove(id) {
    var rows = (u.get(KEY, []) || []).filter(function (p) { return p.id !== id; });
    save(rows);
  }

  function get(id) {
    return list().find(function (p) { return p.id === id; }) || null;
  }

  function exportFile() {
    var rows = list();
    var payload = { app: 'AplicaClimate', version: 1, exportedAt: new Date().toISOString(), places: rows };
    try {
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'aplicaclimate-lugares-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    } catch (e) {
      return null;
    }
    return rows.length;
  }

  function importFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };
      reader.onload = function () {
        try {
          var data = JSON.parse(String(reader.result));
          var incoming = Array.isArray(data) ? data : (data.places || []);
          if (!Array.isArray(incoming)) throw new Error('Formato no reconocido.');
          var rows = u.get(KEY, []) || [];
          var added = 0;
          incoming.forEach(function (p) {
            if (p == null || isNaN(parseFloat(p.lat)) || isNaN(parseFloat(p.lon))) return;
            var lat = parseFloat(p.lat), lon = parseFloat(p.lon);
            if (rows.some(function (r) { return Math.abs(r.lat - lat) < 0.0012 && Math.abs(r.lon - lon) < 0.0012; })) return;
            rows.push({
              id: p.id || uid(),
              name: String(p.name || 'Lugar sin nombre').slice(0, 80),
              lat: lat,
              lon: lon,
              notes: p.notes || '',
              createdAt: p.createdAt || Date.now(),
              updatedAt: p.updatedAt || Date.now()
            });
            added++;
          });
          save(rows);
          resolve(added);
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsText(file);
    });
  }

  function onChange(cb) {
    listeners.push(cb);
    return function () {
      listeners = listeners.filter(function (f) { return f !== cb; });
    };
  }

  function emit() {
    var rows = list();
    listeners.forEach(function (cb) {
      try { cb(rows); } catch (e) {}
    });
  }

  NS.places = {
    list: list, add: add, update: update, remove: remove, get: get,
    exportFile: exportFile, importFile: importFile, onChange: onChange
  };
})();
