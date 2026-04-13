const express = require('express');
const router = express.Router();
const { searchMercadoLibre } = require('../services/mercadolibre');
const { seleccionarDosMejores } = require('../services/productSelector');
const { normalizeAndRank, detectCategory, ML_CATEGORIES } = require('../utils/aggregator');

/**
 * GET /api/ml-best?q=...
 * Devuelve SOLO 2 productos de ML:
 * 1. El más barato internacional
 * 2. El más barato nacional
 */
router.get('/', async (req, res) => {
  const { q, condicion } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Se requiere el parámetro q' });
  }

  try {
    console.log(`\n🔍 Búsqueda ML-best: "${q}"`);

    const catKey = detectCategory(q);
    const categoryId = catKey ? ML_CATEGORIES[catKey] : null;
    const cond = condicion || 'nuevo';

    // Obtener productos de ML (sin límite para tener opciones)
    const mlProducts = await searchMercadoLibre(q, categoryId, cond);
    
    console.log(`  → ${mlProducts.length} productos ML encontrados`);

    if (mlProducts.length === 0) {
      return res.status(404).json({
        error: 'No se encontraron productos en MercadoLibre',
        internacional: null,
        nacional: null,
      });
    }

    // Aplicar ranking normal primero
    const ranked = normalizeAndRank(mlProducts, 20, q, cond);
    
    // Seleccionar los 2 mejores (1 internacional + 1 nacional)
    const { internacional, nacional } = await seleccionarDosMejores(ranked);

    console.log(`  → Internacional: ${internacional ? '$' + internacional.precio : 'N/A'}`);
    console.log(`  → Nacional: ${nacional ? '$' + nacional.precio : 'N/A'}`);

    res.json({
      query: q,
      total: (internacional ? 1 : 0) + (nacional ? 1 : 0),
      internacional,
      nacional,
    });

  } catch (error) {
    console.error('Error en /api/ml-best:', error);
    res.status(500).json({ 
      error: 'Error interno',
      internacional: null,
      nacional: null,
    });
  }
});

module.exports = router;
