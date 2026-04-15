require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const path = require('path');
const searchRoute = require('./routes/search');
const analyticsRoute = require('./routes/analytics');
const analyzeRoute = require('./routes/analyze');
const mlBestRoute = require('./routes/mlBest');
const authRoute = require('./routes/auth');
const userHistoryRoute = require('./routes/userHistory');
const { passport, identifyUser } = require('./middleware/userAuth');
const { dbService } = require('./services/database');
const { auth } = require('./middleware/auth');

// ========== CONEXIÓN A BASE DE DATOS ==========
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("🚀 Conectado exitosamente a MongoDB Atlas"))
  .catch(err => console.error("❌ Error conectando a MongoDB:", err));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    /\.vercel\.app$/,
    /\.netlify\.app$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());
app.use(passport.initialize());

// Middleware para identificar usuario en cada request
app.use(identifyUser);

// Rutas principales
app.use('/api/search', searchRoute);
app.use('/api/track', analyticsRoute);
app.use('/api/analyze', analyzeRoute);
app.use('/api/ml-best', mlBestRoute);
app.use('/api/auth', authRoute);
app.use('/api/user', userHistoryRoute);

// ========== AUTENTICACIÓN ==========

// Registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    const result = await auth.register(name, email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }
    const result = await auth.login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Perfil del usuario (protegido)
app.get('/api/auth/profile', auth.verifyToken, async (req, res) => {
  try {
    const user = await dbService.getUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      last_login: user.last_login
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PANEL DE ADMIN ==========

app.get('/api/admin/check', auth.verifyToken, auth.requireAdmin, (req, res) => {
  res.json({ isAdmin: true });
});

app.get('/api/admin/stats', auth.verifyToken, auth.requireAdmin, async (req, res) => {
  try {
    const stats = await dbService.getStats();
    const popular = await dbService.getPopularSearches(10);
    const daily = await dbService.getDailyStats(7);
    res.json({ stats, popular_searches: popular, daily_stats: daily });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', auth.verifyToken, auth.requireAdmin, async (req, res) => {
  try {
    const users = await dbService.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/searches', auth.verifyToken, auth.requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const searches = await dbService.getRecentSearches(limit);
    res.json(searches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/interactions', auth.verifyToken, auth.requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const interactions = await dbService.getRecentInteractions(limit);
    res.json(interactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users/:id/activity', auth.verifyToken, auth.requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const searches = await dbService.getUserSearches(userId, 20);
    const interactions = await dbService.getUserInteractions(userId, null, 20);
    res.json({ searches, interactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== RUTAS PÚBLICAS ==========

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'MejorIA Backend', 
    database: 'MongoDB Atlas',
    auth: 'JWT'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MejorIA backend activo en puerto ${PORT}`);
  console.log(`📊 Base de datos: MongoDB Atlas`);
});
