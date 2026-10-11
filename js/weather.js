/* AplicaClimate — capa de datos: Open-Meteo (pronóstico y calidad de aire) + Nominatim (búsqueda) */
(function () {
  'use strict';

  var NS = (window.CM = window.CM || {});
  var u = NS.util;

  var FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
  var AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
  var NOMINATIM = 'https://nominatim.openstreetmap.org';

  var CURRENT_VARS = [
    'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
    'precipitation', 'rain', 'showers', 'snowfall', 'weather_code', 'cloud_cover',
    'pressure_msl', 'surface_pressure', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'
  ];

  var HOURLY_VARS = [
    'temperature_2m', 'apparent_temperature', 'precipitation_probability', 'precipitation',
    'weather_code', 'wind_speed_10m', 'wind_gusts_10m', 'uv_index',
    'relative_humidity_2m', 'dew_point_2m', 'visibility'
  ];

  var DAILY_VARS = [
    'weather_code', 'temperature_2m_max', 'temperature_2m_min',
    'apparent_temperature_max', 'apparent_temperature_min', 'sunrise', 'sunset',
    'uv_index_max', 'precipitation_sum', 'precipitation_probability_max',
    'wind_speed_10m_max', 'wind_gusts_10m_max'
  ];

  /* ---------- Códigos WMO ---------- */
  var WMO = {
    0:  { d: 'Despejado',                 n: 'Cielo despejado',        id: '☀️', in: '🌙' },
    1:  { d: 'Mayormente despejado',       n: 'Mayormente despejado',   id: '🌤️', in: '🌙' },
    2:  { d: 'Parcialmente nublado',       n: 'Parcialmente nublado',   id: '⛅', in: '☁️' },
    3:  { d: 'Nublado',                    n: 'Nublado',                id: '☁️', in: '☁️' },
    45: { d: 'Niebla',                     n: 'Niebla',                 id: '🌫️', in: '🌫️' },
    48: { d: 'Niebla con escarcha',        n: 'Niebla con escarcha',    id: '🌫️', in: '🌫️' },
    51: { d: 'Llovizna ligera',            n: 'Llovizna ligera',        id: '🌦️', in: '🌦️' },
    53: { d: 'Llovizna moderada',          n: 'Llovizna moderada',      id: '🌦️', in: '🌦️' },
    55: { d: 'Llovizna densa',             n: 'Llovizna densa',         id: '🌧️', in: '🌧️' },
    56: { d: 'Llovizna helada ligera',     n: 'Llovizna helada ligera', id: '🌧️', in: '🌧️' },
    57: { d: 'Llovizna helada densa',      n: 'Llovizna helada densa',  id: '🌧️', in: '🌧️' },
    61: { d: 'Lluvia ligera',              n: 'Lluvia ligera',          id: '🌦️', in: '🌦️' },
    63: { d: 'Lluvia moderada',            n: 'Lluvia moderada',        id: '🌧️', in: '🌧️' },
    65: { d: 'Lluvia fuerte',              n: 'Lluvia fuerte',          id: '🌧️', in: '🌧️' },
    66: { d: 'Lluvia helada ligera',       n: 'Lluvia helada ligera',   id: '🌧️', in: '🌧️' },
    67: { d: 'Lluvia helada fuerte',       n: 'Lluvia helada fuerte',   id: '🌧️', in: '🌧️' },
    71: { d: 'Nieve ligera',               n: 'Nieve ligera',           id: '🌨️', in: '🌨️' },
    73: { d: 'Nieve moderada',             n: 'Nieve moderada',         id: '🌨️', in: '🌨️' },
    75: { d: 'Nieve fuerte',               n: 'Nieve fuerte',           id: '❄️', in: '❄️' },
    77: { d: 'Granos de nieve',            n: 'Granos de nieve',        id: '🌨️', in: '🌨️' },
    80: { d: 'Chubascos ligeros',          n: 'Chubascos ligeros',      id: '🌦️', in: '🌦️' },
    81: { d: 'Chubascos moderados',        n: 'Chubascos moderados',    id: '🌧️', in: '🌧️' },
    82: { d: 'Chubascos violentos',        n: 'Chubascos violentos',    id: '⛈️', in: '⛈️' },
    85: { d: 'Chubascos de nieve ligeros', n: 'Chubascos de nieve',     id: '🌨️', in: '🌨️' },
    86: { d: 'Chubascos de nieve fuertes', n: 'Chubascos de nieve',     id: '🌨️', in: '🌨️' },
    95: { d: 'Tormenta',                   n: 'Tormenta',               id: '⛈️', in: '⛈️' },
    96: { d: 'Tormenta con granizo leve',  n: 'Tormenta con granizo',   id: '⛈️', in: '⛈️' },
    99: { d: 'Tormenta con granizo fuerte', n: 'Tormenta con granizo',  id: '⛈️', in: '⛈️' }
  };

  function codeInfo(code, isDay) {
    var w = WMO[code] || { d: 'Sin dato', n: 'Sin dato', id: '❓', in: '❓' };
    return {
      label: (isDay === 0 ? w.n : w.d),
      icon: (isDay === 0 ? w.in : w.id)
    };
  }

  /* ---------- Conversiones (los cálculos internos usan unidades métricas) ---------- */
  var conv = {
    tToC: function (v, unit) { return v == null ? null : (unit === 'fahrenheit' ? (v - 32) * 5 / 9 : v); },
    tFromC: function (c, unit) { return c == null ? null : (unit === 'fahrenheit' ? c * 9 / 5 + 32 : c); },
    wToKmh: function (v, unit) { return v == null ? null : (unit === 'mph' ? v * 1.609344 : v); },
    wFromKmh: function (kmh, unit) { return kmh == null ? null : (unit === 'mph' ? kmh / 1.609344 : kmh); },
    pToMm: function (v, unit) { return v == null ? null : (unit === 'inch' ? v * 25.4 : v); },
    pFromMm: function (mm, unit) { return mm == null ? null : (unit === 'inch' ? mm / 25.4 : mm); }
  };

  function buildUrl(lat, lon, prefs) {
    var unit = (prefs && prefs.unit) === 'imperial' ? 'imperial' : 'metric';
    var params = new URLSearchParams();
    params.set('latitude', String(lat));
    params.set('longitude', String(lon));
    params.set('current', CURRENT_VARS.join(','));
    params.set('hourly', HOURLY_VARS.join(','));
    params.set('daily', DAILY_VARS.join(','));
    params.set('timezone', 'auto');
    params.set('forecast_days', '7');
    if (unit === 'imperial') {
      params.set('temperature_unit', 'fahrenheit');
      params.set('wind_speed_unit', 'mph');
      params.set('precipitation_unit', 'inch');
    }
    return FORECAST_URL + '?' + params.toString();
  }

  function getJson(url) {
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (res) {
      if (!res.ok) throw new Error('El servicio respondió ' + res.status + '. Intenta de nuevo.');
      return res.json();
    }).then(function (data) {
      if (data && data.error) throw new Error(data.reason || 'La API de clima devolvió un error.');
      return data;
    });
  }

  function indexForNow(times, currentTime) {
    if (!times || !times.length) return 0;
    if (!currentTime) return 0;
    var key = String(currentTime).slice(0, 16);
    for (var i = times.length - 1; i >= 0; i--) {
      if (String(times[i]).slice(0, 16) <= key) return i;
    }
    return 0;
  }

  function normalize(raw) {
    var unit = raw.hourly_units && raw.hourly_units.temperature_2m === '°F' ? 'fahrenheit' : 'celsius';
    var wunit = raw.hourly_units && raw.hourly_units.wind_speed_10m === 'mp/h' ? 'mph' : 'kmh';
    var punit = raw.hourly_units && raw.hourly_units.precipitation === 'inch' ? 'inch' : 'mm';

    var H = raw.hourly || {};
    var hIndex = indexForNow(H.time, raw.current && raw.current.time);

    var hourly = (H.time || []).map(function (t, i) {
      return {
        time: t,
        temp: conv.tToC(H.temperature_2m && H.temperature_2m[i], unit),
        feels: conv.tToC(H.apparent_temperature && H.apparent_temperature[i], unit),
        pop: H.precipitation_probability ? H.precipitation_probability[i] : null,
        precip: conv.pToMm(H.precipitation && H.precipitation[i], punit),
        code: H.weather_code ? H.weather_code[i] : null,
        wind: conv.wToKmh(H.wind_speed_10m && H.wind_speed_10m[i], wunit),
        gust: conv.wToKmh(H.wind_gusts_10m && H.wind_gusts_10m[i], wunit),
        uv: H.uv_index ? H.uv_index[i] : null,
        humidity: H.relative_humidity_2m ? H.relative_humidity_2m[i] : null,
        dew: conv.tToC(H.dew_point_2m && H.dew_point_2m[i], unit),
        visibility: H.visibility ? H.visibility[i] : null
      };
    });

    var D = raw.daily || {};
    var daily = (D.time || []).map(function (t, i) {
      return {
        date: t,
        code: D.weather_code ? D.weather_code[i] : null,
        tmax: conv.tToC(D.temperature_2m_max && D.temperature_2m_max[i], unit),
        tmin: conv.tToC(D.temperature_2m_min && D.temperature_2m_min[i], unit),
        feelsMax: conv.tToC(D.apparent_temperature_max && D.apparent_temperature_max[i], unit),
        feelsMin: conv.tToC(D.apparent_temperature_min && D.apparent_temperature_min[i], unit),
        sunrise: D.sunrise ? D.sunrise[i] : null,
        sunset: D.sunset ? D.sunset[i] : null,
        uvMax: D.uv_index_max ? D.uv_index_max[i] : null,
        precipSum: conv.pToMm(D.precipitation_sum && D.precipitation_sum[i], punit),
        popMax: D.precipitation_probability_max ? D.precipitation_probability_max[i] : null,
        windMax: conv.wToKmh(D.wind_speed_10m_max && D.wind_speed_10m_max[i], wunit),
        gustMax: conv.wToKmh(D.wind_gusts_10m_max && D.wind_gusts_10m_max[i], wunit)
      };
    });

    var C = raw.current || {};
    var hNow = hourly[hIndex] || {};
    var current = {
      time: C.time,
      temp: conv.tToC(C.temperature_2m, unit),
      feels: conv.tToC(C.apparent_temperature, unit),
      humidity: C.relative_humidity_2m != null ? C.relative_humidity_2m : hNow.humidity,
      isDay: C.is_day,
      precipitation: conv.pToMm(C.precipitation, punit),
      rain: conv.pToMm(C.rain, punit),
      showers: conv.pToMm(C.showers, punit),
      snowfall: C.snowfall,
      code: C.weather_code,
      cloud: C.cloud_cover,
      pressure: C.pressure_msl,
      surfacePressure: C.surface_pressure,
      wind: conv.wToKmh(C.wind_speed_10m, wunit),
      windDir: C.wind_direction_10m,
      gust: conv.wToKmh(C.wind_gusts_10m, wunit),
      dew: hNow.dew,
      visibility: hNow.visibility,
      uv: hNow.uv
    };

    return {
      lat: raw.latitude,
      lon: raw.longitude,
      elevation: raw.elevation,
      timezone: raw.timezone,
      timezoneAbbr: raw.timezone_abbreviation,
      utcOffsetSeconds: raw.utc_offset_seconds,
      today: daily[0] || {},
      current: current,
      hourly: hourly,
      daily: daily,
      hourIndex: hIndex
    };
  }

  /* Próximas N horas desde la hora actual */
  function nextHours(forecast, n) {
    var start = forecast.hourIndex || 0;
    return forecast.hourly.slice(start, start + (n || 24));
  }

  /* Máxima probabilidad de lluvia en las próximas N horas */
  function popAhead(forecast, n) {
    var hours = nextHours(forecast, n || 6);
    var max = 0;
    hours.forEach(function (h) { if (h.pop != null && h.pop > max) max = h.pop; });
    return max;
  }

  function maxPrecipAhead(forecast, n) {
    var hours = nextHours(forecast, n || 3);
    var max = 0;
    hours.forEach(function (h) { if (h.precip != null && h.precip > max) max = h.precip; });
    return max;
  }

  var weather = {
    codeInfo: codeInfo,
    conv: conv,
    WMO: WMO,

    forecast: function (lat, lon, prefs) {
      return getJson(buildUrl(lat, lon, prefs)).then(normalize);
    },

    /* Varios puntos en una sola petición (Open-Meteo acepta listas separadas por coma) */
    batch: function (points, prefs) {
      if (!points || !points.length) return Promise.resolve([]);
      var unit = (prefs && prefs.unit) === 'imperial' ? 'imperial' : 'metric';
      var params = new URLSearchParams();
      params.set('latitude', points.map(function (p) { return p.lat; }).join(','));
      params.set('longitude', points.map(function (p) { return p.lon; }).join(','));
      params.set('current', 'temperature_2m,apparent_temperature,weather_code,is_day');
      params.set('timezone', 'auto');
      if (unit === 'imperial') params.set('temperature_unit', 'fahrenheit');
      return getJson(FORECAST_URL + '?' + params.toString()).then(function (raw) {
        var arr = Array.isArray(raw) ? raw : [raw];
        return arr.map(function (item) {
          var fahrenheit = unit === 'imperial';
          return {
            temp: fahrenheit ? (item.current.temperature_2m - 32) * 5 / 9 : item.current.temperature_2m,
            feels: fahrenheit ? (item.current.apparent_temperature - 32) * 5 / 9 : item.current.apparent_temperature,
            code: item.current.weather_code,
            isDay: item.current.is_day
          };
        });
      });
    },

    airQuality: function (lat, lon) {
      var params = new URLSearchParams();
      params.set('latitude', String(lat));
      params.set('longitude', String(lon));
      params.set('current', 'european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide');
      params.set('timezone', 'auto');
      return getJson(AIR_URL + '?' + params.toString());
    },

    /* ---------- Nominatim ---------- */
    search: function (query) {
      var params = new URLSearchParams();
      params.set('q', query);
      params.set('format', 'jsonv2');
      params.set('limit', '6');
      params.set('addressdetails', '1');
      params.set('accept-language', 'es');
      return getJson(NOMINATIM + '/search?' + params.toString()).then(function (rows) {
        return (rows || []).map(function (r) {
          var parts = [];
          var a = r.address || {};
          ['city', 'town', 'village', 'municipality', 'county', 'state', 'country'].forEach(function (k) {
            if (a[k] && parts.indexOf(a[k]) < 0) parts.push(a[k]);
          });
          return {
            name: r.name || r.display_name.split(',')[0],
            subtitle: parts.join(', ') || r.display_name,
            displayName: r.display_name,
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            type: r.type
          };
        });
      });
    },

    reverse: function (lat, lon) {
      var params = new URLSearchParams();
      params.set('lat', String(lat));
      params.set('lon', String(lon));
      params.set('format', 'jsonv2');
      params.set('zoom', '14');
      params.set('addressdetails', '1');
      params.set('accept-language', 'es');
      return getJson(NOMINATIM + '/reverse?' + params.toString()).then(function (r) {
        if (!r || !r.display_name) return null;
        var a = r.address || {};
        var name = a.city || a.town || a.village || a.municipality || a.county || a.state || r.display_name.split(',')[0];
        var parts = [];
        [a.city, a.town, a.village, a.municipality, a.county, a.state, a.country].forEach(function (v) {
          if (v && parts.indexOf(v) < 0) parts.push(v);
        });
        return {
          name: name,
          subtitle: parts.join(', ') || r.display_name,
          displayName: r.display_name,
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          type: r.type
        };
      });
    },

    nextHours: nextHours,
    popAhead: popAhead,
    maxPrecipAhead: maxPrecipAhead,

    /* Etiquetas auxiliares */
    uvLabel: function (uv) {
      if (uv == null) return '—';
      if (uv < 3) return 'Bajo';
      if (uv < 6) return 'Moderado';
      if (uv < 8) return 'Alto';
      if (uv < 11) return 'Muy alto';
      return 'Extremo';
    },
    aqiLabel: function (aqi) {
      if (aqi == null) return { label: '—', level: '' };
      if (aqi <= 20) return { label: 'Buena', level: 'ok' };
      if (aqi <= 40) return { label: 'Aceptable', level: 'ok' };
      if (aqi <= 60) return { label: 'Moderada', level: 'warn' };
      if (aqi <= 80) return { label: 'Mala', level: 'warn' };
      if (aqi <= 100) return { label: 'Muy mala', level: 'danger' };
      return { label: 'Extrema', level: 'danger' };
    },
    visibilityLabel: function (m) {
      if (m == null) return '—';
      if (m >= 10000) return 'Muy buena';
      if (m >= 5000) return 'Buena';
      if (m >= 2000) return 'Moderada';
      if (m >= 1000) return 'Pobre';
      return 'Muy pobre (niebla)';
    }
  };

  NS.weather = weather;
  NS.util = u;
})();

