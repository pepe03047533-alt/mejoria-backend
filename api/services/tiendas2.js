const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-AR,es;q=0.9',
};
const HEADERS_JSON = { ...HEADERS, Accept: 'application/json' };

function parsePrecio(text) {
  if (!text) return 0;
  const m = text.replace(/\./g, '').replace(/,(\d{2})$/, '').match(/(\d{4,})/);
  return m ? parseInt(m[1]) : 0;
}

// ── Easy Argentina (VTEX) ─────────────────────────────────────
async function searchEasy(query) {
  try {
    const { data } = await axios.get(
      `https://www.easy.com.ar/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=5&O=OrderByPriceASC`,
      { headers: HEADERS_JSON, timeout: 10000 }
    );
    if (!Array.isArray(data)) return [];
    return data.slice(0, 6).map(item => {
      const seller = item.items?.[0]?.sellers?.[0];
      const precio = seller?.commertialOffer?.Price || 0;
      const precioOriginal = seller?.commertialOffer?.ListPrice || precio;
      return {
        titulo: item.productName || '',
        precio: Math.round(precio), precioOriginal: Math.round(precioOriginal),
        descuento: precioOriginal > precio ? Math.round(((precioOriginal - precio) / precioOriginal) * 100) : 0,
        url: `https://www.easy.com.ar/${item.linkText}/p`,
        imagen: item.items?.[0]?.images?.[0]?.imageUrl || '',
        tienda: 'Easy', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      };
    }).filter(p => p.precio > 100 && p.titulo);
  } catch (e) { console.error('Easy:', e.message); return []; }
}

