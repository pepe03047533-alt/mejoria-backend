const express = require('express');
const router = express.Router();

const { searchMercadoLibre } = require('../services/mercadolibre');
const { searchCarrefour } = require('../services/carrefour');
const { searchMusimundo } = require('../services/cetrogar');
const { searchBing } = require('../services/bing');
const { searchJumbo, searchDisco, searchVea } = require('../services/tiendas');
const { searchEasy, searchSodimac } = require('../services/tiendas2');
const { searchRegionales } = require('../services/regionales');
const { normalizeAndRank, detectCategory, ML_CATEGORIES } = require('../utils/aggregator');
const { dbService } = require('../services/database');

// Timeout wrapper: si una fuente tarda más de `ms`, devuelve []
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => {
        console.log(`  [${label}] Timeout (${ms}ms)`);
        resolve([]);
      }, ms);
    }),
  ]);
}

router.get('/', async (req, res) => {
  const { q, condicion } = req.query;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Se requiere el parámetro q' });
  }

  try {
    const start = Date.now();
    const catKey = detectCategory(q);
    const categoryId = catKey ? ML_CATEGORIES[catKey] : null;
    const cond = condicion || 'nuevo';

    console.log(`\n🔍 Búsqueda: "${q}" | Condición: ${cond}`);

    const results = await Promise.allSettled([
      withTimeout(searchMercadoLibre(q, categoryId, cond), 10000, 'MercadoLibre'),
      withTimeout(searchCarrefour(q), 8000, 'Carrefour'),
      withTimeout(searchMusimundo(q), 8000, 'Musimundo'),
      withTimeout(searchBing(q), 8000, 'Bing'),
      withTimeout(searchJumbo(q), 8000, 'Jumbo'),
      withTimeout(searchDisco(q), 8000, 'Disco'),
      withTimeout(searchVea(q), 8000, 'Vea'),
      withTimeout(searchEasy(q), 8000, 'Easy'),
      withTimeout(searchSodimac(q), 8000, 'Sodimac'),
      withTimeout(searchRegionales(q), 8000, 'Regionales'),
    ]);

    const getResults = (r) => r.status === 'fulfilled' ? r.value : [];
    const allProducts = results.flatMap(getResults);

    const elapsed = Date.now() - start;
    console.log(`  → ${allProducts.length} productos en ${elapsed}ms`);

    const top10 = normalizeAndRank(allProducts, 10, q, cond);

    // Registrar búsqueda en el historial del usuario (si existe)
    if (req.user) {
      try {
        await dbService.logSearchHistory(req.user.id, q, { condicion: cond }, top10.length);
      } catch (err) {
        console.log('Error registrando búsqueda:', err.message);
      }
    }

    if (top10.length === 0) {
      return res.status(404).json({
        error: 'No encontramos resultados. Probá con otro término.',
      });
    }

    res.json({
      query: q,
      total: top10.length,
      category: catKey,
      products: top10,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
});

module.exports = router;
