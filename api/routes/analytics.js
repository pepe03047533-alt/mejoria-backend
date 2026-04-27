const express = require('express');
const router = express.Router();
const { dbService, generateId } = require('../services/database');

// POST /api/track - Registrar un evento
router.post('/', async (req, res) => {
  try {
    const { query, product_id, position, clicked, time_to_click } = req.body;

    if (!query || !product_id || !position) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: query, product_id, position',
      });
    }

    await dbService.logInteraction(
      req.userId || 'anonymous',
      { url: product_id, titulo: query, precio: 0, tienda: 'unknown' },
      clicked ? 'click' : 'view',
      { position, time_to_click }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error en /api/track:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/track/batch - Registrar múltiples eventos
router.post('/batch', async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de eventos' });
    }

    for (const event of events) {
      await dbService.logInteraction(
        req.userId || 'anonymous',
        { url: event.product_id, titulo: event.query, precio: 0, tienda: 'unknown' },
        event.clicked ? 'click' : 'view',
        { position: event.position, time_to_click: event.time_to_click }
      );
    }

    res.json({ success: true, tracked: events.length });
  } catch (error) {
    console.error('Error en /api/track/batch:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/track/stats - Obtener estadísticas
router.get('/stats', async (req, res) => {
  try {
    const stats = await dbService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error en /api/track/stats:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
