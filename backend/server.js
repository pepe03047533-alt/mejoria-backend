require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("🚀 Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error de conexión:", err));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

// RUTA DE SALUD (La que confirmará que todo está OK)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'MejorIA Backend', 
    database: 'MongoDB Atlas',
    message: 'Sistema operando correctamente'
  });
});

// Ruta raíz para evitar el error 404
app.get('/', (req, res) => {
  res.send('Servidor de MejorIA activo y conectado a MongoDB Atlas.');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
});
