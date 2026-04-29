const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { dbService } = require('../services/database');

const JWT_SECRET = process.env.JWT_SECRET || 'mejoria-user-secret-2024';
const JWT_EXPIRES = '30d';

// Configurar Passport con Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'tu-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'tu-client-secret',
    callbackURL: '/api/auth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await dbService.createOrUpdateGoogleUser(profile);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await dbService.getUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Generar token JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      name: user.name,
      is_guest: user.is_guest,
      guest_id: user.guest_id
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
};

// Middleware para verificar usuario (invitado o registrado)
const identifyUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const guestId = req.headers['x-guest-id'];

    let user = null;

    if (token) {
      // Verificar token JWT
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await dbService.getUserById(decoded.id);
        if (user) {
          await dbService.updateLastSeen(user.id);
        }
      } catch (err) {
        // Token inválido, continuar como invitado
      }
    }

    // Si no hay usuario válido pero hay guestId, buscar o crear invitado
    if (!user && guestId) {
      user = await dbService.getUserByGuestId(guestId);
      if (!user) {
        // Crear nuevo invitado
        user = await dbService.createGuestUser(guestId);
      } else {
        await dbService.updateLastSeen(user.id);
      }
    }

    // Si no hay nada, crear invitado temporal (opcional)
    if (!user) {
      const tempGuestId = 'guest_' + Date.now();
      user = await dbService.createGuestUser(tempGuestId);
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Error en identifyUser:', err);
    next();
  }
};

// Middleware opcional (no requiere usuario)
const optionalUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const guestId = req.headers['x-guest-id'];

    let user = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await dbService.getUserById(decoded.id);
      } catch (err) {
        // Token inválido, continuar sin usuario
      }
    }

    if (!user && guestId) {
      user = await dbService.getUserByGuestId(guestId);
    }

    req.user = user;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

module.exports = {
  passport,
  generateToken,
  identifyUser,
  optionalUser,
  JWT_SECRET,
};
