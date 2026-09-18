import { createContext } from 'react'
import type { LoginRequest, RegisterRequest, UserResponse } from '../types/api'

export interface CurrentUser {
  id: string
  username: string
}

export interface AuthContextValue {
  user: CurrentUser | null
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (payload: RegisterRequest) => Promise<UserResponse>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