/* ---------- Respaldos de geocodificación ----------
   Nominatim es la fuente principal (da direcciones y puntos de interés), pero
   aplica límites de uso y puede rechazar peticiones. Se añaden respaldos sin
   llave: Open-Meteo Geocoding para buscar y BigDataCloud para el inverso. */
(function () {
  'use strict';

  var NS = window.CM;
  if (!NS || !NS.weather) return;
  var w = NS.weather;

  var GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
  var BDC = 'https://api.bigdatacloud.net/data/reverse-geocode-client';
  var origSearch = w.search;
  var origReverse = w.reverse;

  function fallbackSearch(query) {
    var params = new URLSearchParams();
    params.set('name', query);
    params.set('count', '6');
    params.set('language', 'es');
    params.set('format', 'json');
    return fetch(GEOCODE + '?' + params.toString(), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var rows = (data && data.results) ? data.results : [];
        return rows.map(function (r) {
          var parts = [];
          [r.admin1, r.admin2, r.country].forEach(function (v) {
            if (v && parts.indexOf(v) < 0) parts.push(v);
          });
          return {
            name: r.name,
            subtitle: parts.join(', '),
            displayName: r.name + (parts.length ? ', ' + parts.join(', ') : ''),
            lat: r.latitude,
            lon: r.longitude,
            type: r.feature_code
          };
        });
      });
  }

  function fallbackReverse(lat, lon) {
    var params = new URLSearchParams();
    params.set('latitude', String(lat));
    params.set('longitude', String(lon));
    params.set('localityLanguage', 'es');
    return fetch(BDC + '?' + params.toString(), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d) return null;
        var name = d.city || d.locality || d.principalSubdivision || d.countryName;
        if (!name) return null;
        var parts = [];
        [d.locality, d.city, d.principalSubdivision, d.countryName].forEach(function (v) {
          if (v && parts.indexOf(v) < 0) parts.push(v);
        });
        return {
          name: name,
          subtitle: parts.join(', '),
          displayName: name + (parts.length ? ', ' + parts.join(', ') : ''),
          lat: lat,
          lon: lon,
          type: 'locality'
        };
      });
  }

  w.search = function (query) {
    return origSearch(query).then(function (rows) {
      if (rows && rows.length) return rows;
      return fallbackSearch(query);
    }).catch(function () {
      return fallbackSearch(query);
    });
  };

  w.reverse = function (lat, lon) {
    return origReverse(lat, lon).then(function (place) {
      if (place) return place;
      return fallbackReverse(lat, lon);
    }).catch(function () {
      return fallbackReverse(lat, lon);
    });
  };
})();

