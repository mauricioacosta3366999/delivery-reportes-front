import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { apiFetch } from '@/lib/api/client'
import type { Paginated } from '@/lib/types'
import type { Rol, Usuario } from './types'

export interface UsuarioInput {
  nombre: string
  correo: string
  password: string
  rol: Rol
  contacto?: string
  activo?: boolean
}

export interface UsuarioFiltros {
  rol?: Rol
  activo?: boolean
  pagina?: number
  limite?: number
}

export const usuariosApi = {
  list: (filtros: UsuarioFiltros) => apiFetch<Paginated<Usuario>>('/usuarios', { query: { ...filtros } }),
  create: (input: UsuarioInput) => apiFetch<Usuario>('/usuarios', { method: 'POST', body: input }),
  update: (id: string, input: Partial<UsuarioInput>) => apiFetch<Usuario>(`/usuarios/${id}`, { method: 'PATCH', body: input }),
}

export const usuarioKeys = {
  all: ['usuarios'] as const,
  list: (filtros: UsuarioFiltros) => ['usuarios', filtros] as const,
}

export function useUsuarios(filtros: UsuarioFiltros, enabled = true) {
  return useQuery({
    queryKey: usuarioKeys.list(filtros),
    queryFn: () => usuariosApi.list(filtros),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Usuarios de un rol para selectores y para mostrar nombres (solo ADMIN). */
export function useUsuariosPorRol(rol: Rol, enabled = true) {
  const query = useQuery({
    queryKey: usuarioKeys.list({ rol, limite: 100 }),
    queryFn: () => usuariosApi.list({ rol, limite: 100 }),
    select: (data) => data.datos,
    staleTime: 60_000,
    enabled,
  })
  const porId = useMemo(() => new Map((query.data ?? []).map((usuario) => [usuario._id, usuario])), [query.data])
  return { ...query, porId }
}

export function useGuardarUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: Partial<UsuarioInput> }) =>
      id ? usuariosApi.update(id, input) : usuariosApi.create(input as UsuarioInput),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usuarioKeys.all }),
  })
}
