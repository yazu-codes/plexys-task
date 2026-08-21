import { ref } from 'vue'

const AUTH_BASE = `${import.meta.env.VITE_API_URL}/auth`
const CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_OAUTH_REDIRECT_URI
const AUTH_PROXY_URL = import.meta.env.VITE_AUTH_PROXY_URL // your new Go service

export const isAuthenticated = ref(!!localStorage.getItem('corteza-access-token'))

export const authService = {
  isAuthenticated() {
    return isAuthenticated.value
  },

  getToken() {
    return localStorage.getItem('corteza-access-token')
  },

  login() {
    const state = crypto.randomUUID()
    sessionStorage.setItem('oauth-state', state)

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: 'api',
      state,
    })

    window.location.href = `${AUTH_BASE}/oauth2/authorize?${params}`
  },

  async handleCallback(code, returnedState) {
    const savedState = sessionStorage.getItem('oauth-state')
    if (returnedState !== savedState) {
      throw new Error('State mismatch — possible CSRF attempt')
    }

    const response = await fetch(`${AUTH_PROXY_URL}/api/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${text}`)
    }

    const data = await response.json()
    localStorage.setItem('corteza-access-token', data.access_token)
    if (data.refresh_token) {
      localStorage.setItem('corteza-refresh-token', data.refresh_token)
    }

    isAuthenticated.value = true
    return data
  },

  logout() {
    localStorage.removeItem('corteza-access-token')
    localStorage.removeItem('corteza-refresh-token')
    isAuthenticated.value = false
  },
}