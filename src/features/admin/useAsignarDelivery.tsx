import { useState } from 'react'
import type { Pedido } from '@/features/pedidos/types'
import { AsignarDeliveryDialog } from './AsignarDeliveryDialog'

/** Abre el diálogo de asignación para un pedido; `dialogo` se renderiza en la página. */
export function useAsignarDelivery() {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  return {
    abrir: setPedido,
    dialogo: pedido && <AsignarDeliveryDialog pedido={pedido} onClose={() => setPedido(null)} />,
  }
}

