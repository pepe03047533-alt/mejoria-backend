import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { getUser, isAuthenticated, setupAxiosInterceptors, startMercadoLibreOAuth } from '../services/userAuth'
import Loader from '../components/Loader'
import { API_BASE_URL } from '../config/api'

const API_URL = API_BASE_URL

export default function UserProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [meliStatus, setMeliStatus] = useState(null)

  useEffect(() => {
    setupAxiosInterceptors()
    
    if (!isAuthenticated()) {
      window.location.href = '/'
      return
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/user/dashboard`)
        setProfile(res.data)
      } catch (err) {
        console.error('Error:', err)
      }
      try {
        const meli = await axios.get(`${API_URL}/api/auth/meli/status`)
        setMeliStatus(meli.data)
      } catch (_) {
        setMeliStatus(null)
      }
      setLoading(false)
    }

    fetchProfile()
  }, [])

  if (loading) return <Loader />

  const user = getUser()

  return (
    <div className="min-h-screen bg-[#0a0f2e]">
      <header className="border-b border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-white font-bold text-xl">← Volver</Link>
          <h1 className="text-white text-2xl font-bold">Mi Perfil</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {profile && (
          <>
            {/* Info del usuario */}
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-4">
                {user?.picture ? (
                  <img src={user.picture} alt="" className="w-20 h-20 rounded-full" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white text-3xl font-bold">
                    {user?.name?.[0] || 'U'}
                  </div>
                )}
                <div>
                  <h2 className="text-white text-2xl font-bold">{profile.user.name}</h2>
                  <p className="text-white/60">{profile.user.email}</p>
                  {profile.user.is_guest && (
                    <span className="inline-block mt-2 px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">
                      Modo invitado
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-white">{profile.stats.total_searches}</p>
                <p className="text-white/60 text-sm">Búsquedas</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-white">{profile.stats.total_views}</p>
                <p className="text-white/60 text-sm">Productos vistos</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-white">{profile.stats.total_decisions}</p>
                <p className="text-white/60 text-sm">Decisiones</p>
              </div>
            </div>

            {/* Mercado Libre API (OAuth para límites más altos en búsqueda) */}
            <div className="bg-white/10 rounded-xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-white font-bold mb-1">Mercado Libre API</h3>
                <p className="text-white/60 text-sm">
                  {meliStatus?.connected
                    ? `Conectado${meliStatus.expiresAt ? ` · expira ~${new Date(meliStatus.expiresAt).toLocaleString('es-AR')}` : ''}`
                    : 'Sin token de aplicación: las búsquedas usan la API pública.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    startMercadoLibreOAuth()
                  } catch (e) {
                    alert(e.message || 'No se pudo abrir Mercado Libre')
                  }
                }}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium whitespace-nowrap"
              >
                {meliStatus?.connected ? 'Renovar conexión' : 'Conectar Mercado Libre'}
              </button>
            </div>

            {/* Búsquedas recientes */}
            {profile.recent.searches.length > 0 && (
              <div className="bg-white/10 rounded-xl p-6 mb-6">
                <h3 className="text-white font-bold mb-4">Últimas búsquedas</h3>
                <div className="space-y-2">
                  {profile.recent.searches.map((s) => (
                    <Link
                      key={s.id}
                      to={`/results?q=${encodeURIComponent(s.query)}`}
                      className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <p className="text-white">{s.query}</p>
                      <p className="text-white/50 text-sm">{new Date(s.created_at).toLocaleDateString()}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Productos vistos */}
            {profile.recent.views.length > 0 && (
              <div className="bg-white/10 rounded-xl p-6">
                <h3 className="text-white font-bold mb-4">Vistos recientemente</h3>
                <div className="space-y-2">
                  {profile.recent.views.map((v) => (
                    <a
                      key={v.id}
                      href={v.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <p className="text-white line-clamp-1">{v.product_title}</p>
                      <p className="text-orange-400">${v.product_price?.toLocaleString('es-AR')}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
