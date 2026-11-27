import { z } from 'zod'
import { toISODate } from '@/lib/format'
import type { CreatePedidoPayload, Pedido, Producto, Ubicacion, UpdatePedidoPayload } from './types'
import { normalizarEntrega, UBICACION_RETIRO } from './ubicacion'

const requerido = (max: number, campo = 'Este campo') =>
  z.string().trim().min(1, `${campo} es obligatorio`).max(max, `Máximo ${max} caracteres`)

/**
 * Entrega: un solo campo que acepta una dirección o un link de Google Maps
 * (las coordenadas, si el link las trae, se extraen al armar el payload).
 */
const entregaSchema = z
  .object({ direccion: z.string() })
  .superRefine((value, ctx) => {
    const normalizada = normalizarEntrega(value.direccion)
    if (!normalizada.ok) ctx.addIssue({ code: 'custom', path: ['direccion'], message: normalizada.error })
  })

const entero = (min: number, max: number, campo: string) =>
  z
    .number({ error: `Ingresá ${campo}` })
    .int('Debe ser un número entero')
    .min(min, `Mínimo ${min.toLocaleString('es-PY')}`)
    .max(max, `Máximo ${max.toLocaleString('es-PY')}`)

/**
 * Reglas espejo de POST /pedidos (pedido.validation.ts del backend). El retiro es fijo
 * y vendedorNombre no se envía: el backend usa el nombre del usuario autenticado.
 */
export const pedidoFormSchema = z.object({
  zonaId: z.string().min(1, 'Elegí una zona'),
  fechaPedido: z.iso.date('Fecha inválida'),
  nombreCliente: requerido(150, 'El nombre del cliente'),
  contactoCliente: requerido(100, 'El contacto'),
  ubicacionEntrega: entregaSchema,
  productos: z
    .array(
      z.object({
        nombre: requerido(150, 'El producto'),
        cantidad: entero(1, 10_000, 'una cantidad'),
        precioUnitario: entero(0, 1_000_000_000, 'un precio'),
        /** '' = escrito a mano (no viene del catálogo). */
        productoId: z.string(),
        /** NaN = sin costo cargado (es opcional). */
        costoUnitario: z.union([z.nan(), entero(0, 1_000_000_000, 'un costo')]),
      }),
    )
    .min(1, 'Agregá al menos un producto')
    .max(100, 'Máximo 100 productos'),
  observaciones: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
  pagoDirectoVendedor: z.boolean(),
  /** Solo al crear desde el admin: '' = a nombre de quien lo carga. */
  vendedorId: z.string(),
  /** Solo al crear desde el admin: '' = automático (el delivery por defecto de la zona, si tiene). */
  repartidorId: z.string(),
})

export type PedidoFormValues = z.infer<typeof pedidoFormSchema>
type EntregaForm = PedidoFormValues['ubicacionEntrega']

export const CAMPOS_PEDIDO = Object.keys(pedidoFormSchema.shape)

export function productoVacio(): PedidoFormValues['productos'][number] {
  return { nombre: '', cantidad: 1, precioUnitario: Number.NaN, productoId: '', costoUnitario: Number.NaN }
}

export function pedidoFormDefaults(): PedidoFormValues {
  return {
    zonaId: '',
    fechaPedido: toISODate(),
    nombreCliente: '',
    contactoCliente: '',
    ubicacionEntrega: { direccion: '' },
    productos: [productoVacio()],
    observaciones: '',
    pagoDirectoVendedor: false,
    vendedorId: '',
    repartidorId: '',
  }
}

export function pedidoToForm(pedido: Pedido): PedidoFormValues {
  return {
    zonaId: pedido.zonaId,
    fechaPedido: toISODate(pedido.fechaPedido),
    nombreCliente: pedido.nombreCliente,
    contactoCliente: pedido.contactoCliente,
    ubicacionEntrega: { direccion: pedido.ubicacionEntrega.direccion },
    productos: pedido.productos.map(({ nombre, cantidad, precioUnitario, productoId, costoUnitario }) => ({
      nombre,
      cantidad,
      precioUnitario,
      productoId: productoId ?? '',
      costoUnitario: costoUnitario ?? Number.NaN,
    })),
    observaciones: pedido.observaciones ?? '',
    pagoDirectoVendedor: pedido.pagoDirectoVendedor ?? false,
    vendedorId: '',
    repartidorId: '',
  }
}

