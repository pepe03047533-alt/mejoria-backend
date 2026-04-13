/**
 * Módulo de clasificación y selección de productos ML
 * Devuelve SOLO 2 resultados: el más barato internacional y el más barato nacional
 * 
 * DESACOPLADO: No modifica ninguna función existente
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Palabras clave para detectar internacional
const KEYWORDS_INTERNACIONAL = [
  'internacional', 'llega desde el exterior', 'envío internacional',
  'importado', 'cross border', 'global', 'shipping from',
  'llega de afuera', 'viene del exterior', 'envío desde el exterior',
];

// Palabras clave para detectar nacional
const KEYWORDS_NACIONAL = [
  'retiro en', 'sucursal', 'llega mañana', 'llega hoy',
  'full', 'envío gratis', 'stock en argentina', 'envío a domicilio',
];

/**
 * Clasifica un producto como internacional o nacional
 * @param {object} product - Producto con titulo, url, etc.
 * @returns {Promise<'internacional' | 'nacional'>}
 */
async function clasificarProducto(product) {
  if (!product || !product.titulo) return 'nacional';

  const tituloLower = product.titulo.toLowerCase();
  
  // Verificar por título primero
  for (const kw of KEYWORDS_INTERNACIONAL) {
    if (tituloLower.includes(kw)) return 'internacional';
  }
  
  for (const kw of KEYWORDS_NACIONAL) {
    if (tituloLower.includes(kw)) return 'nacional';
  }

  // Si tiene URL, analizar la página
  if (product.url && product.tienda === 'MercadoLibre') {
    try {
      const { data } = await axios.get(product.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 5000,
      });
      
      const pageText = data.toLowerCase();
      
      // Buscar indicadores internacionales en la página
      for (const kw of KEYWORDS_INTERNACIONAL) {
        if (pageText.includes(kw)) return 'internacional';
      }
      
      // Detectar tiempos de entrega largos
      const entregaMatch = pageText.match(/llega (?:en |entre )?(\d+)\s*(?:a\s*(\d+))?\s*d[ií]as/);
      if (entregaMatch) {
        const diasMax = parseInt(entregaMatch[2] || entregaMatch[1]);
        if (diasMax > 15) return 'internacional';
      }
    } catch (err) {
      // Si falla el análisis, asumir nacional
    }
  }

  return 'nacional';
}

/**
 * Clasificación rápida sin hacer requests (para batch)
 * @param {object} product 
 * @returns {'internacional' | 'nacional'}
 */
function clasificarProductoRapido(product) {
  if (!product || !product.titulo) return 'nacional';

  const tituloLower = product.titulo.toLowerCase();
  const urlLower = (product.url || '').toLowerCase();
  
  // Por título
  for (const kw of KEYWORDS_INTERNACIONAL) {
    if (tituloLower.includes(kw)) return 'internacional';
  }
  
  // Por URL
  if (urlLower.includes('cross_border') || urlLower.includes('cbm_')) {
    return 'internacional';
  }
  
  return 'nacional';
}

/**
 * Filtra y devuelve SOLO 2 productos:
 * 1. El más barato internacional
 * 2. El más barato nacional
 * 
 * @param {Array} products - Lista de productos de ML
 * @returns {Promise<{internacional: object|null, nacional: object|null}>}
 */
async function seleccionarDosMejores(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return { internacional: null, nacional: null };
  }

  // Filtrar solo productos de MercadoLibre
  const mlProducts = products.filter(p => p.tienda === 'MercadoLibre');
  
  if (mlProducts.length === 0) {
    return { internacional: null, nacional: null };
  }

  // Clasificar todos los productos
  const productosClasificados = await Promise.all(
    mlProducts.map(async (p) => ({
      ...p,
      _tipo: await clasificarProducto(p),
    }))
  );

  // Separar en dos listas
  const internacionales = productosClasificados
    .filter(p => p._tipo === 'internacional')
    .sort((a, b) => a.precio - b.precio);

  const nacionales = productosClasificados
    .filter(p => p._tipo === 'nacional')
    .sort((a, b) => a.precio - b.precio);

  // Seleccionar el más barato de cada lista
  const resultado = {
    internacional: internacionales[0] || null,
    nacional: nacionales[0] || null,
  };

  // Limpiar propiedades internas antes de devolver
  if (resultado.internacional) {
    delete resultado.internacional._tipo;
  }
  if (resultado.nacional) {
    delete resultado.nacional._tipo;
  }

  return resultado;
}

/**
 * Versión rápida para usar en el frontend (sin requests adicionales)
 * @param {Array} products 
 * @returns {{internacional: object|null, nacional: object|null}}
 */
function seleccionarDosMejoresRapido(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return { internacional: null, nacional: null };
  }

  const mlProducts = products.filter(p => p.tienda === 'MercadoLibre');
  
  if (mlProducts.length === 0) {
    return { internacional: null, nacional: null };
  }

  // Clasificación rápida
  const productosClasificados = mlProducts.map(p => ({
    ...p,
    _tipo: clasificarProductoRapido(p),
  }));

  const internacionales = productosClasificados
    .filter(p => p._tipo === 'internacional')
    .sort((a, b) => a.precio - b.precio);

  const nacionales = productosClasificados
    .filter(p => p._tipo === 'nacional')
    .sort((a, b) => a.precio - b.precio);

  const resultado = {
    internacional: internacionales[0] || null,
    nacional: nacionales[0] || null,
  };

  if (resultado.internacional) delete resultado.internacional._tipo;
  if (resultado.nacional) delete resultado.nacional._tipo;

  return resultado;
}

module.exports = {
  clasificarProducto,
  clasificarProductoRapido,
  seleccionarDosMejores,
  seleccionarDosMejoresRapido,
  KEYWORDS_INTERNACIONAL,
  KEYWORDS_NACIONAL,
};
