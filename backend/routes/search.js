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
  let timer = null;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      console.log(`  [${label}] Timeout (${ms}ms)`);
      resolve([]);
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getFinalPrice(product) {
  if (!product) return 0;
  const precio = Number(product.precio) || 0;
  const precioOriginal = Number(product.precioOriginal) || 0;
  const descuento = Number(product.descuento) || 0;

  if (precio > 0) return precio;
  if (precioOriginal > 0 && descuento > 0) {
    return Math.round(precioOriginal * (1 - descuento / 100));
  }
  return precioOriginal > 0 ? precioOriginal : 0;
}

function normalizePriceFields(product) {
  const finalPrice = getFinalPrice(product);
  if (finalPrice <= 0) return null;

  const precioOriginal = Number(product.precioOriginal) || finalPrice;
  const descuento = precioOriginal > finalPrice
    ? Math.round(((precioOriginal - finalPrice) / precioOriginal) * 100)
    : (Number(product.descuento) || 0);

  return {
    ...product,
    precio: finalPrice,
    precioOriginal,
    descuento,
  };
}

const MAX_SEARCH_RESULTS = 5;

/** ML y scrapers rinden mejor sin "unidades" redundante si ya hay pack xN. */
function simplifyQueryForSources(q) {
  let s = q.replace(/\s+/g, ' ').trim();
  if (/\bpack\b/i.test(s) && /\bx\s*\d+\b/i.test(s)) {
    s = s.replace(/\bunidades?\b/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  return s;
}

router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Se requiere el parámetro q' });
  }

  try {
    let normalizedQuery = q.trim();
    try {
      normalizedQuery = decodeURIComponent(normalizedQuery);
    } catch (_) {
      // Si la query no está codificada, usarla tal cual.
    }

    const start = Date.now();
    const catKey = detectCategory(normalizedQuery);
    const categoryId = catKey ? ML_CATEGORIES[catKey] : null;
    const cond = 'todos';

    const searchQuery = simplifyQueryForSources(normalizedQuery);
    if (searchQuery !== normalizedQuery) {
      console.log(`  → Query fuentes: "${searchQuery}"`);
    }
    console.log(`\n🔍 Búsqueda: "${normalizedQuery}"`);

    const mlResult = await withTimeout(
      searchMercadoLibre(searchQuery, categoryId, cond),
      35000,
      'MercadoLibre',
    );
    const mlProducts = Array.isArray(mlResult) ? mlResult : [];

    const otherResults = await Promise.allSettled([
      withTimeout(searchCarrefour(searchQuery), 8000, 'Carrefour'),
      withTimeout(searchMusimundo(searchQuery), 8000, 'Musimundo'),
      withTimeout(searchBing(searchQuery), 8000, 'Bing'),
      withTimeout(searchJumbo(searchQuery), 8000, 'Jumbo'),
      withTimeout(searchDisco(searchQuery), 8000, 'Disco'),
      withTimeout(searchVea(searchQuery), 8000, 'Vea'),
      withTimeout(searchEasy(searchQuery), 8000, 'Easy'),
      withTimeout(searchSodimac(searchQuery), 8000, 'Sodimac'),
      withTimeout(searchRegionales(searchQuery), 8000, 'Regionales'),
    ]);

    const getResults = (r) => (r.status === 'fulfilled' ? r.value : []);
    const otherProducts = otherResults.flatMap(getResults);
    const allProducts = [...mlProducts, ...otherProducts];

    const elapsed = Date.now() - start;
    console.log(`  → ${allProducts.length} productos en ${elapsed}ms`);

    const normalizedProducts = allProducts
      .map(normalizePriceFields)
      .filter(Boolean);

    const ranked = normalizeAndRank(normalizedProducts, MAX_SEARCH_RESULTS, normalizedQuery, cond, {
      strictLowestPrice: true,
    });

    const top = ranked;

    // Registrar búsqueda en el historial del usuario (si existe)
    if (req.user) {
      try {
        await dbService.logSearchHistory(req.user.id, normalizedQuery, { condicion: cond }, top.length);
      } catch (err) {
        console.log('Error registrando búsqueda:', err.message);
      }
    }

    if (top.length < 1) {
      return res.status(404).json({
        error: 'No encontramos productos con precio válido para tu búsqueda.',
      });
    }

    res.json({
      query: normalizedQuery,
      total: top.length,
      category: catKey,
      results: top,
      products: top,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
});

module.exports = router;
