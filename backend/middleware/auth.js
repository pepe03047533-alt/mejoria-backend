const jwt = require('jsonwebtoken');
const { dbService } = require('../services/database');

const JWT_SECRET = process.env.JWT_SECRET || 'mejoria-secret-key-2024';
const JWT_EXPIRES = '7d';

const auth = {
  // Generar token
  generateToken: (user) => {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role || 'user'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
  },

  // Middleware para verificar token
  verifyToken: (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  },

  // Middleware solo para admins
  requireAdmin: (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol admin.' });
    }
    next();
  },

  // Login
  login: async (email, password) => {
    const user = await dbService.getUserByEmail(email);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const validPassword = dbService.validatePassword(user, password);
    if (!validPassword) {
      throw new Error('Contraseña incorrecta');
    }

    await dbService.updateLastLogin(user.id);

    const token = auth.generateToken(user);
    
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  },

  // Register
  register: async (name, email, password) => {
    const existingUser = await dbService.getUserByEmail(email);
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    const user = await dbService.createUser(name, email, password);
    const token = auth.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'user'
      }
    };
  }
};

module.exports = { auth, JWT_SECRET };
