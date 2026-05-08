const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Usar stealth plugin para evadir detección
puppeteer.use(StealthPlugin());

let browser = null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildSearchUrls(query, categoryId = null, condicion = 'nuevo') {
  const q = query.trim().replace(/\s+/g, '-');
  const baseQuery = encodeURIComponent(q);
  const paths = [`https://listado.mercadolibre.com.ar/${baseQuery}`];

  if (categoryId) {
    paths.push(`https://listado.mercadolibre.com.ar/${categoryId}/${baseQuery}`);
  }

  return paths.map((baseUrl) => {
    const params = new URLSearchParams();
    params.set('order', 'price_asc');
    if (condicion === 'nuevo') params.set('ITEM_CONDITION', '2230284');
    if (condicion === 'usado') params.set('ITEM_CONDITION', '2230581');
    return `${baseUrl}?${params.toString()}`;
  });
}

function parseProductIdFromUrl(url = '') {
  const m = url.match(/(MLA\d{6,})/i);
  return m ? m[1].toUpperCase() : null;
}

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1366,768',
      ],
    });
  }
  return browser;
}

async function searchMercadoLibre(query, categoryId = null, condicion = 'nuevo') {
  let page = null;
  
  try {
    console.log(`  [MercadoLibre] Buscando: "${query}"`);
    
    const browser = await getBrowser();
    page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewport({ width: 1366, height: 768 });
    
    const candidateUrls = buildSearchUrls(query, categoryId, condicion);
    const selectors = [
      '.ui-search-layout__item',
      '.ui-search-result',
      '[data-testid="product-card"]',
      '.poly-card',
    ];

    const merged = [];
    const seenIds = new Set();

    for (const url of candidateUrls) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(1200);

      let batch = [];

      for (const selector of selectors) {
        batch = await page.evaluate((sel, cond) => {
          const elements = document.querySelectorAll(sel);
          const products = [];

          elements.forEach((el, index) => {
            if (index >= 80) return;

            const titleSelectors = [
              '.poly-component__title',
              '.ui-search-item__title',
              'h2',
              'a h3',
              '.poly-component__title-wrapper'
            ];

            let titulo = '';
            for (const ts of titleSelectors) {
              const elTitle = el.querySelector(ts);
              if (elTitle) {
                titulo = elTitle.textContent.trim();
                break;
              }
            }

            if (!titulo) return;

            const priceWhole = el.querySelector('.andes-money-amount__fraction');
            const priceCents = el.querySelector('.andes-money-amount__cents');
            const whole = priceWhole ? priceWhole.textContent.replace(/[^0-9]/g, '') : '';
            const cents = priceCents ? priceCents.textContent.replace(/[^0-9]/g, '') : '';
            const precio = parseInt(whole || '0', 10) || 0;

            const linkEl = el.querySelector('a');
            const link = linkEl ? linkEl.href : '';

            const imgEl = el.querySelector('img');
            const imagen = imgEl ? (imgEl.src || imgEl.dataset.src || '') : '';

            const tituloLower = titulo.toLowerCase();
            const esUsado = tituloLower.includes('usado') || tituloLower.includes('reacondicionado');
            if (cond === 'nuevo' && esUsado) return;
            if (cond === 'usado' && !esUsado) return;

            const isAdRedirect = link.includes('click1.mercadolibre.com') || link.includes('/mclics/');
            const isMlProduct = link.includes('mercadolibre.com.ar');
            if (!isMlProduct || isAdRedirect) return;

            if (precio > 0 && link) {
              products.push({
                titulo,
                precio,
                precioOriginal: precio,
                descuento: cents ? 0 : 0,
                url: link,
                imagen: imagen.replace('http://', 'https://'),
                tienda: 'MercadoLibre',
                condicion: esUsado ? 'Usado' : 'Nuevo',
                disponible: true,
              });
            }
          });

          return products;
        }, selector, condicion);

        if (batch.length > 0) {
          console.log(`  [MercadoLibre] Selector funcional: ${selector}`);
          break;
        }
      }

      for (const p of batch) {
        const pid = parseProductIdFromUrl(p.url) || p.url;
        if (seenIds.has(pid)) continue;
        seenIds.add(pid);
        merged.push(p);
      }

      // Objetivo mínimo: al menos 3 resultados válidos nuevos y baratos.
      if (merged.length >= 3) break;
    }

    merged.sort((a, b) => a.precio - b.precio);

    console.log(`  [MercadoLibre] ${merged.length} productos encontrados`);
    
    await page.close();
    return merged.slice(0, 60);
    
  } catch (error) {
    console.error('  [MercadoLibre] Error:', error.message);
    if (page) await page.close();
    return [];
  }
}

process.on('exit', async () => {
  if (browser) await browser.close();
});

module.exports = { searchMercadoLibre };
