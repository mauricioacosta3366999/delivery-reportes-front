import { createContext } from 'react'
import type { Usuario } from '@/features/usuarios/types'
import type { LoginInput, RegisterInput } from './api'
import type { LogoutReason } from './session'

export interface AuthContextValue {
  usuario: Usuario | null
  lastLogout: LogoutReason | null
  login: (input: LoginInput) => Promise<Usuario>
  register: (input: RegisterInput) => Promise<Usuario>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
