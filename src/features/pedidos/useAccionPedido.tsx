import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Checkbox } from '@/components/ui/Field'
import { useToast } from '@/components/ui/useToast'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import { formatGs } from '@/lib/format'
import { useTransicionPedido, type Transicion } from './api'
import { codigoPedido } from './numero'
import type { Pedido } from './types'

/** Lo que el delivery tiene que cobrar, o el aviso de que no cobra nada (CU-11). */
function cobro(pedido: Pedido) {
  return pedido.pagoDirectoVendedor
    ? 'No tenés que cobrar nada: el cliente ya le pagó al vendedor.'
    : `Vas a cobrar ${formatGs(pedido.montoTotal)} a ${pedido.nombreCliente}.`
}

const copy: Record<Transicion, { titulo: (pedido: Pedido) => string; descripcion: (pedido: Pedido) => string; confirmar: string; exito: (pedido: Pedido) => string; conflicto?: string; tone: 'primary' | 'danger' | 'accent' }> = {
  tomar: {
    titulo: (pedido) => `¿Tomar el pedido ${codigoPedido(pedido)}?`,
    descripcion: (pedido) => `Quedará a tu cargo. ${cobro(pedido)}`,
    confirmar: 'Tomar pedido',
    exito: (pedido) => `Pedido ${codigoPedido(pedido)} tomado. ¡Buen viaje!`,
    conflicto: 'El pedido ya no está disponible: otro delivery lo tomó o fue asignado a otro.',
    tone: 'primary',
  },
  entregar: {
    titulo: (pedido) => `¿Marcar el pedido ${codigoPedido(pedido)} como entregado?`,
    descripcion: (pedido) =>
      `Confirmá que entregaste los productos a ${pedido.nombreCliente}. ${
        pedido.pagoDirectoVendedor ? 'El vendedor indicó que el cliente ya le pagó.' : `Tenías que cobrar ${formatGs(pedido.montoTotal)}.`
      } Esta acción no se puede deshacer.`,
    confirmar: 'Sí, fue entregado',
    exito: (pedido) => `Pedido ${codigoPedido(pedido)} marcado como entregado.`,
    conflicto: 'No se pudo marcar: el pedido cambió o fue reasignado a otro delivery.',
    tone: 'accent',
  },
  cancelar: {
    titulo: (pedido) => `¿Cancelar el pedido ${codigoPedido(pedido)}?`,
    descripcion: () => 'El pedido dejará de estar disponible para los deliverys. Esta acción no se puede deshacer.',
    confirmar: 'Cancelar pedido',
    exito: (pedido) => `Pedido ${codigoPedido(pedido)} cancelado.`,
    tone: 'danger',
  },
}

/** Hook con el flujo confirmar → ejecutar → avisar (incluye el 409 de concurrencia). */
export function useAccionPedido() {
  const toast = useToast()
  const mutation = useTransicionPedido()
  const [pendiente, setPendiente] = useState<{ pedido: Pedido; accion: Transicion } | null>(null)
  // Al entregar, el delivery puede corregir quién cobró (CU-08/11).
  const [pagoDirecto, setPagoDirecto] = useState(false)

  function pedir(pedido: Pedido, accion: Transicion) {
    setPagoDirecto(Boolean(pedido.pagoDirectoVendedor))
    setPendiente({ pedido, accion })
  }

  function ejecutar() {
    if (!pendiente) return
    const { pedido, accion } = pendiente
    const corrigePago = accion === 'entregar' && pagoDirecto !== Boolean(pedido.pagoDirectoVendedor)
    mutation.mutate(
      { id: pedido._id, accion, body: corrigePago ? { pagoDirectoVendedor: pagoDirecto } : undefined },
      {
        onSuccess: (actualizado) => toast.success(copy[accion].exito(actualizado)),
        onError: (error) => {
          const conflicto = error instanceof ApiError && error.status === 409
          toast.error(conflicto && copy[accion].conflicto ? copy[accion].conflicto : getErrorMessage(error))
        },
        onSettled: () => setPendiente(null),
      },
    )
  }

  const dialogo = pendiente && (
    <ConfirmDialog
      open
      title={copy[pendiente.accion].titulo(pendiente.pedido)}
      description={copy[pendiente.accion].descripcion(pendiente.pedido)}
      confirmLabel={copy[pendiente.accion].confirmar}
      tone={copy[pendiente.accion].tone}
      loading={mutation.isPending}
      onConfirm={ejecutar}
      onClose={() => !mutation.isPending && setPendiente(null)}
    >
      {pendiente.accion === 'entregar' && (
        <Checkbox
          label="El cliente le pagó directo al vendedor (no cobré nada)"
          checked={pagoDirecto}
          onChange={(event) => setPagoDirecto(event.target.checked)}
          disabled={mutation.isPending}
        />
      )}
    </ConfirmDialog>
  )

  return {
    pedir,
    enCurso: mutation.isPending ? mutation.variables : undefined,
    dialogo,
  }
}
