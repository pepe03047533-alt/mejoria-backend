import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Generar o recuperar guestId
export function getOrCreateGuestId() {
  let guestId = localStorage.getItem('mejoria_guest_id')
  if (!guestId) {
    guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('mejoria_guest_id', guestId)
  }
  return guestId
}

// Obtener token
export function getAuthToken() {
  return localStorage.getItem('mejoria_auth_token')
}

// Guardar token
export function setAuthToken(token) {
  localStorage.setItem('mejoria_auth_token', token)
}

// Guardar usuario
export function setUser(user) {
  localStorage.setItem('mejoria_user', JSON.stringify(user))
}

// Obtener usuario
export function getUser() {
  const user = localStorage.getItem('mejoria_user')
  return user ? JSON.parse(user) : null
}

// Login con Google usando OAuth 2.0
export function loginWithGoogle() {
  const redirectUri = window.location.origin + '/auth/callback'
  const scope = 'profile email'
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: scope,
    include_granted_scopes: 'true',
    state: 'mejoria-auth',
  })
  
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// Procesar token de Google (después del redirect)
export async function handleGoogleCallback(accessToken) {
  try {
    const guestId = getOrCreateGuestId()
    
    const res = await axios.post(`${API_URL}/api/auth/google/token`, {
      token: accessToken,
      guestId: guestId,
    })
    
    setAuthToken(res.data.token)
    setUser(res.data.user)
    return res.data
  } catch (err) {
    console.error('Error en callback:', err)
    throw err
  }
}

// Login como invitado
export async function loginAsGuest() {
  const guestId = getOrCreateGuestId()
  
  try {
    const res = await axios.post(`${API_URL}/api/auth/guest`, { guestId })
    setAuthToken(res.data.token)
    setUser(res.data.user)
    return res.data
  } catch (err) {
    console.error('Error login guest:', err)
    throw err
  }
}

// Configurar axios
export function setupAxiosInterceptors() {
  axios.interceptors.request.use(
    (config) => {
      const token = getAuthToken()
      const guestId = getOrCreateGuestId()
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      config.headers['X-Guest-Id'] = guestId
      
      return config
    },
    (error) => Promise.reject(error)
  )
}

// Logout
export function logout() {
  localStorage.removeItem('mejoria_auth_token')
  localStorage.removeItem('mejoria_user')
  localStorage.removeItem('mejoria_guest_id')
}

// Verificar si está autenticado
export function isAuthenticated() {
  return !!getAuthToken()
}
