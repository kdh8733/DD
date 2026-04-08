import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' }
})

// Request: JWT 토큰 첨부
client.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response: 401 -> token refresh 시도
client.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      await useAuthStore.getState().refreshToken()
      return client(err.config)
    }
    return Promise.reject(err)
  }
)

export default client
