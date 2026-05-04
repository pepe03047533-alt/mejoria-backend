require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

const app = express();

// Conexión a MongoDB Atlas
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("🚀 Conectado a MongoDB Atlas"))
    .catch(err => console.error("❌ Error de conexión:", err));
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
    database: process.env.MONGODB_URI ? 'MongoDB Atlas' : 'No conectada',
    message: 'Sistema operando correctamente',
    timestamp: new Date().toISOString()
  });
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
    console.log(`🚀 Motor encendido en http://localhost:${PORT}`);
    console.log(`📡 Probá la salud en: http://localhost:${PORT}/api/health`);
  });
}