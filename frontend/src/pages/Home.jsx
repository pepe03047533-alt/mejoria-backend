import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import UserGreeting from '../components/UserGreeting'
import { setupAxiosInterceptors, loginAsGuest } from '../services/userAuth'

export default function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    setupAxiosInterceptors()
    
    // Iniciar como invitado si no hay sesión
    const initGuest = async () => {
      const token = localStorage.getItem('mejoria_auth_token')
      if (!token) {
        try {
          await loginAsGuest()
        } catch (err) {
          console.log('Error iniciando guest:', err)
        }
      }
    }
    
    initGuest()
  }, [])

  const handleSearch = useCallback((term) => {
    navigate(`/results?q=${encodeURIComponent(term)}`)
  }, [navigate])

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col items-center px-4 sm:px-6 pt-8 sm:pt-12">
      
      {/* Header con saludo */}
      <div className="w-full max-w-2xl min-w-0 flex justify-end mb-4">
        <UserGreeting />
      </div>

      {/* Logo */}
      <img
        src="/logo.png"
        alt="MejorIA"
        draggable={false}
        className="w-full max-w-[min(85vw,550px)] object-contain select-none"
      />

      {/* Barra de búsqueda */}
      <div className="w-full max-w-2xl min-w-0 -mt-10 sm:-mt-16">
        <SearchBar autoFocus onSearch={handleSearch} />
      </div>

    </div>
  )
}