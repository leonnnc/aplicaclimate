/* AplicaClimate — utilidades comunes */
(function () {
  'use strict';

  var NS = (window.CM = window.CM || {});
  var PREFIX = 'climamapa.';  /* prefijo original: se conserva para no perder los lugares ya guardados */

  var util = {
    /* ---------- almacenamiento ---------- */
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(PREFIX + key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    del: function (key) {
      try { localStorage.removeItem(PREFIX + key); } catch (e) {}
    },

    /* ---------- texto ---------- */
    esc: function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    /* ---------- números ---------- */
    round: function (v, decimals) {
      if (v == null || isNaN(v)) return null;
      var f = Math.pow(10, decimals == null ? 0 : decimals);
      return Math.round(v * f) / f;
    },
    fmt: function (v, decimals) {
      var r = util.round(v, decimals);
      if (r == null) return '—';
      return r.toLocaleString('es-PE', {
        minimumFractionDigits: decimals || 0,
        maximumFractionDigits: decimals || 0
      });
    },

    compass: function (deg) {
      if (deg == null || isNaN(deg)) return '—';
      var dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                  'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
      return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
    },

    /* Open-Meteo (timezone=auto) devuelve horas locales sin sufijo de zona.
       Se parsean como texto para no desplazarlas por la zona del dispositivo. */
    parseLocal: function (iso) {
      if (!iso) return null;
      var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(iso));
      if (!m) return null;
      return {
        y: +m[1], m: +m[2], d: +m[3],
        h: m[4] == null ? 0 : +m[4],
        min: m[5] == null ? 0 : +m[5],
        iso: String(iso)
      };
    },
    fmtHour: function (iso) {
      var p = util.parseLocal(iso);
      if (!p) return '—';
      return (p.h < 10 ? '0' + p.h : p.h) + ':' + (p.min < 10 ? '0' + p.min : p.min);
    },
    fmtDayShort: function (iso) {
      var p = util.parseLocal(iso);
      if (!p) return '—';
      var names = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
      var dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
      return names[dow] + ' ' + p.d + '/' + (p.m < 10 ? '0' + p.m : p.m);
    },
    fmtDayName: function (iso) {
      var p = util.parseLocal(iso);
      if (!p) return '—';
      var names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      var dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
      return names[dow];
    },

    debounce: function (fn, wait) {
      var t = null;
      return function () {
        var args = arguments, ctx = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, wait);
      };
    },

    toast: function (msg, ms) {
      var el = document.getElementById('toast');
      if (!el) return;
      el.textContent = msg;
      el.hidden = false;
      clearTimeout(util._toastT);
      util._toastT = setTimeout(function () { el.hidden = true; }, ms || 3200);
    },

    clamp: function (v, min, max) {
      return Math.min(max, Math.max(min, v));
    },

    /* Paleta por temperatura (°C), usada en gráficos y etiquetas */
    tempColor: function (c) {
      if (c == null) return '#93a3bd';
      if (c <= -10) return '#7f5cff';
      if (c <= 0) return '#4aa8ff';
      if (c <= 8) return '#57d2e8';
      if (c <= 15) return '#7ee0c0';
      if (c <= 22) return '#9ede6a';
      if (c <= 28) return '#ffd166';
      if (c <= 34) return '#ff9f45';
      return '#ff6b6b';
    }
  };

  NS.util = util;
})();
