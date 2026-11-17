import type { Usuario } from '@/features/usuarios/types'
import type { Pedido } from './types'

/** Qué puede hacer cada rol con el pedido en su estado actual (espejo de las reglas del backend). */
export function accionesDisponibles(pedido: Pedido, usuario: Usuario) {
  const { rol, _id } = usuario
  const iniciado = pedido.estado === 'INICIADO' && !pedido.repartidorId
  const esDuenio = rol === 'ADMIN' || (rol === 'VENDEDOR' && pedido.vendedorId === _id)
  return {
    editar: iniciado && esDuenio,
    cancelar: iniciado && esDuenio,
    tomar: iniciado && rol === 'REPARTIDOR',
    entregar: pedido.estado === 'TOMADO' && (rol === 'ADMIN' || (rol === 'REPARTIDOR' && pedido.repartidorId === _id)),
  }
}
