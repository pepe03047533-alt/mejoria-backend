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
    const urlBase = (p.url || '').split('#')[0];
    const precio = Number(p.precio) || 0;
    const key = urlBase ? `${urlBase}${precio}` : `${p.titulo || ''}|${precio}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }

  return deduped;
}

module.exports = { searchMercadoLibre };
