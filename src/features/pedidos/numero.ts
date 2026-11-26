import type { Pedido } from './types'

/**
 * Número visible del pedido: `#57`. Los pedidos anteriores a la numeración (sin migrar)
 * muestran un código corto derivado del ID, para poder nombrarlos igual.
 */
export function codigoPedido(pedido: Pick<Pedido, '_id' | 'numero'>) {
  return pedido.numero ? `#${pedido.numero}` : `#${pedido._id.slice(-6).toUpperCase()}`
}
