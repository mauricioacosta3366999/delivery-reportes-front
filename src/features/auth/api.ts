import { apiFetch } from '@/lib/api/client'
import type { Usuario } from '@/features/usuarios/types'
import type { Session } from './session'

export interface LoginInput {
  correo: string
  password: string
}

export interface RegisterInput {
  nombre: string
  correo: string
  password: string
  rol: 'VENDEDOR' | 'REPARTIDOR'
  contacto?: string
}

export const authApi = {
  login: (input: LoginInput) => apiFetch<Session>('/auth/login', { method: 'POST', body: input, auth: false }),
  register: (input: RegisterInput) => apiFetch<Session>('/auth/register', { method: 'POST', body: input, auth: false }),
  me: () => apiFetch<Usuario>('/auth/me'),
}
