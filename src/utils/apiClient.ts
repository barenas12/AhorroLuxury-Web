const TOKEN_STORAGE_KEY = 'al_auth_token'

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setAuthToken(token: string): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  // Limpieza de claves heredadas en localStorage
  localStorage.removeItem('token')
  localStorage.removeItem('al_user_session')
  localStorage.removeItem('al_last_activity')
}

export interface ApiFetchOptions extends RequestInit {
  skipAuthRedirect?: boolean
}

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { skipAuthRedirect = false, headers: rawHeaders, ...rest } = options
  const headers = new Headers(rawHeaders)

  const token = getAuthToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (rest.body && !(rest.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const baseUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    ...rest,
    headers
  })

  if (response.status === 401 && !skipAuthRedirect && unauthorizedHandler) {
    unauthorizedHandler()
  }

  return response
}
