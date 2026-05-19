/**
 * Base URL del backend (sin barra final).
 * - VITE_API_URL: override explícito (Railway, preview, etc.)
 * - dev: '' → Vite proxy /api → localhost:3001
 * - prod: mismo origen (mejoria.com.ar/api/...) cuando el deploy es monolito Vercel
 */
function resolveApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  if (import.meta.env.DEV) return ''
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export const API_BASE_URL = resolveApiBaseUrl()

/** Origen efectivo para redirects OAuth (nunca vacío en el navegador). */
export function getApiOrigin() {
  if (API_BASE_URL) return API_BASE_URL
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
