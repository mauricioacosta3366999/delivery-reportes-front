import type { Usuario } from '@/features/usuarios/types'
import type { Pedido } from './types'

/** Qué puede hacer cada rol con el pedido en su estado actual (espejo de las reglas del backend). */
export function accionesDisponibles(pedido: Pedido, usuario: Usuario) {
  const { rol, _id } = usuario
  const iniciado = pedido.estado === 'INICIADO'
  const esDuenio = rol === 'ADMIN' || (rol === 'VENDEDOR' && pedido.vendedorId === _id)
  return {
    // Asignado a un delivery sigue siendo editable hasta que lo tomen.
    editar: iniciado && esDuenio,
    cancelar: iniciado && esDuenio,
    tomar: iniciado && rol === 'REPARTIDOR' && (!pedido.repartidorId || pedido.repartidorId === _id),
    entregar: pedido.estado === 'TOMADO' && (rol === 'ADMIN' || (rol === 'REPARTIDOR' && pedido.repartidorId === _id)),
    asignar: rol === 'ADMIN' && (iniciado || pedido.estado === 'TOMADO'),
  }
}
