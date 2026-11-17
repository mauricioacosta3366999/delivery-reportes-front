import { Button, ButtonLink } from '@/components/ui/Button'
import type { Usuario } from '@/features/usuarios/types'
import { accionesDisponibles } from '../permisos'
import type { Pedido } from '../types'
import { useAccionPedido } from '../useAccionPedido'

export function AccionesPedido({ pedido, usuario, editarPath }: { pedido: Pedido; usuario: Usuario; editarPath?: string }) {
  const { pedir, dialogo } = useAccionPedido()
  const puede = accionesDisponibles(pedido, usuario)
  if (!puede.editar && !puede.cancelar && !puede.tomar && !puede.entregar) return null

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
