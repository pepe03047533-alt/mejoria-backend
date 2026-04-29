const { pool } = require('../services/database');

// Obtener día actual en español
const getCurrentDay = () => {
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return days[new Date().getDay()];
};

// Calcular score = price_level * (1 - discount)
const calculateScore = (priceLevel, discount) => {
  return priceLevel * (1 - discount);
};

/**
 * GET /best-options?category=carne&user_id=xxx
 * Devuelve las mejores opciones de compra según promociones activas hoy
 */
const getBestOptions = async (req, res) => {
  try {
    const { category, user_id } = req.query;

    // Validaciones
    if (!category) {
      return res.status(400).json({ 
        success: false, 
        message: 'La categoría es obligatoria' 
      });
    }

    const currentDay = getCurrentDay();
    
    // Buscar tiendas que vendan la categoría
    const storesResult = await pool.query(
      'SELECT * FROM stores WHERE $1 = ANY(categories)',
      [category.toLowerCase()]
    );
    
    const stores = storesResult.rows;

    if (stores.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No se encontraron tiendas para esta categoría'
      });
    }

    const storeIds = stores.map(store => store.id);

    // Buscar promociones activas para hoy
    const promotionsResult = await pool.query(
      `SELECT p.*, s.name as store_name, s.price_level 
       FROM promotions p 
       JOIN stores s ON p.store_id = s.id 
       WHERE p.store_id = ANY($1) 
       AND p.category = $2 
       AND $3 = ANY(p.days) 
       AND p.active = true`,
      [storeIds, category.toLowerCase(), currentDay]
    );

    const promotions = promotionsResult.rows;

    // Calcular scores y ordenar
    const results = promotions.map(promo => {
      const score = calculateScore(promo.price_level, promo.discount);
      
      return {
        store: promo.store_name,
        discount: promo.discount,
        score: parseFloat(score.toFixed(2)),
        payment_method: promo.payment_method,
        price_level: promo.price_level
      };
    });

    // Ordenar por score (menor = mejor)
    results.sort((a, b) => a.score - b.score);

    // Devolver top 3
    const top3 = results.slice(0, 3);

    res.status(200).json({
      success: true,
      day: currentDay,
      category: category.toLowerCase(),
      count: top3.length,
      data: top3
    });

  } catch (error) {
    console.error('Error en getBestOptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * GET /stores
 * Obtener todas las tiendas
 */
const getStores = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stores');
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /promotions
 * Obtener todas las promociones
 */
const getPromotions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, s.name as store_name 
       FROM promotions p 
       JOIN stores s ON p.store_id = s.id`
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getBestOptions,
  getStores,
  getPromotions
};
