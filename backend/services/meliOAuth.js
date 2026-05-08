const axios = require('axios');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_aqui';

const TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const AUTH_BASE = 'https://auth.mercadolibre.com.ar/authorization';

function getRedirectUri() {
  return (
    process.env.MERCADOLIBRE_REDIRECT_URI ||
    'https://www.mejoria.com.ar/auth/callback'
  );
}

function getClientCredentials() {
  const clientId = process.env.MERCADOLIBRE_APP_ID || '';
  const clientSecret =
    process.env.MERCADOLIBRE_CLIENT_SECRET ||
    process.env.MERCADOLIBRE_SECRET_KEY ||
    '';
  return { clientId, clientSecret };
}

function createMeliState() {
  return jwt.sign({ p: 'meli', iat: Date.now() }, JWT_SECRET, { expiresIn: '15m' });
}

function verifyMeliState(state) {
  if (!state || typeof state !== 'string') return false;
  try {
    const payload = jwt.verify(state, JWT_SECRET);
    return payload && payload.p === 'meli';
  } catch (_) {
    return false;
  }
}

async function loadFromMongo() {
  if (!process.env.MONGODB_URI) return null;
  try {
    const MeliAppToken = require('../models/MeliAppToken');
    const doc = await MeliAppToken.findOne({ key: 'default' }).lean();
    if (!doc || !doc.access_token) return null;
    return {
      access_token: doc.access_token,
      refresh_token: doc.refresh_token,
      expires_at: doc.expires_at,
    };
  } catch (_) {
    return null;
  }
}

async function saveToMongo(tokens) {
  if (!process.env.MONGODB_URI) return false;
  try {
    const MeliAppToken = require('../models/MeliAppToken');
    await MeliAppToken.findOneAndUpdate(
      { key: 'default' },
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        expires_at: tokens.expires_at,
      },
      { upsert: true }
    );
    return true;
  } catch (_) {
    return false;
  }
}

async function loadFromSqlite() {
  try {
    const { dbService } = require('./database');
    if (!dbService.getMeliTokens) return null;
    return await dbService.getMeliTokens();
  } catch (_) {
    return null;
  }
}

async function saveToSqlite(tokens) {
  try {
    const { dbService } = require('./database');
    if (!dbService.saveMeliTokens) return false;
    const ok = await dbService.saveMeliTokens(tokens);
    return !!ok;
  } catch (_) {
    return false;
  }
}

async function persistTokens(access_token, refresh_token, expires_in) {
  const expires_at =
    Date.now() + Number(expires_in || 0) * 1000 - 60 * 1000;
  const payload = {
    access_token,
    refresh_token: refresh_token || '',
    expires_at,
  };
  if (await saveToMongo(payload)) return;
  if (await saveToSqlite(payload)) return;
  throw new Error('No hay almacenamiento disponible para el token de Mercado Libre');
}

async function loadTokens() {
  let row = await loadFromMongo();
  if (row?.access_token) return row;
  row = await loadFromSqlite();
  return row;
}

async function exchangeCode(code, redirectUri) {
  const { clientId, clientSecret } = getClientCredentials();
  if (!clientId || !clientSecret) {
    throw new Error('Faltan MERCADOLIBRE_APP_ID o MERCADOLIBRE_SECRET_KEY');
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });
  const { data } = await axios.post(TOKEN_URL, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    validateStatus: () => true,
  });
  if (!data || data.error) {
    const msg = data?.message || data?.error_description || data?.error || 'intercambio fallido';
    logger.error('[ML OAuth] Exchange code failed', { detail: msg });
    throw new Error(msg);
  }
  logger.info('[ML OAuth] Exchange code success');
  await persistTokens(data.access_token, data.refresh_token, data.expires_in);
  return { ok: true };
}

async function refreshAccessToken(refresh_token) {
  const { clientId, clientSecret } = getClientCredentials();
  if (!clientId || !clientSecret || !refresh_token) {
    logger.warn('[ML OAuth] Refresh skipped', { reason: 'missing_credentials_or_refresh_token' });
    return false;
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token,
  });
  const { data } = await axios.post(TOKEN_URL, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    validateStatus: () => true,
  });
  if (!data || data.error || !data.access_token) {
    const msg = data?.message || data?.error_description || data?.error || 'refresh fallido';
    logger.error('[ML OAuth] Refresh failed', { detail: msg });
    return false;
  }
  logger.info('🔄 Refreshing Token...');
  await persistTokens(
    data.access_token,
    data.refresh_token || refresh_token,
    data.expires_in
  );
  logger.info('✅ Token Refreshed');
  return true;
}

async function forceRefreshAccessToken() {
  const row = await loadTokens();
  if (!row?.refresh_token) {
    logger.warn('[ML OAuth] Force refresh skipped', { reason: 'missing_refresh_token' });
    return null;
  }
  const ok = await refreshAccessToken(row.refresh_token);
  if (!ok) return null;
  const updated = await loadTokens();
  return updated?.access_token || null;
}

/**
 * Token válido para Authorization: Bearer en APIs de Mercado Libre.
 * Renueva con refresh_token cuando está por vencer.
 */
async function getValidAccessToken() {
  const envTok = process.env.MERCADOLIBRE_ACCESS_TOKEN;
  if (envTok) return envTok;

  let row = await loadTokens();
  if (!row?.access_token) return null;

  const skew = 2 * 60 * 1000;
  const expired =
    !row.expires_at || Date.now() > row.expires_at - skew;

  if (expired && row.refresh_token) {
    logger.info('🔄 Refreshing Token...', { reason: 'token_expiring' });
    const ok = await refreshAccessToken(row.refresh_token);
    if (ok) row = await loadTokens();
  }

  return row?.access_token || null;
}

function buildAuthorizeRedirectUrl() {
  const { clientId } = getClientCredentials();
  if (!clientId) return null;
  const redirectUri = getRedirectUri();
  const state = createMeliState();
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_BASE}?${q.toString()}`;
}

async function getStatus() {
  const envTok = process.env.MERCADOLIBRE_ACCESS_TOKEN;
  if (envTok) {
    return { connected: true, source: 'env', expiresAt: null };
  }
  const row = await loadTokens();
  if (!row?.access_token) {
    return { connected: false, expiresAt: null };
  }
  return {
    connected: true,
    source: 'stored',
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
  };
}

module.exports = {
  getRedirectUri,
  getClientCredentials,
  createMeliState,
  verifyMeliState,
  exchangeCode,
  getValidAccessToken,
  forceRefreshAccessToken,
  buildAuthorizeRedirectUrl,
  getStatus,
};
