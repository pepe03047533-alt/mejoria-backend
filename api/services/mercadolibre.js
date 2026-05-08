// Scraper de MercadoLibre con Puppeteer (evade bloqueos)
const { searchMercadoLibre: searchWithPuppeteer } = require('./mercadolibre-puppeteer');
const { searchMercadoLibreApi } = require('./mercadolibre-api');

async function searchMercadoLibre(query, categoryId = null, condicion = 'nuevo') {
  const [apiItems, scrapedItems] = await Promise.all([
    searchMercadoLibreApi(query, categoryId, condicion),
    searchWithPuppeteer(query, categoryId, condicion),
  ]);

  const merged = [...apiItems, ...scrapedItems];
  const deduped = [];
  const seen = new Set();

  for (const p of merged) {
    const key = (p.url || '').split('#')[0] || `${p.titulo}-${p.precio}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }

  deduped.sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
  return deduped;
}

module.exports = { searchMercadoLibre };
