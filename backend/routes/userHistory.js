const express = require('express');
const router = express.Router();
const { identifyUser } = require('../middleware/userAuth');
const { dbService } = require('../services/database');

// Obtener historial de búsquedas del usuario
router.get('/searches', identifyUser, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const searches = await dbService.getUserSearchHistory(req.user.id, limit);
    
    res.json(searches);
  } catch (err) {
    console.error('Error obteniendo búsquedas:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener productos vistos recientemente
router.get('/views', identifyUser, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const views = await dbService.getUserProductViews(req.user.id, limit);
    
    res.json(views);
  } catch (err) {
    console.error('Error obteniendo vistas:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener decisiones/comparaciones del usuario
router.get('/decisions', identifyUser, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const decisions = await dbService.getUserDecisions(req.user.id, limit);
    
    res.json(decisions);
  } catch (err) {
    console.error('Error obteniendo decisiones:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener dashboard completo del usuario
router.get('/dashboard', identifyUser, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const [profile, searches, views, decisions] = await Promise.all([
      dbService.getUserProfile(req.user.id),
      dbService.getUserSearchHistory(req.user.id, 5),
      dbService.getUserProductViews(req.user.id, 5),
      dbService.getUserDecisions(req.user.id, 5),
    ]);

    res.json({
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
        is_guest: profile.is_guest === 1,
      },
      stats: {
        total_searches: profile.total_searches,
        total_views: profile.total_views,
        total_decisions: profile.total_decisions,
      },
      recent: {
        searches,
        views,
        decisions,
      }
    });
  } catch (err) {
    console.error('Error obteniendo dashboard:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
