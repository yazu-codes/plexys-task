import axios from 'axios'
import { authService } from './auth'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:18080') + '/api'

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const token = authService.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    // 401 = clean auth rejection, 403 = forbidden, 500 = Corteza choking on a malformed/expired token
    if (status === 401 || status === 403 || status === 500) {
      authService.logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api