require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { getValidAccessToken, getStatus } = require('./services/meliOAuth');
const logger = require('./utils/logger');
const { getMongoUri, maskMongoUri } = require('./utils/mongoUri');
const { version } = require('./package.json');

// Configuración de CORS para producción y desarrollo
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://www.mejoria.com.ar',
      'https://mejoria.com.ar',
      'http://localhost:5173',
      'http://localhost:3001'
    ];
    // Permitir peticiones sin origin (como Postman) o si está en allowedOrigins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Id', 'x-guest-id']
};

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

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors(corsOptions));
app.use(express.json());

// Rutas de recomendaciones de compras
const recommendationRoutes = require('./routes/recommendations');
app.use('/api', recommendationRoutes);

// Rutas de búsqueda
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

// RUTA DE SALUD (La que confirmará que todo está OK)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'MejorIA Backend', 
    database: 'MongoDB Atlas',
    message: 'Sistema operando correctamente'
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

// Ruta raíz para evitar el error 404
app.get('/', (req, res) => {
  res.send('Servidor de MejorIA activo y conectado a MongoDB Atlas.');
});

app.listen(PORT, () => {
  logger.info('Backend server started', { port: PORT });
});
