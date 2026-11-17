export const ESTADOS = ['INICIADO', 'TOMADO', 'ENTREGADO', 'CANCELADO'] as const
export type Estado = (typeof ESTADOS)[number]

/** Etiquetas visibles de cada estado: cambiar aquí si el negocio prefiere otros nombres. */
export const estadoLabels: Record<Estado, string> = {
  INICIADO: 'Iniciado',
  TOMADO: 'Tomado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

export interface Coordenadas {
  latitud: number
  longitud: number
}

export interface Ubicacion {
  direccion: string
  coordenadas?: Coordenadas | null
}

export interface Producto {
  nombre: string
  cantidad: number
  precioUnitario: number
}

export interface Pedido {
  _id: string
  vendedorId: string
  vendedorNombre: string
  fechaPedido: string
  repartidorId: string | null
  zonaId: string
  zonaNombre: string
  zonaRequiereTransportadora: boolean
  nombreCliente: string
  contactoCliente: string
  ubicacionRetiro: Ubicacion
  ubicacionEntrega: Ubicacion
  productos: Producto[]
  costoDelivery: number
  totalVenta: number
  montoTotal: number
  montoARendir: number
  estado: Estado
  observaciones: string
  tomadoAt: string | null
  entregadoAt: string | null
  canceladoAt: string | null
  createdAt: string
  updatedAt: string
}

/** Body aceptado por POST /pedidos (el backend rechaza cualquier otro campo). */
export interface CreatePedidoPayload {
  zonaId: string
  vendedorNombre?: string
  fechaPedido?: string
  nombreCliente: string
  contactoCliente: string
  ubicacionRetiro: Ubicacion
  ubicacionEntrega: Ubicacion
  productos: Producto[]
  observaciones?: string
}

export type UpdatePedidoPayload = Partial<CreatePedidoPayload>

/** Filtros de listado. `desde`/`hasta` son fechas calendario (YYYY-MM-DD) inclusivas. */
export interface PedidoFiltros {
  estado?: Estado
  desde?: string
  hasta?: string
  vendedorId?: string
  repartidorId?: string
  pagina?: number
  limite?: number
}
