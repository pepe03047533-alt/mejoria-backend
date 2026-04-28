// Scraper de MercadoLibre con Puppeteer (evade bloqueos)
const { searchMercadoLibre: searchWithPuppeteer } = require('./mercadolibre-puppeteer');

async function searchMercadoLibre(query, categoryId = null, condicion = 'nuevo') {
  return searchWithPuppeteer(query, categoryId, condicion);
}

module.exports = { searchMercadoLibre };
