const express = require('express');
const router = express.Router();
const { getBestOptions, getStores, getPromotions } = require('../controllers/recommendationController');

// GET /best-options?category=carne&user_id=xxx
router.get('/best-options', getBestOptions);

// GET /stores
router.get('/stores', getStores);

// GET /promotions
router.get('/promotions', getPromotions);

module.exports = router;
