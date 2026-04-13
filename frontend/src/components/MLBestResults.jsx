import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import Loader from './Loader'

const API_URL = import.meta.env.VITE_API_URL || ''

/**
 * Componente que muestra SOLO 2 resultados de ML:
 * 1. El más barato internacional
 * 2. El más barato nacional
 */
export default function MLBestResults({ query, condicion = 'nuevo' }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!query) return

    const fetchData = async () => {
      setLoading(true)
      setError('')
      
      try {
        const res = await axios.get(`${API_URL}/api/ml-best`, {
          params: { q: query, condicion },
          timeout: 30000,
        })
        setResult(res.data)
      } catch (err) {
        setError(err.response?.data?.error || 'Error al buscar')
      }
      
      setLoading(false)
    }

    fetchData()
  }, [query, condicion])

  if (loading) return <Loader />
  if (error) return <div className="text-red-400 text-center py-4">{error}</div>
  if (!result) return null

  const { internacional, nacional } = result

  // Si no hay ninguno
  if (!internacional && !nacional) {
    return (
      <div className="text-center py-8 text-white/60">
        No se encontraron productos en MercadoLibre
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white mb-4">Mejores opciones en MercadoLibre</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Internacional */}
        {internacional && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🌍</span>
              <span className="text-red-300 font-bold">Compra Internacional</span>
            </div>
            
            <img 
              src={internacional.imagen || '/placeholder.png'} 
              alt={internacional.titulo}
              className="w-full h-40 object-contain bg-white/5 rounded-lg mb-3"
            />
            
            <p className="text-white text-sm line-clamp-2 mb-2">{internacional.titulo}</p>
            
            <div className="text-2xl font-bold text-white mb-1">
              ${internacional.precio.toLocaleString('es-AR')}
            </div>
            
            <p className="text-red-300 text-xs mb-3">
              ⚠️ Puede tener demoras en la entrega
            </p>
            
            <a
              href={internacional.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 bg-red-500 hover:bg-red-400 text-white text-center rounded-lg font-semibold transition-colors"
            >
              Ver en MercadoLibre
            </a>
          </div>
        )}

        {/* Nacional */}
        {nacional && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🇦🇷</span>
              <span className="text-green-300 font-bold">Compra Nacional</span>
            </div>
            
            <img 
              src={nacional.imagen || '/placeholder.png'} 
              alt={nacional.titulo}
              className="w-full h-40 object-contain bg-white/5 rounded-lg mb-3"
            />
            
            <p className="text-white text-sm line-clamp-2 mb-2">{nacional.titulo}</p>
            
            <div className="text-2xl font-bold text-white mb-1">
              ${nacional.precio.toLocaleString('es-AR')}
            </div>
            
            <p className="text-green-300 text-xs mb-3">
              ✓ Entrega más rápida, garantía local
            </p>
            
            <a
              href={nacional.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 bg-green-500 hover:bg-green-400 text-white text-center rounded-lg font-semibold transition-colors"
            >
              Ver en MercadoLibre
            </a>
          </div>
        )}
      </div>

      {/* Comparación */}
      {internacional && nacional && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg text-center">
          <p className="text-white/80 text-sm">
            {internacional.precio < nacional.precio ? (
              <>
                El internacional es <span className="text-green-400 font-bold">${(nacional.precio - internacional.precio).toLocaleString('es-AR')} más barato</span>,
                {' '}pero puede demorar más
              </>
            ) : (
              <>
                El nacional es <span className="text-green-400 font-bold">${(internacional.precio - nacional.precio).toLocaleString('es-AR')} más barato</span>
                {' '}y llega más rápido
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
