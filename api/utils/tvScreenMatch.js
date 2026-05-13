const VALID_TV_INCHES = new Set([
  24, 32, 39, 40, 42, 43, 48, 49, 50, 55, 58, 60, 65, 70, 75, 77, 82, 85, 86, 98, 100,
]);

const INCH_QUOTE_CLASS = `["\u201c\u201d\u2033\u00b4'′″]`;

function queryLooksLikeTvSearch(query) {
  const q = (query || '').toLowerCase();
  if (/\bchromecast\b|\bfire\s*tv\s*stick\b|\bapple\s*tv\b/i.test(q)) return false;
  return /\b(smart\s*)?tv\b|\btelevisor\b|\bqled\b|\boled\b|\bgoogle\s*tv\b/i.test(q);
}

/**
 * Extrae pulgadas pedidas explícitamente (p. ej. "65 pulgadas", pantalla 65, modelo 65Q6N).
 * Si hay varias medidas ambiguas sin "pulgadas", devuelve null.
 */
function extractWantedTvInches(query) {
  if (!queryLooksLikeTvSearch(query)) return null;
  const q = query.trim().toLowerCase();
  const found = collectInchesFromText(q);
  if (found.size === 0) return null;
  if (found.size === 1) return [...found][0];

  const pulg = [...q.matchAll(/\b(\d{2})\s*pulgadas?\b/gi)]
    .map((x) => parseInt(x[1], 10))
    .filter((n) => VALID_TV_INCHES.has(n));
  if (pulg.length === 1) return pulg[0];

  const pant = /\bpantalla\s+(\d{2})\b/i.exec(q);
  if (pant) {
    const n = parseInt(pant[1], 10);
    if (VALID_TV_INCHES.has(n)) return n;
  }

  return null;
}

function collectInchesFromText(text) {
  const hay = (text || '').toLowerCase();
  const found = new Set();
  let m;

  const rPulg = /\b(\d{2})\s*pulgadas?\b/gi;
  while ((m = rPulg.exec(hay)) !== null) {
    const n = parseInt(m[1], 10);
    if (VALID_TV_INCHES.has(n)) found.add(n);
  }

  const rQuot = new RegExp(`\\b(\\d{2})\\s*${INCH_QUOTE_CLASS}+\\b`, 'gi');
  while ((m = rQuot.exec(hay)) !== null) {
    const n = parseInt(m[1], 10);
    if (VALID_TV_INCHES.has(n)) found.add(n);
  }

  const rPant = /\bpantalla\s+(\d{2})\b/gi;
  while ((m = rPant.exec(hay)) !== null) {
    const n = parseInt(m[1], 10);
    if (VALID_TV_INCHES.has(n)) found.add(n);
  }

  const rModel = /\b(32|40|43|48|49|50|55|58|60|65|70|75|77|85|86|98|100)\s*[qQtTuUnNmM][0-9a-z]/i;
  m = rModel.exec(hay.replace(/\s+/g, ' '));
  if (m) found.add(parseInt(m[1], 10));

  const rLeadSize = /\b(43|48|49|50|55|58|60|65|70|75|77|85)\s+[0-9a-z]{3,}/i;
  m = rLeadSize.exec(hay);
  if (m) found.add(parseInt(m[1], 10));

  const rSlugInch = /-(\d{2})--\d{3,}/i;
  m = rSlugInch.exec(hay);
  if (m && VALID_TV_INCHES.has(parseInt(m[1], 10))) found.add(parseInt(m[1], 10));

  return found;
}

/**
 * Si la query pide N pulgadas: el producto debe contener esa medida en título/URL,
 * o no tener ninguna medida TV reconocible (se deja pasar por si el título es pobre).
 */
function productMatchesWantedInches(product, wantedInches) {
  if (wantedInches == null) return true;
  const set = collectInchesFromText(`${product.titulo || ''} ${product.url || ''}`);
  if (set.size === 0) return true;
  return set.has(wantedInches);
}

module.exports = {
  queryLooksLikeTvSearch,
  extractWantedTvInches,
  collectInchesFromText,
  productMatchesWantedInches,
};
