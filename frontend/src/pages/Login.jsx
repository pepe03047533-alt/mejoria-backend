import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  setupAxiosInterceptors,
  loginAsGuest,
  loginWithGoogle,
  getUser,
  isAuthenticated,
} from '../services/userAuth'
import { API_BASE_URL, getApiOrigin } from '../config/api'

const GOOGLE_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim())

export default function Login() {
  const navigate = useNavigate()
  const [initError, setInitError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    try {
      setupAxiosInterceptors()
    } catch (err) {
      setInitError(err?.message || 'No se pudo inicializar la sesión.')
    }
  }, [])

  const handleGuest = async () => {
    setActionError(null)
    setBusy(true)
    try {
      await loginAsGuest()
      navigate('/profile', { replace: true })
    } catch (err) {
      setActionError(
        err?.response?.data?.error ||
          err?.message ||
          'No se pudo iniciar como invitado. Verificá la conexión con el backend.'
      )
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = () => {
    setActionError(null)
    try {
      if (!GOOGLE_CONFIGURED) {
        setActionError(
          'Falta la variable VITE_GOOGLE_CLIENT_ID en Vercel. Agregala y redeployá el frontend.'
        )
        return
      }
      loginWithGoogle()
    } catch (err) {
      setActionError(err?.message || 'No se pudo abrir el login de Google.')
    }
  }

  const user = getUser()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="text-white/80 hover:text-white text-sm">
            ← Volver al inicio
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-white">Iniciar sesión</h1>
          <p className="mt-2 text-white/60 text-sm">
            Vinculá tu cuenta para guardar historial y conectar Mercado Libre desde{' '}
            <Link to="/profile" className="text-orange-400 hover:underline">
              tu perfil
            </Link>
            .
          </p>
        </div>

        {initError && (
          <div className="rounded-xl bg-red-500/15 border border-red-400/40 text-red-200 text-sm px-4 py-3">
            {initError}
          </div>
        )}

        {actionError && (
          <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-100 text-sm px-4 py-3">
            {actionError}
          </div>
        )}

        {!GOOGLE_CONFIGURED && (
          <div className="rounded-xl bg-white/10 border border-white/20 text-white/80 text-sm px-4 py-3">
            Google OAuth no está configurado en este deploy. Agregá{' '}
            <code className="text-orange-300">VITE_GOOGLE_CLIENT_ID</code> en Vercel y volvé a
            publicar.
          </div>
        )}

        <div className="rounded-2xl bg-white/10 border border-white/20 p-6 space-y-4">
          <button
            type="button"
            disabled={busy}
            onClick={handleGoogle}
            className="w-full py-3 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            Continuar con Google
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleGuest}
            className="w-full py-3 rounded-xl bg-orange-500/90 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            Entrar como invitado
          </button>

          <p className="text-white/50 text-xs text-center">
            Backend: <span className="text-white/70">{getApiOrigin() || API_BASE_URL || '(mismo dominio)'}</span>
          </p>
        </div>

        {isAuthenticated() && user && (
          <p className="text-center text-white/60 text-sm">
            Ya tenés sesión activa.{' '}
            <Link to="/profile" className="text-orange-400 hover:underline">
              Ir al perfil
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
