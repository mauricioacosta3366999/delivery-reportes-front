import { Navigate, Outlet, useLocation } from 'react-router'
import type { Rol } from '@/features/usuarios/types'
import { homePath, useAuth } from './useAuth'

/** Rutas privadas: sin sesión, al login recordando a dónde quería ir. */
export function RequireAuth() {
  const { usuario } = useAuth()
  const location = useLocation()
  if (!usuario) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** Rutas por rol: si no corresponde, al inicio de su rol. */
export function RequireRole({ roles }: { roles: Rol[] }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  if (!roles.includes(usuario.rol)) return <Navigate to={homePath(usuario.rol)} replace />
  return <Outlet />
}

/** Login/registro: con sesión activa no tiene sentido verlos. */
export function PublicOnly() {
  const { usuario } = useAuth()
  if (usuario) return <Navigate to={homePath(usuario.rol)} replace />
  return <Outlet />
}

export function HomeRedirect() {
  const { usuario } = useAuth()
  return <Navigate to={usuario ? homePath(usuario.rol) : '/login'} replace />
}
