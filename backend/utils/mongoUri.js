/**
 * Railway suele exponer MONGO_URL; otros entornos usan MONGODB_URI.
 */
function getMongoUri() {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    ''
  ).trim();
}

/**
 * Oculta credenciales en mongodb:// y mongodb+srv:// para logs seguros.
 */
function maskMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '[URI_OCULTA]';
  try {
    let masked = uri.replace(
      /^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/i,
      '$1$2:***@'
    );
    if (masked === uri) {
      masked = uri.replace(/^(mongodb(?:\+srv)?:\/\/)([^/?]+@)/i, '$1[URI_OCULTA]');
    }
    return masked.length > 120 ? `${masked.slice(0, 120)}…` : masked;
  } catch (_) {
    return '[URI_OCULTA]';
  }
}

module.exports = { getMongoUri, maskMongoUri };
