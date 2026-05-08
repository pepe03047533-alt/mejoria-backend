require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { getValidAccessToken, getStatus } = require('./services/meliOAuth');
const logger = require('./utils/logger');
const { getMongoUri, maskMongoUri } = require('./utils/mongoUri');
const { version } = require('./package.json');

const app = express();

// Conexión a MongoDB (MONGODB_URI o MONGO_URL en Railway)
const mongoUri = getMongoUri();
if (mongoUri) {
  console.log(`Intentando conectar a MongoDB con URI: ${maskMongoUri(mongoUri)}`);
  mongoose
    .connect(mongoUri)
    .then(() => logger.info('MongoDB connected'))
    .catch((err) => {
      console.error('Error de conexión a Mongo:', err);
      logger.error('MongoDB connection error', { detail: err.message });
    });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de recomendaciones de compras
const recommendationRoutes = require('./routes/recommendations');
app.use('/api', recommendationRoutes);

const searchRoutes = require('./routes/search');
app.use('/api/search', searchRoutes);
app.use('/api/buscar', searchRoutes);

// Rutas de autenticación
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Rutas de AI
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);
app.use('/api/chat', aiRoutes);

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
    database: getMongoUri() ? 'MongoDB' : 'No conectada',
    message: 'Sistema operando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', async (req, res) => {
  try {
    const mongoConnected = mongoose.connection.readyState === 1;
    const tokenStatus = await getStatus();
    const token = await getValidAccessToken();
    let tokenValid = false;
    if (token) {
      const probe = await axios.get('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
        validateStatus: () => true,
      });
      tokenValid = probe.status >= 200 && probe.status < 300;
    }
    res.json({
      status: 'ok',
      mongo: {
        connected: mongoConnected,
        readyState: mongoose.connection.readyState,
      },
      mercadolibre: {
        hasToken: !!token,
        valid: tokenValid,
        source: tokenStatus.source || null,
        expiresAt: tokenStatus.expiresAt || null,
      },
      deploy: {
        version: process.env.RELEASE_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || version,
      },
    });
  } catch (err) {
    logger.error('Status endpoint error', { detail: err.message });
    res.status(500).json({ status: 'error', message: 'No se pudo obtener el estado' });
  }
});

// Test rápido de conectividad con Mercado Libre (sin búsqueda)
app.get('/api/test-meli', async (req, res) => {
  try {
    const status = await getStatus();
    const token = await getValidAccessToken();
    if (!token) {
      return res.status(200).json({
        ok: false,
        connected: false,
        status,
        message: 'No hay access_token disponible para Mercado Libre',
      });
    }
    const { status: mlStatus } = await axios.get('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
      validateStatus: () => true,
    });
    const ok = mlStatus >= 200 && mlStatus < 300;
    return res.status(ok ? 200 : 502).json({
      ok,
      connected: ok,
      mlStatus,
      status,
      message: ok ? 'Conexión con Mercado Libre OK' : 'Mercado Libre respondió con error',
    });
  } catch (err) {
    logger.error('Test meli endpoint error', { detail: err.message });
    return res.status(500).json({
      ok: false,
      connected: false,
      message: 'Error testeando conexión con Mercado Libre',
    });
  }
});

// Ruta raíz
app.get('/', (req, res) => {
  res.send('Servidor de MejorIA activo');
});

// Exportar para Vercel Serverless
module.exports = app;

// --- CONFIGURACIÓN PARA EJECUCIÓN LOCAL ---
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3001; // Puerto 3001 para coincidir con tu frontend
  app.listen(PORT, () => {
    logger.info('API local server started', { port: PORT });
  });
}