/**
 * Módulo de análisis de publicaciones internacionales
 * Detecta productos importados y calcula precio real con impuestos argentinos
 * 
 * DESACOPLADO: No modifica ninguna función existente del sistema
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Configuración de impuestos Argentina 2025
// Según el usuario: 34.64% total de impuestos sobre el precio base
const TAX_CONFIG = {
  dolarReferencia: 1300,
  porcentajeImpuestos: 0.3464,  // 34.64% total
};

// Palabras clave que indican producto internacional
const KEYWORDS_INTERNACIONAL = [
  'internacional', 'llega desde el exterior', 'envío internacional',
  'importado', 'desde china', 'desde estados unidos', 'desde usa',
  'cross border', 'global', 'shipping from', 'fulfilled by',
  'llega de afuera', 'viene del exterior',
];

// Palabras clave que indican producto local
const KEYWORDS_LOCAL = [
  'retiro en', 'sucursal', 'envío a domicilio', 'llega mañana',
  'llega hoy', 'full', 'vendido por', 'tienda oficial',
  'stock en argentina', 'envío gratis',
];

/**
 * Analiza una publicación y detecta si es internacional
 * @param {string} url - URL del producto
 * @returns {Promise<{tipo: string, confianza: number, indicadores: string[]}>}
 */
async function analizarPublicacion(url) {
  const result = {
    tipo: 'local',        // 'local' | 'dudoso' | 'internacional'
    confianza: 0,         // 0-100
    indicadores: [],      // razones de la clasificación
  };

  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
      timeout: 8000,
    });

    const pageText = data.toLowerCase();

    // Buscar indicadores internacionales
    let scoreInternacional = 0;

    KEYWORDS_INTERNACIONAL.forEach(kw => {
      if (pageText.includes(kw)) {
        scoreInternacional += 20;
        result.indicadores.push(`Contiene: "${kw}"`);
      }
    });

    // Buscar indicadores locales
    let scoreLocal = 0;

    KEYWORDS_LOCAL.forEach(kw => {
      if (pageText.includes(kw)) {
        scoreLocal += 15;
      }
    });

    // Detectar tiempos de entrega largos (>7 días)
    const entregaMatch = pageText.match(/llega (?:en |entre )?(\d+)\s*(?:a\s*(\d+))?\s*d[ií]as/);
    if (entregaMatch) {
      const diasMax = parseInt(entregaMatch[2] || entregaMatch[1]);
      if (diasMax > 15) {
        scoreInternacional += 30;
        result.indicadores.push(`Entrega estimada: ${diasMax} días`);
      } else if (diasMax > 7) {
        scoreInternacional += 15;
        result.indicadores.push(`Entrega estimada: ${diasMax} días`);
      }
    }

    // Detectar moneda extranjera
    if (pageText.includes('usd') || pageText.includes('u$s') || pageText.includes('dólares')) {
      scoreInternacional += 15;
      result.indicadores.push('Menciona precio en USD');
    }

    // Clasificar
    const scoreFinal = scoreInternacional - scoreLocal;

    if (scoreFinal >= 30) {
      result.tipo = 'internacional';
      result.confianza = Math.min(95, 50 + scoreFinal);
    } else if (scoreFinal >= 10) {
      result.tipo = 'dudoso';
      result.confianza = Math.min(80, 40 + scoreFinal);
    } else {
      result.tipo = 'local';
      result.confianza = Math.min(95, 50 + scoreLocal);
    }

  } catch (err) {
    // Si no puede acceder a la URL, asumir local
    result.tipo = 'local';
    result.confianza = 30;
    result.indicadores.push('No se pudo verificar la publicación');
  }

  return result;
}

/**
 * Analiza un producto rápidamente sin visitar la URL (por título y precio)
 * @param {object} product - Producto con titulo, precio, tienda
 * @returns {{tipo: string, confianza: number, indicadores: string[]}}
 */
