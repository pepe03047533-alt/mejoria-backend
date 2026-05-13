// Scraper de MercadoLibre con Puppeteer (evade bloqueos)
const { searchMercadoLibre: searchWithPuppeteer } = require('./mercadolibre-puppeteer');
const { searchMercadoLibreApi } = require('./mercadolibre-api');

const KNOWN_BRANDS = [
  'gadnic', 'samsung', 'xiaomi', 'motorola', 'apple', 'iphone', 'lg',
  'sony', 'philips', 'noblex', 'tcl', 'hisense', 'bgh', 'whirlpool',
  'drean', 'electrolux', 'longvie', 'atma', 'oster', 'liliana',
  'peabody', 'midea', 'kent', 'protalia', 'lenovo', 'hp', 'dell',
  'asus', 'acer', 'huawei', 'honor', 'oppo', 'realme', 'nokia',
  'jbl', 'logitech', 'hyperx', 'redragon', 'corsair', 'razer',
  'thermaltake', 'noga', 'nisuta', 'tp-link', 'mercusys',
];

function detectBrand(query) {
  const queryLower = query.toLowerCase();
  for (const brand of KNOWN_BRANDS) {
    const regex = new RegExp(`(?:^|\\s|\\b)${brand.replace('-', '\\-')}(?:\\s|\\b|$)`, 'i');
    if (regex.test(queryLower)) return brand;
  }
  return null;
}

async function searchMercadoLibre(query, categoryId = null, condicion = 'nuevo') {
  const [apiItems, scrapedItems] = await Promise.all([
    searchMercadoLibreApi(query, categoryId, condicion),
    searchWithPuppeteer(query, categoryId, condicion),
  ]);

  const brand = detectBrand(query);

  const merged = [...apiItems, ...scrapedItems];
  const deduped = [];
  const seen = new Set();

  for (const p of merged) {
    if (brand) {
      const titulo = (p.titulo || '').toLowerCase();
      if (!titulo.includes(brand)) continue;
    }

    const urlBase = (p.url || '').split('#')[0];
    const precio = Number(p.precio) || 0;
    const key = urlBase ? `${urlBase}${precio}` : `${p.titulo || ''}|${precio}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }

  deduped.sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
  return deduped;
}

module.exports = { searchMercadoLibre };
