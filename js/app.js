/* AplicaClimate — aplicación principal: mapa, búsqueda, panel y renderizado */
(function () {
  'use strict';

  var NS = window.CM;
  var u = NS.util, W = NS.weather, PL = NS.places, CL = NS.clothing;

  /* ---------------- estado ---------------- */
  var state = {
    unit: u.get('unit', 'metric'),                 // metric | imperial
    theme: u.get('theme', window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
    basemap: u.get('basemap', null),
    activity: u.get('activity', 'normal'),
    sensitivity: u.get('sensitivity', '0'),
    selected: u.get('lastPoint', null),
    forecast: null,
    extras: null,
    advice: null,
    aqi: null,
    loading: false,
    placeTemps: u.get('placesTemps', {}),
    source: 'live',                // live | cache
    updatedAt: null,
    cachedAt: null,
    heading: null,
    compassOn: false,
    wakeSentinel: null,
    toolChecks: [],
    offline: !navigator.onLine
  };

  var el = {};
  var map, marker, baseLayers = {};
  var lastReverseKey = '', lastViewKey = '', lastViewCheck = 0;
  var statusTimer = null, chipTimer = null, autoRefreshTimer = null;
  var introDone = false;

  function $(id) { return document.getElementById(id); }

  function cacheEls() {
    ['intro', 'introBar', 'introMsg', 'introChecks', 'introSkip',
     'searchInput', 'searchBtn', 'searchResults', 'btnLocate', 'btnSavePlace', 'btnUnits', 'btnTheme',
     'map', 'coords', 'mapHint', 'viewPlace', 'status', 'statusText', 'panel', 'sheetHandle',
     'weatherEmpty', 'weatherContent', 'placeName', 'placeCoords', 'placeLocalTime', 'placeElev', 'dataState',
     'offlineBanner', 'btnRename', 'btnQuickSave', 'btnRefresh',
     'nowIcon', 'nowTemp', 'nowUnit', 'nowDesc', 'nowFeels', 'nowAlert', 'metrics',
     'adviceBadge', 'adviceBody', 'activity', 'sensitivity',
     'outfitFigure', 'outfitImg', 'outfitTitle', 'outfitNote', 'outfitAccess',
     'hourly', 'daily', 'extrasCard', 'extrasMetrics', 'extrasNote', 'aqiCard', 'aqiBadge', 'aqiMetrics',
     'toolsCard', 'toolsList', 'btnShare', 'btnCopyCoords', 'btnCompassOn', 'btnWakeLock',
     'placesList', 'placesEmpty', 'btnExport', 'btnImport', 'importFile'
    ].forEach(function (id) { el[id] = $(id); });
  }

  /* ---------------- unidades y formato ---------------- */
  function isImperial() { return state.unit === 'imperial'; }
  function tempUnitLabel() { return isImperial() ? '°F' : '°C'; }
  function windUnitLabel() { return isImperial() ? 'mph' : 'km/h'; }
  function precipUnitLabel() { return isImperial() ? 'in' : 'mm'; }

  function unitsLabel() {
    var short = window.innerWidth <= 640;
    if (isImperial()) return short ? '°F' : '°F · mph';
    return short ? '°C' : '°C · km/h';
  }
  function updateUnitsLabel() {
    if (!el.btnUnits) return;
    el.btnUnits.textContent = unitsLabel();
    el.btnUnits.title = isImperial() ? 'Cambiar a °C y km/h' : 'Cambiar a °F y mph';
  }

  function tTemp(c, decimals) {
    if (c == null) return '—';
    return u.fmt(W.conv.tFromC(c, isImperial() ? 'fahrenheit' : 'celsius'), decimals == null ? 0 : decimals);
  }
  function tTempUnit(c) { return tTemp(c) + '°'; }
  function tWind(kmh) {
    if (kmh == null) return '—';
    return u.fmt(W.conv.wFromKmh(kmh, isImperial() ? 'mph' : 'kmh'), 0);
  }
  function tPrecip(mm, decimals) {
    if (mm == null) return '—';
    return u.fmt(W.conv.pFromMm(mm, isImperial() ? 'inch' : 'mm'), decimals == null ? 1 : decimals);
  }
  function tDistance(m) {
    if (m == null) return '—';
    if (isImperial()) return u.fmt(m / 1609.344, m < 1609 ? 1 : 0) + ' mi';
    return u.fmt(m / 1000, m < 10000 ? 1 : 0) + ' km';
  }
  function agoText(ms) {
    if (!ms) return '—';
    var s = Math.round((Date.now() - ms) / 1000);
    if (s < 45) return 'hace unos segundos';
    var m = Math.round(s / 60);
    if (m < 60) return 'hace ' + m + ' min';
    var h = Math.round(m / 60);
    if (h < 24) return 'hace ' + h + ' h';
    return 'hace ' + Math.round(h / 24) + ' días';
  }
  function fmtStamp(ms) {
    if (!ms) return '—';
    var d = new Date(ms);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  /* ---------------- tema y mapas base ---------------- */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    if (el.btnTheme) {
      el.btnTheme.textContent = state.theme === 'dark' ? '🌙' : '☀️';
      el.btnTheme.title = state.theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
    }
  }

  /* El mapa base oscuro son los tiles de OpenStreetMap invertidos por CSS:
     así se ven todos los nombres (ciudades, provincias, calles) hasta zoom 19. */
  var BASEMAPS = {
    dark: {
      label: 'Oscuro',
      dark: true,
      layers: [{
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: { maxZoom: 19, attribution: '&copy; OpenStreetMap' }
      }]
    },
    streets: {
      label: 'Calles',
      layers: [{
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: { maxZoom: 19, attribution: '&copy; OpenStreetMap' }
      }]
    },
    topo: {
      label: 'Relieve',
      layers: [{
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        options: { maxZoom: 17, attribution: '&copy; OpenTopoMap (CC-BY-SA)' }
      }]
    },
    satellite: {
      label: 'Satélite',
      layers: [{
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: { maxNativeZoom: 18, maxZoom: 19, attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics' }
      }]
    }
  };

  function buildBaseLayer(key) {
    var def = BASEMAPS[key];
    var layers = (def.layers || []).map(function (l) { return L.tileLayer(l.url, l.options); });
    if (!layers.length) return null;
    return layers.length === 1 ? layers[0] : L.layerGroup(layers);
  }

  function tileLayersOf(key) {
    var out = [];
    var l = baseLayers[key];
    if (!l) return out;
    if (typeof l.eachLayer === 'function') { l.eachLayer(function (x) { out.push(x); }); } else { out.push(l); }
    return out;
  }

  function applyDarkFilter() {
    var def = BASEMAPS[state.basemap];
    if (el.map) el.map.classList.toggle('map-dark', !!(def && def.dark));
  }

  /* ---------------- mapa ---------------- */
  var pinIcon = L.divIcon({
    className: '',
    html: '<div class="pin">📍</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 28]
  });

  function initMap() {
    var sel = state.selected;
    map = L.map('map', {
      zoomControl: true,
      worldCopyJump: true,
      minZoom: 2,
      maxZoom: 19,
      center: sel ? [sel.lat, sel.lon] : [-12.04, -77.03],
      zoom: sel ? 12 : 6
    });
    map.zoomControl.setPosition('topleft');

    Object.keys(BASEMAPS).forEach(function (key) { baseLayers[key] = buildBaseLayer(key); });

    var initial = (state.basemap && baseLayers[state.basemap]) ? state.basemap : (state.theme === 'dark' ? 'dark' : 'streets');
    baseLayers[initial].addTo(map);
    state.basemap = initial;
    applyDarkFilter();

    var labels = {};
    Object.keys(BASEMAPS).forEach(function (k) { labels[BASEMAPS[k].label] = baseLayers[k]; });
    L.control.layers(labels, null, { position: 'topleft', collapsed: true }).addTo(map);

    map.on('baselayerchange', function (e) {
      Object.keys(BASEMAPS).forEach(function (k) {
        if (BASEMAPS[k].label === e.name) { state.basemap = k; u.set('basemap', k); }
      });
      applyDarkFilter();
      updateViewPlace(true);
    });

    map.on('click', function (e) { selectPoint(e.latlng.lat, e.latlng.lng, { reverse: true }); });

    map.on('mousemove', function (e) {
      if (el.coords) el.coords.textContent = u.fmt(e.latlng.lat, 4) + ', ' + u.fmt(e.latlng.lng, 4);
    });

    map.on('moveend zoomend', function () {
      var c = map.getCenter();
      u.set('lastView', { lat: c.lat, lon: c.lng, zoom: map.getZoom() });
      scheduleViewPlace();
    });

    var view = u.get('lastView', null);
    if (view && !sel) map.setView([view.lat, view.lon], view.zoom);
    if (sel) placeMarker(sel.lat, sel.lon);

    addCompassControl();
  }

  function placeMarker(lat, lon) {
    if (!marker) {
      marker = L.marker([lat, lon], { icon: pinIcon, draggable: true, keyboard: true }).addTo(map);
      marker.on('dragend', function () {
        var p = marker.getLatLng();
        selectPoint(p.lat, p.lng, { reverse: true, fly: false, keepName: true });
      });
    } else {
      marker.setLatLng([lat, lon]);
    }
    updateMarkerLabel();
  }

  function updateMarkerLabel() {
    if (!marker) return;
    var sel = state.selected;
    if (!sel || !sel.name) { marker.unbindTooltip(); return; }
    var sub = '';
    if (state.forecast && state.forecast.current) {
      sub = tTemp(state.forecast.current.temp, 0) + '° · ' +
        W.codeInfo(state.forecast.current.code, state.forecast.current.isDay).label;
    }
    var html = u.esc(sel.name) + (sub ? '<span class="pl-sub">' + u.esc(sub) + '</span>' : '');
    marker.bindTooltip(html, {
      permanent: true,
      direction: 'top',
      offset: [0, -26],
      className: 'place-label',
      opacity: 1
    });
  }

  /* ---------------- nombre del lugar que se está viendo ---------------- */
  var viewTimer = null;
  function scheduleViewPlace() {
    clearTimeout(viewTimer);
    viewTimer = setTimeout(function () { updateViewPlace(false); }, 900);
  }

  function updateViewPlace(force) {
    if (!el.viewPlace || !map) return;
    if (!navigator.onLine) { el.viewPlace.hidden = true; return; }
    var z = map.getZoom();
    if (z < 6) { el.viewPlace.hidden = true; return; }
    var c = map.getCenter();
    var key = c.lat.toFixed(2) + ',' + c.lng.toFixed(2);
    if (!force && key === lastViewKey) return;
    if (Date.now() - lastViewCheck < 2500) return;   // uso prudente de Nominatim
    lastViewCheck = Date.now();
    W.reverse(c.lat, c.lng).then(function (place) {
      if (!place) return;
      lastViewKey = key;
      el.viewPlace.innerHTML = '📍 ' + u.esc(place.name) +
        (place.subtitle ? ' <span class="vp-sub">· ' + u.esc(place.subtitle) + '</span>' : '');
      el.viewPlace.hidden = false;
    }).catch(function () { /* el nombre de la vista es opcional */ });
  }

  /* ---------------- selección de punto ---------------- */
  function selectPoint(lat, lon, opts) {
    opts = opts || {};
    var keepName = opts.keepName && state.selected &&
      Math.abs(state.selected.lat - lat) < 0.0005 && Math.abs(state.selected.lon - lon) < 0.0005;

    state.selected = {
      lat: lat,
      lon: lon,
      name: keepName ? state.selected.name : (opts.name || null),
      subtitle: keepName ? state.selected.subtitle : (opts.subtitle || null)
    };
    u.set('lastPoint', state.selected);

    placeMarker(lat, lon);
    if (opts.fly !== false) map.flyTo([lat, lon], Math.max(map.getZoom(), 11), { duration: 0.6 });
    if (el.mapHint) el.mapHint.classList.add('gone');
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }

    expandPanel();
    switchTab('weather');
    el.btnSavePlace.disabled = false;

    if (opts.reverse !== false && !keepName && !opts.name) reverseGeocode(lat, lon);

    renderPlaceHead();
    return loadWeather();
  }

  var reverseTimer = null;
  function reverseGeocode(lat, lon) {
    var key = lat.toFixed(3) + ',' + lon.toFixed(3);
    if (key === lastReverseKey) return;
    lastReverseKey = key;
    clearTimeout(reverseTimer);
    reverseTimer = setTimeout(function () {
      W.reverse(lat, lon).then(function (place) {
        if (!place || !state.selected) return;
        if (Math.abs(state.selected.lat - lat) > 0.002 || Math.abs(state.selected.lon - lon) > 0.002) return;
        if (!state.selected.name) {
          state.selected.name = place.name;
          state.selected.subtitle = place.subtitle;
          u.set('lastPoint', state.selected);
          renderPlaceHead();
          updateMarkerLabel();
        }
      }).catch(function () { /* opcional */ });
    }, 400);
  }

  /* ---------------- caché de pronóstico (modo sin conexión) ---------------- */
  var WX_INDEX = 'wxIndex';

  function wxKey(lat, lon) { return 'wx.' + lat.toFixed(3) + ',' + lon.toFixed(3); }

  function saveWx(lat, lon, payload) {
    var entry = {
      lat: lat, lon: lon, t: Date.now(),
      f: payload.f || null, extras: payload.extras || null, aqi: payload.aqi || null
    };
    if (!u.set(wxKey(lat, lon), entry)) return false;
    var idx = (u.get(WX_INDEX, []) || []).filter(function (k) { return k !== wxKey(lat, lon); });
    idx.unshift(wxKey(lat, lon));
    if (idx.length > 24) {
      idx.slice(24).forEach(function (k) { u.del(k); });
      idx = idx.slice(0, 24);
    }
    u.set(WX_INDEX, idx);
    return true;
  }

  function loadWx(lat, lon) {
    var exact = u.get(wxKey(lat, lon), null);
    if (exact && exact.f) return exact;
    var idx = u.get(WX_INDEX, []) || [];
    var best = null, bestD = Infinity;
    idx.forEach(function (k) {
      var e = u.get(k, null);
      if (!e || !e.f) return;
      var d = Math.abs(e.lat - lat) + Math.abs(e.lon - lon);
      if (d < bestD) { bestD = d; best = e; }
    });
    return (best && bestD < 0.05) ? best : null;   // hasta ~5 km de distancia
  }

  /* ---------------- carga de datos ---------------- */
  function setStatus(text) {
    if (!el.status) return;
    clearTimeout(statusTimer);
    if (text) {
      el.statusText.textContent = text;
      el.status.hidden = false;
      statusTimer = setTimeout(function () { el.status.hidden = true; }, 15000);
    } else {
      el.status.hidden = true;
    }
  }

  function loadWeather() {
    var sel = state.selected;
    if (!sel || !map) return Promise.resolve({ ok: false });
    var lat = sel.lat, lon = sel.lon;
    state.loading = true;
    setStatus('Consultando clima…');

    return Promise.all([
      W.forecast(lat, lon, { unit: 'metric' }),
      W.extras(lat, lon).catch(function () { return null; })
    ]).then(function (res) {
      state.forecast = res[0];
      state.extras = res[1];
      state.source = 'live';
      state.updatedAt = Date.now();
      state.cachedAt = null;
      state.offline = false;
      state.loading = false;
      setStatus('');
      renderAll();
      saveWx(lat, lon, { f: state.forecast, extras: state.extras, aqi: state.aqi });

      W.airQuality(lat, lon).then(function (aqi) {
        state.aqi = aqi;
        saveWx(lat, lon, { f: state.forecast, extras: state.extras, aqi: aqi });
        renderAqi();
      }).catch(function () {});

      refreshPlaceTemps();
      return { ok: true };
    }).catch(function (err) {
      state.loading = false;
      setStatus('');
      var entry = loadWx(lat, lon);
      if (entry) {
        state.forecast = entry.f;
        state.extras = entry.extras || null;
        state.aqi = entry.aqi || null;
        state.source = 'cache';
        state.cachedAt = entry.t;
        state.offline = true;
        renderAll();
        renderOfflineBanner(entry.t);
        return { ok: true, cached: true };
      }
      state.offline = true;
      renderOfflineBanner(null);
      renderDataState();
      u.toast('No se pudo obtener el clima: ' + (err && err.message ? err.message : 'error de red'));
      return { ok: false, error: err };
    });
  }

  function renderAll() {
    if (!state.forecast) return;
    el.weatherEmpty.hidden = true;
    el.weatherContent.hidden = false;
    renderPlaceHead();
    renderDataState();
    renderOfflineBanner(state.source === 'cache' ? state.cachedAt : null);
    renderNow();
    renderAdvice();
    renderAlerts();
    renderMetrics();
    renderHourly();
    renderDaily();
    renderExtras();
    renderAqi();
    updateMarkerLabel();
  }

  function renderOfflineBanner(cachedAt) {
    if (!el.offlineBanner) return;
    if (!state.offline && navigator.onLine) { el.offlineBanner.hidden = true; return; }
    el.offlineBanner.hidden = false;
    if (cachedAt) {
      el.offlineBanner.innerHTML =
        '<div class="ob-title">📴 Sin conexión</div>Estás viendo el pronóstico guardado del <strong>' +
        fmtStamp(cachedAt) + '</strong> (' + agoText(cachedAt) + '), con los 7 días completos. ' +
        'Se actualizará solo cuando vuelva la conexión.';
    } else {
      el.offlineBanner.innerHTML =
        '<div class="ob-title">📴 Sin conexión</div>No hay datos guardados para este punto. ' +
        'Conéctate una vez a internet para poder verlo después sin conexión.';
    }
  }

  function renderDataState() {
    var node = el.dataState;
    if (!node) return;
    if (!state.forecast) { node.hidden = true; return; }
    node.hidden = false;
    if (state.source === 'cache') {
      node.className = 'data-state offline';
      node.innerHTML = '📴 Sin conexión · datos del ' + fmtStamp(state.cachedAt);
    } else if (state.offline) {
      node.className = 'data-state stale';
      node.innerHTML = '⚠ Sin conexión';
    } else {
      node.className = 'data-state fresh';
      node.innerHTML = '✔ Actualizado ' + agoText(state.updatedAt);
    }
  }

  function startChipTimer() {
    clearInterval(chipTimer);
    chipTimer = setInterval(function () {
      if (state.forecast) { renderDataState(); }
    }, 30000);
  }

  function startAutoRefresh() {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = setInterval(function () {
      if (!navigator.onLine || !state.selected) return;
      if (state.source === 'cache') loadWeather();
    }, 10 * 60 * 1000);
  }

  /* ---------------- render: cabecera del lugar ---------------- */
  function renderPlaceHead() {
    var sel = state.selected;
    if (!sel || !el.placeName) return;
    el.placeName.textContent = sel.name || 'Punto seleccionado';
    el.placeCoords.textContent = u.fmt(sel.lat, 4) + ', ' + u.fmt(sel.lon, 4);
    if (state.forecast) {
      el.placeLocalTime.textContent = u.fmtHour(state.forecast.current.time) +
        ' (local' + (state.forecast.timezone ? ', ' + state.forecast.timezone : '') + ')';
      var elev = state.forecast.elevation;
      el.placeElev.hidden = elev == null;
      el.placeElev.textContent = '· ' + u.fmt(elev, 0) + ' m s. n. m.';
    }
    var saved = PL.list().some(function (p) {
      return Math.abs(p.lat - sel.lat) < 0.0012 && Math.abs(p.lon - sel.lon) < 0.0012;
    });
    el.btnQuickSave.textContent = saved ? 'Guardado ✓' : 'Guardar';
    el.btnQuickSave.disabled = saved;
    el.btnSavePlace.disabled = saved;
  }

  function metric(label, value, cls) {
    return '<div class="metric ' + (cls || '') + '">' +
      '<div class="m-label">' + u.esc(label) + '</div>' +
      '<div class="m-value">' + value + '</div></div>';
  }

  function windDial(deg) {
    var s = 34, c = s / 2, r = c - 2;
    var rad = (deg == null ? 0 : deg) * Math.PI / 180;
    var x2 = c + Math.sin(rad) * (r - 4);
    var y2 = c - Math.cos(rad) * (r - 4);
    var x1 = c - Math.sin(rad) * (r - 9);
    var y1 = c + Math.cos(rad) * (r - 9);
    return '<svg class="wind-dial" width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + ' ' + s + '" aria-hidden="true">' +
      '<circle class="wd-ring" cx="' + c + '" cy="' + c + '" r="' + r + '"></circle>' +
      '<text class="wd-n" x="' + c + '" y="9" text-anchor="middle">N</text>' +
      '<line class="wd-needle" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
        '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"></line>' +
      '</svg>';
  }

  /* ---------------- render: clima actual ---------------- */
  function renderNow() {
    var f = state.forecast;
    if (!f) return;
    el.nowUnit.textContent = tempUnitLabel();
    var c = f.current;
    var info = W.codeInfo(c.code, c.isDay);
    el.nowIcon.textContent = info.icon;
    el.nowTemp.textContent = tTemp(c.temp, 0);
    el.nowDesc.textContent = info.label;
    el.nowFeels.textContent = 'Sensación ' + tTempUnit(c.feels) +
      (f.today.feelsMax != null
        ? '  ·  máx ' + tTempUnit(f.today.feelsMax) + ' / mín ' + tTempUnit(f.today.feelsMin)
        : '');
  }

  function renderMetrics() {
    var f = state.forecast, c = f.current, t = f.today;
    var html = '';
    html += metric('Viento',
      '<span class="with-dial">' + windDial(c.windDir) + '<span>' + tWind(c.wind) + ' ' +
      windUnitLabel() + ' ' + u.compass(c.windDir) + '</span></span>', 'wide');
    html += metric('Ráfagas', tWind(c.gust) + ' ' + windUnitLabel());
    html += metric('Humedad', c.humidity != null ? u.fmt(c.humidity, 0) + ' %' : '—');
    html += metric('Punto de rocío', tTempUnit(c.dew));
    html += metric('Presión', c.pressure != null ? u.fmt(c.pressure, 0) + ' hPa' : '—');
    html += metric('Nubosidad', c.cloud != null ? u.fmt(c.cloud, 0) + ' %' : '—');
    html += metric('Visibilidad', c.visibility != null ? tDistance(c.visibility) : '—');
    html += metric('Índice UV', c.uv != null ? u.fmt(c.uv, 1) + ' · ' + W.uvLabel(c.uv) : '—');
    html += metric('Precipitación', tPrecip(c.precipitation, 2) + ' ' + precipUnitLabel());
    html += metric('Nieve', c.snowfall != null ? u.fmt(c.snowfall, 1) + ' cm' : '—');
    html += metric('Prob. lluvia (6 h)', W.popAhead(f, 6) + ' %');
    html += metric('Amanecer', t.sunrise ? u.fmtHour(t.sunrise) : '—');
    html += metric('Atardecer', t.sunset ? u.fmtHour(t.sunset) : '—');
    if (t.precipSum != null) html += metric('Lluvia hoy', tPrecip(t.precipSum, 1) + ' ' + precipUnitLabel());
    html += metric('Zona horaria', u.esc(f.timezoneAbbr || f.timezone || '—'), 'wide');
    el.metrics.innerHTML = html;
  }

  function renderAlerts() {
    var alerts = [];
    if (state.advice) alerts = alerts.concat(state.advice.alerts);
    var f = state.forecast;
    var code = f.current.code;
    if ([95, 96, 99].indexOf(code) >= 0) {
      alerts.unshift({ level: 'danger', text: 'Tormenta eléctrica en la zona: evita espacios abiertos y objetos metálicos.' });
    } else if ([65, 82].indexOf(code) >= 0) {
      alerts.unshift({ level: 'warn', text: 'Lluvia fuerte: puede haber aniegos y poca visibilidad al conducir.' });
    } else if ([45, 48].indexOf(code) >= 0) {
      alerts.unshift({ level: 'warn', text: 'Niebla: visibilidad reducida, cuidado si vas a conducir.' });
    }
    if (f.current.visibility != null && f.current.visibility < 1000) {
      alerts.push({ level: 'warn', text: 'Visibilidad muy reducida (' + tDistance(f.current.visibility) + ').' });
    }
    var maxWind = f.daily[0] && f.daily[0].gustMax;
    if (maxWind != null && maxWind >= 70) {
      alerts.push({ level: 'warn', text: 'Ráfagas de hasta ' + tWind(maxWind) + ' ' + windUnitLabel() + ' hoy: asegura objetos sueltos.' });
    }

    if (!alerts.length) { el.nowAlert.hidden = true; el.nowAlert.innerHTML = ''; return; }
    var danger = alerts.some(function (a) { return a.level === 'danger'; });
    el.nowAlert.className = 'now-alert ' + (danger ? 'danger' : '');
    el.nowAlert.hidden = false;
    el.nowAlert.innerHTML = alerts.slice(0, 3).map(function (a) {
      return '<div>' + (a.level === 'danger' ? '🚨 ' : '⚠️ ') + u.esc(a.text) + '</div>';
    }).join('');
  }

  /* ---------------- render: vestimenta y maniquí ---------------- */
  function renderAdvice() {
    var f = state.forecast;
    if (!f) return;
    var c = f.current;
    var advice = CL.advise({
      feels: c.feels,
      temp: c.temp,
      wind: c.wind,
      gust: c.gust,
      pop: W.popAhead(f, 6),
      precip: Math.max(c.precipitation || 0, W.maxPrecipAhead(f, 3) || 0),
      humidity: c.humidity,
      uv: c.uv,
      isDay: c.isDay,
      weatherCode: c.code
    }, { activity: state.activity, sensitivity: state.sensitivity });

    state.advice = advice;
    el.adviceBadge.textContent = advice.badge;
    el.adviceBadge.style.borderColor = advice.color;
    el.adviceBadge.style.color = advice.color;

    renderOutfit(advice);

    var html = '<div class="advice-summary">' + u.esc(advice.outfitHint) + '<br><span class="muted">' +
      u.esc(advice.summary) + '</span></div>';

    advice.layers.forEach(function (layer) {
      if (!layer.items.length) return;
      html += '<div class="layer"><div class="layer-name">' + layer.icon + ' ' + u.esc(layer.name) + '</div><div class="chips">';
      layer.items.forEach(function (item) {
        var parts = String(item).split(' — ');
        html += '<span class="chip">' + u.esc(parts[0]) +
          (parts[1] ? ' <em>' + u.esc(parts[1]) + '</em>' : '') + '</span>';
      });
      html += '</div></div>';
    });

    var tips = advice.tips.concat(advice.alerts);
    if (tips.length) {
      html += '<ul class="tips">';
      tips.forEach(function (t) {
        var cls = t.level === 'danger' ? 'danger' : (t.level === 'warn' ? 'warn' : '');
        html += '<li class="' + cls + '">' + u.esc(t.text) + '</li>';
      });
      html += '</ul>';
    }
    el.adviceBody.innerHTML = html;
  }

  function renderOutfit(advice) {
    if (!el.outfitImg) return;
    var band = advice.band || {};
    var src = band.image || 'assets/outfits/templado.png';
    if (el.outfitImg.getAttribute('src') !== src) el.outfitImg.src = src;
    el.outfitImg.alt = 'Ilustración: ' + (band.imageTitle || band.title || 'vestimenta sugerida');
    el.outfitTitle.textContent = (band.imageTitle || band.title || '') + ' · ' + tTempUnit(state.forecast.current.temp);
    el.outfitNote.textContent = advice.outfitHint;

    var extras = null;
    advice.layers.forEach(function (l) { if (l.key === 'extras') extras = l.items; });
    el.outfitAccess.innerHTML = (extras || []).slice(0, 4).map(function (a) {
      return '<span>' + u.esc(String(a).split(' — ')[0]) + '</span>';
    }).join('');
  }

  /* ---------------- render: horario y diario ---------------- */
  function renderHourly() {
    var f = state.forecast;
    var hours = W.nextHours(f, 24);
    var t = f.today;
    var sunrise = t.sunrise ? u.parseLocal(t.sunrise) : null;
    var sunset = t.sunset ? u.parseLocal(t.sunset) : null;

    var html = hours.map(function (h, i) {
      var timeLabel = i === 0 ? 'Ahora' : u.fmtHour(h.time);
      var isNight = false;
      if (sunrise && sunset) {
        var hh = u.parseLocal(h.time);
        if (hh) {
          var m = hh.h * 60 + hh.min;
          isNight = m < (sunrise.h * 60 + sunrise.min) || m > (sunset.h * 60 + sunset.min);
        }
      }
      var icon = W.codeInfo(h.code, isNight ? 0 : 1).icon;
      return '<div class="hour">' +
        '<div class="h-time">' + u.esc(timeLabel) + '</div>' +
        '<div class="h-icon">' + icon + '</div>' +
        '<div class="h-temp">' + tTemp(h.temp, 0) + '°</div>' +
        '<div class="h-pop">' + (h.pop != null ? h.pop + '%' : '') + '</div>' +
        '<div class="h-wind">' + tWind(h.wind) + '</div>' +
        '</div>';
    }).join('');
    el.hourly.innerHTML = html;
  }

  function renderDaily() {
    var f = state.forecast;
    var days = f.daily;
    var mins = days.map(function (d) { return d.tmin; }).filter(function (v) { return v != null; });
    var maxs = days.map(function (d) { return d.tmax; }).filter(function (v) { return v != null; });
    var min = mins.length ? Math.min.apply(null, mins) : 0;
    var max = maxs.length ? Math.max.apply(null, maxs) : 1;
    var span = Math.max(1, max - min);

    var html = days.map(function (d, i) {
      var icon = W.codeInfo(d.code, 1).icon;
      var name = i === 0 ? 'Hoy' : (i === 1 ? 'Mañana' : u.fmtDayName(d.date));
      var left = ((d.tmin - min) / span) * 100;
      var width = Math.max(6, ((d.tmax - d.tmin) / span) * 100);
      var bits = [];
      if (d.popMax != null) bits.push('💧 ' + d.popMax + '%');
      if (d.precipSum != null && d.precipSum > 0) bits.push(tPrecip(d.precipSum, 1) + ' ' + precipUnitLabel());
      if (d.uvMax != null) bits.push('UV ' + u.fmt(d.uvMax, 0));
      if (d.windMax != null) bits.push('💨 ' + tWind(d.windMax) + ' ' + windUnitLabel());
      return '<div class="day" data-date="' + u.esc(d.date) + '" title="Toca para ver el detalle hora a hora">' +
        '<div class="d-name">' + u.esc(name) + '</div>' +
        '<div class="d-icon">' + icon + '</div>' +
        '<div class="d-info"><div>' + u.esc(bits.join(' · ')) + '</div>' +
          '<div class="bar"><span style="left:' + left + '%;width:' + width + '%;background:' +
            u.tempColor((d.tmin + d.tmax) / 2) + '"></span></div>' +
        '</div>' +
        '<div class="d-temp">' + tTemp(d.tmax, 0) + '° <span class="min">/ ' + tTemp(d.tmin, 0) + '°</span></div>' +
        '</div>';
    }).join('');
    el.daily.innerHTML = html;
  }

  function toggleDayDetail(row) {
    var next = row.nextElementSibling;
    if (next && next.classList && next.classList.contains('day-detail')) {
      next.parentNode.removeChild(next);
      row.classList.remove('detail-open');
      return;
    }
    var date = row.getAttribute('data-date');
    var f = state.forecast;
    var hours = (f.hourly || []).filter(function (h) { return String(h.time).slice(0, 10) === date; });
    if (!hours.length) return;
    var rows = hours.filter(function (h, i) { return i % 2 === 0; }).map(function (h) {
      var icon = W.codeInfo(h.code, 1).icon;
      return '<div class="detail-row">' +
        '<span>' + u.esc(u.fmtHour(h.time)) + '</span>' +
        '<span class="dr-icon">' + icon + '</span>' +
        '<span>' + tTemp(h.temp, 0) + '°</span>' +
        '<span>' + (h.pop != null ? h.pop + '%' : '—') + '</span>' +
        '<span>' + tWind(h.wind) + '</span>' +
        '<span>' + (h.uv != null ? u.fmt(h.uv, 1) : '—') + '</span>' +
        '</div>';
    }).join('');
    var div = document.createElement('div');
    div.className = 'day-detail';
    div.innerHTML =
      '<div class="detail-row head"><span>Hora</span><span></span><span>Temp</span><span>Lluvia</span><span>Viento</span><span>UV</span></div>' +
      rows;
    row.parentNode.insertBefore(div, row.nextSibling);
    row.classList.add('detail-open');
  }

  /* ---------------- render: datos adicionales ---------------- */
  function renderExtras() {
    if (!el.extrasMetrics) return;
    var x = state.extras;
    if (!x) {
      el.extrasMetrics.innerHTML = '';
      el.extrasNote.textContent = navigator.onLine
        ? 'No hay datos adicionales disponibles para este punto.'
        : 'Sin datos adicionales en la copia guardada.';
      return;
    }
    var rows = [];
    if (x.radiation != null) rows.push(['Radiación solar', u.fmt(x.radiation, 0) + ' W/m²']);
    if (x.directRadiation != null) rows.push(['Radiación directa', u.fmt(x.directRadiation, 0) + ' W/m²']);
    if (x.freezingLevel != null) rows.push(['Nivel de congelación', u.fmt(x.freezingLevel, 0) + ' m']);
    if (x.tempTrend3h != null) {
      var d3 = isImperial() ? x.tempTrend3h * 9 / 5 : x.tempTrend3h;
      rows.push(['Tendencia (3 h)', (d3 >= 0 ? '+' : '') + u.fmt(d3, 1) + '°']);
    }
    if (x.soilMoisture != null) rows.push(['Humedad del suelo', u.fmt(x.soilMoisture, 0) + ' %']);
    if (x.soilTemp != null) rows.push(['Temp. del suelo (6 cm)', tTempUnit(x.soilTemp)]);
    if (x.et0 != null) rows.push(['Evapotranspiración', u.fmt(x.et0, 2) + ' mm']);
    if (x.snowDepth != null) rows.push(['Espesor de nieve', u.fmt(x.snowDepth * 100, 0) + ' cm']);
    if (x.visibilityMin12h != null) rows.push(['Visibilidad mín. (12 h)', tDistance(x.visibilityMin12h)]);
    if (x.cloudLow != null || x.cloudMid != null || x.cloudHigh != null) {
      rows.push(['Nubes baja / media / alta',
        u.fmt(x.cloudLow, 0) + ' / ' + u.fmt(x.cloudMid, 0) + ' / ' + u.fmt(x.cloudHigh, 0) + ' %']);
    }
    if (x.sunshineHours != null) rows.push(['Horas de sol hoy', u.fmt(x.sunshineHours, 1) + ' h']);
    if (x.daylightHours != null) rows.push(['Duración del día', u.fmt(x.daylightHours, 1) + ' h']);
    if (x.precipHours != null) rows.push(['Horas con lluvia', u.fmt(x.precipHours, 0) + ' h']);
    if (x.surfacePressure != null) rows.push(['Presión superficial', u.fmt(x.surfacePressure, 0) + ' hPa']);

    el.extrasMetrics.innerHTML = rows.map(function (r) { return metric(r[0], u.esc(r[1])); }).join('');
    el.extrasNote.textContent = 'Fuente: Open-Meteo (modelo horario) · ' +
      (state.source === 'cache'
        ? 'copia guardada del ' + fmtStamp(state.cachedAt)
        : 'actualizado ' + agoText(x.fetchedAt || state.updatedAt));
  }

  /* ---------------- render: calidad del aire ---------------- */
  function renderAqi() {
    if (!el.aqiCard) return;
    if (!state.aqi || !state.aqi.current) { el.aqiCard.hidden = true; return; }
    var c = state.aqi.current;
    var lvl = W.aqiLabel(c.european_aqi);
    el.aqiCard.hidden = false;
    el.aqiBadge.textContent = lvl.label + (c.european_aqi != null ? ' (' + u.fmt(c.european_aqi, 0) + ')' : '');
    el.aqiBadge.style.color = lvl.level === 'danger' ? '#ff6b6b' : (lvl.level === 'warn' ? '#ffb648' : '#58d68d');
    var rows = [
      ['PM2.5', c.pm2_5 != null ? u.fmt(c.pm2_5, 1) + ' µg/m³' : '—'],
      ['PM10', c.pm10 != null ? u.fmt(c.pm10, 1) + ' µg/m³' : '—'],
      ['Ozono (O₃)', c.ozone != null ? u.fmt(c.ozone, 0) + ' µg/m³' : '—'],
      ['NO₂', c.nitrogen_dioxide != null ? u.fmt(c.nitrogen_dioxide, 0) + ' µg/m³' : '—'],
      ['SO₂', c.sulphur_dioxide != null ? u.fmt(c.sulphur_dioxide, 0) + ' µg/m³' : '—'],
      ['CO', c.carbon_monoxide != null ? u.fmt(c.carbon_monoxide, 0) + ' µg/m³' : '—']
    ];
    el.aqiMetrics.innerHTML = rows.map(function (r) { return metric(r[0], u.esc(r[1])); }).join('');
  }

  /* ---------------- render: lugares guardados ---------------- */
  function placeTempFor(p) {
    if (state.placeTemps[p.id]) return state.placeTemps[p.id];
    var e = u.get(wxKey(p.lat, p.lon), null);
    if (e && e.f && e.f.current) {
      return { temp: e.f.current.temp, code: e.f.current.code, isDay: e.f.current.isDay, cached: true };
    }
    return null;
  }

  function renderPlaces() {
    var rows = PL.list();
    el.placesEmpty.hidden = rows.length > 0;
    el.placesList.innerHTML = rows.map(function (p) {
      var temp = placeTempFor(p);
      var icon = temp ? W.codeInfo(temp.code, temp.isDay).icon : '📍';
      var line = temp
        ? '<span class="p-temp' + (temp.cached ? ' muted' : '') + '">' + tTemp(temp.temp, 0) + '°</span>'
        : '<span class="p-temp muted">·</span>';
      return '<li class="place-item" data-id="' + u.esc(p.id) + '">' +
        '<span class="p-icon">' + icon + '</span>' +
        '<span class="p-body">' +
          '<span class="p-name">' + u.esc(p.name) + '</span>' +
          '<span class="p-sub">' + u.fmt(p.lat, 3) + ', ' + u.fmt(p.lon, 3) +
            (p.notes ? ' · ' + u.esc(p.notes) : '') + '</span>' +
        '</span>' + line +
        '<button class="p-del" title="Eliminar" data-del="' + u.esc(p.id) + '">✕</button>' +
        '</li>';
    }).join('');
  }

  function refreshPlaceTemps() {
    var rows = PL.list().slice(0, 20);
    if (!rows.length) { state.placeTemps = {}; renderPlaces(); return; }
    if (!navigator.onLine) { renderPlaces(); return; }
    W.batch(rows, { unit: 'metric' }).then(function (temps) {
      var next = {};
      rows.forEach(function (p, i) { if (temps[i]) next[p.id] = temps[i]; });
      state.placeTemps = next;
      u.set('placesTemps', next);
      renderPlaces();
    }).catch(function () { renderPlaces(); });
  }

  /* ---------------- pestañas y hoja móvil ---------------- */
  function switchTab(name) {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === name);
    });
    var wt = document.getElementById('tab-weather');
    var pt = document.getElementById('tab-places');
    if (wt) wt.classList.toggle('active', name === 'weather');
    if (pt) pt.classList.toggle('active', name === 'places');
    if (name === 'places') { renderPlaces(); refreshPlaceTemps(); }
  }

  function expandPanel() { el.panel.classList.remove('collapsed'); }
  function isMobile() { return window.matchMedia('(max-width: 900px)').matches; }
  function toggleSheet() { if (isMobile()) el.panel.classList.toggle('collapsed'); }

  /* ---------------- búsqueda / geocodificación ---------------- */
  function renderSearchResults(rows) {
    if (!rows || !rows.length) {
      el.searchResults.innerHTML = '<li class="r-empty"><span class="muted">Sin resultados</span></li>';
      el.searchResults.hidden = false;
      return;
    }
    el.searchResults.innerHTML = rows.map(function (r, i) {
      return '<li data-i="' + i + '">' +
        '<span class="r-name">' + u.esc(r.name) + '</span>' +
        '<span class="r-sub">' + u.esc(r.subtitle || '') + '</span></li>';
    }).join('');
    el.searchResults.hidden = false;
    el.searchResults._rows = rows;
  }

  function doSearch() {
    var q = el.searchInput.value.trim();
    if (!q) return;
    var coords = /^(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)$/.exec(q);
    if (coords) {
      var lat = parseFloat(coords[1]), lon = parseFloat(coords[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        el.searchResults.hidden = true;
        selectPoint(lat, lon, { reverse: true });
        return;
      }
    }
    el.searchResults.innerHTML = '<li class="r-empty"><span class="muted">Buscando…</span></li>';
    el.searchResults.hidden = false;
    W.search(q).then(renderSearchResults).catch(function () {
      el.searchResults.innerHTML = '<li class="r-empty"><span class="muted">No se pudo buscar. Revisa tu conexión.</span></li>';
    });
  }

  /* ---------------- diálogo de nombre ---------------- */
  function askName(defaultValue, title) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML =
        '<div class="modal">' +
          '<h3>' + u.esc(title || 'Nombre del lugar') + '</h3>' +
          '<input id="modalName" type="text" maxlength="80" value="' + u.esc(defaultValue || '') + '" />' +
          '<div class="modal-actions">' +
            '<button class="mini" id="modalCancel">Cancelar</button>' +
            '<button class="mini primary" id="modalOk">Guardar</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      var input = overlay.querySelector('#modalName');
      input.focus();
      input.select();
      function close(val) {
        if (overlay.parentNode) document.body.removeChild(overlay);
        resolve(val);
      }
      overlay.querySelector('#modalOk').addEventListener('click', function () { close(input.value.trim()); });
      overlay.querySelector('#modalCancel').addEventListener('click', function () { close(null); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(null); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') close(input.value.trim());
        if (e.key === 'Escape') close(null);
      });
    });
  }

  function saveCurrentPlace() {
    var sel = state.selected;
    if (!sel) { u.toast('Primero selecciona un punto en el mapa.'); return; }
    var already = PL.list().some(function (p) {
      return Math.abs(p.lat - sel.lat) < 0.0012 && Math.abs(p.lon - sel.lon) < 0.0012;
    });
    if (already) { u.toast('Este punto ya está guardado.'); return; }
    var suggested = sel.name || (u.fmt(sel.lat, 3) + ', ' + u.fmt(sel.lon, 3));
    askName(suggested, 'Guardar lugar').then(function (name) {
      if (name == null) return;
      PL.add({ name: name || suggested, lat: sel.lat, lon: sel.lon, notes: '' });
      renderPlaceHead();
      u.toast('Lugar guardado: ' + (name || suggested));
      refreshPlaceTemps();
    });
  }

  function renameCurrent() {
    var sel = state.selected;
    if (!sel) return;
    askName(sel.name || '', 'Renombrar lugar').then(function (name) {
      if (name == null || !name) return;
      sel.name = name;
      u.set('lastPoint', sel);
      var saved = PL.list().find(function (p) {
        return Math.abs(p.lat - sel.lat) < 0.0012 && Math.abs(p.lon - sel.lon) < 0.0012;
      });
      if (saved) PL.update(saved.id, { name: name });
      renderPlaceHead();
      renderPlaces();
      updateMarkerLabel();
    });
  }

  /* ---------------- herramientas del dispositivo ---------------- */
  function toolCheck() {
    var checks = [];
    function add(name, level, detail) { checks.push({ name: name, level: level, detail: detail || '' }); }

    var storageOk = false;
    try {
      localStorage.setItem('aplicaclimate.__t', '1');
      localStorage.removeItem('aplicaclimate.__t');
      storageOk = true;
    } catch (e) { storageOk = false; }
    add('Almacenamiento local', storageOk ? 'ok' : 'bad',
      storageOk ? 'Lugares y pronósticos guardados en el equipo' : 'No disponible (¿modo privado?)');

    add('Conexión a internet', navigator.onLine ? 'ok' : 'warn',
      navigator.onLine ? 'En línea' : 'Sin conexión: se usa la última copia guardada');

    var geo = typeof navigator.geolocation !== 'undefined';
    add('Ubicación (GPS)', geo ? 'ok' : 'bad', geo ? 'Disponible' : 'Este navegador no la ofrece');

    var DOE = typeof window.DeviceOrientationEvent !== 'undefined';
    var needsPerm = DOE && typeof window.DeviceOrientationEvent.requestPermission === 'function';
    add('Brújula / orientación', DOE ? 'ok' : 'bad',
      DOE ? (needsPerm ? 'Requiere permiso (se pide al activarla)' : 'Disponible') : 'Sin sensor en este equipo');

    var vib = typeof navigator.vibrate === 'function';
    add('Vibración', vib ? 'ok' : 'bad', vib ? 'Se usa al seleccionar un punto' : 'No disponible');

    var share = typeof navigator.share === 'function';
    add('Compartir del sistema', share ? 'ok' : 'warn', share ? 'Disponible' : 'Se copiará al portapapeles');

    var wake = typeof navigator.wakeLock !== 'undefined' && !!(navigator.wakeLock && navigator.wakeLock.request);
    add('Mantener pantalla activa', wake ? 'ok' : 'warn', wake ? 'Disponible' : 'No disponible');

    var sw = 'serviceWorker' in navigator;
    add('Caché sin conexión', sw ? 'ok' : 'warn',
      sw ? (navigator.serviceWorker.controller ? 'Activa' : 'Registrándose…') : 'No disponible');

    var tz = '—';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '—'; } catch (e) {}
    add('Zona horaria del equipo', 'ok', tz);

    var idx = u.get(WX_INDEX, []) || [];
    add('Pronósticos guardados', idx.length ? 'ok' : 'warn',
      idx.length + ' punto' + (idx.length === 1 ? '' : 's') + ' disponible' + (idx.length === 1 ? '' : 's') + ' sin conexión');

    state.toolChecks = checks;
    return checks;
  }

  function renderTools() {
    if (!el.toolsList) return;
    var checks = state.toolChecks.length ? state.toolChecks : toolCheck();
    var html = checks.map(function (c) {
      var txt = c.level === 'ok' ? 'Disponible' : (c.level === 'warn' ? 'Con avisos' : 'No disponible');
      return '<li><span class="t-name">' + u.esc(c.name) +
        '<br><span class="muted small">' + u.esc(c.detail) + '</span></span>' +
        '<span class="t-state ' + c.level + '">' + txt + '</span></li>';
    }).join('');
    if (state.compassOn && state.heading != null) {
      html += '<li><span class="t-name">Rumbo actual<br><span class="muted small">Lectura del sensor en vivo</span></span>' +
        '<span class="t-state ok">' + u.fmt(state.heading, 0) + '° ' + u.compass(state.heading) + '</span></li>';
    }
    el.toolsList.innerHTML = html;
    if (el.btnCompassOn) el.btnCompassOn.textContent = state.compassOn ? 'Desactivar brújula' : 'Activar brújula';
    if (el.btnWakeLock) el.btnWakeLock.textContent = state.wakeSentinel ? 'Apagar pantalla activa' : 'Pantalla activa';
    if (el.btnShare) el.btnShare.disabled = !state.selected;
  }

  function updateCompassNeedle() {
    if (state.heading == null) return;
    var needle = document.querySelector('.cp-needle');
    var badge = document.getElementById('compassBadge');
    if (needle) needle.style.transform = 'rotate(' + state.heading + 'deg)';
    if (badge) badge.textContent = u.fmt(state.heading, 0) + '° ' + u.compass(state.heading);
  }

  function onOrientation(e) {
    var heading = null;
    if (typeof e.webkitCompassHeading === 'number') heading = e.webkitCompassHeading;
    else if (typeof e.alpha === 'number') heading = (360 - e.alpha) % 360;
    if (heading == null || isNaN(heading)) return;
    state.heading = heading;
    updateCompassNeedle();
  }

  function toggleCompass() {
    if (state.compassOn) {
      window.removeEventListener('deviceorientationabsolute', onOrientation, true);
      window.removeEventListener('deviceorientation', onOrientation, true);
      state.compassOn = false;
      state.heading = null;
      var needle = document.querySelector('.cp-needle');
      if (needle) needle.style.transform = '';
      var badge = document.getElementById('compassBadge');
      if (badge) badge.textContent = 'N';
      u.toast('Brújula desactivada');
      renderTools();
      return;
    }
    if (typeof window.DeviceOrientationEvent === 'undefined') {
      u.toast('Este equipo no tiene brújula disponible.');
      return;
    }
    function start() {
      window.addEventListener('deviceorientationabsolute', onOrientation, true);
      window.addEventListener('deviceorientation', onOrientation, true);
      state.compassOn = true;
      u.toast('Brújula activada: la aguja marca tu rumbo.');
      renderTools();
    }
    var DOE = window.DeviceOrientationEvent;
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then(function (res) {
        if (res === 'granted') start();
        else u.toast('Permiso de brújula denegado.');
      }).catch(function () { u.toast('No se pudo activar la brújula.'); });
    } else {
      start();
    }
  }

  function addCompassControl() {
    var CompassControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        var div = L.DomUtil.create('div', 'leaflet-control-compass');
        div.title = 'Brújula: toca para usar el sensor del equipo';
        div.innerHTML =
          '<svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true">' +
          '<circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="1.5"></circle>' +
          '<text x="20" y="10" text-anchor="middle" font-size="9" fill="currentColor" opacity=".75">N</text>' +
          '<g class="cp-needle">' +
          '<polygon points="20,5 23.5,21 20,18.5 16.5,21" fill="#ff6b6b"></polygon>' +
          '<polygon points="20,35 23.5,19 20,21.5 16.5,19" fill="currentColor" opacity=".45"></polygon>' +
          '</g></svg>' +
          '<span class="compass-badge" id="compassBadge">N</span>';
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.on(div, 'click', function (ev) {
          L.DomEvent.stop(ev);
          toggleCompass();
        });
        return div;
      }
    });
    map.addControl(new CompassControl());
  }

  function toggleWakeLock() {
    if (!(navigator.wakeLock && navigator.wakeLock.request)) {
      u.toast('Este equipo no permite mantener la pantalla activa.');
      return;
    }
    if (state.wakeSentinel) {
      try { state.wakeSentinel.release(); } catch (e) {}
      state.wakeSentinel = null;
      u.toast('Pantalla activa desactivada.');
      renderTools();
      return;
    }
    navigator.wakeLock.request('screen').then(function (sentinel) {
      state.wakeSentinel = sentinel;
      sentinel.addEventListener('release', function () { state.wakeSentinel = null; renderTools(); });
      u.toast('La pantalla quedará encendida mientras veas el clima.');
      renderTools();
    }).catch(function () {
      u.toast('No se pudo activar (requiere HTTPS y estar en primer plano).');
    });
  }

  function fallbackCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); u.toast('Copiado.'); } catch (e) { u.toast('No se pudo copiar.'); }
    document.body.removeChild(ta);
  }

  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () {
        u.toast('Copiado.');
      }).catch(function () { fallbackCopy(txt); });
    } else {
      fallbackCopy(txt);
    }
  }

  function summaryText() {
    var sel = state.selected;
    if (!sel) return '';
    var f = state.forecast;
    var head = 'AplicaClimate' + (sel.name ? ' · ' + sel.name : '') + '\n';
    if (!f) return head + u.fmt(sel.lat, 4) + ', ' + u.fmt(sel.lon, 4);
    var lines = [
      head + u.fmt(sel.lat, 4) + ', ' + u.fmt(sel.lon, 4),
      tTemp(f.current.temp, 0) + '° ' + W.codeInfo(f.current.code, f.current.isDay).label +
        ' (sensación ' + tTemp(f.current.feels, 0) + '°)',
      'Viento ' + tWind(f.current.wind) + ' ' + windUnitLabel() + ' ' + u.compass(f.current.windDir) +
        ' · Humedad ' + u.fmt(f.current.humidity, 0) + '%' +
        (f.current.uv != null ? ' · UV ' + u.fmt(f.current.uv, 1) : ''),
      state.advice ? 'Qué ponerte: ' + state.advice.outfitHint : '',
      'Datos: Open-Meteo'
    ];
    return lines.filter(function (l) { return l; }).join('\n');
  }

  function shareCurrent() {
    if (!state.selected) { u.toast('Selecciona un punto primero.'); return; }
    var text = summaryText();
    if (navigator.share) {
      navigator.share({ title: 'AplicaClimate', text: text }).catch(function () {});
    } else {
      copyText(text);
    }
  }

  /* ---------------- eventos ---------------- */
  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.getAttribute('data-tab'));
        expandPanel();
      });
    });

    if (el.introSkip) el.introSkip.addEventListener('click', finishIntro);

    el.btnUnits.addEventListener('click', function () {
      state.unit = isImperial() ? 'metric' : 'imperial';
      u.set('unit', state.unit);
      updateUnitsLabel();
      if (state.forecast) renderAll();
      renderPlaces();
      renderTools();
    });

    el.btnTheme.addEventListener('click', function () {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      u.set('theme', state.theme);
      applyTheme();
      if (!u.get('basemap', null)) {
        var key = state.theme === 'dark' ? 'dark' : 'streets';
        Object.keys(baseLayers).forEach(function (k) {
          if (k !== key && map.hasLayer(baseLayers[k])) map.removeLayer(baseLayers[k]);
        });
        if (!map.hasLayer(baseLayers[key])) baseLayers[key].addTo(map);
        state.basemap = key;
        applyDarkFilter();
      }
    });

    el.btnRefresh.addEventListener('click', function () {
      loadWeather();
      u.toast('Actualizando…', 1200);
    });
    el.btnSavePlace.addEventListener('click', saveCurrentPlace);
    el.btnQuickSave.addEventListener('click', saveCurrentPlace);
    el.btnRename.addEventListener('click', renameCurrent);

    el.activity.value = state.activity;
    el.sensitivity.value = state.sensitivity;
    el.activity.addEventListener('change', function () {
      state.activity = el.activity.value;
      u.set('activity', state.activity);
      if (state.forecast) { renderAdvice(); renderAlerts(); }
    });
    el.sensitivity.addEventListener('change', function () {
      state.sensitivity = el.sensitivity.value;
      u.set('sensitivity', state.sensitivity);
      if (state.forecast) { renderAdvice(); renderAlerts(); }
    });

    el.btnLocate.addEventListener('click', function () {
      if (!navigator.geolocation) { u.toast('Este dispositivo no soporta geolocalización.'); return; }
      setStatus('Obteniendo tu ubicación…');
      navigator.geolocation.getCurrentPosition(function (pos) {
        setStatus('');
        selectPoint(pos.coords.latitude, pos.coords.longitude, { reverse: true, name: 'Mi ubicación' });
        u.toast('Ubicación detectada');
      }, function () {
        setStatus('');
        u.toast('No se pudo obtener la ubicación. Revisa los permisos.');
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });

    el.searchBtn.addEventListener('click', doSearch);
    el.searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doSearch();
      if (e.key === 'Escape') el.searchResults.hidden = true;
    });
    el.searchInput.addEventListener('input', u.debounce(function () {
      var q = el.searchInput.value.trim();
      if (q.length < 3) { el.searchResults.hidden = true; return; }
      W.search(q).then(renderSearchResults).catch(function () {});
    }, 700));

    el.searchResults.addEventListener('click', function (e) {
      var li = e.target.closest('li[data-i]');
      if (!li) return;
      var row = (el.searchResults._rows || [])[+li.getAttribute('data-i')];
      if (!row) return;
      el.searchResults.hidden = true;
      selectPoint(row.lat, row.lon, { name: row.name, subtitle: row.subtitle, reverse: false });
    });

    document.addEventListener('click', function (e) {
      if (!el.searchResults.hidden && !el.searchResults.contains(e.target) && e.target !== el.searchInput) {
        el.searchResults.hidden = true;
      }
    });

    el.sheetHandle.addEventListener('click', toggleSheet);

    el.daily.addEventListener('click', function (e) {
      var row = e.target.closest('.day[data-date]');
      if (row) toggleDayDetail(row);
    });

    if (el.extrasCard) {
      el.extrasCard.addEventListener('toggle', function () {
        if (el.extrasCard.open) renderExtras();
      });
    }

    if (el.btnShare) el.btnShare.addEventListener('click', shareCurrent);
    if (el.btnCopyCoords) el.btnCopyCoords.addEventListener('click', function () {
      if (!state.selected) { u.toast('Selecciona un punto primero.'); return; }
      copyText(u.fmt(state.selected.lat, 5) + ', ' + u.fmt(state.selected.lon, 5));
    });
    if (el.btnCompassOn) el.btnCompassOn.addEventListener('click', toggleCompass);
    if (el.btnWakeLock) el.btnWakeLock.addEventListener('click', toggleWakeLock);

    el.placesList.addEventListener('click', function (e) {
      var del = e.target.closest('[data-del]');
      if (del) {
        e.stopPropagation();
        var id = del.getAttribute('data-del');
        var p = PL.get(id);
        PL.remove(id);
        renderPlaceHead();
        renderPlaces();
        u.toast('Eliminado: ' + (p ? p.name : ''));
        return;
      }
      var li = e.target.closest('.place-item');
      if (!li) return;
      var place = PL.get(li.getAttribute('data-id'));
      if (!place) return;
      selectPoint(place.lat, place.lon, { name: place.name, subtitle: place.notes, reverse: false });
    });

    el.btnExport.addEventListener('click', function () {
      var n = PL.exportFile();
      u.toast(n == null ? 'No se pudo exportar.' : 'Exportados ' + n + ' lugares.');
    });

    el.btnImport.addEventListener('click', function () { el.importFile.click(); });
    el.importFile.addEventListener('change', function () {
      var file = el.importFile.files && el.importFile.files[0];
      if (!file) return;
      PL.importFile(file).then(function (n) {
        u.toast('Importados ' + n + ' lugares.');
        renderPlaces();
        refreshPlaceTemps();
      }).catch(function (err) {
        u.toast('Error al importar: ' + err.message);
      });
      el.importFile.value = '';
    });

    window.addEventListener('resize', u.debounce(function () {
      if (!isMobile()) el.panel.classList.remove('collapsed');
      updateUnitsLabel();
      if (map) map.invalidateSize();
    }, 200));

    window.addEventListener('offline', function () {
      state.offline = true;
      u.toast('Sin conexión: se muestra el último pronóstico guardado');
      renderDataState();
      renderOfflineBanner(state.source === 'cache' ? state.cachedAt : null);
      state.toolChecks = toolCheck();
      renderTools();
    });

    window.addEventListener('online', function () {
      state.offline = false;
      u.toast('Conexión restaurada: actualizando…');
      state.toolChecks = toolCheck();
      renderTools();
      if (state.selected) loadWeather();
      updateViewPlace(true);
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && navigator.onLine && state.source === 'cache' && state.selected) loadWeather();
    });

    PL.onChange(function () {
      renderPlaces();
      renderPlaceHead();
      renderTools();
    });
  }

  /* ---------------- pantalla de inicio ---------------- */
  function introProgress(pct, msg) {
    if (el.introBar) el.introBar.style.width = pct + '%';
    if (msg && el.introMsg) el.introMsg.textContent = msg;
  }

  function renderIntroChecks(checks) {
    if (!el.introChecks) return;
    el.introChecks.innerHTML = checks.map(function (c) {
      var icon = c.level === 'ok' ? '✔' : (c.level === 'warn' ? '⚠' : '—');
      return '<li><span class="ic ' + c.level + '">' + icon + '</span><span>' + u.esc(c.name) +
        (c.detail ? ' <span class="muted">· ' + u.esc(c.detail) + '</span>' : '') + '</span></li>';
    }).join('');
  }

  function finishIntro() {
    if (introDone) return;
    introDone = true;
    if (!el.intro) return;
    el.intro.classList.add('hide');
    setTimeout(function () {
      if (el.intro) el.intro.hidden = true;
      if (map) map.invalidateSize();
    }, 500);
  }

  function waitForTiles(timeoutMs) {
    return new Promise(function (resolve) {
      var layers = tileLayersOf(state.basemap);
      if (!layers.length) return resolve(false);
      var settled = false;
      function finish(ok) { if (!settled) { settled = true; resolve(ok); } }
      layers[0].once('load', function () { finish(true); });
      setTimeout(function () {
        finish(!!(layers[0]._tiles && layers[0]._tilesLoaded));
      }, timeoutMs || 7000);
    });
  }

  function loadInitialData() {
    if (state.selected) return loadWeather();
    var view = u.get('lastView', null);
    var lat = view ? view.lat : -12.04;
    var lon = view ? view.lon : -77.03;
    return selectPoint(lat, lon, { reverse: true, fly: false });
  }

  function runIntro() {
    var checks = state.toolChecks.length ? state.toolChecks : toolCheck();
    renderIntroChecks(checks);
    introProgress(15, 'Herramientas del equipo verificadas');

    waitForTiles(7000).then(function (tilesOk) {
      introProgress(48, tilesOk ? 'Mapa cargado con sus nombres' : 'Mapa cargado (algunos tiles pueden tardar)');
      introProgress(72, 'Descargando el pronóstico…');
      var timeout = new Promise(function (resolve) {
        setTimeout(function () { resolve({ ok: false, timeout: true }); }, 13000);
      });
      return Promise.race([loadInitialData(), timeout]);
    }).then(function (res) {
      introProgress(100, res && res.cached ? 'Listo · sin conexión, con datos guardados' : 'Todo listo');
      setTimeout(finishIntro, 550);
    }).catch(function () {
      introProgress(100, 'Listo con avisos');
      setTimeout(finishIntro, 550);
    });
  }

  /* ---------------- arranque ---------------- */
  function boot() {
    cacheEls();

    if (typeof window.L === 'undefined') {
      if (el.introMsg) el.introMsg.textContent = 'No se pudo cargar el motor del mapa (Leaflet).';
      return;
    }

    applyTheme();
    updateUnitsLabel();
    initMap();
    bind();
    switchTab('weather');
    renderPlaces();
    startChipTimer();
    startAutoRefresh();

    state.toolChecks = toolCheck();
    renderTools();
    runIntro();

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').then(function () {
        state.toolChecks = toolCheck();
        renderTools();
      }).catch(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
