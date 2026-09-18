/**
 * The backend exposes no /me endpoint, so the signed-in user's identity is read
 * from the JWT itself. The token is never trusted for authorisation here — the
 * backend re-verifies every request — this only drives what the UI displays.
 */
export interface TokenPayload {
  /** username */
  sub: string
  /** user id */
  uid: string
  /** expiry, seconds since epoch */
  exp?: number
}

function decodeBase64Url(segment: string): string | null {
  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export function decodeToken(token: string): TokenPayload | null {
  const segment = token.split('.')[1]
  if (!segment) return null

  const json = decodeBase64Url(segment)
  if (!json) return null

  try {
    const payload: unknown = JSON.parse(json)
    if (
      typeof payload === 'object' &&
      payload !== null &&
      typeof (payload as TokenPayload).sub === 'string'
    ) {
      return payload as TokenPayload
    }
  } catch {
    /* malformed token */
  }
  return null
}

export function isTokenExpired(payload: TokenPayload): boolean {
  if (typeof payload.exp !== 'number') return false
  return payload.exp * 1000 <= Date.now()
}
