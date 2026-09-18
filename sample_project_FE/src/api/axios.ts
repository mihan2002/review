import axios from 'axios'

const TOKEN_STORAGE_KEY = 'diary.token'

/** Fired when the API rejects the stored token, so the auth layer can sign out. */
export const UNAUTHORIZED_EVENT = 'diary:unauthorized'

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    /* storage unavailable (private mode) — the session stays in memory only */
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      // A failed login is a credentials problem, not an expired session.
      if (!url.includes('/auth/')) {
        setStoredToken(null)
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
      }
    }
    return Promise.reject(error)
  },
)
