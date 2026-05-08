const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  'https://mejoria-backend-production.up.railway.app'

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, '')

