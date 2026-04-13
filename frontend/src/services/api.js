import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export async function searchProducts(query, condicion = 'nuevo') {
  const params = new URLSearchParams()
  params.set('q', query)
  if (condicion && condicion !== 'todos') {
    params.set('condicion', condicion)
  }
  
  const response = await axios.get(`${BASE_URL}/api/search?${params.toString()}`, {
    timeout: 45000,
  })
  return response.data
}

export async function getAIAnalysis(query, products) {
  const response = await axios.post(`${BASE_URL}/api/chat`, {
    query,
    products,
  }, { timeout: 15000 })
  return response.data
}

export async function sendChatMessage(message, history = []) {
  const response = await axios.post(`${BASE_URL}/api/chat`, {
    message,
    history,
  }, { timeout: 15000 })
  return response.data
}
