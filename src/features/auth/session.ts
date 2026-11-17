import type { Usuario } from '@/features/usuarios/types'

export interface Session {
  token: string
  usuario: Usuario
}

export type LogoutReason = 'manual' | 'expired'

interface SessionState {
  session: Session | null
  /** Motivo del último cierre, para avisar en el login ("tu sesión expiró"). */
  lastLogout: LogoutReason | null
}

const STORAGE_KEY = 'delivery-reportes.session'

/** Lee `exp` (segundos) del payload del JWT sin verificarlo: solo para programar el logout. */
export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const exp = (JSON.parse(json) as { exp?: unknown }).exp
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

export function isExpired(token: string, now = Date.now()) {
  const expiresAt = tokenExpiresAt(token)
  return expiresAt === null || expiresAt <= now
}

function readStorage(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    if (typeof parsed.token !== 'string' || !parsed.usuario || isExpired(parsed.token)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed as Session
  } catch {
    return null
  }
}

function writeStorage(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // almacenamiento no disponible (modo privado): la sesión vive solo en memoria
  }
}

let state: SessionState = { session: readStorage(), lastLogout: null }
const listeners = new Set<() => void>()

function emit(next: SessionState) {
  state = next
  listeners.forEach((listener) => listener())
}

/** Store externo de la sesión: lo leen React (useSyncExternalStore) y el cliente HTTP. */
export const sessionStore = {
  get: () => state,
  getToken: () => state.session?.token ?? null,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  set(session: Session) {
    writeStorage(session)
    emit({ session, lastLogout: null })
  },
  updateUsuario(usuario: Usuario) {
    if (!state.session) return
    this.set({ ...state.session, usuario })
  },
  clear(reason: LogoutReason) {
    if (!state.session) return
    writeStorage(null)
    emit({ session: null, lastLogout: reason })
  },
  /** Sincroniza con cambios hechos en otra pestaña. */
  syncFromStorage() {
    const session = readStorage()
    if (session?.token === state.session?.token) return
    emit({ session, lastLogout: session ? null : state.session ? 'manual' : state.lastLogout })
  },
}