// ── Sodimac Argentina (VTEX) ──────────────────────────────────
async function searchSodimac(query) {
  try {
    const { data } = await axios.get(
      `https://www.sodimac.com.ar/sodimac-ar/search?Ntt=${encodeURIComponent(query)}&start=0&sz=6`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const products = [];
    $('[class*="product-item"], [class*="pod-item"], article.pod').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('[class*="title"], [class*="name"], h3').first().text().trim();
      const precio = parsePrecio($(el).find('[class*="price"]:not([class*="original"]):not([class*="list"])').first().text());
      const precioOriginal = parsePrecio($(el).find('[class*="price-original"],[class*="price-list"]').first().text()) || precio;
      const link = $(el).find('a').first().attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src') || '';
      if (titulo && precio > 0) products.push({
        titulo, precio, precioOriginal,
        descuento: precioOriginal > precio ? Math.round(((precioOriginal - precio) / precioOriginal) * 100) : 0,
        url: link.startsWith('http') ? link : `https://www.sodimac.com.ar${link}`,
        imagen, tienda: 'Sodimac', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });
    return products;
  } catch (e) { console.error('Sodimac:', e.message); return []; }
}

// ── Chango Más (VTEX) ─────────────────────────────────────────
async function searchChangoMas(query) {
  try {
    const { data } = await axios.get(
      `https://www.changomas.com.ar/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=5&O=OrderByPriceASC`,
      { headers: HEADERS_JSON, timeout: 10000 }
    );
    if (!Array.isArray(data)) return [];
    return data.slice(0, 6).map(item => {
      const seller = item.items?.[0]?.sellers?.[0];
      const precio = seller?.commertialOffer?.Price || 0;
      const precioOriginal = seller?.commertialOffer?.ListPrice || precio;
      return {
        titulo: item.productName || '',
        precio: Math.round(precio), precioOriginal: Math.round(precioOriginal),
        descuento: precioOriginal > precio ? Math.round(((precioOriginal - precio) / precioOriginal) * 100) : 0,
        url: `https://www.changomas.com.ar/${item.linkText}/p`,
        imagen: item.items?.[0]?.images?.[0]?.imageUrl || '',
        tienda: 'Chango Más', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      };
    }).filter(p => p.precio > 100 && p.titulo);
  } catch (e) { console.error('ChangoMas:', e.message); return []; }
}

// ── Megatone Argentina ────────────────────────────────────────
async function searchMegatone(query) {
  try {
    const { data } = await axios.get(
      `https://www.megatone.net/buscar/${encodeURIComponent(query)}/`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const products = [];
    $('[class*="product"], .item-product, article').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('[class*="name"],[class*="title"],h2,h3').first().text().trim();
      const precio = parsePrecio($(el).find('[class*="price"]:not([class*="old"]):not([class*="before"])').first().text());
      const precioOriginal = parsePrecio($(el).find('[class*="price-old"],[class*="price-before"],[class*="old-price"]').first().text()) || precio;
      const link = $(el).find('a').first().attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src') || '';
      if (titulo && precio > 0) products.push({
        titulo, precio, precioOriginal,
        descuento: precioOriginal > precio ? Math.round(((precioOriginal - precio) / precioOriginal) * 100) : 0,
        url: link.startsWith('http') ? link : `https://www.megatone.net${link}`,
        imagen, tienda: 'Megatone', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });
    return products;
  } catch (e) { console.error('Megatone:', e.message); return []; }
}

// ── Naldo Lombardi ────────────────────────────────────────────
async function searchNaldo(query) {
  try {
    const { data } = await axios.get(
      `https://www.naldo.com.ar/buscar?q=${encodeURIComponent(query)}`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const products = [];
    $('[class*="product"], .item, article').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('[class*="name"],[class*="title"],h2,h3').first().text().trim();
      const precio = parsePrecio($(el).find('[class*="price"]:not([class*="old"]):not([class*="list"])').first().text());
      const precioOriginal = parsePrecio($(el).find('[class*="price-old"],[class*="list-price"]').first().text()) || precio;
      const link = $(el).find('a').first().attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src') || '';
      if (titulo && precio > 0) products.push({
        titulo, precio, precioOriginal,
        descuento: precioOriginal > precio ? Math.round(((precioOriginal - precio) / precioOriginal) * 100) : 0,
        url: link.startsWith('http') ? link : `https://www.naldo.com.ar${link}`,
        imagen, tienda: 'Naldo', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });
    return products;
  } catch (e) { console.error('Naldo:', e.message); return []; }
}

// ── Tienda Newsan (Magento) ───────────────────────────────────
async function searchNewsan(query) {
  try {
    const { data } = await axios.get(
      `https://tiendanewsan.com.ar/catalogsearch/result/?q=${encodeURIComponent(query)}`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const products = [];
    $('[class*="product-item"], li.product-item').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('.product-item-name, [class*="name"], h2').first().text().trim();
      const precio = parsePrecio($(el).find('.price, [class*="price"]:not([class*="old"])').first().text());
      const precioOriginal = parsePrecio($(el).find('.old-price, [class*="old-price"]').first().text()) || precio;
      const link = $(el).find('a.product-item-link, a').first().attr('href') || '';
      const imagen = $(el).find('img.product-image-photo, img').first().attr('src') || '';
      if (titulo && precio > 0) products.push({
        titulo, precio, precioOriginal,
        descuento: precioOriginal > precio ? Math.round(((precioOriginal - precio) / precioOriginal) * 100) : 0,
        url: link.startsWith('http') ? link : `https://tiendanewsan.com.ar${link}`,
        imagen, tienda: 'Newsan', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });
    return products;
  } catch (e) { console.error('Newsan:', e.message); return []; }
}

// ── Norauto Argentina (neumáticos y auto) ─────────────────────
async function searchNorauto(query) {
  try {
    const { data } = await axios.get(
      `https://www.norauto.com.ar/buscar?q=${encodeURIComponent(query)}`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const products = [];
    $('[class*="product"], article, .item').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('[class*="name"],[class*="title"],h2,h3').first().text().trim();
      const precio = parsePrecio($(el).find('[class*="price"]:not([class*="old"]):not([class*="cross"])').first().text());
      const precioOriginal = parsePrecio($(el).find('[class*="price-old"],[class*="price-cross"],[class*="crossed"]').first().text()) || precio;
      const link = $(el).find('a').first().attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src') || '';
      if (titulo && precio > 0) products.push({
        titulo, precio, precioOriginal,
        descuento: precioOriginal > precio ? Math.round(((precioOriginal - precio) / precioOriginal) * 100) : 0,
        url: link.startsWith('http') ? link : `https://www.norauto.com.ar${link}`,
        imagen, tienda: 'Norauto', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });
    return products;
  } catch (e) { console.error('Norauto:', e.message); return []; }
}

// ── Ribeiro Argentina ─────────────────────────────────────────
async function searchRibeiro(query) {
  try {
    const { data } = await axios.get(
      `https://www.ribeiro.com.ar/buscar?q=${encodeURIComponent(query)}`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const products = [];
    $('[class*="product"], .item, article').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('[class*="name"],[class*="title"],h2,h3').first().text().trim();
      const precio = parsePrecio($(el).find('[class*="price"]:not([class*="old"])').first().text());
      const link = $(el).find('a').first().attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src') || '';
      if (titulo && precio > 0) products.push({
        titulo, precio, precioOriginal: precio, descuento: 0,
        url: link.startsWith('http') ? link : `https://www.ribeiro.com.ar${link}`,
        imagen, tienda: 'Ribeiro', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });
    return products;
  } catch (e) { console.error('Ribeiro:', e.message); return []; }
}

module.exports = {
  searchEasy, searchSodimac, searchChangoMas,
  searchMegatone, searchNaldo, searchNewsan,
  searchNorauto, searchRibeiro,
};
