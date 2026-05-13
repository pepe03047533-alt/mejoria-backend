const axios = require('axios');
const { getValidAccessToken, forceRefreshAccessToken } = require('./meliOAuth');
const logger = require('../utils/logger');
const { extractWantedTvInches, productMatchesWantedInches } = require('../utils/tvScreenMatch');

const MIN_VALID_PRODUCTS = 50;
const PAGE_SIZE = 100;
const MAX_SEARCH_OFFSET = 2000;
const MAX_SEARCH_OFFSET_TV_INCHES = 8000;

function mapMeliItem(item) {
  if (!item || !item.permalink) return null;

  let price = Number(item.price);
  if (!price || price <= 0) {
    const sp = item.sale_price;
    if (sp != null) {
      price = typeof sp === 'object' ? Number(sp.amount ?? sp.value ?? 0) : Number(sp);
    }
  }
  if (!price || price <= 0) {
    const prs = item.prices;
    if (Array.isArray(prs) && prs[0]) {
      price = Number(prs[0].amount ?? prs[0].price ?? 0);
    } else if (prs && typeof prs === 'object' && Array.isArray(prs.prices) && prs.prices[0]) {
      price = Number(prs.prices[0].amount ?? 0);
    }
  }
  if (!price || price <= 0) {
    price = Number(item.original_price) || 0;
  }
  if (price <= 0) return null;

  const original = Number(item.original_price) || 0;

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
    const wantedInches = extractWantedTvInches(query);
    const maxOffset = wantedInches != null ? MAX_SEARCH_OFFSET_TV_INCHES : MAX_SEARCH_OFFSET;

    /** Con TV por pulgadas hace falta recorrer páginas ordenadas por precio (suelen aparecer primero las más chicas). */
    const sortMode = wantedInches != null ? 'price_asc' : 'relevance';

    while (collected.length < MIN_VALID_PRODUCTS && offset < maxOffset) {
      const params = {
        q: query,
        sort: sortMode,
        limit: PAGE_SIZE,
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
        if (!productMatchesWantedInches(item, wantedInches)) continue;
        const urlBase = (item.url || '').split('#')[0];
        const precio = Number(item.precio) || 0;
        const key = urlBase ? `${urlBase}${precio}` : `${item.titulo || ''}|${precio}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(item);
      }
      offset += data.results.length;
      if (data.results.length < PAGE_SIZE) break;
    }

    if (wantedInches != null) {
      collected.sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
    }
    return { items: collected, tokenErrorDetected };
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
