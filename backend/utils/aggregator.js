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
 * - Primera palabra = anchor obligatorio (si no está → score 0)
 * - Tokens numéricos tienen bonus especial
 * - Palabras consecutivas dan bonus
 * - Match ratio penaliza coincidencias parciales
 */
function scoreProduct(titulo, query) {
  if (!titulo || !query) return 0;

  const tituloLower = titulo.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2 && !STOPWORDS.has(w));
  if (words.length === 0) return 0;

  // Anchor: primera palabra DEBE estar en el título
  if (!tituloLower.includes(words[0])) return 0;

  let score = 0;
  let matched = 0;

  words.forEach((word, index) => {
    const isNumeric = /^\d+$/.test(word);
    const weight = index === 0 ? words.length * 3 : words.length - index;

    if (tituloLower.includes(word)) {
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

  // Match ratio: penalizar coincidencias parciales
  const matchRatio = matched / words.length;
  score = Math.round(score * matchRatio);

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

  // 5. Filtrar productos con score 0 (no relevantes)
  let relevant = pool.filter(p => p._score > 0);

  // Fallback: si menos de 3 resultados, relajar
  if (relevant.length < 3) {
    relevant = pool.filter(p => p._score >= 0);
  }

  // 6. Ordenar por PRECIO ASC primero, luego por SCORE DESC
  // Esto garantiza que entre productos relevantes, el más barato gana
  relevant.sort((a, b) => {
    // Si la diferencia de score es muy grande (>10), priorizar relevancia
    const scoreDiff = b._score - a._score;
    if (Math.abs(scoreDiff) > 10) return scoreDiff;
    // Si scores similares, priorizar precio más bajo
    if (a.precio !== b.precio) return a.precio - b.precio;
    // Último recurso: score
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

  // 8. Re-ordenar final por precio ASC (más barato primero)
  deduped.sort((a, b) => a.precio - b.precio);

  return deduped.slice(0, maxResults);
}

module.exports = { normalizeAndRank, detectCategory, ML_CATEGORIES };
