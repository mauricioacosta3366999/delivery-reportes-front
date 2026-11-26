import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import type { Paginated } from '@/lib/types'

export interface Zona {
  _id: string
  nombre: string
  descripcion: string
  costoDelivery: number
  requiereTransportadora: boolean
  /** Delivery al que se asignan solos los pedidos nuevos de la zona (CU-13). */
  repartidorDefaultId?: string | null
  /** Pedidos en curso de la zona; solo viene para el ADMIN (CU-14). */
  pedidosActivos?: number
  activa: boolean
  createdAt: string
  updatedAt: string
}

export interface ZonaInput {
  nombre: string
  descripcion?: string
  costoDelivery: number
  requiereTransportadora?: boolean
  repartidorDefaultId?: string | null
  activa?: boolean
}

export interface ZonaFiltros {
  activa?: boolean
  pagina?: number
  limite?: number
}

export const zonasApi = {
  list: (filtros: ZonaFiltros) => apiFetch<Paginated<Zona>>('/zonas', { query: { ...filtros } }),
  create: (input: ZonaInput) => apiFetch<Zona>('/zonas', { method: 'POST', body: input }),
  update: (id: string, input: Partial<ZonaInput>) => apiFetch<Zona>(`/zonas/${id}`, { method: 'PATCH', body: input }),
}

export const zonaKeys = {
  all: ['zonas'] as const,
  list: (filtros: ZonaFiltros) => ['zonas', filtros] as const,
}

export function useZonas(filtros: ZonaFiltros) {
  return useQuery({ queryKey: zonaKeys.list(filtros), queryFn: () => zonasApi.list(filtros), placeholderData: keepPreviousData })
}

/** Zonas activas para el desplegable del pedido (la API permite hasta 100 por página). */
export function useZonasActivas() {
  return useQuery({
    queryKey: zonaKeys.list({ activa: true, limite: 100 }),
    queryFn: () => zonasApi.list({ activa: true, limite: 100 }),
    select: (data) => data.datos,
    staleTime: 60_000,
  })
}

export function useGuardarZona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: Partial<ZonaInput> }) =>
      id ? zonasApi.update(id, input) : zonasApi.create(input as ZonaInput),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: zonaKeys.all }),
  })
}
