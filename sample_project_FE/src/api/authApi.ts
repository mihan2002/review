import { api } from './axios'
import type { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '../types/api'

export const authApi = {
  async register(payload: RegisterRequest): Promise<UserResponse> {
    const { data } = await api.post<UserResponse>('/auth/register', payload)
    return data
  },

  async login(payload: LoginRequest): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload)
    return data
  },
}
