import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import { finDiaExclusivoISO, inicioDiaISO } from '@/lib/format'
import type { Paginated } from '@/lib/types'
import type { CreatePedidoPayload, Pedido, PedidoFiltros, UpdatePedidoPayload } from './types'

export type Transicion = 'tomar' | 'entregar' | 'cancelar'

/** Traduce los filtros de UI (días calendario) al contrato de la API (ISO con offset, [desde, hasta)). */
export function toListQuery({ desde, hasta, ...rest }: PedidoFiltros) {
  return {
    ...rest,
    desde: desde ? inicioDiaISO(desde) : undefined,
    hasta: hasta ? finDiaExclusivoISO(hasta) : undefined,
  }
}

export const pedidosApi = {
  list: (filtros: PedidoFiltros) => apiFetch<Paginated<Pedido>>('/pedidos', { query: toListQuery(filtros) }),
  get: (id: string) => apiFetch<Pedido>(`/pedidos/${id}`),
  create: (payload: CreatePedidoPayload) => apiFetch<Pedido>('/pedidos', { method: 'POST', body: payload }),
  update: (id: string, payload: UpdatePedidoPayload) => apiFetch<Pedido>(`/pedidos/${id}`, { method: 'PATCH', body: payload }),
  // Las transiciones no llevan body: el backend rechaza campos desconocidos.
  transicion: (id: string, accion: Transicion) => apiFetch<Pedido>(`/pedidos/${id}/${accion}`, { method: 'POST' }),
  /** CU-12: asignar, cambiar o liberar (`null`) el delivery. Solo ADMIN. */
  resumenDeliverys: () => apiFetch<ResumenDeliverys>('/pedidos/resumen-deliverys'),
  asignar: (id: string, repartidorId: string | null) => apiFetch<Pedido>(`/pedidos/${id}/asignar`, { method: 'POST', body: { repartidorId } }),
}

/** Carga en curso (Iniciado asignado + Tomado) por delivery y por zona (CU-14). */
export interface CargaZona {
  zonaId: string
  zonaNombre: string
  total: number
  asignados: number
  tomados: number
}

export interface CargaDelivery {
  repartidorId: string
  nombre: string
  contacto?: string
  activo: boolean
  total: number
  asignados: number
  tomados: number
  zonas: CargaZona[]
}

export interface ResumenDeliverys {
  datos: CargaDelivery[]
  sinAsignar: Omit<CargaDelivery, 'repartidorId' | 'nombre' | 'contacto' | 'activo'>
}

export const pedidoKeys = {
  lists: ['pedidos'] as const,
  list: (filtros: PedidoFiltros) => ['pedidos', filtros] as const,
  detail: (id: string) => ['pedido', id] as const,
}

export function usePedidos(filtros: PedidoFiltros, options: { refetchInterval?: number; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: pedidoKeys.list(filtros),
    queryFn: () => pedidosApi.list(filtros),
    placeholderData: keepPreviousData,
    refetchInterval: options.refetchInterval,
    enabled: options.enabled,
  })
}

/** CU-14 (solo ADMIN). Comparte el prefijo 'pedidos': se invalida con cada cambio de pedido. */
export function useResumenDeliverys() {
  return useQuery({ queryKey: ['pedidos', 'resumen-deliverys'], queryFn: pedidosApi.resumenDeliverys })
}

export function usePedido(id: string) {
  return useQuery({ queryKey: pedidoKeys.detail(id), queryFn: () => pedidosApi.get(id) })
}

function useSyncPedido() {
  const queryClient = useQueryClient()
  return (pedido: Pedido) => {
    queryClient.setQueryData(pedidoKeys.detail(pedido._id), pedido)
    return queryClient.invalidateQueries({ queryKey: pedidoKeys.lists })
  }
}

export function useCrearPedido() {
  const sync = useSyncPedido()
  return useMutation({ mutationFn: pedidosApi.create, onSuccess: sync })
}

export function useActualizarPedido(id: string) {
  const sync = useSyncPedido()
  return useMutation({ mutationFn: (payload: UpdatePedidoPayload) => pedidosApi.update(id, payload), onSuccess: sync })
}

/** CU-12: el 409 significa que el pedido cambió (entregado, cancelado o reasignado en paralelo). */
export function useAsignarPedido() {
  const sync = useSyncPedido()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, repartidorId }: { id: string; repartidorId: string | null }) => pedidosApi.asignar(id, repartidorId),
    onSuccess: sync,
    onError: (_error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: pedidoKeys.lists })
      void queryClient.invalidateQueries({ queryKey: pedidoKeys.detail(id) })
    },
  })
}

export function useTransicionPedido() {
  const sync = useSyncPedido()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, accion }: { id: string; accion: Transicion }) => pedidosApi.transicion(id, accion),
    onSuccess: sync,
    // Un 409 significa que el pedido cambió: refrescar para mostrar el estado real.
    onError: (_error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: pedidoKeys.lists })
      void queryClient.invalidateQueries({ queryKey: pedidoKeys.detail(id) })
    },
  })
}
