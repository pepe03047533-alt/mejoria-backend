import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { handleGoogleCallback } from '../services/userAuth'
import Loader from '../components/Loader'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    // Obtener token del hash (OAuth implicit flow)
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
      // Procesar login con Google
      handleGoogleCallback(accessToken)
        .then(() => {
          navigate('/', { replace: true })
        })
        .catch((err) => {
          console.error('Error:', err)
          navigate('/', { replace: true })
        })
    } else {
      navigate('/', { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f2e]">
      <Loader />
    </div>
  )
}
