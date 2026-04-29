require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, dbService } = require('./services/database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Verificar conexión a PostgreSQL y seedear datos
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err);
  } else {
    console.log('🚀 PostgreSQL conectado:', res.rows[0].now);
    // Seedear datos de tiendas y promociones
    try {
      await dbService.seedStoresAndPromotions();
    } catch (seedErr) {
      console.error('Error seedeando datos:', seedErr);
    }
  }
});

// Rutas de recomendaciones de compras
const recommendationRoutes = require('./routes/recommendations');
app.use('/api', recommendationRoutes);

// Rutas de búsqueda
const searchRoutes = require('./routes/search');
app.use('/api/search', searchRoutes);

// Rutas de autenticación
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Rutas de AI
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);

// Rutas de análisis
const analyzeRoutes = require('./routes/analyze');
app.use('/api/analyze', analyzeRoutes);

// Rutas de analytics
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);

// Rutas de ML Best
const mlBestRoutes = require('./routes/mlBest');
app.use('/api/ml-best', mlBestRoutes);

// Rutas de historial de usuario
const userHistoryRoutes = require('./routes/userHistory');
app.use('/api/user-history', userHistoryRoutes);

// RUTA DE SALUD
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'MejorIA Backend', 
    database: 'PostgreSQL',
    message: 'Sistema operando correctamente'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.send('Servidor de MejorIA activo y conectado a PostgreSQL.');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
});
