import RecommendationSearch from '../components/RecommendationSearch'
import ResultsList from '../components/ResultsList'
import { useState } from 'react'

function Promotions() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastSearch, setLastSearch] = useState(null)

  const handleSearch = async (category) => {
    setLoading(true)
    setError(null)
    setLastSearch(category)

    try {
      const response = await fetch(`/api/best-options?category=${category}`)
      const data = await response.json()
      
      if (data.success) {
        setResults(data)
      } else {
        setError(data.message || 'Error al obtener recomendaciones')
      }
    } catch (err) {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-white">
        💰 Promociones del Día
      </h1>
      
      <RecommendationSearch 
        onSearch={handleSearch} 
        loading={loading} 
      />

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
          {error}
        </div>
      )}

      {results && (
        <ResultsList 
          results={results.data} 
          category={lastSearch}
          day={results.day}
        />
      )}
    </div>
  )
}

export default Promotions

