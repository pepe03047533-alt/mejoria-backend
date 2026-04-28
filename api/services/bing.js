const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS_PAGE = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-AR,es;q=0.9',
};

function extractPriceFromText(text) {
  const patterns = [
    /(?:AR\$|\$)\s*([\d]{1,3}(?:[\.,]\d{3})+)/g,
    /(?:AR\$|\$)\s*(\d{4,})/g,
  ];
  const found = [];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      const before = text.slice(Math.max(0, m.index - 30), m.index).toLowerCase();
      if (/\d+\s*(?:cuotas?|x)\s*(?:de\s*)?$/.test(before)) continue;
      if (/cuota|financ|mensual/i.test(before)) continue;
      const n = parseInt(m[1].replace(/[.,]/g, ''));
      if (n >= 500 && n <= 100_000_000) found.push(n);
    }
  }
  return found.length > 0 ? Math.min(...found) : 0;
}

function extractPriceFromPage($, html) {
  // 1. JSON-LD schema.org
  try {
    $('script[type="application/ld+json"]').each(function(i, el) {
      const json = JSON.parse($(el).html() || '{}');
      const offers = json.offers || (Array.isArray(json['@graph']) && json['@graph'].find(function(n){ return n.offers; }));
      const price = offers && (offers.price || offers.lowPrice);
      if (price) throw { price: parseFloat(String(price).replace(/[^0-9.]/g, '')) };
    });
  } catch(e) {
    if (e.price && e.price >= 500) return Math.round(e.price);
  }

  // 2. Open Graph / meta
  const ogPrice = $('meta[property="product:price:amount"]').attr('content') || '';
  if (ogPrice) { const n = parseFloat(ogPrice.replace(/[^0-9.]/g, '')); if (n >= 500) return Math.round(n); }

  // 3. Selectores CSS comunes
  const priceSelectors = [
    '.woocommerce-Price-amount',
    '[class*="price"][class*="current"]',
    '[class*="precio"][class*="actual"]',
    '[class*="Price"] .amount',
    '[class*="price"]:not([class*="old"]):not([class*="before"]):not([class*="tachado"])',
    '[class*="precio"]:not([class*="anterior"])',
  ];
  for (const sel of priceSelectors) {
    const text = $(sel).first().text().trim();
    const p = extractPriceFromText(text);
    if (p >= 500) return p;
  }

  // 4. Fallback regex en body
  return extractPriceFromText(html.slice(0, 50000));
}

async function fetchProductPage(url) {
  const { data } = await axios.get(url, {
    headers: HEADERS_PAGE, timeout: 6000, maxRedirects: 3,
  });
  const $ = cheerio.load(data);
  const titulo = $('meta[property="og:title"]').attr('content') || $('title').first().text().trim() || '';
  const precio = extractPriceFromPage($, data);
  const imagen = $('meta[property="og:image"]').attr('content') || '';
  return { titulo, precio, imagen };
}

// ─────────────────────────────────────────────────────────────
//  Bing Web Search via RapidAPI
//  Mismo motor que usa ChatGPT — índice más amplio que DuckDuckGo
// ─────────────────────────────────────────────────────────────
async function searchBing(query) {
  const apiKey = process.env.BING_RAPIDAPI_KEY;
  if (!apiKey) {
    console.log('Bing RapidAPI key no configurada, omitiendo.');
    return [];
  }

  try {
    const searchQuery = `${query} precio comprar Argentina`;
    const { data } = await axios.get('https://bing-web-search1.p.rapidapi.com/search', {
      params: {
        q: searchQuery,
        mkt: 'es-AR',
        safeSearch: 'Off',
        count: '15',
        freshness: 'Month',
      },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'bing-web-search1.p.rapidapi.com',
        'Accept-Language': 'es-AR',
      },
      timeout: 12000,
    });

    const webPages = data?.webPages?.value || [];

    // Filtrar solo URLs argentinas (.ar) o que mencionan Argentina
    const arUrls = webPages
      .filter(function(item) {
        const url = item.url || '';
        const snippet = (item.snippet || '').toLowerCase();
        return url.includes('.ar') || snippet.includes('argentin');
      })
      .slice(0, 10);

    if (arUrls.length === 0) return [];

    // Visitar cada URL en paralelo para extraer precio real
    const results = await Promise.allSettled(
      arUrls.slice(0, 8).map(function(item) {
        return fetchProductPage(item.url).then(function(page) {
          const titulo = page.titulo || item.name || '';
          const precio = page.precio;
          const imagen = page.imagen;
          // Detectar nombre de tienda desde dominio
          let tienda = (item.url.match(/https?:\/\/(?:www\.)?([^\/]+)/) || [])[1] || 'Web AR';
          tienda = tienda.replace(/^www\./, '').split('.')[0];
          tienda = tienda.charAt(0).toUpperCase() + tienda.slice(1);
          return { titulo, precio, imagen, url: item.url, tienda };
        });
      })
    );

    const products = [];
    results.forEach(function(r) {
      if (r.status !== 'fulfilled') return;
      const { titulo, precio, imagen, url, tienda } = r.value;
      if (!titulo || precio < 500) return;
      products.push({
        titulo, precio, precioOriginal: precio, descuento: 0,
        url, imagen, tienda,
        condicion: 'Nuevo', disponible: true,
        fechaActualizacion: new Date().toISOString(),
      });
    });

    console.log('Bing: ' + products.length + ' productos encontrados');
    return products;
  } catch (error) {
    console.error('Error Bing:', error.message);
    return [];
  }
}

module.exports = { searchBing };
