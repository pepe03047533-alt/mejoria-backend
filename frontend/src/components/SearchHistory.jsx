import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const MAX_HISTORY = 10

export function useSearchHistory() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem('mejoria_search_history')
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch {
        setHistory([])
      }
    }
  }, [])

  const addToHistory = (query) => {
    if (!query || query.trim().length < 2) return
    
    setHistory(prev => {
      const newHistory = [
        { query: query.trim(), timestamp: Date.now() },
        ...prev.filter(h => h.query.toLowerCase() !== query.trim().toLowerCase())
      ].slice(0, MAX_HISTORY)
      
      localStorage.setItem('mejoria_search_history', JSON.stringify(newHistory))
      return newHistory
    })
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('mejoria_search_history')
  }

  return { history, addToHistory, clearHistory }
}

export default function SearchHistory({ onSelect, className = '' }) {
  const [history, setHistory] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem('mejoria_search_history')
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch {
        setHistory([])
      }
    }
  }, [])

  const handleSelect = (query) => {
    if (onSelect) {
      onSelect(query)
    } else {
      navigate(`/results?q=${encodeURIComponent(query)}`)
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setHistory([])
    localStorage.removeItem('mejoria_search_history')
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Hace un momento'
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  }

  if (history.length === 0) return null

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-sm transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Historial
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{history.length}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-72 rounded-xl border border-white/10 bg-[#0b1120] shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white/70 text-sm font-medium">Búsquedas recientes</span>
              <button
                onClick={handleClear}
                className="text-white/40 hover:text-red-400 text-xs transition-colors"
              >
                Borrar
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {history.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(item.query)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="text-white text-sm truncate flex-1">{item.query}</span>
                  <span className="text-white/30 text-xs ml-2">{formatTime(item.timestamp)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
