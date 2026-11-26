import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Select } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/useToast'
import type { Usuario } from '@/features/usuarios/types'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import { useAsignarPedido } from '../api'
import { codigoPedido } from '../numero'
import type { Pedido } from '../types'

interface Props {
  pedido: Pedido
  /** Deliverys para elegir (se muestran solo los activos, más el actual si está inactivo). */
  repartidores: Usuario[]
  onClose: () => void
}

/** CU-12: el admin asigna, cambia o libera el delivery de un pedido INICIADO o TOMADO. */
export function AsignarDeliveryDialog({ pedido, repartidores, onClose }: Props) {
  const toast = useToast()
  const asignar = useAsignarPedido()
  const [elegido, setElegido] = useState(pedido.repartidorId ?? '')
  const tomado = pedido.estado === 'TOMADO'
  const opciones = repartidores.filter((usuario) => usuario.activo || usuario._id === pedido.repartidorId)
  const actual = repartidores.find((usuario) => usuario._id === pedido.repartidorId)

  function confirmar() {
    const repartidorId = elegido || null
    if (repartidorId === (pedido.repartidorId ?? null)) return onClose()
    asignar.mutate(
      { id: pedido._id, repartidorId },
      {
        onSuccess: (actualizado) => {
          const nombre = repartidores.find((usuario) => usuario._id === repartidorId)?.nombre
          toast.success(
            nombre
              ? `Pedido ${codigoPedido(actualizado)} asignado a ${nombre}.`
              : `Pedido ${codigoPedido(actualizado)} sin asignar: quedó disponible para todos.`,
          )
          onClose()
        },
        onError: (error) => {
          toast.error(
            error instanceof ApiError && error.status === 409
              ? `${error.message}. Actualizamos el pedido con su estado actual.`
              : getErrorMessage(error),
          )
          if (error instanceof ApiError && error.status === 409) onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open
      onClose={() => !asignar.isPending && onClose()}
      title={`${pedido.repartidorId ? 'Cambiar' : 'Asignar'} delivery · ${codigoPedido(pedido)}`}
      description={
        actual
          ? `Hoy lo tiene ${actual.nombre}${tomado ? ' (ya lo tomó)' : ' (asignado, todavía sin retirar)'}.`
          : 'Elegí quién lleva este pedido. Solo ese delivery lo va a ver y lo toma al retirarlo.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={asignar.isPending}>
            Volver
          </Button>
          <Button onClick={confirmar} loading={asignar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Delivery">
          {(a11y) => (
            <Select {...a11y} value={elegido} onChange={(event) => setElegido(event.target.value)} disabled={asignar.isPending}>
              <option value="">Sin asignar (disponible para todos)</option>
              {opciones.map((usuario) => (
                <option key={usuario._id} value={usuario._id}>
                  {usuario.nombre}
                  {usuario.activo ? '' : ' (inactivo)'}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {tomado && (
          <p className="flex items-start gap-2 rounded-xl bg-cafe-50 px-3 py-2.5 text-sm text-cafe">
            <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
            {elegido
              ? 'El pedido ya fue tomado: el delivery anterior puede tener el paquete en la mano. Avisale antes de reasignarlo.'
              : 'Sin asignar, el pedido vuelve a "Iniciado" y queda disponible para todos. El delivery anterior puede tener el paquete en la mano.'}
          </p>
        )}
      </div>
    </Dialog>
  )
}
