const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html',
  'Accept-Language': 'es-AR,es;q=0.9',
};

// Musimundo — tienda argentina con buena cobertura de electrónica
async function searchMusimundo(query) {
  try {
    const url = `https://www.musimundo.com/search?text=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(data);
    const products = [];

    $('[class*="product-item"], [class*="ProductItem"], [class*="product_item"], .product, li.item').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('[class*="name"], [class*="title"], a[title], h2, h3').first().text().trim()
        || $(el).find('a').first().attr('title') || '';
      const precioRaw = $(el).find('[class*="price"], [class*="Price"], [class*="precio"]').first().text().replace(/[^0-9]/g, '');
      const precio = parseInt(precioRaw) || 0;
      const link = $(el).find('a').first().attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src') || '';
      if (titulo && precio > 0) {
        products.push({
          titulo, precio, precioOriginal: precio, descuento: 0,
          url: link.startsWith('http') ? link : `https://www.musimundo.com${link}`,
          imagen, tienda: 'Musimundo', condicion: 'Nuevo', disponible: true,
          fechaActualizacion: new Date().toISOString(),
        });
      }
    });
    return products;
  } catch (error) {
    console.error('Error Musimundo:', error.message);
    return [];
  }
}

// Falabella Argentina — scraping
async function searchFalabella(query) {
  try {
    const url = `https://www.falabella.com.ar/falabella-ar/search?Ntt=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(data);
    const products = [];

    $('[class*="pod"], [class*="Pod"]').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('[class*="title"], h3, h2, a').first().text().trim();
      const precioRaw = $(el).find('[class*="price"], [class*="Price"]').first().text().replace(/[^0-9]/g, '');
      const precio = parseInt(precioRaw) || 0;
      const link = $(el).find('a').first().attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || '';
      if (titulo && precio > 0) {
        products.push({
          titulo, precio, precioOriginal: precio, descuento: 0,
          url: link.startsWith('http') ? link : `https://www.falabella.com.ar${link}`,
          imagen, tienda: 'Falabella', condicion: 'Nuevo', disponible: true,
          fechaActualizacion: new Date().toISOString(),
        });
      }
    });
    return products;
  } catch (error) {
    console.error('Error Falabella:', error.message);
    return [];
  }
}

// Alias para compatibilidad con imports existentes
async function searchCetrogar(query) { return searchMusimundo(query); }
async function searchMetgatone(query) { return searchFalabella(query); }

module.exports = { searchCetrogar, searchCoto: searchFalabella, searchMusimundo, searchFalabella, searchMetgatone };
