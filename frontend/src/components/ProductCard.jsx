import { useEffect } from 'react'
import { trackClick, trackImpression } from '../services/analytics'
import TaxBadge from './TaxBadge'

function getRankBadge(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export default function ProductCard({ product, rank, query, renderTime }) {
  useEffect(() => {
    if (query && product) {
      trackImpression(query, product, rank)
    }
  }, [product, query, rank])

  const handleClick = () => {
    const timeToClick = renderTime ? Date.now() - renderTime : null
    if (query && product) {
      trackClick(query, product, rank, timeToClick)
    }
  }

  if (!product) return null

  const imageUrl = product.imagen || '/placeholder.png'
  const price = Number(product.precio) || 0
  const hasDiscount = Number(product.descuento) > 0

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-sm font-semibold text-orange-300">{getRankBadge(rank)}</span>
        {hasDiscount && (
          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
            {Math.round(product.descuento)}% OFF
          </span>
        )}
      </div>

      <img
        src={imageUrl}
        alt={product.titulo || 'Producto'}
        className="w-full h-40 object-contain rounded-lg bg-black/20 mb-3"
        loading="lazy"
      />

      <h3 className="text-white font-medium text-sm line-clamp-2 min-h-[2.5rem] mb-2">
        {product.titulo || 'Producto sin título'}
      </h3>

      <p className="text-white/60 text-xs mb-1">{product.tienda || 'Tienda desconocida'}</p>
      <p className="text-xl font-bold text-white mb-3">${price.toLocaleString('es-AR')}</p>

      <TaxBadge product={product} />

      <a
        href={product.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="mt-auto inline-flex justify-center items-center w-full rounded-lg bg-orange-500 hover:bg-orange-400 transition-colors text-white font-semibold py-2.5"
      >
        Ver oferta
      </a>
    </article>
  )
}