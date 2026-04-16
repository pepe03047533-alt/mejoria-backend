import { useState, useEffect } from 'react'
import { getUser, loginWithGoogle, logout } from '../services/userAuth'

export default function UserGreeting() {
  const [user, setUser] = useState(null)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const u = getUser()
    setUser(u)
  }, [])

  if (!user) return null

  const isUserGuest = isGuest()

  // Determinar mensaje de saludo
  const getGreeting = () => {
    const hour = new Date().getHours()
    let timeGreeting = 'Hola'
    
    if (hour < 12) timeGreeting = 'Buenos días'
    else if (hour < 18) timeGreeting = 'Buenas tardes'
    else timeGreeting = 'Buenas noches'

    if (isUserGuest) {
      return `${timeGreeting}, invitado`
    }

    return `${timeGreeting}, ${user.name?.split(' ')[0] || 'usuario'}`
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      >
        {user.picture ? (
          <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
            {isUserGuest ? '👤' : (user.name?.[0] || 'U')}
          </div>
        )}
        <span className="text-white text-sm hidden sm:block">{getGreeting()}</span>
        <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#0a0f2e] border border-white/20 rounded-xl shadow-xl z-50">
          <div className="p-4">
            {isUserGuest ? (
              <>
                <p className="text-white/60 text-sm mb-3">
                  Estás navegando como invitado. Iniciá sesión para guardar tu historial.
                </p>
                <button
                  onClick={() => {
                    loginWithGoogle()
                    setShowMenu(false)
                  }}
                  className="w-full py-2 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Iniciar con Google
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  {user.picture && <img src={user.picture} alt="" className="w-10 h-10 rounded-full" />}
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-white/60 text-sm">{user.email}</p>
                  </div>
                </div>
                <a
                  href="/profile"
                  className="block w-full py-2 text-center text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  Mi perfil
                </a>
                <button
                  onClick={() => {
                    logout()
                    setShowMenu(false)
                    window.location.reload()
                  }}
                  className="w-full py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mt-2"
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
