import axios from 'axios'
import type { ApiErrorResponse } from '../types/api'

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Some of the details are invalid. Please check the form and try again.',
  401: 'Your session has ended. Please sign in again.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: 'That already exists. Please try something different.',
  500: 'Something went wrong on our side. Please try again in a moment.',
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorResponse).status === 'number' &&
    typeof (value as ApiErrorResponse).message === 'string'
  )
}

/** Turns any thrown value into a short, user-friendly sentence. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return 'Unable to reach the server. Please check your connection and try again.'
    }

    const data: unknown = error.response?.data
    const status = error.response?.status

    if (isApiErrorResponse(data)) {
      const fieldErrors = data.errors ? Object.values(data.errors) : []
      // Validation responses carry the useful detail in `errors`.
      if (fieldErrors.length > 0) return fieldErrors.join(' ')
      if (data.message) return data.message
    }

    if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status]
    if (status && status >= 500) return STATUS_MESSAGES[500] as string
  }

  return fallback
}

/** Field-level validation errors returned by the backend, keyed by field name. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error) && isApiErrorResponse(error.response?.data)) {
    return error.response.data.errors ?? {}
  }
  return {}
}

export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
