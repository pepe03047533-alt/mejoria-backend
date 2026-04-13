import { trackClick } from '../services/analytics'
import TaxBadge from './TaxBadge'

export default function ProductCard({ product, rank, query, renderTime }) {
  const rankColors = {
    1: { badge: 'bg-yellow-400 text-yellow-900', border: 'border-yellow-400/40', glow: 'shadow-yellow-400/20', label: '🥇 Mejor precio' },
    2: { badge: 'bg-orange-400 text-orange-900', border: 'border-orange-400/40', glow: 'shadow-orange-400/20', label: '🥈 Excelente oferta' },
    3: { badge: 'bg-cyan-400 text-cyan-900', border: 'border-cyan-400/40', glow: 'shadow-cyan-400/20', label: '🥉 Gran opción' },
    4: { badge: 'bg-purple-400 text-purple-900', border: 'border-purple-400/30', glow: 'shadow-purple-400/10', label: '⭐ Destacado' },
    5: { badge: 'bg-blue-400 text-blue-900', border: 'border-blue-400/30', glow: 'shadow-blue-400/10', label: '✨ Recomendado' },
    6: { badge: 'bg-green-400 text-green-900', border: 'border-green-400/30', glow: 'shadow-green-400/10', label: '💚 Buena opción' },
  }

  const colors = rankColors[rank] || rankColors[6]

  const formatPrice = (price) => {
    if (!price) return 'Consultar'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const esInternacional = product.alcance === 'internacional'
  const tieneInfoImpuestos = product.precioInfo && product.precioInfo.desglose

  // Determinar badges de calidad de la oferta
  const esMejorOferta = product.scoreOferta >= 50
  const tieneEnvioGratis = product.envioGratis || product.esFull
  const tieneCuotas = product.cuotasSinInteres
  const esOficial = product.esOficial

  // Handler para el click
  const handleClick = () => {
    if (query && renderTime) {
      const timeToClick = Date.now() - renderTime
      trackClick(query, product, rank, timeToClick)
    }
  }

  return (
    <div className={`relative flex flex-col bg-white/5 backdrop-blur-md rounded-2xl border ${colors.border} shadow-2xl ${colors.glow} hover:scale-105 hover:bg-white/10 transition-all duration-300 overflow-hidden`}>
      {/* Rank badge */}
      <div className={`absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
        {colors.label}
      </div>

      {/* Badge de mejor oferta */}
      {esMejorOferta && (
        <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
          🔥 SUPER OFERTA
        </div>
      )}

      {/* Badge de descuento */}
      {product.descuento > 0 && !esMejorOferta && !esInternacional && (
        <div className="absolute top-3 right-3 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
          -{product.descuento}% OFF
        </div>
      )}

      {/* Image */}
      <div className="h-52 flex items-center justify-center bg-white/5 p-4">
        {product.imagen ? (
          <img
            src={product.imagen}
            alt={product.titulo}
            className="max-h-44 max-w-full object-contain"
            onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23334" width="100" height="100"/><text y="50%" x="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="30">📦</text></svg>' }}
          />
        ) : (
          <div className="text-6xl opacity-50">📦</div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Store tag + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">{product.tienda}</span>
          {product.alcance === 'regional' && (
            <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">🇦🇷</span>
          )}
          {esOficial && (
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">✓ OFICIAL</span>
          )}
          {product.esFull && (
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">⚡ FULL</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-white font-semibold text-sm leading-snug line-clamp-3">{product.titulo}</h3>

        {/* Beneficios */}
        <div className="flex flex-wrap gap-2">
          {tieneEnvioGratis && (
            <span className="text-[10px] bg-green-500/20 text-green-300 px-2 py-1 rounded-full">🚚 Envío gratis</span>
          )}
          {tieneCuotas && (
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">💳 Sin interés</span>
          )}
          {product.reputacion === 'platino' && (
            <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">⭐ Platino</span>
          )}
        </div>

        {/* Price */}
        <div className="mt-auto">
          {product.descuento > 0 && (
            <p className="text-white/40 text-xs line-through">{formatPrice(product.precioOriginal)}</p>
          )}
          <p className="text-2xl font-bold text-white">
            {product.precioDesde && <span className="text-sm font-normal text-white/60 mr-1">desde</span>}
            {formatPrice(product.precio)}
          </p>
          
          {product.condicion && (
            <span className="text-xs text-white/50">{product.condicion}</span>
          )}
        </div>

        {/* CTA */}
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="mt-2 w-full text-center bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-orange-500/30 hover:shadow-orange-400/50 block"
        >
          Ver en {product.tienda} →
        </a>

        {/* Análisis de impuestos (capa adicional) */}
        <TaxBadge product={product} />

        {/* Disclaimer de precio */}
        <div className="mt-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-yellow-200/80 text-center text-[10px] leading-tight">
            ⚠️ Precio puede variar. Verificar en {product.tienda}
          </p>
        </div>
      </div>
    </div>
  )
}
