const ML_CATEGORIES = {
  electronica: 'MLA1000',
  celulares: 'MLA1051',
  computacion: 'MLA1648',
  tv_audio: 'MLA1001',
  electrodomesticos: 'MLA1574',
  herramientas: 'MLA1459',
  hogar: 'MLA9937',
  autos: 'MLA1743',
};

function detectCategory(query) {
  const q = query.toLowerCase();
  if (/celular|iphone|samsung|motorola|xiaomi/.test(q)) return 'celulares';
  if (/notebook|laptop|pc|computadora|monitor/.test(q)) return 'computacion';
  if (/tv|televisor|smart tv|led|oled|audio/.test(q)) return 'tv_audio';
  if (/heladera|freezer|lavarropa|microondas|cocina/.test(q)) return 'electrodomesticos';
  if (/taladro|herramienta|atornillador/.test(q)) return 'herramientas';
  if (/mueble|silla|mesa|cama|colchon/.test(q)) return 'hogar';
  if (/auto|moto|neumatico|cubierta/.test(q)) return 'autos';
  return null;
}

// Stopwords que se ignoran en el scoring
const STOPWORDS = new Set([
  'de','la','el','en','a','un','una','los','las','del','por','para','con','sin',
  'que','mas','más','muy','como','donde','cuando','mejor','bueno','buena',
]);

// Patrones de exclusión - productos que NO son el producto buscado
const EXCLUSION_PATTERNS = [
  /\b(repuesto|repuestos|pieza|piezas|modulo|módulo)\b/i,
  /\b(accesorio|accesorios|funda|fundas|protector|vidrio templado|mica|glass)\b/i,
  /\b(cable|cargador|adaptador|convertidor|boquilla)\b/i,
  /\b(servicio|instalaci[oó]n|reparaci[oó]n|mantenimiento|diagnóstico|diagnostico)\b/i,
  /\b(motor para|compresor para|plaqueta para|termostato para|filtro para)\b/i,
  /\b(junta para|burlete para|bisagra para|estante para|control remoto para)\b/i,
  /\b(chuck|mandril|cabezal|interruptor|cepillo|carbon|carbón)\b/i,
  /\b(flex|display|bateria|batería|pin de carga)\b/i,
];

function isExcluded(titulo) {
  const t = titulo.toLowerCase();
  return EXCLUSION_PATTERNS.some(p => p.test(t));
}

function isDirectUrl(url) {
  if (!url) return false;
  if (url.includes('listado.mercadolibre')) return false;
  if (url.includes('/search?') || url.includes('/busca?')) return false;
  if (url.includes('/categoria/')) return false;
  return true;
}

/**
 * Scoring de relevancia por palabras.
 * - Anchor: primera palabra de la query debe matchear el título
 * - Penaliza modelo distinto (ej. A16 pedido vs A06 en título)
 * - Ordering: relevancia antes que precio (evita groceries baratos arriba)
 */
function tokenizeQuery(q) {
  return q.toLowerCase().split(/\s+/).filter(w => w.length >= 2 && !STOPWORDS.has(w));
}

function tokenMatchesTitle(tituloLower, word) {
  if (tituloLower.includes(word)) return true;
  const num = word.match(/^(\d+)(gb|g|tb)?$/i);
  if (num) {
    const n = num[1];
    if (tituloLower.includes(n + 'gb') || tituloLower.includes(n + ' gb')) return true;
    if (tituloLower.includes(' ' + n + ' ') || tituloLower.includes(' ' + n + 'gb')) return true;
  }
  return false;
}

function scoreProduct(titulo, query) {
  if (!titulo || !query) return 0;

  const tituloLower = titulo.toLowerCase();
  const words = tokenizeQuery(query);
  if (words.length === 0) return 0;

  // Anchor: primera palabra sustantiva debe aparecer (marca o término clave)
  if (!tokenMatchesTitle(tituloLower, words[0])) return 0;

  let score = 0;
  let matched = 0;

  words.forEach((word, index) => {
    const isNumeric = /^\d+$/.test(word);
    const weight = index === 0 ? words.length * 3 : words.length - index;

    if (tokenMatchesTitle(tituloLower, word)) {
      score += weight;
      if (isNumeric) score += 12; // Bonus numérico
      matched++;
    } else {
      if (isNumeric) score -= 8; // Penalización por número faltante
    }
  });

  // Bonus por palabras consecutivas en el título
  for (let i = 0; i < words.length - 1; i++) {
    const pair = words[i] + ' ' + words[i + 1];
    if (tituloLower.includes(pair)) {
      score += 5;
    }
  }

  // Penalizar fuerte si la búsqueda pide un modelo (A16, S24, etc.) y el título tiene otro modelo Galaxy
  const modelToken = words.find(w => /^a\d{1,2}$/i.test(w) || /^s\d{1,2}$/i.test(w) || /^m\d{1,2}$/i.test(w));
  if (modelToken) {
    const want = modelToken.toLowerCase();
    const otherModels = tituloLower.match(/\b(a\d{1,2}|s\d{1,2}|m\d{1,2})\b/gi) || [];
    const hasWanted = otherModels.some(m => m.toLowerCase() === want);
    if (otherModels.length > 0 && !hasWanted) {
      score = Math.max(0, Math.round(score * 0.35));
    }
  }

  // Match ratio: penalizar coincidencias parciales
  const matchRatio = matched / words.length;
  score = Math.round(score * matchRatio);

  // Compatibilidad de red: si la query pide LTE/4G, penalizar fuerte resultados 5G.
  const q = query.toLowerCase();
  const wants4G = /\blte\b|\b4g\b/.test(q);
  const wants5G = /\b5g\b/.test(q);
  const has4G = /\blte\b|\b4g\b/.test(tituloLower);
  const has5G = /\b5g\b/.test(tituloLower);
  if (wants4G && has5G && !has4G) {
    score = Math.max(0, Math.round(score * 0.15));
  }
  if (wants5G && has4G && !has5G) {
    score = Math.max(0, Math.round(score * 0.15));
  }

  return Math.max(score, 0);
}

