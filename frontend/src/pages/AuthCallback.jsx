import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { handleGoogleCallback, handleMeliCallback } from '../services/userAuth'
import Loader from '../components/Loader'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const oauthError = searchParams.get('error')

    if (oauthError) {
      console.error('OAuth error:', oauthError, searchParams.get('error_description'))
      alert('No se pudo conectar Mercado Libre. Intentá nuevamente.')
      navigate('/profile', { replace: true })
      return
    }

    if (code && state) {
      handleMeliCallback(code, state)
        .then(() => {
          alert('Mercado Libre conectado correctamente.')
          navigate('/profile', { replace: true })
        })
        .catch((err) => {
          console.error('Error Mercado Libre:', err)
          alert('Error conectando Mercado Libre. Revisá permisos e intentá otra vez.')
          navigate('/profile', { replace: true })
        })
      return
    }

    // Token de Google (implicit flow en hash)
    const hash = window.location.hash
    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const error = params.get('error')

    if (error) {
      console.error('Error de Google:', error)
      navigate('/', { replace: true })
      return
    }

    if (accessToken) {
      handleGoogleCallback(accessToken)
        .then(() => {
          navigate('/', { replace: true })
        })
        .catch((err) => {
          console.error('Error:', err)
          navigate('/', { replace: true })
        })
      return
    }

    navigate('/', { replace: true })
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f2e]">
      <Loader />
    </div>
  )
}
