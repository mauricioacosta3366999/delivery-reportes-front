import { useContext } from 'react'
import type { Rol, Usuario } from '@/features/usuarios/types'
import { AuthContext } from './context'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}

/** Usuario autenticado; solo usar dentro de rutas protegidas. */
export function useUsuario(): Usuario {
  const { usuario } = useAuth()
  if (!usuario) throw new Error('useUsuario requiere una sesión activa')
  return usuario
}

export function homePath(rol: Rol) {
  switch (rol) {
    case 'VENDEDOR':
      return '/pedidos'
    case 'REPARTIDOR':
      return '/entregas'
    case 'ADMIN':
      return '/admin/pedidos'
  }
}
