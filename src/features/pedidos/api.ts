import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import { finDiaExclusivoISO, inicioDiaISO } from '@/lib/format'
import type { Paginated } from '@/lib/types'
import type { CreatePedidoPayload, Pedido, PedidoFiltros, UpdatePedidoPayload } from './types'

export type Transicion = 'tomar' | 'entregar' | 'cancelar'
/** Solo "entregar" admite body: corregir si el cliente le pagó directo al vendedor. */
export interface TransicionBody {
  pagoDirectoVendedor?: boolean
}

/** Traduce los filtros de UI (días calendario) al contrato de la API (ISO con offset, [desde, hasta)). */
export function toListQuery({ desde, hasta, activos, sinAsignar, ...rest }: PedidoFiltros) {
  return {
    ...rest,
    activos: activos ? 'true' : undefined,
    sinAsignar: sinAsignar && !rest.repartidorId ? 'true' : undefined,
    desde: desde ? inicioDiaISO(desde) : undefined,
    hasta: hasta ? finDiaExclusivoISO(hasta) : undefined,
  }
}

/** Pedidos en curso (Iniciado o Tomado) por delivery y zona; solo ADMIN. */
export interface ConteoActivos {
  total: number
  asignados: number
  tomados: number
}
export interface ZonaResumen extends ConteoActivos {
  zonaId: string
  zonaNombre: string
}
export interface DeliveryResumen extends ConteoActivos {
  repartidorId: string
  nombre: string
  contacto: string
  activo: boolean
  zonas: ZonaResumen[]
}
export interface ResumenDeliverys {
  datos: DeliveryResumen[]
  sinAsignar: ConteoActivos & { zonas: ZonaResumen[] }
}

export const pedidosApi = {
  list: (filtros: PedidoFiltros) => apiFetch<Paginated<Pedido>>('/pedidos', { query: toListQuery(filtros) }),
  get: (id: string) => apiFetch<Pedido>(`/pedidos/${id}`),
  create: (payload: CreatePedidoPayload) => apiFetch<Pedido>('/pedidos', { method: 'POST', body: payload }),
  update: (id: string, payload: UpdatePedidoPayload) => apiFetch<Pedido>(`/pedidos/${id}`, { method: 'PATCH', body: payload }),
  // Sin body salvo la corrección de pago al entregar: el backend rechaza cualquier otro campo.
  transicion: (id: string, accion: Transicion, body?: TransicionBody) =>
    apiFetch<Pedido>(`/pedidos/${id}/${accion}`, { method: 'POST', ...(body ? { body } : {}) }),
  /** null desasigna: vuelve a quedar disponible para todos los deliverys. */
  asignar: (id: string, repartidorId: string | null) =>
    apiFetch<Pedido>(`/pedidos/${id}/asignar`, { method: 'POST', body: { repartidorId } }),
  resumenDeliverys: () => apiFetch<ResumenDeliverys>('/pedidos/resumen-deliverys'),
}

export const pedidoKeys = {
  lists: ['pedidos'] as const,
  list: (filtros: PedidoFiltros) => ['pedidos', filtros] as const,
  detail: (id: string) => ['pedido', id] as const,
  resumen: ['pedidos', 'resumen-deliverys'] as const,
}

export function usePedidos(filtros: PedidoFiltros, options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: pedidoKeys.list(filtros),
    queryFn: () => pedidosApi.list(filtros),
    placeholderData: keepPreviousData,
    refetchInterval: options.refetchInterval,
  })
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

export function useTransicionPedido() {
  const sync = useSyncPedido()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, accion, body }: { id: string; accion: Transicion; body?: TransicionBody }) => pedidosApi.transicion(id, accion, body),
    onSuccess: sync,
    // Un 409 significa que el pedido cambió: refrescar para mostrar el estado real.
    onError: (_error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: pedidoKeys.lists })
      void queryClient.invalidateQueries({ queryKey: pedidoKeys.detail(id) })
    },
  })
}

export function useAsignarPedido() {
  const sync = useSyncPedido()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, repartidorId }: { id: string; repartidorId: string | null }) => pedidosApi.asignar(id, repartidorId),
    onSuccess: async (pedido) => {
      await sync(pedido)
      // Los contadores de las zonas también cambian.
      void queryClient.invalidateQueries({ queryKey: ['zonas'] })
    },
    onError: (_error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: pedidoKeys.lists })
      void queryClient.invalidateQueries({ queryKey: pedidoKeys.detail(id) })
    },
  })
}

export function useResumenDeliverys() {
  return useQuery({ queryKey: pedidoKeys.resumen, queryFn: pedidosApi.resumenDeliverys, refetchInterval: 60_000 })
}