function analizarProductoRapido(product) {
  const result = {
    tipo: 'local',
    confianza: 50,
    indicadores: [],
  };

  const titulo = (product.titulo || '').toLowerCase();
  const precio = product.precio || 0;

  // Detectar por título
  if (titulo.includes('internacional') || titulo.includes('importado')) {
    result.tipo = 'internacional';
    result.confianza = 80;
    result.indicadores.push('Título indica producto internacional');
  }

  // Detectar por URL (cross-border de ML)
  const url = (product.url || '').toLowerCase();
  if (url.includes('cross_border') || url.includes('cbm_')) {
    result.tipo = 'internacional';
    result.confianza = 90;
    result.indicadores.push('URL indica cross-border');
  }

  return result;
}

/**
 * Calcula el precio FINAL con impuestos según el usuario
 * 25.73% de impuestos sobre el precio base
 * 
 * @param {number} precioBase - Precio base del producto (sin impuestos)
 * @param {object} config - Configuración de impuestos (opcional)
 * @returns {{precioBase, impuestos, precioFinal, desglose}}
 */
function calcularPrecioReal(precioBase, config = TAX_CONFIG) {
  // Impuestos: 25.73% sobre precio base
  const impuestos = Math.round(precioBase * config.porcentajeImpuestos);
  
  // Precio final = precio base + impuestos
  const precioFinal = precioBase + impuestos;

  return {
    precioBase: Math.round(precioBase),
    impuestos,
    precioFinal,
    desglose: {
      porcentajeImpuestos: 34.64,
      dolarUsado: config.dolarReferencia,
    },
  };
}

/**
 * Genera un insight/recomendación para el usuario
 * @param {object} analisis - Resultado de analizarPublicacion + calcularPrecioReal
 * @returns {{mensaje, recomendacion, riesgo}}
 */
function generarInsight(analisis) {
  const { tipo } = analisis.clasificacion;
  const p = analisis.precioReal;

  if (tipo === 'local') {
    return {
      mensaje: 'Producto local - sin impuestos de importación',
      recomendacion: 'Precio confiable. Verificá envío y garantía.',
      riesgo: 'bajo',
    };
  }

  if (tipo === 'dudoso') {
    return {
      mensaje: 'No pudimos confirmar si este producto es local o importado',
      recomendacion: 'Verificá con el vendedor antes de comprar.',
      riesgo: 'medio',
    };
  }

  // Internacional
  return {
    mensaje: p
      ? `Compra internacional: $${p.precioBase.toLocaleString('es-AR')} + $${p.impuestos.toLocaleString('es-AR')} (34.64% impuestos) = $${p.precioFinal.toLocaleString('es-AR')}`
      : 'Este producto es internacional y tiene impuestos adicionales.',
    recomendacion: 'Un producto local similar podría ser más barato. Compará antes de comprar.',
    riesgo: 'alto',
  };
}

/**
 * Análisis completo de un producto: clasifica + calcula impuestos + genera insight
 * @param {object} product - Producto {titulo, precio, url, tienda}
 * @param {boolean} deep - Si true, visita la URL para análisis profundo
 * @returns {Promise<object>}
 */
async function analizarCompleto(product, deep = false) {
  // Análisis rápido (por título y URL)
  let clasificacion = analizarProductoRapido(product);

  // Si es deep, visitar la URL para más precisión
  if (deep && product.url) {
    clasificacion = await analizarPublicacion(product.url);
  }

  // Calcular precio real solo si es internacional o dudoso
  let precioReal = null;
  if (clasificacion.tipo !== 'local') {
    precioReal = calcularPrecioReal(product.precio);
  }

  const insight = generarInsight({
    clasificacion,
    precioReal,
  });

  return {
    producto: {
      titulo: product.titulo,
      precio: product.precio,
      tienda: product.tienda,
    },
    clasificacion,
    precioReal,
    insight,
  };
}

module.exports = {
  analizarPublicacion,
  analizarProductoRapido,
  calcularPrecioReal,
  generarInsight,
  analizarCompleto,
  TAX_CONFIG,
};
