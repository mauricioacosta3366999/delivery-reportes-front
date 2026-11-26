import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { codigoPedido } from '@/features/pedidos/numero'
import { accionesDisponibles, estaAsignado } from '@/features/pedidos/permisos'
import { EstadoBadge } from '@/features/pedidos/components/EstadoBadge'
import { NoCobrar, TelLink, UbicacionLink } from '@/features/pedidos/components/PedidoDetalle'
import type { Pedido } from '@/features/pedidos/types'
import type { Usuario } from '@/features/usuarios/types'
import { formatFechaHora, formatGs } from '@/lib/format'

interface Props {
  pedido: Pedido
  usuario: Usuario
  onAccion: (accion: 'tomar' | 'entregar') => void
  cargando?: boolean
}

/** Card pensada para el celular: todo lo necesario para llevar el pedido sin entrar al detalle. */
export function EntregaCard({ pedido, usuario, onAccion, cargando }: Props) {
  const puede = accionesDisponibles(pedido, usuario)
  const productos = pedido.productos.reduce((total, producto) => total + producto.cantidad, 0)
  const asignadoAMi = estaAsignado(pedido) && pedido.repartidorId === usuario._id

  return (
    <Card className="flex h-full flex-col">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="tabular text-xs font-semibold text-gris">Pedido {codigoPedido(pedido)}</p>
            <Link to={`/entregas/${pedido._id}`} className="block truncate text-lg font-bold text-tinta hover:text-azul">
              {pedido.nombreCliente}
            </Link>
            <p className="text-xs text-gris">
              {pedido.zonaNombre} · {productos} {productos === 1 ? 'producto' : 'productos'}
            </p>
          </div>
          <EstadoBadge pedido={pedido} />
        </div>

        {asignadoAMi && (
          <p className="flex items-center gap-2 rounded-xl bg-naranja-50 px-3 py-2 text-sm font-semibold text-naranja-700">
            <Icon name="pin" className="size-4" /> Asignado a vos: tomalo cuando lo retires.
          </p>
        )}

        {pedido.zonaRequiereTransportadora && (
          <p className="flex items-center gap-2 rounded-xl bg-cafe-50 px-3 py-2 text-sm font-semibold text-cafe">
            <Icon name="truck" className="size-4" /> Requiere transportadora
          </p>
        )}

        <dl className="space-y-3 text-sm">
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-xs font-semibold text-gris uppercase">Retiro</dt>
            <dd className="min-w-0">
              <UbicacionLink ubicacion={pedido.ubicacionRetiro} />
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-xs font-semibold text-gris uppercase">Entrega</dt>
            <dd className="min-w-0">
              <UbicacionLink ubicacion={pedido.ubicacionEntrega} />
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-xs font-semibold text-gris uppercase">Cliente</dt>
            <dd>
              <TelLink contacto={pedido.contactoCliente} />
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-16 shrink-0 text-xs font-semibold text-gris uppercase">Vendedor</dt>
            <dd className="min-w-0 space-y-0.5">
              <p className="font-medium">{pedido.vendedorNombre}</p>
              {pedido.vendedorContacto && <TelLink contacto={pedido.vendedorContacto} />}
            </dd>
          </div>
        </dl>

        {pedido.observaciones && <p className="rounded-xl bg-crema/70 px-3 py-2 text-sm whitespace-pre-line text-tinta">{pedido.observaciones}</p>}
      </div>

      <div className="mt-auto space-y-3 border-t border-linea p-4 sm:p-5">
        {pedido.pagoDirectoVendedor ? (
          <NoCobrar />
        ) : (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gris">Cobrar al cliente</span>
            <span className="tabular text-xl font-extrabold text-azul-900">{formatGs(pedido.montoTotal)}</span>
          </div>
        )}
        {puede.tomar && (
          <Button block size="lg" loading={cargando} onClick={() => onAccion('tomar')}>
            Tomar pedido
          </Button>
        )}
        {puede.entregar && (
          <Button block size="lg" variant="accent" loading={cargando} onClick={() => onAccion('entregar')}>
            <Icon name="check" /> Marcar como entregado
          </Button>
        )}
        {pedido.estado === 'ENTREGADO' && <p className="text-center text-xs text-gris">Entregado el {formatFechaHora(pedido.entregadoAt)}</p>}
      </div>
    </Card>
  )
}
