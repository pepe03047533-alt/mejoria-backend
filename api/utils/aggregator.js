const { extractWantedTvInches, productMatchesWantedInches } = require('./tvScreenMatch');

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
  if (/hidrolavadora|hidro[\s-]*lavadora/.test(q)) return 'herramientas';
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

// Marcas conocidas para el filtro obligatorio de marca
const KNOWN_BRANDS = new Set([
  'gadnic','samsung','lg','sony','philips','motorola','xiaomi','apple','iphone',
  'nokia','huawei','honor','oppo','realme','redmi','tcl','hisense','noblex',
  'bgh','sanyo','hitachi','panasonic','electrolux','whirlpool','drean','gafa',
  'patrick','longvie','aurora','stihl','karcher','bosch','makita','dewalt',
  'stanley','einhell','gamma','lusqtoff','rexon','lenovo','hp','dell','asus',
  'acer','msi','logitech','hyperx','razer','corsair','jbl','marshall','bose',
  'oster','atma','peabody','liliana','philco','kent','midea','carrier',
  'surrey','tophouse','daewoo','ranser','protalia','black+decker','candy',
  'kölher','sensei','punktal','kanji','noga','bangho','exo','positivo',
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

/** Títulos que empiezan por pieza/accesorio típico (búsqueda de hidrolavadora completa). */
const HIDROLAVADORA_PART_LEAD = /^\s*(kit|juego|acople|manguera|pistola|presostato|crapodina|repuesto|repuestos|retenes?|rodamiento|sellos|boquilla|pico|juntas?|filtro|flexible|lanza|enrollador|burlete|tubo|conector|adaptador|terminal|válvulas?|valvulas?|motor|bobina|carb[oó]n|esmeril|esmeriles|o-?ring|oring)\b/i;

function normalizeTitleForLead(titulo) {
  return (titulo || '')
    .replace(/^\uFEFF/, '')
    .replace(/^[\s\u00A0]+/, '')
    .trim();
}

function normalizeSpecText(s) {
  return (s || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Números técnicos extraídos de la query (bar, psi, watts/w).
 * @returns {Array<{ value: string, unit: 'bar' | 'psi' | 'watts' }>}
 */
function extractSpecs(query) {
  if (!query || typeof query !== 'string') return [];
  const raw = query.toLowerCase().replace(/,/g, '.');
  const out = [];
  const seen = new Set();

  const push = (numStr, unit) => {
    const value = String(numStr).replace(/^0+(\d)/, '$1');
    const key = `${value}|${unit}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ value, unit });
  };

  const reBar = /\b(\d+)\s*bar\b/gi;
  let m;
  while ((m = reBar.exec(raw)) !== null) push(m[1], 'bar');

  const rePsi = /\b(\d+)\s*psi\b/gi;
  while ((m = rePsi.exec(raw)) !== null) push(m[1], 'psi');

  const reWatts = /\b(\d+)\s*(watts?|w|vatios)\b/gi;
  while ((m = reWatts.exec(raw)) !== null) push(m[1], 'watts');

  return out;
}

function titleMentionsSpecNumber(tituloNorm, value) {
  if (!value || !tituloNorm) return false;
  if (value.length >= 4) return tituloNorm.includes(value);
  return new RegExp(`(^|[^0-9])${value}([^0-9]|$)`).test(tituloNorm);
}

function isHidrolavadoraQuery(query) {
  return /\bhidrolavadora\b|\bhidro[\s-]*lavadora\b/i.test(query || '');
}

/** Accesorios que no pueden abrir el título si la búsqueda es hidrolavadora. */
const HIDROLAVADORA_IDENTITY_BLOCKLIST =
  /^(manguera|crapodina|ret[eé]n|retenes?|acople|v[aá]lvulas?|valvulas?|puntero|lanza|pistola)\b/i;

/**
 * Identidad estricta: el título debe empezar con "hidrolavadora" (equipo), no con accesorio.
 */
function passesHidrolavadoraPrincipalNoun(titulo, query) {
  if (!isHidrolavadoraQuery(query)) return true;
  const head = normalizeTitleForLead(titulo);
  const headLower = head.toLowerCase();
  if (HIDROLAVADORA_IDENTITY_BLOCKLIST.test(headLower)) return false;
  return /^hidrolavadora\b|^hidro[\s-]*lavadora\b/i.test(headLower);
}

/** Predicados de coincidencia por specs extraídos de la query. */
function extractHidrolavadoraTechnicalMeasures(query) {
  if (!isHidrolavadoraQuery(query)) return [];
  return extractSpecs(query).map((entry) => {
    const v = entry.value;
    return (t) => titleMentionsSpecNumber(t, v);
  });
}

function titleMatchesAnyTechnicalMeasure(titulo, measures) {
  const t = normalizeSpecText(titulo);
  return measures.some((fn) => fn(t));
}

/**
 * Identidad estricta + refinamiento por specs: si hay medidas en la query, priorizar coincidencias;
 * si ninguna coincide, devolver solo el pool que pasó identidad.
 */
function applyHidrolavadoraIdentityAndSpecRefinement(pool, query) {
  if (!isHidrolavadoraQuery(query) || !pool.length) return pool;

  const identity = pool.filter((p) => passesHidrolavadoraPrincipalNoun(p.titulo, query));
  if (identity.length === 0) return pool;

  const measures = extractHidrolavadoraTechnicalMeasures(query);
  if (measures.length === 0) return identity;

  const specPreferred = identity.filter((p) => titleMatchesAnyTechnicalMeasure(p.titulo, measures));
  return specPreferred.length > 0 ? specPreferred : identity;
}

function isExcluded(titulo, query = '') {
  const t = (titulo || '').toLowerCase();
  if (EXCLUSION_PATTERNS.some(p => p.test(t))) return true;
  if (/\bhidrolavadora\b|\bhidro[\s-]*lavadora\b/i.test(query) && HIDROLAVADORA_PART_LEAD.test(normalizeTitleForLead(titulo))) return true;
  return false;
}

function isDirectUrl(url) {
  if (!url) return false;
  if (url.includes('listado.mercadolibre')) return false;
  if (url.includes('/search?') || url.includes('/busca?')) return false;
  if (url.includes('/categoria/')) return false;
  return true;
}

function tvQueryWantsHighResolution(query) {
  const q = (query || '').toLowerCase();
  return /\b4k\b|\buhd\b|\b2160p?\b|\b3840\b|\b8k\b|\bqled\b|\boled\b|\bneo\s*qled\b/i.test(q);
}

function tvListingLooksEntryLevelOnly(titulo, url) {
  const haystack = `${titulo || ''} ${url || ''}`.toLowerCase();
  if (/\b4k\b|\buhd\b|\b2160\b|\b3840\b|\b8k\b|\bqled\b|\boled\b|\bqned\b/i.test(haystack)) return false;
  return /\bfull\s*-?hd\b|\bfullhd\b|\bfull-hd\b|\bhd\s*ready\b|\b720p\b|\b720\s*p\b|\b768p\b|\b1366\s*w\b/i.test(haystack);
}

/** Evita que una búsqueda de TV 4K/QLED muestre variantes Full HD más baratas (mismo modelo distinta resolución). */
function isTvResolutionConflict(product, query) {
  if (!tvQueryWantsHighResolution(query)) return false;
  const q = (query || '').toLowerCase();
  const tvContext = detectCategory(query) === 'tv_audio' || /\b(smart\s*)?tv\b|\btelevisor\b/i.test(q);
  if (!tvContext) return false;
  return tvListingLooksEntryLevelOnly(product.titulo, product.url);
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

  const w = word.toLowerCase();

  // Volumen / contenido: 473cc, 473ml, 473 ml, 1l, etc.
  const vol = w.match(/^(\d+)(cc|ml|l|lt|litros?)?$/i) || w.match(/^(\d+)\s*(cc|ml|l|lt|litros?)$/i);
  if (vol) {
    const n = vol[1];
    if (new RegExp(`\\b${n}\\s*(?:cc|ml|mililitros?|l|lt|litros?)\\b`, 'i').test(tituloLower)) return true;
    if (tituloLower.includes(`${n}cc`) || tituloLower.includes(`${n} ml`) || tituloLower.includes(`${n}ml`)) return true;
  }

  const tvModel = w.match(/^(\d{2})(q[0-9][a-z0-9]*)$/i);
  if (tvModel) {
    const inch = tvModel[1];
    const tail = tvModel[2].toLowerCase();
    if (tituloLower.includes(tail) && new RegExp(`(^|[^0-9])${inch}([^0-9]|$)`).test(tituloLower)) return true;
    const compact = tituloLower.replace(/\s+/g, '');
    if (compact.includes(inch + tail)) return true;
  }

  const num = word.match(/^(\d+)(gb|g|tb)?$/i);
  if (num) {
    const n = num[1];
    if (tituloLower.includes(n + 'gb') || tituloLower.includes(n + ' gb')) return true;
    if (tituloLower.includes(' ' + n + ' ') || tituloLower.includes(' ' + n + 'gb')) return true;
  }
  return false;
}

/**
 * Detecta marcas conocidas presentes en la query del usuario.
 * @returns {string[]} tokens de marca encontrados (ya en lowercase)
 */
function detectQueryBrands(query) {
  return tokenizeQuery(query).filter(t => KNOWN_BRANDS.has(t));
}

/**
 * Match ratio puro: fracción de tokens de la query presentes en el título (0..1).
 * Se usa para dar prioridad absoluta a productos con 100% de coincidencia.
 */
function computeMatchRatio(titulo, query) {
  if (!titulo || !query) return 0;
  const tituloLower = titulo.toLowerCase();
  const words = tokenizeQuery(query);
  if (words.length === 0) return 0;
  let matched = 0;
  for (const word of words) {
    if (tokenMatchesTitle(tituloLower, word)) matched++;
  }
  return matched / words.length;
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

  score = applyHidrolavadoraSpecScorePenalty(score, titulo, query);

  return Math.max(score, 0);
}

/**
 * Si la query de hidrolavadora pide números (bar/psi/watts) y el título no menciona ninguno, penalizar fuerte.
 */
function applyHidrolavadoraSpecScorePenalty(score, titulo, query) {
  if (!isHidrolavadoraQuery(query) || score <= 0) return score;
  const specs = extractSpecs(query);
  if (specs.length === 0) return score;

  const t = normalizeSpecText(titulo);
  const nums = [...new Set(specs.map((s) => s.value))];
  const mentionsAny = nums.some((n) => titleMentionsSpecNumber(t, n));
  if (mentionsAny) return score;

  return Math.max(0, Math.round(score * 0.07));
}

function sortByPriceMercadoLibreTiebreak(a, b) {
  const pa = Number(a.precio) || 0;
  const pb = Number(b.precio) || 0;
  if (pa !== pb) return pa - pb;
  const storeRank = (p) => (p.tienda === 'MercadoLibre' ? 0 : 1);
  return storeRank(a) - storeRank(b);
}

/** Cantidad en pack (x6, pack x6, 6 unidades). */
function extractPackQuantity(titulo) {
  const t = (titulo || '').toLowerCase();
  const m = t.match(/\bpack\s*x\s*(\d+)\b|\bx\s*(\d+)\s*(?:unidades|u\.?|latas|unid)\b|\b(\d+)\s*u\b/);
  if (!m) return 1;
  const n = parseInt(m[1] || m[2] || m[3], 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/** Precio comparable: total o por unidad si es pack. */
function getComparablePrice(p) {
  const price = Number(p.precio) || 0;
  if (price <= 0) return Infinity;
  const qty = extractPackQuantity(p.titulo);
  return price / qty;
}

function sortByComparablePrice(a, b) {
  const pa = getComparablePrice(a);
  const pb = getComparablePrice(b);
  if (pa !== pb) return pa - pb;
  return sortByPriceMercadoLibreTiebreak(a, b);
}

/** Una fila por publicación ML; no fundir títulos casi iguales de vendedores distintos. */
function getListingDedupeKey(p) {
  const url = ((p.url || '') + '').split('#')[0].split('?')[0].trim();
  if (/mercadolibre\.com\./i.test(url)) {
    const up = url.match(/\/(MLAU\d+)\b/i);
    if (up) return `meli:${up[1]}`;
    const pc = url.match(/\/p\/(MLA\d+)\b/i);
    if (pc) return `meli:${pc[1]}`;
    const art = url.match(/\b(MLA-\d+-\d{4,})\b/i);
    if (art) return `meli:${art[1]}`;
  }
  if (url) return `url:${url}`;
  return `t:${(p.titulo || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120)}`;
}

/** Ajusta precio mostrado si el listado está por encima de oferta o de referencia. */
function ensurePayablePrecio(p) {
  let pay = Number(p.precio) || 0;
  const sale = Number(p.precioOferta ?? NaN);
  const orig = Number(p.precioOriginal) || 0;
  if (Number.isFinite(sale) && sale > 0 && pay > sale) pay = sale;
  else if (orig > 0 && pay > orig) pay = orig;
  if (!(pay > 0)) pay = Number(p.precio) || orig;
  const out = { ...p, precio: Math.round(pay) };
  delete out.precioOferta;
  const po = Number(out.precioOriginal) || 0;
  if (po > out.precio && po > 0) {
    out.descuento = Math.round(((po - out.precio) / po) * 100);
  }
  return out;
}

function normalizeAndRank(allProducts, maxResults = 10, query = '', condicion = 'nuevo', options = {}) {
  const { strictLowestPrice = false } = options;
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
  pool = pool.filter(p => !isExcluded(p.titulo || '', query));

  pool = applyHidrolavadoraIdentityAndSpecRefinement(pool, query);

  // 3. Filtrar URLs de listados
  pool = pool.filter(p => isDirectUrl(p.url));

  // TV: no mezclar variantes Full HD cuando la búsqueda pide explícitamente 4K/UHD/QLED
  pool = pool.filter(p => !isTvResolutionConflict(p, query));

  const wantedInches = extractWantedTvInches(query);
  pool = pool.filter(p => productMatchesWantedInches(p, wantedInches));

  // 4. Calcular score de relevancia + match ratio por token
  pool = pool.map(p => ({
    ...p,
    _score: scoreProduct(p.titulo, query),
    _matchRatio: computeMatchRatio(p.titulo, query),
  }));

  // 5. Solo productos con relevancia > 0 (nunca mezclar basura tipo Carrefour con score 0)
  let relevant = pool.filter(p => p._score > 0);

  // 5b. Filtro de marca obligatorio: si la query contiene una marca conocida,
  // descartar productos cuyo título no la contenga (hard filter, sin fallback)
  const queryBrands = detectQueryBrands(query);
  if (queryBrands.length > 0) {
    relevant = relevant.filter(p => {
      const tLower = (p.titulo || '').toLowerCase();
      return queryBrands.every(brand => tLower.includes(brand));
    });
  }

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

  // 6. Orden previo a deduplicar
  if (strictLowestPrice) {
    // Menor precio (por unidad si es pack), sin priorizar match ratio parcial
    relevant.sort(sortByComparablePrice);
  } else {
    relevant.sort((a, b) => {
      const aFull = a._matchRatio >= 1 ? 1 : 0;
      const bFull = b._matchRatio >= 1 ? 1 : 0;
      if (aFull !== bFull) return bFull - aFull;
      const scoreDiff = b._score - a._score;
      if (Math.abs(scoreDiff) >= 3) return scoreDiff;
      if (a.precio !== b.precio) return a.precio - b.precio;
      return scoreDiff;
    });
  }

  // 7. Deduplicar por publicación (ML: MLAU… /p/MLA…); nunca por similitud de título (varias ofertas del mismo equipo).
  const byDedupeKey = new Map();
  for (const p of relevant) {
    const k = getListingDedupeKey(p);
    const prev = byDedupeKey.get(k);
    const price = Number(p.precio) || 0;
    const prevPrice = Number(prev?.precio) || 0;
    if (!prev || price < prevPrice) {
      byDedupeKey.set(k, p);
    }
  }
  const deduped = [...byDedupeKey.values()].map(ensurePayablePrecio);

  // Orden final
  if (strictLowestPrice) {
    deduped.sort(sortByComparablePrice);
  } else {
    deduped.sort((a, b) => {
      const aFull = (a._matchRatio >= 1) ? 1 : 0;
      const bFull = (b._matchRatio >= 1) ? 1 : 0;
      if (aFull !== bFull) return bFull - aFull;
      return (Number(a.precio) || 0) - (Number(b.precio) || 0);
    });
  }

  return deduped.slice(0, maxResults);
}

module.exports = {
  normalizeAndRank,
  detectCategory,
  ML_CATEGORIES,
  extractSpecs,
  isHidrolavadoraQuery,
  passesHidrolavadoraPrincipalNoun,
};
