const express = require('express');
const router = express.Router();
const { analizarCompleto, analizarProductoRapido, analizarPublicacion, calcularPrecioReal } = require('../services/taxAnalyzer');

// POST /api/analyze - Análisis rápido de un producto (por título/precio)
router.post('/', async (req, res) => {
  try {
    const { titulo, precio, url, tienda, deep } = req.body;

    if (!titulo || !precio) {
      return res.status(400).json({ error: 'Se requiere titulo y precio' });
    }

    const result = await analizarCompleto(
      { titulo, precio, url, tienda },
      deep === true
    );

    res.json(result);
  } catch (error) {
    console.error('Error en /api/analyze:', error.message);
    res.status(500).json({ error: 'Error al analizar el producto' });
  }
});

// POST /api/analyze/batch - Análisis de múltiples productos (profundo en paralelo)
router.post('/batch', async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de productos' });
    }

    const results = await Promise.all(
      products.map(async (p) => {
        try {
          const clasificacion = p.url 
            ? await analizarPublicacion(p.url)
            : analizarProductoRapido(p);
          const precioReal = clasificacion.tipo !== 'local' ? calcularPrecioReal(p.precio) : null;
          return { url: p.url, clasificacion, precioReal };
        } catch (err) {
          return { url: p.url, clasificacion: { tipo: 'local', confianza: 30, indicadores: [] }, precioReal: null };
        }
      })
    );

    res.json(results);
  } catch (error) {
    console.error('Error en /api/analyze/batch:', error.message);
    res.status(500).json({ error: 'Error al analizar productos' });
  }
});

module.exports = router;