/** Ubicación de entrega para la API, con las coordenadas del link de Maps si las trae. */
export function entregaToPayload({ direccion }: EntregaForm): Ubicacion {
  const normalizada = normalizarEntrega(direccion)
  // El schema ya validó; el fallback solo cubre llamadas directas sin validar.
  if (!normalizada.ok) return { direccion: direccion.trim() }
  return normalizada.coordenadas ? { direccion: normalizada.direccion, coordenadas: normalizada.coordenadas } : { direccion: normalizada.direccion }
}

function productosToPayload(productos: PedidoFormValues['productos']): Producto[] {
  return productos.map(({ nombre, cantidad, precioUnitario, productoId, costoUnitario }) => ({
    nombre: nombre.trim(),
    cantidad,
    precioUnitario,
    ...(productoId ? { productoId } : {}),
    ...(Number.isFinite(costoUnitario) ? { costoUnitario } : {}),
  }))
}

/**
 * Arma el body de POST /pedidos. Nunca incluye importes ni estado (los calcula
 * el servidor) y omite los opcionales vacíos, porque la API es estricta.
 */
export function toCreatePayload(values: PedidoFormValues): CreatePedidoPayload {
  const observaciones = values.observaciones.trim()
  return {
    zonaId: values.zonaId,
    fechaPedido: values.fechaPedido,
    nombreCliente: values.nombreCliente.trim(),
    contactoCliente: values.contactoCliente.trim(),
    ubicacionRetiro: UBICACION_RETIRO,
    ubicacionEntrega: entregaToPayload(values.ubicacionEntrega),
    productos: productosToPayload(values.productos),
    ...(observaciones ? { observaciones } : {}),
    ...(values.pagoDirectoVendedor ? { pagoDirectoVendedor: true } : {}),
    ...(values.vendedorId ? { vendedorId: values.vendedorId } : {}),
    ...(values.repartidorId ? { repartidorId: values.repartidorId } : {}),
  }
}

/** Body de PATCH /pedidos/:id con solo los campos que cambiaron (el retiro no se edita). */
export function toUpdatePayload(values: PedidoFormValues, original: PedidoFormValues): UpdatePedidoPayload {
  const payload: UpdatePedidoPayload = {}
  const changed = <K extends keyof PedidoFormValues>(key: K) => JSON.stringify(values[key]) !== JSON.stringify(original[key])

  if (changed('zonaId')) payload.zonaId = values.zonaId
  if (changed('fechaPedido')) payload.fechaPedido = values.fechaPedido
  if (changed('nombreCliente')) payload.nombreCliente = values.nombreCliente.trim()
  if (changed('contactoCliente')) payload.contactoCliente = values.contactoCliente.trim()
  if (changed('ubicacionEntrega')) payload.ubicacionEntrega = entregaToPayload(values.ubicacionEntrega)
  if (changed('productos')) payload.productos = productosToPayload(values.productos)
  if (values.observaciones.trim() !== original.observaciones.trim()) payload.observaciones = values.observaciones.trim()
  if (changed('pagoDirectoVendedor')) payload.pagoDirectoVendedor = values.pagoDirectoVendedor
  return payload
}

/** Costo de los productos para el vendedor (solo los que tienen costo); null si ninguno lo tiene. */
export function calcularCosto(productos: Array<Partial<Producto>>) {
  const conCosto = productos.filter((item) => Number.isFinite(item.costoUnitario))
  if (!conCosto.length) return null
  return conCosto.reduce((total, item) => total + (Number.isFinite(item.cantidad) ? Number(item.cantidad) : 0) * Number(item.costoUnitario), 0)
}

/** Importes que mostrará el servidor; en el front son solo una vista previa. */
export function calcularMontos(productos: Array<Partial<Producto>>, costoDelivery: number, pagoDirectoVendedor = false) {
  const totalVenta = productos.reduce((total, item) => {
    const cantidad = Number.isFinite(item.cantidad) ? Number(item.cantidad) : 0
    const precio = Number.isFinite(item.precioUnitario) ? Number(item.precioUnitario) : 0
    return total + cantidad * precio
  }, 0)
  // Si el cliente ya le pagó al vendedor, el delivery no cobra y el vendedor debe el delivery.
  if (pagoDirectoVendedor) return { totalVenta, costoDelivery, montoTotal: 0, montoARendir: -costoDelivery }
  return { totalVenta, costoDelivery, montoTotal: totalVenta + costoDelivery, montoARendir: totalVenta }
}
