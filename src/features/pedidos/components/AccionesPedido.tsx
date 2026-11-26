import { useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useUsuariosPorRol } from '@/features/usuarios/api'
import type { Usuario } from '@/features/usuarios/types'
import { accionesDisponibles } from '../permisos'
import type { Pedido } from '../types'
import { useAccionPedido } from '../useAccionPedido'
import { AsignarDeliveryDialog } from './AsignarDeliveryDialog'

export function AccionesPedido({ pedido, usuario, editarPath }: { pedido: Pedido; usuario: Usuario; editarPath?: string }) {
  const { pedir, dialogo } = useAccionPedido()
  const puede = accionesDisponibles(pedido, usuario)
  const [asignando, setAsignando] = useState(false)
  const repartidores = useUsuariosPorRol('REPARTIDOR', puede.asignar)
  if (!puede.editar && !puede.cancelar && !puede.tomar && !puede.entregar && !puede.asignar) return null

  return (
    <>
      {puede.tomar && (
        <Button block size="lg" onClick={() => pedir(pedido, 'tomar')}>
          Tomar pedido
        </Button>
      )}
      {puede.entregar && (
        <Button block size="lg" variant="accent" onClick={() => pedir(pedido, 'entregar')}>
          Marcar como entregado
        </Button>
      )}
      {puede.asignar && (
        <Button block variant="secondary" onClick={() => setAsignando(true)} disabled={repartidores.isPending}>
          <Icon name="truck" className="size-4" /> {pedido.repartidorId ? 'Cambiar delivery' : 'Asignar delivery'}
        </Button>
      )}
      {puede.editar && editarPath && (
        <ButtonLink block to={editarPath} variant="secondary">
          Editar pedido
        </ButtonLink>
      )}
      {puede.cancelar && (
        <Button block variant="danger" onClick={() => pedir(pedido, 'cancelar')}>
          Cancelar pedido
        </Button>
      )}
      {dialogo}
      {asignando && <AsignarDeliveryDialog pedido={pedido} repartidores={repartidores.data ?? []} onClose={() => setAsignando(false)} />}
    </>
  )
}
