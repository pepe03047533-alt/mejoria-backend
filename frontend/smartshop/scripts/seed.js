require('dotenv').config();
const mongoose = require('mongoose');
const { Store, Promotion, User } = require('../models');
const connectDB = require('../config/database');

const seedData = async () => {
  try {
    await connectDB();
    
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
      }
    ]);
    console.log(`🏪 ${stores.length} tiendas creadas`);

    // Crear usuario de prueba
    const user = await User.create({
      name: 'Usuario Demo',
      email: 'demo@example.com',
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
        store_id: stores[0]._id, // Chango Más
        discount: 0.20,
        payment_method: 'tarjeta_visa',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'carne'
      },
      {
        store_id: stores[1]._id, // Carrefour
        discount: 0.15,
        payment_method: 'mercadopago',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'carne'
      },
      {
        store_id: stores[3]._id, // Coto
        discount: 0.10,
        payment_method: 'efectivo',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'carne'
      },
      // Promociones para limpieza
      {
        store_id: stores[2]._id, // Día
        discount: 0.25,
        payment_method: 'efectivo',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'limpieza'
      },
      {
        store_id: stores[0]._id, // Chango Más
        discount: 0.15,
        payment_method: 'tarjeta_visa',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'limpieza'
      },
      // Promociones para bebidas
      {
        store_id: stores[4]._id, // Jumbo
        discount: 0.30,
        payment_method: 'tarjeta_visa',
        days: ['viernes', 'sabado', 'domingo'],
        active: true,
        category: 'bebidas'
      },
      {
        store_id: stores[1]._id, // Carrefour
        discount: 0.20,
        payment_method: 'mercadopago',
        days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        active: true,
        category: 'bebidas'
      }
    ]);
    console.log(`🏷️  ${promotions.length} promociones creadas`);

    console.log('\n✅ Datos de prueba cargados exitosamente!');
    console.log(`📅 Hoy es ${currentDay} - las promociones para hoy están activas`);
    console.log('\n🧪 Para probar el endpoint:');
    console.log(`   curl http://localhost:3001/api/best-options?category=carne`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
    process.exit(1);
  }
};

seedData();
