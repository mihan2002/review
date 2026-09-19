/**
 * TypeScript mirror of the backend DTOs
 * (see sample_project_BE/src/main/java/com/sampleproject/diary/dto).
 * This module is the single source of truth for API contracts.
 */

/** DiaryEntryResponse */
export interface DiaryEntry {
  id: string
  title: string
  content: string
  /** ISO local date, e.g. "2026-09-18" */
  entryDate: string
  /** ISO instant */
  createdAt: string
  /** ISO instant */
  updatedAt: string
}

/** DiaryEntryRequest — the payload accepted by create and update */
export interface DiaryEntryRequest {
  title: string
  content: string
  entryDate: string
}

/** PageResponse<T> */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

/** RegisterRequest */
export interface RegisterRequest {
  username: string
  email: string
  password: string
}

/** UserResponse — returned by POST /api/auth/register */
export interface UserResponse {
  id: string
  username: string
  email: string
  createdAt: string
}

/** LoginRequest */
export interface LoginRequest {
  username: string
  password: string
}

/** AuthResponse — returned by POST /api/auth/login */
export interface AuthResponse {
  token: string
  tokenType: string
  /** seconds */
  expiresIn: number
}

/** ForgotPasswordRequest — POST /api/auth/forgot-password */
export interface ForgotPasswordRequest {
  email: string
}

/** VerifyResetPinRequest — POST /api/auth/verify-reset-pin */
export interface VerifyResetPinRequest {
  email: string
  pin: string
}

/** ResetPasswordRequest — POST /api/auth/reset-password */
export interface ResetPasswordRequest {
  email: string
  pin: string
  newPassword: string
}

/** MessageResponse — plain confirmation returned by the password-reset endpoints */
export interface MessageResponse {
  message: string
}

/** ErrorResponse — the shape every failing request returns */
export interface ApiErrorResponse {
  status: number
  message: string
  errors?: Record<string, string>
  path?: string
  timestamp?: string
}

/** Query parameters accepted by GET /api/diaries */
export interface DiaryListParams {
  from?: string
  to?: string
  page?: number
  size?: number
}

/** Query parameters accepted by GET /api/diaries/search */
export interface DiarySearchParams {
  keyword: string
  page?: number
  size?: number
}
