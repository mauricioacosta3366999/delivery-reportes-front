import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/useToast'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import { formatGs } from '@/lib/format'
import { useTransicionPedido, type Transicion } from './api'
import type { Pedido } from './types'

const copy: Record<Transicion, { titulo: string; descripcion: (pedido: Pedido) => string; confirmar: string; exito: string; tone: 'primary' | 'danger' | 'accent' }> = {
  tomar: {
    titulo: '¿Tomar este pedido?',
    descripcion: (pedido) => `Quedará asignado a vos. Vas a cobrar ${formatGs(pedido.montoTotal)} a ${pedido.nombreCliente}.`,
    confirmar: 'Tomar pedido',
    exito: 'Pedido tomado. ¡Buen viaje!',
    tone: 'primary',
  },
  entregar: {
    titulo: '¿Marcar como entregado?',
    descripcion: (pedido) => `Confirmá que entregaste los productos a ${pedido.nombreCliente}. Esta acción no se puede deshacer.`,
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
  const [pendiente, setPendiente] = useState<{ pedido: Pedido; accion: Transicion } | null>(null)

  function ejecutar() {
    if (!pendiente) return
    const { pedido, accion } = pendiente
    mutation.mutate(
      { id: pedido._id, accion },
      {
        onSuccess: () => toast.success(copy[accion].exito),
        onError: (error) => {
          const conflicto = error instanceof ApiError && error.status === 409
          toast.error(conflicto && accion === 'tomar' ? 'El pedido ya no está disponible: otro delivery lo tomó.' : getErrorMessage(error))
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
    />
  )

  return {
    pedir: (pedido: Pedido, accion: Transicion) => setPendiente({ pedido, accion }),
    enCurso: mutation.isPending ? mutation.variables : undefined,
    dialogo,
  }
}
