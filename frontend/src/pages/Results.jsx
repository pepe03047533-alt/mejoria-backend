import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { searchProducts } from '../services/api'
import { trackEvents } from '../services/analytics'
import SearchBar from '../components/SearchBar'
import ProductCard from '../components/ProductCard'
import Loader from '../components/Loader'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function Results() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const condicion = searchParams.get('condicion') || 'nuevo'

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const renderTimeRef = useRef(null)

  useEffect(() => {
    if (!query) return

    const fetchData = async () => {
      setLoading(true)
      setError('')
      setProducts([])

      try {
        const data = await searchProducts(query, condicion)
        
        let filteredProducts = data.products || []
        
        // Limitar MercadoLibre a máximo 3 resultados
        const mlProducts = filteredProducts.filter(p => p.tienda === 'MercadoLibre').slice(0, 3)
        const otherProducts = filteredProducts.filter(p => p.tienda !== 'MercadoLibre')
        let finalProducts = [...mlProducts, ...otherProducts]

        // Analizar si los ML son internacionales (batch rápido)
        if (mlProducts.length > 0) {
          try {
            const analyzeRes = await axios.post(`${API_URL}/api/analyze/batch`, {
              products: mlProducts.map(p => ({
                titulo: p.titulo,
                precio: p.precio,
                url: p.url,
                tienda: p.tienda,
              }))
            })

            const analyses = analyzeRes.data || []
            
            // Marcar productos ML con su clasificación
            const mlWithAnalysis = mlProducts.map((p, i) => ({
              ...p,
              _internacional: analyses[i]?.clasificacion?.tipo === 'internacional',
            }))

            // Verificar si TODOS los ML son internacionales
            const todosInternacionales = mlWithAnalysis.every(p => p._internacional)

            if (todosInternacionales && mlWithAnalysis.length > 0) {
              // Buscar nacionales en el resto de productos ML que no se mostraron
              const allMlProducts = filteredProducts.filter(p => p.tienda === 'MercadoLibre')
              
              // Analizar los restantes
              const restantes = allMlProducts.slice(3, 15) // Verificar hasta 12 más
              let nacionales = []

              if (restantes.length > 0) {
                try {
                  const restAnalyze = await axios.post(`${API_URL}/api/analyze/batch`, {
                    products: restantes.map(p => ({
                      titulo: p.titulo,
                      precio: p.precio,
                      url: p.url,
                      tienda: p.tienda,
                    }))
                  })
                  const restAnalyses = restAnalyze.data || []
                  
                  nacionales = restantes.filter((p, i) => 
                    restAnalyses[i]?.clasificacion?.tipo === 'local'
                  ).slice(0, 2) // Máximo 2 nacionales
                  
                  // Marcar como alternativa nacional
                  nacionales = nacionales.map(p => ({
                    ...p,
                    _alternativaNacional: true,
                  }))
                } catch (err) {}
              }

              finalProducts = [...mlWithAnalysis, ...nacionales, ...otherProducts]
            } else {
              finalProducts = [...mlWithAnalysis, ...otherProducts]
            }
          } catch (err) {
            // Si falla el análisis, continuar normalmente
            finalProducts = [...mlProducts, ...otherProducts]
          }
        }

        setProducts(finalProducts)
        renderTimeRef.current = Date.now()
        
        // Track impressions
        if (data.products && data.products.length > 0) {
          const impressionEvents = data.products.map((product, index) => ({
            query,
            product_id: extractProductId(product.url),
            position: index + 1,
            clicked: false,
            time_to_click: null,
          }))
          trackEvents(impressionEvents)
        }
        
        setLoading(false)
      } catch (err) {
        const msg = err.response?.data?.error || 'No pudimos conectarnos al servidor.'
        setError(msg)
        setLoading(false)
      }
    }

    fetchData()
  }, [query])

  function extractProductId(url) {
    if (!url) return 'unknown'
    const match = url.match(/(MLA|MLU)-\d+/)
    if (match) return match[0]
    const parts = url.split('/')
    const lastPart = parts[parts.length - 1] || parts[parts.length - 2]
    return lastPart?.split('?')[0] || 'unknown'
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl" style={{ background: 'rgba(10,15,46,0.9)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="shrink-0">
            <img src="/logo.png" alt="MejorIA" className="h-10 w-10 object-contain rounded-full" />
          </Link>
          <div className="flex-1">
            <SearchBar initialValue={query} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {loading ? (
          <Loader />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="text-6xl">😕</div>
            <h2 className="text-xl font-bold text-white">No encontramos resultados</h2>
            <p className="text-white/60 max-w-sm">{error}</p>
            <Link to="/" className="mt-4 px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-full transition-colors">
              Volver al inicio
            </Link>
          </div>
        ) : (
          <>
            {/* Query title */}
            <div className="mb-6">
              <p className="text-white/50 text-sm mb-1">Resultados para</p>
              <h2 className="text-2xl font-bold text-white">"{query}"</h2>
            </div>

            {/* Product cards */}
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product, i) => (
                  <div key={i}>
                    {/* Badge de alternativa nacional */}
                    {product._alternativaNacional && (
                      <div className="mb-2 p-2 rounded-lg bg-green-500/20 border border-green-500/40 text-center">
                        <span className="text-green-300 text-sm font-bold">🇦🇷 Alternativa Nacional</span>
                      </div>
                    )}
                    <ProductCard 
                      product={product} 
                      rank={product._alternativaNacional ? i + 1 : i + 1}
                      query={query}
                      renderTime={renderTimeRef.current}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-white/50">No se encontraron productos.</p>
              </div>
            )}

            {/* Back button */}
            <div className="mt-10 text-center">
              <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/40 rounded-full text-sm transition-all duration-200">
                ← Nueva búsqueda
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
