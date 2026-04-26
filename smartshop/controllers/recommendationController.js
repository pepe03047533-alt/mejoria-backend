const { Store, Promotion, User } = require('../models');

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
    
    // Buscar usuario para obtener sus métodos de pago (opcional)
    let userPaymentMethods = [];
    if (user_id) {
      const user = await User.findById(user_id);
      if (user) {
        userPaymentMethods = user.payment_methods;
      }
    }

    // Buscar tiendas que vendan la categoría
    const stores = await Store.find({ 
      categories: { $in: [category.toLowerCase()] } 
    });

    if (stores.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No se encontraron tiendas para esta categoría'
      });
    }

    const storeIds = stores.map(store => store._id);

    // Construir query de promociones
    const promotionQuery = {
      store_id: { $in: storeIds },
      category: category.toLowerCase(),
      days: { $in: [currentDay] },
      active: true
    };

    // Si tenemos usuario, filtrar por sus métodos de pago
    if (userPaymentMethods.length > 0) {
      promotionQuery.payment_method = { $in: userPaymentMethods };
    }

    // Buscar promociones activas
    const promotions = await Promotion.find(promotionQuery)
      .populate('store_id', 'name price_level');

    // Calcular scores y ordenar
    const results = promotions.map(promo => {
      const store = promo.store_id;
      const score = calculateScore(store.price_level, promo.discount);
      
      return {
        store: store.name,
        discount: promo.discount,
        score: parseFloat(score.toFixed(2)),
        payment_method: promo.payment_method,
        price_level: store.price_level
      };
    });

    // Ordenar por score (menor = mejor, porque price_level bajo = más barato)
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
    const stores = await Store.find();
    res.status(200).json({ success: true, data: stores });
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
    const promotions = await Promotion.find().populate('store_id', 'name');
    res.status(200).json({ success: true, data: promotions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getBestOptions,
  getStores,
  getPromotions
};
