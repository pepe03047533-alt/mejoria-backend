const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Usar stealth plugin para evadir detección
puppeteer.use(StealthPlugin());

let browser = null;

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
    
    // Navegar a ML homepage primero (parece más natural)
    await page.goto('https://www.mercadolibre.com.ar', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    
    // Esperar un poco
    await page.waitForTimeout(2000);
    
    // Hacer la búsqueda
    const baseQuery = encodeURIComponent(query.replace(/ /g, '-'));
    const url = `https://listado.mercadolibre.com.ar/${baseQuery}`;
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    
    // Esperar carga de productos
    await page.waitForTimeout(3000);
    
    // Intentar diferentes selectores
    const selectors = [
      '.ui-search-layout__item',
      '.ui-search-result',
      '[data-testid="product-card"]',
      '.poly-card',
    ];
    
    let items = [];
    
    for (const selector of selectors) {
      items = await page.evaluate((sel, cond) => {
        const elements = document.querySelectorAll(sel);
        const products = [];
        
        elements.forEach((el, index) => {
          if (index >= 20) return; // Máximo 20
          
          // Intentar múltiples selectores de título
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
          
          // Precio
          const priceEl = el.querySelector('.andes-money-amount__fraction');
          const precioText = priceEl ? priceEl.textContent.replace(/[^0-9]/g, '') : '';
          const precio = parseInt(precioText) || 0;
          
          // Link
          const linkEl = el.querySelector('a');
          const link = linkEl ? linkEl.href : '';
          
          // Imagen
          const imgEl = el.querySelector('img');
          const imagen = imgEl ? (imgEl.src || imgEl.dataset.src || '') : '';
          
          // Filtro condición
          const tituloLower = titulo.toLowerCase();
          const esUsado = tituloLower.includes('usado') || 
                         tituloLower.includes('reacondicionado');
          
          if (cond === 'nuevo' && esUsado) return;
          if (cond === 'usado' && !esUsado) return;
          
          if (precio > 0 && link) {
            products.push({
              titulo,
              precio,
              precioOriginal: precio,
              descuento: 0,
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
      
      if (items.length > 0) {
        console.log(`  [MercadoLibre] Selector funcional: ${selector}`);
        break;
      }
    }
    
    console.log(`  [MercadoLibre] ${items.length} productos encontrados`);
    
    await page.close();
    return items;
    
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
