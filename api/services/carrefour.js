const axios = require('axios');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'es-AR,es;q=0.9',
  'Referer': 'https://www.carrefour.com.ar/',
};

// Normaliza specs de neumáticos: "cubiertas 195 60 15" → "neumatico 195 60 R15"
function normalizeQuery(query) {
  return query
    .replace(/\bcubiertas?\b/gi, 'neumatico')
    .replace(/\bneum[aá]ticos?\b/gi, 'neumatico')
    .replace(/\b(\d{3})\s+(\d{2})\s+(\d{2})\b/, '$1 $2 R$3')  // 195 60 15 → 195 60 R15
    .replace(/\s+/g, ' ').trim();
}

async function searchCarrefour(query) {
  try {
    const q = normalizeQuery(query);
    const url = 'https://www.carrefour.com.ar/api/io/_v/api/intelligent-search/product_search/';
    const { data } = await axios.get(url, {
      params: { query: q, count: 8, sort: 'price:asc' },
      headers: HEADERS,
      timeout: 10000,
    });

    const products = data?.products || [];
    return products.slice(0, 8).map(item => {
      // ✅ Campo correcto: lowPrice (no lowValue)
      const precio        = item.priceRange?.sellingPrice?.lowPrice || 0;
      const precioOriginal = item.priceRange?.listPrice?.lowPrice   || precio;
      const descuento = precioOriginal > precio
        ? Math.round(((precioOriginal - precio) / precioOriginal) * 100)
        : 0;

      const imagen = item.items?.[0]?.images?.[0]?.imageUrl || item.image || '';
      const slug   = item.linkText || item.link || '';
      const url2   = slug
        ? (slug.startsWith('http') ? slug : `https://www.carrefour.com.ar/${slug}/p`)
        : 'https://www.carrefour.com.ar';

      return {
        titulo: item.productName || item.name || '',
        precio: Math.round(precio),
        precioOriginal: Math.round(precioOriginal),
        descuento,
        url: url2,
        imagen,
        tienda: 'Carrefour',
        condicion: 'Nuevo',
        disponible: true,
        fechaActualizacion: new Date().toISOString(),
      };
    }).filter(p => p.precio > 100 && p.titulo && p.titulo.length > 3);
  } catch (error) {
    console.error('Error Carrefour:', error.message);
    return [];
  }
}

module.exports = { searchCarrefour };
