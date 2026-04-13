const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-AR,es;q=0.9',
};

function parsePrecio(text) {
  const m = text.replace(/\./g, '').replace(/,/g, '').match(/(\d{4,})/);
  return m ? parseInt(m[1]) : 0;
}

// ── TireNow — tirenow.com.ar ──────────────────────────────────
async function searchTireNow(query) {
  try {
    const { data } = await axios.get(
      `https://www.tirenow.com.ar/buscar?q=${encodeURIComponent(query)}`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const products = [];

    $('[class*="product"], .item, article').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('[class*="name"],[class*="title"],h2,h3').first().text().trim();
      const precio = parsePrecio($(el).find('[class*="Price"],[class*="price"],.price').first().text());
      const link = $(el).find('a').first().attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || '';
      if (titulo && precio > 0) products.push({
        titulo, precio, precioOriginal: precio, descuento: 0,
        url: link.startsWith('http') ? link : `https://www.tirenow.com.ar${link}`,
        imagen, tienda: 'TireNow', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });
    return products;
  } catch (e) { console.error('TireNow:', e.message); return []; }
}

// ── NeumaticosArgentina.com.ar ────────────────────────────────
async function searchNeumaticosArgentina(query) {
  try {
    const { data } = await axios.get(
      `https://www.neumaticosargentina.com.ar/?s=${encodeURIComponent(query)}`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const products = [];

    $('.product, li.product, .woocommerce-loop-product__link').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('.woocommerce-loop-product__title, [class*="title"],[class*="name"],h2,h3').first().text().trim();
      const precio = parsePrecio($(el).find('.price, .woocommerce-Price-amount, [class*="price"]').first().text());
      const link = $(el).find('a').first().attr('href') || $(el).closest('a').attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || '';
      if (titulo && precio > 0) products.push({
        titulo, precio, precioOriginal: precio, descuento: 0,
        url: link.startsWith('http') ? link : `https://www.neumaticosargentina.com.ar${link}`,
        imagen, tienda: 'NeumaticosArgentina', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });
    return products;
  } catch (e) { console.error('NeumaticosArgentina:', e.message); return []; }
}

// ── Pneustore.com.ar ──────────────────────────────────────────
async function searchPneustore(query) {
  try {
    const { data } = await axios.get(
      `https://pneustore.com.ar/?s=${encodeURIComponent(query)}`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const products = [];

    $('li.product, .product, article').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('.woocommerce-loop-product__title,[class*="title"],[class*="name"],h2,h3').first().text().trim();
      const precio = parsePrecio($(el).find('.woocommerce-Price-amount,.price,[class*="price"]').first().text());
      const link = $(el).find('a').first().attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src') || '';
      if (titulo && precio > 0) products.push({
        titulo, precio, precioOriginal: precio, descuento: 0,
        url: link.startsWith('http') ? link : `https://pneustore.com.ar${link}`,
        imagen, tienda: 'Pneustore', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });
    return products;
  } catch (e) { console.error('Pneustore:', e.message); return []; }
}

// ── NeumaticosOK.com.ar ───────────────────────────────────────
async function searchNeumaticosOK(query) {
  try {
    const { data } = await axios.get(
      `https://www.neumaticosok.com.ar/search?q=${encodeURIComponent(query)}`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const products = [];
    $('[class*="product"], article, .item').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('[class*="title"],[class*="name"],h2,h3').first().text().trim();
      const precio = parsePrecio($(el).find('[class*="price"]').first().text());
      const link = $(el).find('a').first().attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || '';
      if (titulo && precio > 0) products.push({
        titulo, precio, precioOriginal: precio, descuento: 0,
        url: link.startsWith('http') ? link : `https://www.neumaticosok.com.ar${link}`,
        imagen, tienda: 'NeumaticosOK', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });
    return products;
  } catch (e) { console.error('NeumaticosOK:', e.message); return []; }
}

// ── Jumbo Argentina ───────────────────────────────────────────
async function searchJumbo(query) {
  try {
    const { data } = await axios.get(
      `https://www.jumbo.com.ar/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=10`,
      { headers: { ...HEADERS, Accept: 'application/json' }, timeout: 10000 }
    );
    if (!Array.isArray(data)) return [];
    return data.slice(0, 10).map(item => {
      const seller = item.items?.[0]?.sellers?.[0];
      const commertialOffer = seller?.commertialOffer;
      const precio = commertialOffer?.Price || 0;
      const precioOriginal = commertialOffer?.ListPrice || precio;
      
      // Verificar stock - IsAvailable indica si hay stock
      const hayStock = commertialOffer?.IsAvailable !== false && 
                       commertialOffer?.AvailableQuantity > 0;
      
      return {
        titulo: item.productName || '',
        precio: Math.round(precio), precioOriginal: Math.round(precioOriginal),
        descuento: precioOriginal > precio ? Math.round(((precioOriginal - precio) / precioOriginal) * 100) : 0,
        url: `https://www.jumbo.com.ar/${item.linkText}/p`,
        imagen: item.items?.[0]?.images?.[0]?.imageUrl || '',
        tienda: 'Jumbo', condicion: 'Nuevo', disponible: hayStock,
        fechaActualizacion: new Date().toISOString(),
      };
    }).filter(p => p.precio > 100 && p.titulo && p.disponible);
  } catch (e) { console.error('Jumbo:', e.message); return []; }
}

// ── Disco Argentina ───────────────────────────────────────────
async function searchDisco(query) {
  try {
    const { data } = await axios.get(
      `https://www.disco.com.ar/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=10`,
      { headers: { ...HEADERS, Accept: 'application/json' }, timeout: 10000 }
    );
    if (!Array.isArray(data)) return [];
    return data.slice(0, 10).map(item => {
      const seller = item.items?.[0]?.sellers?.[0];
      const commertialOffer = seller?.commertialOffer;
      const precio = commertialOffer?.Price || 0;
      
      // Verificar stock
      const hayStock = commertialOffer?.IsAvailable !== false && 
                       commertialOffer?.AvailableQuantity > 0;
      
      return {
        titulo: item.productName || '',
        precio: Math.round(precio), precioOriginal: Math.round(seller?.commertialOffer?.ListPrice || precio),
        descuento: 0,
        url: `https://www.disco.com.ar/${item.linkText}/p`,
        imagen: item.items?.[0]?.images?.[0]?.imageUrl || '',
        tienda: 'Disco', condicion: 'Nuevo', disponible: hayStock,
        fechaActualizacion: new Date().toISOString(),
      };
    }).filter(p => p.precio > 100 && p.titulo && p.disponible);
  } catch (e) { console.error('Disco:', e.message); return []; }
}

// ── Vea Argentina ─────────────────────────────────────────────
async function searchVea(query) {
  try {
    const { data } = await axios.get(
      `https://www.vea.com.ar/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=10`,
      { headers: { ...HEADERS, Accept: 'application/json' }, timeout: 10000 }
    );
    if (!Array.isArray(data)) return [];
    return data.slice(0, 10).map(item => {
      const seller = item.items?.[0]?.sellers?.[0];
      const commertialOffer = seller?.commertialOffer;
      const precio = commertialOffer?.Price || 0;
      
      // Verificar stock
      const hayStock = commertialOffer?.IsAvailable !== false && 
                       commertialOffer?.AvailableQuantity > 0;
      
      return {
        titulo: item.productName || '',
        precio: Math.round(precio), precioOriginal: Math.round(seller?.commertialOffer?.ListPrice || precio),
        descuento: 0,
        url: `https://www.vea.com.ar/${item.linkText}/p`,
        imagen: item.items?.[0]?.images?.[0]?.imageUrl || '',
        tienda: 'Vea', condicion: 'Nuevo', disponible: hayStock,
        fechaActualizacion: new Date().toISOString(),
      };
    }).filter(p => p.precio > 100 && p.titulo && p.disponible);
  } catch (e) { console.error('Vea:', e.message); return []; }
}

// ── Linio Argentina ───────────────────────────────────────────
async function searchLinio(query) {
  try {
    const { data } = await axios.get(
      `https://www.linio.com.ar/search?q=${encodeURIComponent(query)}`,
      { headers: HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(data);
    const products = [];
    $('[class*="product"], [class*="catalogue"]').each((i, el) => {
      if (products.length >= 6) return false;
      const titulo = $(el).find('[class*="title"],[class*="name"],h3').first().text().trim();
      const precio = parsePrecio($(el).find('[class*="price"]').first().text());
      const link = $(el).find('a').first().attr('href') || '';
      const imagen = $(el).find('img').first().attr('src') || '';
      if (titulo && precio > 0) products.push({
        titulo, precio, precioOriginal: precio, descuento: 0,
        url: link.startsWith('http') ? link : `https://www.linio.com.ar${link}`,
        imagen, tienda: 'Linio', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });
    return products;
  } catch (e) { console.error('Linio:', e.message); return []; }
}

// ── MAS Online (Changomás) ────────────────────────────────────
async function searchMASOnline(query) {
  try {
    const HEADERS_JSON = { ...HEADERS, Accept: 'application/json', Referer: 'https://www.masonline.com.ar/' };
    // Normalizar query: "cubiertas 195 60 15" → "195 60 R15" para VTEX
    const normalized = query
      .replace(/\bcubiertas?\b/gi, '')
      .replace(/\bneum[aá]ticos?\b/gi, '')
      .replace(/\b(\d{3})\s+(\d{2})\s+(\d{2})\b/, '$1 $2 R$3')  // 195 60 15 → 195 60 R15
      .replace(/\s+/g, ' ').trim() || query;

    const { data } = await axios.get(
      `https://www.masonline.com.ar/api/io/_v/api/intelligent-search/product_search/neumaticos?query=${encodeURIComponent(normalized)}&count=6&locale=es-AR&sort=price:asc`,
      { headers: HEADERS_JSON, timeout: 10000 }
    );
    if (!data.products?.length) return [];
    return data.products.slice(0, 6).map(item => {
      const precio = item.priceRange?.sellingPrice?.lowPrice || 0;
      const precioOriginal = item.priceRange?.listPrice?.lowPrice || precio;
      return {
        titulo: item.productName || '',
        precio: Math.round(precio),
        precioOriginal: Math.round(precioOriginal),
        descuento: precioOriginal > precio ? Math.round(((precioOriginal - precio) / precioOriginal) * 100) : 0,
        url: `https://www.masonline.com.ar/${item.linkText}/p`,
        imagen: item.items?.[0]?.images?.[0]?.imageUrl || '',
        tienda: 'MAS Online', condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      };
    }).filter(p => p.precio > 100 && p.titulo);
  } catch (e) { console.error('MASOnline:', e.message); return []; }
}

module.exports = {
  searchNeumaticosOK, searchTireNow, searchNeumaticosArgentina,
  searchPneustore, searchJumbo, searchDisco, searchVea, searchLinio,
  searchMASOnline,
};
