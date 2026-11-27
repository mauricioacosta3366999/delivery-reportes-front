import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import type { Paginated } from '@/lib/types'

/** Producto del catálogo de un vendedor: precio de venta al cliente y costo de compra del vendedor. */
export interface ProductoCatalogo {
  _id: string
  vendedorId: string
  nombre: string
  precioVenta: number
  costo: number
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductoInput {
  nombre: string
  precioVenta: number
  costo: number
  activo?: boolean
  /** Solo ADMIN: dueño del producto. */
  vendedorId?: string
}

export interface ProductoFiltros {
  q?: string
  activo?: boolean
  vendedorId?: string
  pagina?: number
  limite?: number
}

export const productosApi = {
  list: (filtros: ProductoFiltros) => apiFetch<Paginated<ProductoCatalogo>>('/productos', { query: { ...filtros } }),
  create: (input: ProductoInput) => apiFetch<ProductoCatalogo>('/productos', { method: 'POST', body: input }),
  update: (id: string, input: Partial<Omit<ProductoInput, 'vendedorId'>>) =>
    apiFetch<ProductoCatalogo>(`/productos/${id}`, { method: 'PATCH', body: input }),
}

export const productoKeys = {
  all: ['productos'] as const,
  list: (filtros: ProductoFiltros) => ['productos', filtros] as const,
}

export function useProductos(filtros: ProductoFiltros) {
  return useQuery({ queryKey: productoKeys.list(filtros), queryFn: () => productosApi.list(filtros), placeholderData: keepPreviousData })
}

/** Catálogo activo de un vendedor para elegir productos al cargar un pedido (hasta 100). */
export function useCatalogo(vendedorId: string | undefined, enabled = true) {
  const filtros: ProductoFiltros = { activo: true, limite: 100, ...(vendedorId ? { vendedorId } : {}) }
  return useQuery({
    queryKey: productoKeys.list(filtros),
    queryFn: () => productosApi.list(filtros),
    select: (data) => data.datos,
    staleTime: 60_000,
    enabled,
  })
}

export function useGuardarProducto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: Partial<ProductoInput> }) =>
      id ? productosApi.update(id, input) : productosApi.create(input as ProductoInput),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productoKeys.all }),
  })
}
