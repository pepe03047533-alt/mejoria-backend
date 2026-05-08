const axios = require('axios');
const { getValidAccessToken, forceRefreshAccessToken } = require('./meliOAuth');
const logger = require('../utils/logger');
const MIN_RESULTS = 3;

function mapMeliItem(item) {
  if (!item || !item.permalink) return null;

  const price = Number(item.price) || 0;
  const original = Number(item.original_price) || 0;
  if (price <= 0) return null;

  const descuento = original > price && original > 0
    ? Math.round(((original - price) / original) * 100)
    : 0;

  return {
    titulo: item.title || 'Producto MercadoLibre',
    precio: price,
    precioOriginal: original > 0 ? original : price,
    descuento,
    url: item.permalink,
    imagen: item.thumbnail || '',
    tienda: 'MercadoLibre',
    condicion: item.condition === 'used' ? 'Usado' : 'Nuevo',
    disponible: item.available_quantity !== 0,
    fuente: 'meli_api',
  };
}

async function searchMercadoLibreApi(query, categoryId = null, condicion = 'nuevo') {
  const performSearch = async (token) => {
    const normalizedCondition = 'new';
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const collected = [];
    const seen = new Set();
    let offset = 0;
    let tokenErrorDetected = false;

    while (collected.length < MIN_RESULTS && offset <= 100) {
      const params = {
        q: query,
        sort: 'price_asc',
        limit: 50,
        offset,
        condition: normalizedCondition,
      };
      if (categoryId) params.category = categoryId;
      const { data, status } = await axios.get('https://api.mercadolibre.com/sites/MLA/search', {
        params,
        timeout: 12000,
        headers,
        validateStatus: () => true,
      });
      const hasTokenError = status === 401 || data?.error === 'invalid_token' || data?.message === 'invalid_token';
      if (hasTokenError) {
        tokenErrorDetected = true;
        break;
      }
      if (!data || data.error || status >= 400 || !Array.isArray(data.results)) break;
      const mapped = data.results.map(mapMeliItem).filter(Boolean);
      if (!mapped.length) break;
      for (const item of mapped) {
        const key = item.url || `${item.titulo}-${item.precio}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(item);
      }
      offset += data.results.length;
      if (data.results.length < 50) break;
    }

    collected.sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
    return { items: collected.slice(0, Math.max(MIN_RESULTS, collected.length)), tokenErrorDetected };
  };

  try {
    const token = await getValidAccessToken();
    const firstAttempt = await performSearch(token);
    if (!firstAttempt.tokenErrorDetected) {
      return firstAttempt.items;
    }

    logger.warn('[ML API] Token invalid/expired during search', { action: 'retry_with_refresh' });
    const refreshedToken = await forceRefreshAccessToken();
    if (!refreshedToken) {
      logger.error('❌ Search Failed', { source: 'mercadolibre_api', reason: 'token_refresh_failed' });
      return [];
    }
    const secondAttempt = await performSearch(refreshedToken);
    if (secondAttempt.tokenErrorDetected) {
      logger.error('❌ Search Failed', { source: 'mercadolibre_api', reason: 'invalid_token_after_refresh' });
      return [];
    }
    logger.info('[ML API] Search recovered after token refresh');
    return secondAttempt.items;
  } catch (err) {
    const reason = err.message?.includes('token') ? 'missing_or_invalid_token' : 'mercadolibre_api_error';
    logger.error('❌ Search Failed', { source: 'mercadolibre_api', reason, detail: err.message });
    return [];
  }
}

module.exports = { searchMercadoLibreApi };
