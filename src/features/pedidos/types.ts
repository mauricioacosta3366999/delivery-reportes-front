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
  /** Vínculo al catálogo del vendedor (CU-15). */
  productoId?: string
  /** Costo de compra del vendedor; el delivery nunca lo recibe. */
  costoUnitario?: number
}

/** Quién dejó el pedido asignado mientras sigue INICIADO (CU-12/13). */
export type AsignadoPor = 'ADMIN' | 'ZONA' | null

export interface Pedido {
  _id: string
  /** Correlativo; falta en pedidos anteriores a la numeración sin migrar. */
  numero?: number
  vendedorId: string
  vendedorNombre: string
  vendedorContacto?: string
  fechaPedido: string
  repartidorId: string | null
  asignadoPor?: AsignadoPor
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
  /** Σ cantidad × costoUnitario; null sin costos cargados. No viene para el delivery. */
  totalCosto?: number | null
  /** El cliente le pagó al vendedor (CU-11): el delivery no cobra. */
  pagoDirectoVendedor?: boolean
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
  pagoDirectoVendedor?: boolean
  /** Solo ADMIN (CU-10): el pedido queda a nombre de ese vendedor. */
  vendedorId?: string
  /** Solo ADMIN (CU-12): sin esto se usa el delivery por defecto de la zona. */
  repartidorId?: string
}

/** El dueño y la asignación no se editan por PATCH. */
export type UpdatePedidoPayload = Partial<Omit<CreatePedidoPayload, 'vendedorId' | 'repartidorId'>>

/** Filtros de listado. `desde`/`hasta` son fechas calendario (YYYY-MM-DD) inclusivas. */
export interface PedidoFiltros {
  estado?: Estado
  numero?: number
  zonaId?: string
  /** Solo en curso: INICIADO (asignado o no) o TOMADO. */
  activos?: boolean
  /** Solo los que no tienen delivery; la API lo ignora si viene repartidorId. */
  sinAsignar?: boolean
  desde?: string
  hasta?: string
  vendedorId?: string
  repartidorId?: string
  pagina?: number
  limite?: number
}
