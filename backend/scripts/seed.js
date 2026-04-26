require('dotenv').config();
const mongoose = require('mongoose');
const { Store, Promotion, User } = require('../models');

const seedData = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Limpiar colecciones
    await Store.deleteMany({});
    await Promotion.deleteMany({});
    await User.deleteMany({});
    
    console.log('🗑️  Colecciones limpiadas');

    // Crear tiendas
    const stores = await Store.insertMany([
      {
        name: 'Chango Más',
        categories: ['carne', 'limpieza', 'bebidas'],
        price_level: 2,
        location: { lat: -34.6037, lng: -58.3816 }
      },
      {
        name: 'Carrefour',
        categories: ['carne', 'limpieza', 'bebidas', 'lacteos'],
        price_level: 3,
        location: { lat: -34.6158, lng: -58.4333 }
      },
      {
        name: 'Día',
        categories: ['limpieza', 'bebidas', 'lacteos'],
        price_level: 1,
        location: { lat: -34.5889, lng: -58.3922 }
      },
      {
        name: 'Coto',
        categories: ['carne', 'bebidas', 'lacteos'],
        price_level: 3,
        location: { lat: -34.6278, lng: -58.4542 }
      },
      {
        name: 'Jumbo',
        categories: ['carne', 'limpieza', 'bebidas', 'lacteos'],
        price_level: 4,
        location: { lat: -34.5567, lng: -58.4723 }
      },
      {
        name: 'Walmart',
        categories: ['carne', 'limpieza', 'bebidas', 'lacteos'],
        price_level: 3,
        location: { lat: -34.5887, lng: -58.4212 }
      },
      {
        name: 'Easy',
        categories: ['limpieza', 'bebidas'],
        price_level: 2,
        location: { lat: -34.6123, lng: -58.3923 }
      },
      {
        name: 'Sodimac',
        categories: ['limpieza', 'bebidas'],
        price_level: 2,
        location: { lat: -34.5789, lng: -58.4123 }
      }
    ]);
    console.log(`🏪 ${stores.length} tiendas creadas`);

    // Crear usuario de prueba
    const user = await User.create({
      name: 'Usuario Demo',
      email: 'demo@mejoria.com',
      password: 'demo123456',
      payment_methods: ['tarjeta_visa', 'efectivo', 'mercadopago'],
      location: { lat: -34.6037, lng: -58.3816 }
    });
    console.log(`👤 Usuario creado: ${user.email}`);

    // Crear promociones
    const today = new Date();
    const currentDay = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][today.getDay()];
    
    const promotions = await Promotion.insertMany([
      // Promociones para carne
      {
        store_id: stores[0]._id,
        discount: 0.20,
        payment_method: 'tarjeta_visa',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'carne'
      },
      {
        store_id: stores[1]._id,
        discount: 0.15,
        payment_method: 'mercadopago',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'carne'
      },
      {
        store_id: stores[3]._id,
        discount: 0.25,
        payment_method: 'efectivo',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
        active: true,
        category: 'carne'
      },
      // Promociones para limpieza
      {
        store_id: stores[2]._id,
        discount: 0.30,
        payment_method: 'efectivo',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'limpieza'
      },
      {
        store_id: stores[0]._id,
        discount: 0.18,
        payment_method: 'tarjeta_visa',
        days: ['sabado', 'domingo'],
        active: true,
        category: 'limpieza'
      },
      {
        store_id: stores[4]._id,
        discount: 0.22,
        payment_method: 'mercadopago',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'limpieza'
      },
      // Promociones para bebidas
      {
        store_id: stores[2]._id,
        discount: 0.25,
        payment_method: 'efectivo',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'bebidas'
      },
      {
        store_id: stores[1]._id,
        discount: 0.12,
        payment_method: 'tarjeta_visa',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'bebidas'
      },
      {
        store_id: stores[3]._id,
        discount: 0.20,
        payment_method: 'mercadopago',
        days: ['sabado', 'domingo'],
        active: true,
        category: 'bebidas'
      },
      // Promociones para lácteos
      {
        store_id: stores[1]._id,
        discount: 0.18,
        payment_method: 'tarjeta_visa',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'lacteos'
      },
      {
        store_id: stores[4]._id,
        discount: 0.15,
        payment_method: 'efectivo',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
        active: true,
        category: 'lacteos'
      },
      {
        store_id: stores[2]._id,
        discount: 0.22,
        payment_method: 'mercadopago',
        days: ['sabado', 'domingo'],
        active: true,
        category: 'lacteos'
      }
    ]);
    console.log(`🏷️  ${promotions.length} promociones creadas`);

    console.log('\n✅ Seed completado exitosamente!');
    console.log(`📅 Día actual: ${currentDay}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
};

seedData();