function normalizeAndRank(allProducts, maxResults = 10, query = '', condicion = 'nuevo') {
  if (!allProducts || allProducts.length === 0) return [];

  // 1. Filtrar por condición
  let pool = allProducts;
  if (condicion === 'nuevo') {
    pool = allProducts.filter(p => {
      const t = (p.titulo || '').toLowerCase();
      return !t.includes('usado') && !t.includes('usada') && !t.includes('reacondicionado');
    });
  } else if (condicion === 'usado') {
    pool = allProducts.filter(p => {
      const t = (p.titulo || '').toLowerCase();
      return t.includes('usado') || t.includes('usada') || t.includes('reacondicionado');
    });
  }

  // 2. Filtrar exclusiones (repuestos, accesorios, servicios)
  pool = pool.filter(p => !isExcluded(p.titulo || ''));

  // 3. Filtrar URLs de listados
  pool = pool.filter(p => isDirectUrl(p.url));

  // 4. Calcular score de relevancia
  pool = pool.map(p => ({
    ...p,
    _score: scoreProduct(p.titulo, query),
  }));

  // 5. Solo productos con relevancia > 0 (nunca mezclar basura tipo Carrefour con score 0)
  let relevant = pool.filter(p => p._score > 0);

  // Celulares: exigir al menos marca o modelo fuerte para no pasar falsos positivos
  const catKey = detectCategory(query);
  if (catKey === 'celulares' && relevant.length > 0) {
    const qLower = query.toLowerCase();
    const brandHits = [/samsung|galaxy|motorola|iphone|apple|xiaomi|redmi|realme|oppo|honor/i];
    relevant = relevant.filter(p => {
      const t = (p.titulo || '').toLowerCase();
      if (brandHits.some(re => re.test(qLower)) && brandHits.some(re => re.test(t))) return true;
      if (/\bcelular\b/i.test(t) || /\bsmartphone\b/i.test(t)) return true;
      return false;
    });
  }

  // 6. Ordenar por relevancia primero; entre scores parecidos, precio ascendente
  relevant.sort((a, b) => {
    const scoreDiff = b._score - a._score;
    if (Math.abs(scoreDiff) >= 3) return scoreDiff;
    if (a.precio !== b.precio) return a.precio - b.precio;
    return scoreDiff;
  });

  // 7. Deduplicar: mantener solo el MÁS BARATO de cada producto similar
  // También eliminar productos de ML con mismo precio exacto
  const deduped = [];
  const seenTitles = new Map();
  const seenMLPrices = new Set();

  for (const p of relevant) {
    // Normalizar título para comparar similitud
    const tituloNorm = (p.titulo || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Si es MercadoLibre, no permitir dos productos con el mismo precio
    if (p.tienda === 'MercadoLibre') {
      if (seenMLPrices.has(p.precio)) continue;
      seenMLPrices.add(p.precio);
    }
    
    // Verificar si ya existe un producto muy similar
    let isDuplicate = false;
    for (const [existingTitle, idx] of seenTitles) {
      const words1 = new Set(tituloNorm.split(' '));
      const words2 = new Set(existingTitle.split(' '));
      const intersection = [...words1].filter(w => words2.has(w));
      const similarity = intersection.length / Math.max(words1.size, words2.size);
      
      if (similarity > 0.75) {
        if (p.precio < deduped[idx].precio) {
          deduped[idx] = p;
        }
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      seenTitles.set(tituloNorm, deduped.length);
      deduped.push(p);
    }
  }

  // Orden final estricto por precio ascendente (barato primero).
  deduped.sort((a, b) => a.precio - b.precio);

  return deduped.slice(0, maxResults);
}

module.exports = { normalizeAndRank, detectCategory, ML_CATEGORIES };