/* ---------- Datos adicionales para el bloque "Más datos" ----------
   Variables que Open-Meteo sirve por hora y que no se piden en la consulta
   principal: radiación, nivel de congelación, suelo, nubes por capas, etc. */
(function () {
  'use strict';

  var NS = window.CM;
  if (!NS || !NS.weather) return;
  var w = NS.weather;
  var FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

  var HOURLY = [
    'shortwave_radiation', 'direct_radiation', 'freezing_level_height',
    'soil_moisture_0_to_7cm', 'soil_temperature_6cm', 'et0_fao_evapotranspiration',
    'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
    'sunshine_duration', 'snow_depth', 'surface_pressure', 'visibility', 'dew_point_2m'
  ];
  var DAILY = ['sunshine_duration', 'daylight_duration', 'precipitation_hours'];

  function get(url) {
    return fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('El servicio respondió ' + r.status + '.');
        return r.json();
      })
      .then(function (d) {
        if (d && d.error) throw new Error(d.reason || 'La API devolvió un error.');
        return d;
      });
  }

  function indexForNow(times, currentTime) {
    if (!times || !times.length) return 0;
    if (!currentTime) return 0;
    var key = String(currentTime).slice(0, 16);
    for (var i = times.length - 1; i >= 0; i--) {
      if (String(times[i]).slice(0, 16) <= key) return i;
    }
    return 0;
  }

  w.extras = function (lat, lon) {
    var params = new URLSearchParams();
    params.set('latitude', String(lat));
    params.set('longitude', String(lon));
    params.set('current', 'temperature_2m,surface_pressure');
    params.set('hourly', HOURLY.join(','));
    params.set('daily', DAILY.join(','));
    params.set('timezone', 'auto');

    return get(FORECAST_URL + '?' + params.toString()).then(function (raw) {
      var H = raw.hourly || {};
      var D = raw.daily || {};
      var i = indexForNow(H.time, raw.current && raw.current.time);

      function at(name, k) {
        var arr = H[name];
        return (arr && arr[k] != null) ? arr[k] : null;
      }
      function day0(name) {
        var arr = D[name];
        return (arr && arr[0] != null) ? arr[0] : null;
      }

      var trend = null;
      if (H.temperature_2m && H.temperature_2m[i] != null && H.temperature_2m[i + 3] != null) {
        trend = H.temperature_2m[i + 3] - H.temperature_2m[i];
      }

      var vmin = null;
      var vis = H.visibility || [];
      for (var k = i; k < Math.min(i + 12, vis.length); k++) {
        if (vis[k] != null && (vmin == null || vis[k] < vmin)) vmin = vis[k];
      }

      var soil = at('soil_moisture_0_to_7cm', i);
      var sun = day0('sunshine_duration');
      var dayl = day0('daylight_duration');

      return {
        radiation: at('shortwave_radiation', i),
        directRadiation: at('direct_radiation', i),
        freezingLevel: at('freezing_level_height', i),
        soilMoisture: soil == null ? null : soil * 100,
        soilTemp: at('soil_temperature_6cm', i),
        et0: at('et0_fao_evapotranspiration', i),
        cloudLow: at('cloud_cover_low', i),
        cloudMid: at('cloud_cover_mid', i),
        cloudHigh: at('cloud_cover_high', i),
        snowDepth: at('snow_depth', i),
        surfacePressure: at('surface_pressure', i),
        visibility: at('visibility', i),
        dew: at('dew_point_2m', i),
        sunshineHours: sun == null ? null : sun / 3600,
        daylightHours: dayl == null ? null : dayl / 3600,
        precipHours: day0('precipitation_hours'),
        tempTrend3h: trend,
        visibilityMin12h: vmin,
        fetchedAt: Date.now()
      };
    });
  };
})();
