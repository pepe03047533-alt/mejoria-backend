const express = require('express');
const router = express.Router();
const { googleService } = require('../services/googleService');
const { dbService } = require('../services/database');
const jwt = require('jsonwebtoken');
const meliOAuth = require('../services/meliOAuth');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_aqui';

// Generar token JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      name: user.name,
      picture: user.picture
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// URL de login con Google
router.get('/google', (req, res) => {
  const authUrl = googleService.getAuthUrl();
  res.redirect(authUrl);
});

// Callback de Google (para OAuth implicit flow desde frontend)
router.post('/google/token', async (req, res) => {
  try {
    const { token, guestId } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    // Validar token con Google
    const userInfo = await googleService.getUserInfo(token);
    
    if (!userInfo) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Crear o actualizar usuario
    const user = await dbService.createOrUpdateGoogleUser({
      id: userInfo.id,
      emails: [{ value: userInfo.email }],
      displayName: userInfo.name,
      photos: [{ value: userInfo.picture }],
    });

    // Si venía como invitado, unificar historial
    if (guestId) {
      const oldGuest = await dbService.getUserByGuestId(guestId);
      if (oldGuest && oldGuest.id !== user.id) {
        await dbService.mergeGuestToUser(oldGuest.id, user.id);
      }
    }

    const jwtToken = generateToken(user);

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        is_guest: false,
      }
    });
  } catch (err) {
    console.error('Error en Google auth:', err);
    res.status(500).json({ error: 'Error en autenticación' });
  }
});

// Mercado Libre OAuth — redirige a la página de autorización de ML
router.get('/meli/start', (req, res) => {
  try {
    const url = meliOAuth.buildAuthorizeRedirectUrl();
    if (!url) {
      return res.status(500).json({ error: 'Configurá MERCADOLIBRE_APP_ID' });
    }
    res.redirect(url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo iniciar OAuth de Mercado Libre' });
  }
});

router.post('/meli/exchange', async (req, res) => {
  try {
    const { code, state } = req.body;
    if (!code || !meliOAuth.verifyMeliState(state)) {
      return res.status(400).json({ error: 'Código o estado inválido' });
    }
    const redirectUri = meliOAuth.getRedirectUri();
    await meliOAuth.exchangeCode(code, redirectUri);
    res.json({ ok: true, message: 'Mercado Libre conectado' });
  } catch (err) {
    console.error('Meli exchange:', err);
    res.status(500).json({ error: err.message || 'Error al obtener token' });
  }
});

router.get('/meli/status', async (req, res) => {
  try {
    const status = await meliOAuth.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo leer el estado' });
  }
});

// Crear sesión de invitado
router.post('/guest', async (req, res) => {
  try {
    const { guestId } = req.body;
    
    if (!guestId) {
      return res.status(400).json({ error: 'Se requiere guestId' });
    }

    let user = await dbService.getUserByGuestId(guestId);
    
    if (!user) {
      user = await dbService.createGuestUser(guestId);
    } else {
      await dbService.updateLastSeen(user.id);
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        is_guest: true,
        guest_id: user.guest_id,
      }
    });
  } catch (err) {
    console.error('Error creando invitado:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Obtener perfil
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await dbService.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        is_guest: user.is_guest === 1,
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
