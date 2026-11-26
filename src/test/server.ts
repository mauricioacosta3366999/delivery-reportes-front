import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { sessionStore } from '@/features/auth/session'

/** Prefijo que matchea la API sin importar el origen (jsdom usa http://localhost:3000). */
export const API = '*/api/v1'

/** Handlers base: GET /auth/me (lo llama AuthProvider al montar) devuelve el usuario de la sesión. */
const defaults = [
  http.get(`${API}/auth/me`, () => {
    const usuario = sessionStore.get().session?.usuario
    return usuario ? HttpResponse.json(usuario) : HttpResponse.json({ error: 'Autenticación requerida' }, { status: 401 })
  }),
  // El buscador del catálogo consulta mientras se escribe un producto: catálogo vacío por defecto.
  http.get(`${API}/productos`, () => HttpResponse.json({ datos: [], total: 0, pagina: 1, limite: 8 })),
]

/** Servidor MSW compartido; cada test agrega sus handlers con server.use(...). */
export const server = setupServer(...defaults)
