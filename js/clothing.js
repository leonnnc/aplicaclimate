/* AplicaClimate — motor de recomendación de vestimenta
   Entrada: condiciones actuales (unidades métricas) + actividad + sensibilidad.
   Salida: bandas de temperatura con prendas sugeridas, avisos y consejos. */
(function () {
  'use strict';

  var NS = (window.CM = window.CM || {});
  var u = NS.util;

  var ACTIVITY = {
    rest:   { label: 'Tranquila',   offset: -1 },
    normal: { label: 'Normal',      offset: 0 },
    active: { label: 'Activa',      offset: 3 },
    sport:  { label: 'Deporte',     offset: 6 }
  };

  var SENSITIVITY = {
    '-1': { label: 'Friolento/a', offset: -2 },
    '0':  { label: 'Normal',      offset: 0 },
    '1':  { label: 'Caluroso/a',  offset: 2 }
  };

  /* Bandas por temperatura efectiva (°C) — de más calor a más frío */
  var BANDS = [
    {
      key: 'xheat', min: 32, title: 'Calor extremo', icon: '🥵', color: '#ff4d4d',
      summary: 'Prioriza el calor sobre todo: ropa mínima, suelta y de color claro.',
      layers: {
        torso:  ['Camiseta sin mangas o manga corta de algodón/linen, holgada'],
        bottom: ['Short ligero o pantalón ancho de tejido fino'],
        feet:   ['Sandalias o zapatillas de tela transpirable'],
        outer:  ['Nada. Si hay sol fuerte, una camisa fina de manga larga para cubrirte'],
        extras: ['Gorra o sombrero de ala ancha', 'Gafas de sol', 'Botella de agua', 'Protector solar 50+']
      }
    },
    {
      key: 'heat', min: 27, title: 'Calor', icon: '☀️', color: '#ff9f45',
      summary: 'Ropa fresca, transpirable y en capas finas por si entras a un lugar con aire acondicionado.',
      layers: {
        torso:  ['Camiseta de manga corta (algodón o tejido técnico)', 'Camisa de lino de manga corta'],
        bottom: ['Short o pantalón liviano de tejido delgado'],
        feet:   ['Zapatillas transpirables o sandalias cómodas'],
        outer:  ['Nada, o una camisa fina para interiores con A/C'],
        extras: ['Gorra o sombrero', 'Gafas de sol', 'Protector solar 30–50', 'Agua a la mano']
      }
    },
    {
      key: 'warm', min: 23, title: 'Cálido', icon: '🌤️', color: '#ffd166',
      summary: 'Clima agradable y cálido: una capa ligera es suficiente.',
      layers: {
        torso:  ['Camiseta de manga corta', 'Polo o blusa de algodón fino'],
        bottom: ['Pantalón ligero, jeans finos o falda'],
        feet:   ['Zapatillas o calzado ventilado'],
        outer:  ['Sudadera o chaqueta muy liviana para la noche'],
        extras: ['Gafas de sol', 'Protector solar si estarás al aire libre']
      }
    },
    {
      key: 'mild', min: 18, title: 'Templado', icon: '⛅', color: '#9ede6a',
      summary: 'Temperatura ideal: capas ligeras que puedas quitarte y poner.',
      layers: {
        torso:  ['Camiseta o polo de manga corta o larga', 'Camisa de algodón'],
        bottom: ['Jeans, chino o pantalón de tela'],
        feet:   ['Zapatillas cerradas'],
        outer:  ['Casaca ligera, hoodie fino o blazer'],
        extras: ['Bufanda fina opcional al atardecer']
      }
    },
    {
      key: 'cool', min: 13, title: 'Fresco', icon: '🌥️', color: '#7ee0c0',
      summary: 'Fresco: usa el sistema de capas (base + media + exterior ligera).',
      layers: {
        torso:  ['Camiseta de manga larga o polo + polera fina'],
        bottom: ['Jeans o pantalón de drill', 'Medias de algodón normales'],
        feet:   ['Zapatillas deportivas cerradas'],
        outer:  ['Casaca ligera, rompevientos o chaqueta de punto'],
        extras: ['Bufanda fina', 'Gorro ligero si hay viento']
      }
    },
    {
      key: 'cold', min: 8, title: 'Frío', icon: '🌧️', color: '#57d2e8',
      summary: 'Frío real: capa base térmica, capa media de abrigo y exterior cortaviento.',
      layers: {
        torso:  ['Camiseta térmica o de manga larga', 'Polera/suéter de franela o lana'],
        bottom: ['Pantalón grueso (drill, mezclilla pesada) o leggings térmicos debajo', 'Medias gruesas'],
        feet:   ['Zapatillas cerradas o botines'],
        outer:  ['Casaca abrigada (plumón/relleno) o parka con forro'],
        extras: ['Bufanda', 'Guantes finos', 'Gorro de lana']
      }
    },
    {
      key: 'verycold', min: 2, title: 'Muy frío', icon: '🥶', color: '#4aa8ff',
      summary: 'Bastante frío: capas térmicas completas y protección de extremidades.',
      layers: {
        torso:  ['Base térmica de manga larga (primera piel)', 'Chompa de lana o polar', 'Segunda capa de abrigo'],
        bottom: ['Pantalón térmico o legging térmico + pantalón grueso', 'Medias térmicas de lana'],
        feet:   ['Botas cerradas, preferible impermeables', 'Plantillas térmicas si vas a estar quieto'],
        outer:  ['Abrigo largo tipo parka/plumón con capucha', 'Rompevientos encima si hay viento'],
        extras: ['Gorro de lana que cubra orejas', 'Guantes gruesos', 'Bufanda o cuello polar']
      }
    },
    {
      key: 'freezing', min: -6, title: 'Helado', icon: '❄️', color: '#7f5cff',
      summary: 'Cerca o por debajo de cero: máxima cobertura de piel, nada de algodón pegado al cuerpo.',
      layers: {
        torso:  ['Base térmica merino/sintética (evita algodón en la primera capa)', 'Polar grueso', 'Chaqueta aislante'],
        bottom: ['Pantalón aislado o térmico + pantalón de nieve', 'Medias térmicas de lana (lleva repuesto)'],
        feet:   ['Botas de invierno impermeables con buen agarre', 'Doble media si hay mucha nieve'],
        outer:  ['Plumón grueso o parka de invierno con capucha', 'Plumón de pluma o relleno sintético alto'],
        extras: ['Guantes impermeables tipo mitón', 'Gorro + orejeras', 'Bufanda/cuello alto', 'Bálsamo labial']
      }
    },
    {
      key: 'extreme', min: -999, title: 'Frío extremo', icon: '🧊', color: '#5c7cff',
      summary: 'Frío peligroso: cubre casi toda la piel y limita el tiempo al aire libre.',
      layers: {
        torso:  ['Doble base térmica', 'Polar o pluma intermedia', 'Parka extrema con capucha y cortaviento'],
        bottom: ['Pantalón aislado + sobrepantalón cortaviento', 'Doble media térmica de lana'],
        feet:   ['Botas de nieve aisladas (-20 °C o menos)', 'Nada de calzado ajustado: corta la circulación'],
        outer:  ['Plumón de expedición / parka de alta montaña'],
        extras: ['Mitones impermeables + guantes finos debajo', 'Pasamontañas y gorro', 'Gafas de nieve', 'Crema barrera en la cara']
      }
    }
  ];

  function pickBand(eff) {
    for (var i = 0; i < BANDS.length; i++) {
      if (eff >= BANDS[i].min) return BANDS[i];
    }
    return BANDS[BANDS.length - 1];
  }

  var LAYER_LABELS = {
    torso:  { icon: '👕', name: 'Parte superior' },
    bottom: { icon: '👖', name: 'Parte inferior' },
    feet:   { icon: '👟', name: 'Calzado' },
    outer:  { icon: '🧥', name: 'Capa exterior' },
    extras: { icon: '🧢', name: 'Accesorios' }
  };

  /**
   * @param {object} wx  condiciones (métricas): feels, temp, wind, gust, pop, precip,
   *                     humidity, uv, isDay, weatherCode, sunrise/sunset opcionales
   * @param {object} prefs { activity: 'rest'|'normal'|'active'|'sport', sensitivity: '-1'|'0'|'1' }
   */
  function advise(wx, prefs) {
    prefs = prefs || {};
    var act = ACTIVITY[prefs.activity] || ACTIVITY.normal;
    var sen = SENSITIVITY[String(prefs.sensitivity)] || SENSITIVITY['0'];

    var feels = wx.feels != null ? wx.feels : wx.temp;
    if (feels == null) feels = 20;

    var eff = feels + act.offset + sen.offset;
    var band = pickBand(eff);

    var layers = Object.keys(LAYER_LABELS).map(function (key) {
      return {
        key: key,
        icon: LAYER_LABELS[key].icon,
        name: LAYER_LABELS[key].name,
        items: (band.layers[key] || []).slice()
      };
    });

    function addTo(key, item) {
      for (var i = 0; i < layers.length; i++) {
        if (layers[i].key === key) { layers[i].items.push(item); return; }
      }
    }

    var tips = [];
    var alerts = [];

    var rain = (wx.precip != null && wx.precip > 0.05) || (wx.pop != null && wx.pop >= 40);
    var heavyRain = (wx.precip != null && wx.precip >= 2) || (wx.pop != null && wx.pop >= 70);
    var snow = (wx.weatherCode != null && [71, 73, 75, 77, 85, 86].indexOf(wx.weatherCode) >= 0) ||
               (wx.temp != null && wx.temp <= 1 && (wx.precip || 0) > 0.1);
    var windy = wx.wind != null && wx.wind >= 30;
    var veryWindy = wx.wind != null && wx.wind >= 50;
    var uv = wx.uv != null ? wx.uv : 0;

    /* --- Lluvia --- */
    if (rain) {
      addTo('outer', 'Chaqueta impermeable o chubasquero con capucha');
      addTo('feet', 'Calzado impermeable o botas de lluvia');
      addTo('extras', heavyRain ? 'Paraguas resistente (o capucha: el viento rompe paraguas)' : 'Paraguas compacto');
      tips.push({ level: heavyRain ? 'warn' : 'info', text: heavyRain
        ? 'Hay alta probabilidad de lluvia: llevas impermeable completo y calzado que no se empape.'
        : 'Puede llover: una capa impermeable liviana evita el problema.' });
    }

    /* --- Nieve / hielo --- */
    if (snow) {
      addTo('feet', 'Botas con suela antideslizante (agarre en hielo)');
      addTo('extras', 'Guantes impermeables');
      tips.push({ level: 'warn', text: 'Nieve o aguanieve: el piso puede estar resbaladizo y la ropa mojada enfría muy rápido.' });
    }

    /* --- Viento --- */
    if (windy) {
      addTo('outer', 'Rompevientos / cortaviento encima de la capa de abrigo');
      tips.push({ level: veryWindy ? 'warn' : 'info', text: veryWindy
        ? 'Viento fuerte (≥ 50 km/h): evita prendas sueltas y sombreros con ala; el viento baja la sensación térmica varios grados.'
        : 'Viento moderado: añade un cortavientos, la sensación térmica será menor que la temperatura real.' });
    }

    /* --- UV --- */
    if (uv >= 3) {
      addTo('extras', uv >= 6 ? 'Protector solar 50+ (reaplicar cada 2 h)' : 'Protector solar 30+');
      addTo('extras', uv >= 6 ? 'Sombrero de ala ancha y gafas UV' : 'Gafas de sol');
      if (uv >= 8) {
        alerts.push({ level: 'warn', text: 'Índice UV muy alto (' + u.fmt(uv, 0) + '): evita el sol entre 10:00 y 16:00, busca sombra.' });
      }
    }

    /* --- Noche --- */
    if (wx.isDay === 0) {
      addTo('extras', 'Prenda o detalle reflectante si caminas por la calle');
      tips.push({ level: 'info', text: 'Es de noche: suma una capa más que de día, la temperatura baja rápido tras el atardecer.' });
    }

    /* --- Humedad --- */
    if (wx.humidity != null && wx.humidity >= 80 && eff >= 24) {
      tips.push({ level: 'info', text: 'Humedad alta con calor: telas transpirables (lino, algodón fino, tejido técnico) en vez de sintético grueso.' });
    }
    if (wx.humidity != null && wx.humidity >= 85 && eff <= 10) {
      tips.push({ level: 'warn', text: 'Humedad alta con frío: la ropa húmeda enfría el cuerpo. Evita el algodón como primera capa y usa tejido térmico.' });
    }

    /* --- Riesgos por temperatura sentida --- */
    if (feels >= 35) {
      alerts.push({ level: 'danger', text: 'Sensación de ' + u.fmt(feels, 0) + ' °C: alto riesgo de golpe de calor. Hidrátate, evita esfuerzo físico entre 11:00 y 16:00.' });
    } else if (feels >= 30) {
      alerts.push({ level: 'warn', text: 'Sensación de ' + u.fmt(feels, 0) + ' °C: riesgo de deshidratación y agotamiento por calor. Agua y sombra.' });
    }
    if (feels <= 0) {
      alerts.push({ level: hearsRisk(feels) ? 'danger' : 'warn', text: 'Sensación de ' + u.fmt(feels, 0) + ' °C: riesgo de hipotermia si te mojas o si el viento es fuerte. Capas secas y abrigo completo.' });
    }
    if (wx.wind != null && wx.wind >= 35 && feels <= 5) {
      alerts.push({ level: 'danger', text: 'Fr\u00edo + viento: riesgo de congelación en dedos, orejas y nariz. Guantes, gorro y bufanda son obligatorios.' });
    }

    /* --- Resumen --- */
    var summaryParts = [];
    summaryParts.push('Con ' + act.label.toLowerCase() +
      (sen.offset !== 0 ? ' y tu sensibilidad (' + sen.label.toLowerCase() + ')' : '') +
      ' sentirás el equivalente a ' + u.fmt(eff, 0) + ' °C.');
    summaryParts.push(band.summary);
    if (rain) summaryParts.push('Súmale la lluvia: capa impermeable obligatoria.');

    return {
      band: band,
      eff: eff,
      feels: feels,
      badge: band.icon + ' ' + band.title,
      color: band.color,
      activityLabel: act.label,
      sensitivityLabel: sen.label,
      summary: summaryParts.join(' '),
      layers: layers,
      tips: tips,
      alerts: alerts,
      outfitHint: outfitHint(band.key, rain, snow)
    };
  }

  function hearsRisk(feels) {
    return feels <= -5;
  }

  /* Resumen corto "una línea" para listas y tarjetas compactas */
  function outfitHint(bandKey, rain, snow) {
    var base = {
      xheat:    'Camiseta sin mangas + short + sombrero.',
      heat:     'Manga corta + short o pantalón liviano + gorra.',
      warm:     'Manga corta + pantalón ligero + capa muy fina.',
      mild:     'Manga corta/larga + jeans + casaca ligera.',
      cool:     'Manga larga + jeans + casaca ligera o rompevientos.',
      cold:     'Base térmica + suéter + casaca abrigada + bufanda.',
      verycold: 'Térmico completo + polar + parka + gorro y guantes.',
      freezing: 'Doble capa térmica + parka + botas + mitones.',
      extreme:  'Sistema de 3 capas extremo, sin piel expuesta.'
    }[bandKey] || '';
    var extra = [];
    if (rain) extra.push('impermeable');
    if (snow) extra.push('botas antideslizantes');
    return extra.length ? base + ' + ' + extra.join(' + ') + '.' : base;
  }

  NS.clothing = {
    advise: advise,
    BANDS: BANDS,
    ACTIVITY: ACTIVITY,
    SENSITIVITY: SENSITIVITY
  };
})();

