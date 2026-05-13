import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import VoiceButton from './VoiceButton'

export default function SearchBar({ initialValue = '', autoFocus = false, onSearch = null }) {
  // Sincronizamos el estado interno con el valor inicial de la URL para evitar bucles
  const [query, setQuery] = useState(initialValue)
  const [condicion, setCondicion] = useState('nuevo') 
  const navigate = useNavigate()

  // EFECTO CLAVE: Si el valor inicial cambia (por navegación), actualizamos el input
  // pero NO disparamos handleSearch para evitar el bucle infinito.
  useEffect(() => {
    setQuery(initialValue)
  }, [initialValue])

  const handleSearch = useCallback((q) => {
    const term = (q || query).trim()
    if (!term) return
    
    const params = new URLSearchParams()
    params.set('q', term)
    if (condicion !== 'todos') {
      params.set('condicion', condicion)
    }
    
    if (onSearch) {
      onSearch(term)
    } else {
      // Navegamos solo si la URL actual es distinta a la nueva
      const newRelativePath = `/results?${params.toString()}`
      if (window.location.pathname + window.location.search !== newRelativePath) {
        navigate(newRelativePath)
      }
    }
  }, [query, condicion, onSearch, navigate])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault() // Evitamos que el formulario haga cosas raras
        handleSearch()
    }
  }

  const handleVoiceResult = (transcript) => {
    setQuery(transcript)
    handleSearch(transcript)
  }

  return (
    <div className="flex flex-col w-full max-w-2xl min-w-0 gap-3 mx-auto">
      <div className="flex flex-wrap sm:flex-nowrap items-center w-full min-w-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl sm:rounded-full px-3 sm:px-5 py-2 gap-2 sm:gap-3 shadow-2xl hover:border-white/40 transition-all duration-300 focus-within:border-cyan-400/60">
        <svg className="w-5 h-5 text-white/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="¿Qué producto estás buscando?"
          autoFocus={autoFocus}
          className="flex-1 bg-transparent text-white placeholder-white/40 text-sm sm:text-base outline-none min-w-0"
        />

        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-white/40 hover:text-white/80 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}

        <VoiceButton onResult={handleVoiceResult} />

        <button
          onClick={() => handleSearch()}
          className="bg-orange-500 hover:bg-orange-400 text-white font-semibold px-4 sm:px-5 py-2 rounded-full text-sm transition-all duration-200 shadow-lg shrink-0"
        >
          Buscar
        </button>
      </div>
      
      <div className="flex flex-wrap items-center justify-center gap-2 px-1">
        <span className="text-white/60 text-sm">Condición:</span>
        <div className="flex max-w-full bg-white/10 rounded-full p-1 overflow-x-auto">
          {[
            { value: 'nuevo', label: 'Nuevo' },
            { value: 'usado', label: 'Usado' },
            { value: 'todos', label: 'Todos' }
          ].map((opcion) => (
            <button
              key={opcion.value}
              onClick={() => setCondicion(opcion.value)}
              className={`px-3 sm:px-4 py-1 rounded-full text-sm transition-all duration-200 shrink-0 ${
                condicion === opcion.value
                  ? 'bg-orange-500 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {opcion.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}