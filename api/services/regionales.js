const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-AR,es;q=0.9',
};

// Tasas de impuestos para compras internacionales (2024 Argentina)
const IMPUESTOS_INT = {
  PAIS: 0.35,        // 35% RG 5272 - Impuesto PAIS
  ADUANERO: 0.30,    // 30% Derechos de importación (para productos > USD 400)
  IVA: 0.21,         // 21% IVA sobre importación
};

function parsePrecio(text) {
  if (!text) return 0;
  const clean = text.replace(/\./g, '').replace(/,(\d{2})(\s|$)/, '').replace(/[^\d]/g, '');
  const n = parseInt(clean);
  return n >= 500 && n <= 100000000 ? n : 0;
}

function calcularPrecioFinalArgentina(precioUSD, impuestosConfig) {
  // Si no hay config de impuestos, usar el default
  const imp = impuestosConfig || IMPUESTOS_INT;
  
  // Calcular multiplicador total
  // Ejemplo: precio 100 USD
  // + 35% PAIS = 135
  // + 30% Aduanero = 165 (sobre el valor CIF que incluye envío)
  // + 21% IVA = 199.65
  // Total: ~200% del precio original
  
  const tasaTotal = 1 + imp.PAIS + imp.ADUANERO + imp.IVA;
  const precioFinal = Math.round(precioUSD * tasaTotal);
  
  return {
    precioOriginal: precioUSD,
    precioFinal,
    tasaTotal,
    desglose: {
      pais: Math.round(precioUSD * imp.PAIS),
      aduanero: Math.round(precioUSD * imp.ADUANERO),
      iva: Math.round(precioUSD * imp.IVA),
    }
  };
}

async function scrapeTienda(tienda, query) {
  const url = tienda.searchUrl.replace('{query}', encodeURIComponent(query));
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
  const $ = cheerio.load(data);
  const products = [];
  const sel = tienda.selectores;

  $(sel.item).each(function(i, el) {
    if (products.length >= 6) return false;
    const titulo = $(el).find(sel.titulo).first().text().trim();
    const precioRaw = parsePrecio($(el).find(sel.precio).first().text());
    const linkHref = $(el).find(sel.link).first().attr('href') || '';
    const imgSrc = $(el).find(sel.imagen).first().attr('src') ||
                   $(el).find(sel.imagen).first().attr('data-src') || '';

    if (!titulo || precioRaw <= 0) return;

    const esInternacional = tienda.alcance === 'internacional';
    let precio = precioRaw;
    let precioInfo = null;

    // Si es tienda internacional, calcular precio final con impuestos
    if (esInternacional && tienda.moneda === 'USD') {
      precioInfo = calcularPrecioFinalArgentina(precioRaw, tienda.impuestos);
      precio = precioInfo.precioFinal;
    }

    products.push({
      titulo,
      precio,
      precioOriginal: precioRaw,
      precioInfo,
      descuento: 0,
      url: linkHref.startsWith('http') ? linkHref : tienda.baseUrl + linkHref,
      imagen: imgSrc.startsWith('http') ? imgSrc : (imgSrc ? tienda.baseUrl + imgSrc : ''),
      tienda: tienda.nombre,
      condicion: 'Nuevo',
      disponible: true,
      alcance: tienda.alcance || 'regional',
      ubicacion: tienda.ubicacion || null,
      tiempoEntrega: tienda.tiempoEntrega || null,
      categoria: tienda.categoria || null,
      moneda: tienda.moneda || 'ARS',
      fechaActualizacion: new Date().toISOString(),
    });
  });

  return products;
}

async function searchRegionales(query) {
  // Leer el JSON en cada llamada para permitir agregar tiendas sin reiniciar
  let tiendas;
  try {
    delete require.cache[require.resolve('../tiendas-regionales.json')];
    tiendas = require('../tiendas-regionales.json');
  } catch (e) {
    console.error('Error leyendo tiendas-regionales.json:', e.message);
    return [];
  }

  const activas = tiendas.filter(function(t) { return t.activa; });
  if (activas.length === 0) return [];

  const results = await Promise.allSettled(
    activas.map(function(tienda) {
      return scrapeTienda(tienda, query);
    })
  );

  const all = [];
  results.forEach(function(r, i) {
    if (r.status === 'fulfilled') {
      all.push(...r.value);
    } else {
      console.error(activas[i].nombre + ':', r.reason && r.reason.message);
    }
  });

  console.log('Regionales: ' + all.length + ' productos de ' + activas.length + ' tiendas');
  return all;
}

module.exports = { searchRegionales };