/* ---------- v0.2: ilustración por banda y accesorios concretos ----------
   Se mutan los objetos de banda ya definidos (NS.clothing.BANDS es la misma
   referencia que usa advise()), así que el motor los aplica sin más cambios. */
(function () {
  'use strict';

  var NS = window.CM;
  if (!NS || !NS.clothing || !NS.clothing.BANDS) return;

  var IMAGES = {
    xheat: 'verano', heat: 'verano',
    warm: 'calido',
    mild: 'templado', cool: 'templado',
    cold: 'frio', verycold: 'frio',
    freezing: 'extremo', extreme: 'extremo'
  };

  var TITLES = {
    verano: 'Ropa de verano',
    calido: 'Ropa de clima cálido',
    templado: 'Ropa de entretiempo',
    frio: 'Ropa de abrigo',
    extremo: 'Ropa de frío extremo'
  };

  /* Accesorios concretos: el gorro o guante que corresponde a cada banda */
  var ACCESORIOS = {
    xheat: [
      'Sombrero de ala ancha o gorra con visera',
      'Gafas de sol UV400',
      'Protector solar 50+ (reaplicar cada 2 h)',
      'Botella de agua de 1 L',
      'Camiseta de repuesto si sudas mucho'
    ],
    heat: [
      'Gorra de visera o sombrero de paja',
      'Gafas de sol con protección UV',
      'Protector solar 30–50',
      'Agua a la mano'
    ],
    warm: [
      'Gorra de visera (al mediodía)',
      'Gafas de sol',
      'Protector solar si estarás al sol'
    ],
    mild: [
      'Pañuelo o bufanda fina para la noche',
      'Gafas de sol si hay sol'
    ],
    cool: [
      'Bufanda fina de algodón',
      'Gorro ligero de tela si hay viento',
      'Gafas de sol si hay sol'
    ],
    cold: [
      'Gorro de lana que cubra las orejas',
      'Guantes de tela o cuero fino',
      'Bufanda de punto',
      'Calcetines gruesos de repuesto'
    ],
    verycold: [
      'Gorro de lana grueso con orejeras',
      'Guantes térmicos impermeables',
      'Bufanda gruesa o cuello polar',
      'Medias térmicas de lana de repuesto'
    ],
    freezing: [
      'Gorro de invierno doble con orejeras',
      'Mitones impermeables sobre guantes finos',
      'Braga de cuello o pasamontañas',
      'Gafas de sol de nieve',
      'Bálsamo labial y crema barrera'
    ],
    extreme: [
      'Pasamontañas + gorro de expedición',
      'Mitones impermeables de alta montaña',
      'Gafas de nieve de doble lente',
      'Crema barrera en cara y manos',
      'Calentadores de manos'
    ]
  };

  NS.clothing.BANDS.forEach(function (band) {
    var img = IMAGES[band.key];
    if (img) {
      band.image = 'assets/outfits/' + img + '.png';
      band.imageTitle = TITLES[img];
    }
    if (ACCESORIOS[band.key]) {
      band.layers.extras = ACCESORIOS[band.key].slice();
    }
  });
})();
