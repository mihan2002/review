import { api } from './axios'
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
  UserResponse,
  VerifyResetPinRequest,
} from '../types/api'

export const authApi = {
  async register(payload: RegisterRequest): Promise<UserResponse> {
    const { data } = await api.post<UserResponse>('/auth/register', payload)
    return data
  },

  async login(payload: LoginRequest): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload)
    return data
  },

  /** Always resolves for a well-formed email, whether or not it has an account. */
  async forgotPassword(payload: ForgotPasswordRequest): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>('/auth/forgot-password', payload)
    return data
  },

  /** Rejects with 401 when the PIN is wrong, expired or already used. */
  async verifyResetPin(payload: VerifyResetPinRequest): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>('/auth/verify-reset-pin', payload)
    return data
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>('/auth/reset-password', payload)
    return data
  },
}
