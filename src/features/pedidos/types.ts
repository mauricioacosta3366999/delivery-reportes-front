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
  /** Producto del catálogo del vendedor (opcional). */
  productoId?: string
  /** Costo de compra del vendedor; el delivery nunca lo recibe. */
  costoUnitario?: number
}

export type AsignadoPor = 'ADMIN' | 'ZONA' | null

export interface Pedido {
  _id: string
  /** Ausente solo en pedidos anteriores a la numeración. */
  numero?: number
  vendedorId: string
  vendedorNombre: string
  vendedorContacto?: string
  fechaPedido: string
  repartidorId: string | null
  /** Quién asignó el delivery mientras está INICIADO: un admin o la zona. */
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
  /** Lo que cobra el delivery al cliente (0 si el cliente ya le pagó al vendedor). */
  montoTotal: number
  montoARendir: number
  pagoDirectoVendedor?: boolean
  /** Costo de los productos para el vendedor; null si ningún producto tiene costo. No llega al delivery. */
  totalCosto?: number | null
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
  /** Solo ADMIN: crea el pedido a nombre de ese vendedor. */
  vendedorId?: string
  /** Solo ADMIN: asigna el delivery (si no, el de la zona, si tiene). */
  repartidorId?: string
  vendedorNombre?: string
  fechaPedido?: string
  nombreCliente: string
  contactoCliente: string
  ubicacionRetiro: Ubicacion
  ubicacionEntrega: Ubicacion
  productos: Producto[]
  observaciones?: string
  pagoDirectoVendedor?: boolean
}

export type UpdatePedidoPayload = Partial<Omit<CreatePedidoPayload, 'vendedorId' | 'repartidorId'>>

/** Filtros de listado. `desde`/`hasta` son fechas calendario (YYYY-MM-DD) inclusivas. */
export interface PedidoFiltros {
  estado?: Estado
  desde?: string
  hasta?: string
  vendedorId?: string
  repartidorId?: string
  /** Solo los que todavía no tienen delivery. */
  sinAsignar?: boolean
  zonaId?: string
  /** Solo en curso: Iniciado (asignado o no) o Tomado. */
  activos?: boolean
  numero?: number
  pagina?: number
  limite?: number
}

/** "Asignado": sigue INICIADO pero ya tiene delivery (lo eligió un admin o la zona). No es un estado en la base. */
export function estaAsignado(pedido: Pick<Pedido, 'estado' | 'repartidorId'>) {
  return pedido.estado === 'INICIADO' && Boolean(pedido.repartidorId)
}

/** "#123"; los pedidos anteriores a la numeración muestran un código corto derivado del id. */
export function etiquetaPedido(pedido: Pick<Pedido, '_id' | 'numero'>) {
  return pedido.numero ? `#${pedido.numero}` : `#${pedido._id.slice(-6).toUpperCase()}`
}
