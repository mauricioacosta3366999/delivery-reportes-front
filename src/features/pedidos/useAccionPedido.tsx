import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Checkbox } from '@/components/ui/Field'
import { useToast } from '@/components/ui/useToast'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import { formatGs } from '@/lib/format'
import { useTransicionPedido, type Transicion } from './api'
import { etiquetaPedido, type Pedido } from './types'

const copy: Record<Transicion, { titulo: string; descripcion: (pedido: Pedido) => string; confirmar: string; exito: string; tone: 'primary' | 'danger' | 'accent' }> = {
  tomar: {
    titulo: '¿Tomar este pedido?',
    descripcion: (pedido) =>
      pedido.pagoDirectoVendedor
        ? `Pedido ${etiquetaPedido(pedido)}. Quedará asignado a vos. No tenés que cobrarle a ${pedido.nombreCliente}: ya le pagó al vendedor.`
        : `Pedido ${etiquetaPedido(pedido)}. Quedará asignado a vos. Vas a cobrar ${formatGs(pedido.montoTotal)} a ${pedido.nombreCliente}.`,
    confirmar: 'Tomar pedido',
    exito: 'Pedido tomado. ¡Buen viaje!',
    tone: 'primary',
  },
  entregar: {
    titulo: '¿Marcar como entregado?',
    descripcion: (pedido) => `Confirmá que entregaste el pedido ${etiquetaPedido(pedido)} a ${pedido.nombreCliente}. Esta acción no se puede deshacer.`,
    confirmar: 'Sí, fue entregado',
    exito: 'Pedido marcado como entregado.',
    tone: 'accent',
  },
  cancelar: {
    titulo: '¿Cancelar este pedido?',
    descripcion: () => 'El pedido dejará de estar disponible para los deliverys. Esta acción no se puede deshacer.',
    confirmar: 'Cancelar pedido',
    exito: 'Pedido cancelado.',
    tone: 'danger',
  },
}

/** Hook con el flujo confirmar → ejecutar → avisar (incluye el 409 de concurrencia). */
export function useAccionPedido() {
  const toast = useToast()
  const mutation = useTransicionPedido()
  const [pendiente, setPendiente] = useState<{ pedido: Pedido; accion: Transicion; pagoDirecto: boolean } | null>(null)

  function ejecutar() {
    if (!pendiente) return
    const { pedido, accion, pagoDirecto } = pendiente
    // Solo se envía si el delivery corrigió lo que cargó el vendedor.
    const corregido = accion === 'entregar' && pagoDirecto !== (pedido.pagoDirectoVendedor ?? false)
    mutation.mutate(
      { id: pedido._id, accion, ...(corregido ? { body: { pagoDirectoVendedor: pagoDirecto } } : {}) },
      {
        onSuccess: () => toast.success(copy[accion].exito),
        onError: (error) => {
          const conflicto = error instanceof ApiError && error.status === 409
          const mensajes: Partial<Record<Transicion, string>> = {
            tomar: 'El pedido ya no está disponible: otro delivery lo tomó o se lo asignaron a otro.',
            entregar: 'El pedido cambió: puede que lo hayan reasignado a otro delivery. Recargamos la lista.',
          }
          toast.error(conflicto ? (mensajes[accion] ?? getErrorMessage(error)) : getErrorMessage(error))
        },
        onSettled: () => setPendiente(null),
      },
    )
  }

  const dialogo = pendiente && (
    <ConfirmDialog
      open
      title={copy[pendiente.accion].titulo}
      description={copy[pendiente.accion].descripcion(pendiente.pedido)}
      confirmLabel={copy[pendiente.accion].confirmar}
      tone={copy[pendiente.accion].tone}
      loading={mutation.isPending}
      onConfirm={ejecutar}
      onClose={() => !mutation.isPending && setPendiente(null)}
    >
      {pendiente.accion === 'entregar' && (
        <div className="space-y-2">
          <Checkbox
            label="El cliente le pagó directo al vendedor (no cobré nada)"
            checked={pendiente.pagoDirecto}
            disabled={mutation.isPending}
            onChange={(event) => setPendiente({ ...pendiente, pagoDirecto: event.target.checked })}
          />
          <p className="rounded-xl bg-crema/70 px-3 py-2 text-sm">
            {pendiente.pagoDirecto ? (
              'No cobraste nada: el costo del delivery se le descuenta al vendedor.'
            ) : (
              <>
                Cobraste <span className="tabular font-bold">{formatGs(pendiente.pedido.totalVenta + pendiente.pedido.costoDelivery)}</span> al cliente.
              </>
            )}
          </p>
        </div>
      )}
    </ConfirmDialog>
  )

  return {
    pedir: (pedido: Pedido, accion: Transicion) => setPendiente({ pedido, accion, pagoDirecto: pedido.pagoDirectoVendedor ?? false }),
    enCurso: mutation.isPending ? mutation.variables : undefined,
    dialogo,
  }
}
