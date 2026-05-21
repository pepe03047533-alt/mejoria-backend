import axios from 'axios'
import { API_BASE_URL } from '../config/api'

const BASE_URL = API_BASE_URL

export async function searchProducts(query) {
  const params = new URLSearchParams()
  params.set('q', query)

  const response = await axios.get(`${BASE_URL}/api/search?${params.toString()}`, {
    timeout: 45000,
  })
  return response.data
}

export async function getAIAnalysis(query, products) {
  const response = await axios.post(`${BASE_URL}/api/ai`, {
    query,
    products,
  }, { timeout: 15000 })
  return response.data
}

export async function sendChatMessage(message, history = []) {
  const response = await axios.post(`${BASE_URL}/api/ai`, {
    message,
    history,
  }, { timeout: 15000 })
  return response.data
}
