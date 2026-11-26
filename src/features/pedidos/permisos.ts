import type { Usuario } from '@/features/usuarios/types'
import type { Pedido } from './types'

/** INICIADO con delivery: asignado por un admin o por la zona, pero todavía nadie lo retiró. */
export function estaAsignado(pedido: Pedido) {
  return pedido.estado === 'INICIADO' && Boolean(pedido.repartidorId)
}

/** Qué puede hacer cada rol con el pedido en su estado actual (espejo de las reglas del backend). */
export function accionesDisponibles(pedido: Pedido, usuario: Usuario) {
  const { rol, _id } = usuario
  const iniciado = pedido.estado === 'INICIADO'
  const esDuenio = rol === 'ADMIN' || (rol === 'VENDEDOR' && pedido.vendedorId === _id)
  const esMio = pedido.repartidorId === _id
  return {
    // Un pedido asignado sigue siendo editable hasta que el delivery lo toma.
    editar: iniciado && esDuenio,
    cancelar: iniciado && esDuenio,
    tomar: iniciado && rol === 'REPARTIDOR' && (!pedido.repartidorId || esMio),
    entregar: pedido.estado === 'TOMADO' && (rol === 'ADMIN' || (rol === 'REPARTIDOR' && esMio)),
    asignar: rol === 'ADMIN' && (pedido.estado === 'INICIADO' || pedido.estado === 'TOMADO'),
    // CU-17: solo en zonas con transportadora, con el pedido tomado o entregado, por su delivery o un admin.
    subirBoleta:
      pedido.zonaRequiereTransportadora &&
      (pedido.estado === 'TOMADO' || pedido.estado === 'ENTREGADO') &&
      (rol === 'ADMIN' || (rol === 'REPARTIDOR' && esMio)),
  }
}
