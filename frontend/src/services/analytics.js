const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Envia un evento de tracking al backend
 * @param {Object} event - Evento a trackear
 */
export async function trackEvent(event) {
  try {
    const response = await fetch(`${API_URL}/api/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    
    if (!response.ok) {
      console.error('Error tracking event:', response.statusText);
    }
  } catch (error) {
    // Silenciar errores de tracking para no afectar UX
    console.error('Tracking error:', error.message);
  }
}

/**
 * Envia múltiples eventos (impressions) al backend
 * @param {Array} events - Array de eventos
 */
export async function trackEvents(events) {
  try {
    const response = await fetch(`${API_URL}/api/track/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });
    
    if (!response.ok) {
      console.error('Error tracking events:', response.statusText);
    }
  } catch (error) {
    // Silenciar errores de tracking para no afectar UX
    console.error('Tracking batch error:', error.message);
  }
}

/**
 * Track de impression (producto mostrado)
 * @param {string} query - Término buscado
 * @param {Object} product - Producto mostrado
 * @param {number} position - Posición (1-10)
 */
export function trackImpression(query, product, position) {
  const productId = extractProductId(product.url);
  
  trackEvent({
    query,
    product_id: productId,
    position,
    clicked: false,
    time_to_click: null,
  });
}

/**
 * Track de click en producto
 * @param {string} query - Término buscado
 * @param {Object} product - Producto clickeado
 * @param {number} position - Posición (1-10)
 * @param {number} timeToClick - Tiempo en ms desde que se mostró
 */
export function trackClick(query, product, position, timeToClick) {
  const productId = extractProductId(product.url);
  
  trackEvent({
    query,
    product_id: productId,
    position,
    clicked: true,
    time_to_click: timeToClick,
  });
}

/**
 * Extrae el ID del producto de la URL
 * @param {string} url - URL del producto
 * @returns {string} ID del producto
 */
function extractProductId(url) {
  if (!url) return 'unknown';
  
  // Intentar extraer MLA-XXXX o similar
  const match = url.match(/(MLA|MLU)-\d+/);
  if (match) return match[0];
  
  // Si no hay match, usar el slug de la URL
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1] || parts[parts.length - 2];
  return lastPart?.split('?')[0] || 'unknown';
}

/**
 * Obtiene estadísticas de analytics
 */
export async function getAnalyticsStats() {
  try {
    const response = await fetch(`${API_URL}/api/track/stats`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error getting stats:', error.message);
    return null;
  }
}
