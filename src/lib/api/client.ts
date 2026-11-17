import { env } from '@/lib/env'
import type { QueryParams } from '@/lib/types'

export interface ErrorDetalle {
  campo: string
  mensaje: string
}

/** Error normalizado de la API: `{ error, detalles? }` del backend + status HTTP. */
export class ApiError extends Error {
  readonly status: number
  readonly detalles: ErrorDetalle[]

  constructor(status: number, message: string, detalles: ErrorDetalle[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detalles = detalles
  }
}

const mensajesPorStatus: Record<number, string> = {
  0: 'No se pudo conectar con el servidor. Revisá tu conexión.',
  401: 'Tu sesión no es válida. Iniciá sesión nuevamente.',
  403: 'No tenés permisos para realizar esta acción.',
  404: 'No encontramos lo que buscabas.',
  413: 'La solicitud es demasiado grande.',
  429: 'Demasiadas solicitudes; intentá de nuevo en unos minutos.',
  500: 'Ocurrió un error en el servidor. Intentá más tarde.',
}

interface ApiConfig {
  getToken: () => string | null
  onUnauthorized: () => void
}

let config: ApiConfig = { getToken: () => null, onUnauthorized: () => {} }

/** Conecta el cliente con la sesión (token + qué hacer ante un 401). */
export function configureApi(next: ApiConfig) {
  config = next
}

export function buildUrl(path: string, query?: QueryParams) {
  const url = new URL(`${env.VITE_API_URL}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  query?: QueryParams
  signal?: AbortSignal
  /** false para endpoints públicos (login/registro): no envía token ni dispara logout. */
  auth?: boolean
}

async function toApiError(response: Response) {
  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // respuesta sin JSON
  }
  const body = (data && typeof data === 'object' ? data : {}) as { error?: unknown; detalles?: unknown }
  const message = typeof body.error === 'string' ? body.error : (mensajesPorStatus[response.status] ?? mensajesPorStatus[500])
  const detalles = Array.isArray(body.detalles) ? (body.detalles as ErrorDetalle[]) : []
  return new ApiError(response.status, message, detalles)
}

/** Request de bajo nivel: devuelve el Response si es 2xx, si no lanza ApiError. */
export async function apiRequest(path: string, { method = 'GET', body, query, signal, auth = true }: RequestOptions = {}) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = auth ? config.getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, mensajesPorStatus[0])
  }

  if (!response.ok) {
    const error = await toApiError(response)
    // Solo un 401 con token implica sesión vencida; un login fallido también responde 401.
    if (response.status === 401 && token) config.onUnauthorized()
    throw error
  }
  return response
}

export async function apiFetch<T>(path: string, options?: RequestOptions): Promise<T> {
  const response = await apiRequest(path, options)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.') {
  if (error instanceof ApiError) return error.message
  return fallback
}
