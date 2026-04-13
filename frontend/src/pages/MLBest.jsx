import { useState } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import MLBestResults from '../components/MLBestResults'

export default function MLBest() {
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (q) => {
    setSearchQuery(q)
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
            <SearchBar initialValue={query} onSearch={(q) => { setQuery(q); handleSearch(q); }} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {!searchQuery ? (
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold text-white mb-4">Comparador ML</h1>
            <p className="text-white/60 max-w-md mx-auto mb-8">
              Buscá un producto y te mostramos la mejor opción internacional 
              y la mejor opción nacional de MercadoLibre.
            </p>
            <div className="flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-red-300">
                <span>🌍</span>
                <span>Internacional (más barato)</span>
              </div>
              <div className="flex items-center gap-2 text-green-300">
                <span>🇦🇷</span>
                <span>Nacional (más rápido)</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-white/50 text-sm mb-1">Resultados para</p>
              <h2 className="text-2xl font-bold text-white">"{searchQuery}"</h2>
            </div>

            <MLBestResults query={searchQuery} />

            <div className="mt-8 text-center">
              <Link 
                to={`/results?q=${encodeURIComponent(searchQuery)}`}
                className="text-orange-400 hover:text-orange-300 text-sm underline"
              >
                Ver todos los resultados →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
