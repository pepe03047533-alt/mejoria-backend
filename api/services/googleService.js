/**
 * Servicio de integración con Google APIs
 * Usa la API key proporcionada
 */

const GOOGLE_API_KEY = process.env.GOOGLE_CLIENT_ID || '';

const googleService = {
  // Configuración de OAuth
  oauthConfig: {
    clientId: GOOGLE_API_KEY,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback',
    scope: 'profile email',
  },

  // URL de autorización
  getAuthUrl: () => {
    const params = new URLSearchParams({
      client_id: GOOGLE_API_KEY,
      redirect_uri: googleService.oauthConfig.redirectUri,
      response_type: 'token',
      scope: googleService.oauthConfig.scope,
      include_granted_scopes: 'true',
      state: 'mejoria-auth',
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  // Validar token con Google
  validateToken: async (token) => {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
      if (!response.ok) throw new Error('Token inválido');
      return await response.json();
    } catch (error) {
      console.error('Error validando token:', error);
      return null;
    }
  },

  // Obtener info del usuario
  getUserInfo: async (accessToken) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) throw new Error('Error obteniendo usuario');
      return await response.json();
    } catch (error) {
      console.error('Error obteniendo info de usuario:', error);
      return null;
    }
  },
};

module.exports = { googleService, GOOGLE_API_KEY };
