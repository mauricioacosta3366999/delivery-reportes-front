import { Button, ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import type { Usuario } from '@/features/usuarios/types'
import { accionesDisponibles } from '../permisos'
import type { Pedido } from '../types'
import { useAccionPedido } from '../useAccionPedido'

export function AccionesPedido({ pedido, usuario, editarPath, onAsignar }: { pedido: Pedido; usuario: Usuario; editarPath?: string; onAsignar?: () => void }) {
  const { pedir, dialogo } = useAccionPedido()
  const puede = accionesDisponibles(pedido, usuario)
  const asignar = puede.asignar && onAsignar
  if (!puede.editar && !puede.cancelar && !puede.tomar && !puede.entregar && !asignar) return null

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
      {asignar && (
        <Button block variant="secondary" onClick={onAsignar}>
          <Icon name="assign" className="size-4" /> {pedido.repartidorId ? 'Cambiar delivery' : 'Asignar delivery'}
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
    </>
  )
}
