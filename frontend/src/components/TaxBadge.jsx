import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function TaxBadge({ product }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!product?.titulo || !product?.precio) return

    const analyze = async () => {
      try {
        const res = await axios.post(`${API_URL}/api/analyze`, {
          titulo: product.titulo,
          precio: product.precio,
          url: product.url,
          tienda: product.tienda,
          deep: true,
        })
        setAnalysis(res.data)
      } catch (err) {}
      setLoading(false)
    }

    analyze()
  }, [product?.url])

  if (loading || !analysis) return null
  if (analysis.clasificacion.tipo === 'local') return null

  const { clasificacion, precioReal, insight } = analysis

  return (
    <div className="mt-3 p-3 rounded-lg border bg-red-500/20 border-red-500/40 text-red-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold text-red-300">
          {clasificacion.tipo === 'internacional' ? '🌍' : '⚠️'}{' '}
          {clasificacion.tipo === 'internacional' ? 'COMPRA INTERNACIONAL' : 'ORIGEN DUDOSO'}
        </span>
      </div>

      {precioReal && (
        <div className="text-sm space-y-1">
          <div className="flex justify-between text-xs opacity-70">
            <span>Precio base:</span>
            <span>${precioReal.precioBase.toLocaleString('es-AR')}</span>
          </div>
          <div className="flex justify-between text-xs opacity-70">
            <span>Impuestos (34.64%):</span>
            <span>${precioReal.impuestos.toLocaleString('es-AR')}</span>
          </div>

          {/* LO QUE EN REALIDAD PAGÁS - RESALTADO */}
          <div className="mt-2 p-2 rounded-lg bg-red-600/40 border border-red-400/60">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white text-sm">Lo que en realidad pagás:</span>
              <span className="font-bold text-white text-lg">
                ${precioReal.precioFinal.toLocaleString('es-AR')}
              </span>
            </div>
            <p className="text-[10px] text-red-200/80 mt-1">
              ${precioReal.precioBase.toLocaleString('es-AR')} + ${precioReal.impuestos.toLocaleString('es-AR')} de impuestos
            </p>
          </div>
        </div>
      )}

      <p className="text-xs mt-2 opacity-80 italic">{insight.recomendacion}</p>
    </div>
  )
}
