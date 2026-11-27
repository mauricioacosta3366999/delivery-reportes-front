import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, FormError, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/useToast'
import { useAsignarPedido } from '@/features/pedidos/api'
import { etiquetaPedido, type Pedido } from '@/features/pedidos/types'
import { useUsuariosPorRol } from '@/features/usuarios/api'
import { getErrorMessage } from '@/lib/api/client'

const SIN_ASIGNAR = ''

/** Diálogo del admin para asignar, reasignar o liberar el delivery de un pedido Iniciado o Tomado. */
export function AsignarDeliveryDialog({ pedido, onClose }: { pedido: Pedido; onClose: () => void }) {
  const toast = useToast()
  const asignar = useAsignarPedido()
  const repartidores = useUsuariosPorRol('REPARTIDOR')
  const [repartidorId, setRepartidorId] = useState(pedido.repartidorId ?? SIN_ASIGNAR)
  const actual = pedido.repartidorId ? repartidores.porId.get(pedido.repartidorId) : undefined
  const opciones = (repartidores.data ?? []).filter((usuario) => usuario.activo || usuario._id === pedido.repartidorId)
  const tomado = pedido.estado === 'TOMADO'
  const sinCambios = repartidorId === (pedido.repartidorId ?? SIN_ASIGNAR)

  function guardar() {
    asignar.mutate(
      { id: pedido._id, repartidorId: repartidorId || null },
      {
        onSuccess: (actualizado) => {
          const nombre = actualizado.repartidorId ? repartidores.porId.get(actualizado.repartidorId)?.nombre : undefined
          toast.success(nombre ? `Pedido ${etiquetaPedido(pedido)} asignado a ${nombre}.` : `Pedido ${etiquetaPedido(pedido)} disponible para todos los deliverys.`)
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open
      onClose={() => !asignar.isPending && onClose()}
      title={`Asignar delivery · ${etiquetaPedido(pedido)}`}
      description={`${pedido.nombreCliente} · ${pedido.zonaNombre}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={asignar.isPending}>
            Volver
          </Button>
          <Button onClick={guardar} loading={asignar.isPending} disabled={sinCambios || repartidores.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormError message={asignar.error ? getErrorMessage(asignar.error) : null} />
        <Field label="Delivery" hint={tomado ? undefined : 'El delivery lo ve como "Asignado a vos" y lo toma al retirarlo.'}>
          {(a11y) => (
            <Select {...a11y} value={repartidorId} onChange={(event) => setRepartidorId(event.target.value)} disabled={repartidores.isPending}>
              <option value={SIN_ASIGNAR}>Sin asignar (disponible para todos)</option>
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
          <p className="rounded-xl bg-naranja-50 px-3 py-2 text-sm text-naranja-700">
            {actual ? `${actual.nombre} ya lo tomó` : 'Ya fue tomado'} y puede tenerlo en la mano. Si lo reasignás, coordiná la entrega del paquete.
            {repartidorId === SIN_ASIGNAR && ' Al dejarlo sin asignar vuelve a estar disponible para todos.'}
          </p>
        )}
      </div>
    </Dialog>
  )
}
