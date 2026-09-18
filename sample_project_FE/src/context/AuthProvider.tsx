import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/authApi'
import { getStoredToken, setStoredToken, UNAUTHORIZED_EVENT } from '../api/axios'
import type { LoginRequest, RegisterRequest } from '../types/api'
import { decodeToken, isTokenExpired } from '../utils/jwt'
import { AuthContext, type CurrentUser } from './authContext'

function userFromToken(token: string | null): CurrentUser | null {
  if (!token) return null

  const payload = decodeToken(token)
  if (!payload || isTokenExpired(payload)) return null

  return { id: payload.uid, username: payload.sub }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(() => {
    const stored = getStoredToken()
    // Drop a token that is already expired rather than letting the first
    // request fail with a 401.
    if (stored && !userFromToken(stored)) {
      setStoredToken(null)
      return null
    }
    return stored
  })

  const user = useMemo(() => userFromToken(token), [token])

  const logout = useCallback(() => {
    setStoredToken(null)
    setToken(null)
    queryClient.clear()
  }, [queryClient])

  // The Axios interceptor signals a rejected token from outside React.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout)
  }, [logout])

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const response = await authApi.login(credentials)
      setStoredToken(response.token)
      setToken(response.token)
      queryClient.clear()
    },
    [queryClient],
  )

  const register = useCallback((payload: RegisterRequest) => authApi.register(payload), [])

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, login, register, logout }),
    [user, login, register, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
