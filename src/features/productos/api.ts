import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api/client'
import type { Paginated } from '@/lib/types'

/** Producto del catálogo de un vendedor (CU-15). Precio de venta y costo, enteros en Gs. */
export interface ProductoCatalogo {
  _id: string
  vendedorId: string
  nombre: string
  precioVenta: number
  costo: number
  /** false = archivado: no aparece al cargar pedidos. */
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductoInput {
  nombre: string
  precioVenta: number
  costo: number
  activo?: boolean
  /** Solo ADMIN, obligatorio al crear; no se edita. */
  vendedorId?: string
}

export interface ProductoFiltros {
  q?: string
  activo?: boolean
  /** Solo ADMIN: el catálogo de ese vendedor. El vendedor siempre ve el suyo. */
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

export function useProductos(filtros: ProductoFiltros, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: productoKeys.list(filtros),
    queryFn: () => productosApi.list(filtros),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
    staleTime: 30_000,
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
