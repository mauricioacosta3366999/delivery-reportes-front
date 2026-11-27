import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { formatFecha, formatGs } from '@/lib/format'
import { estaAsignado, etiquetaPedido, type Pedido } from '../types'
import { EstadoBadge } from './EstadoBadge'

interface Props {
  pedidos: Pedido[]
  basePath: string
  /** Columna con el nombre del vendedor (vista admin). */
  mostrarVendedor?: boolean
  /** Resolver de nombre de delivery a partir de su id (solo ADMIN puede leer usuarios). */
  nombreRepartidor?: (id: string) => string | undefined
  /** Solo admin: abre el diálogo para asignar el delivery (se ofrece en Iniciado y Tomado). */
  onAsignar?: (pedido: Pedido) => void
}

const asignable = (pedido: Pedido) => pedido.estado === 'INICIADO' || pedido.estado === 'TOMADO'

/** Cards en mobile, tabla desde md. */
export function PedidosLista({ pedidos, basePath, mostrarVendedor, nombreRepartidor, onAsignar }: Props) {
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {pedidos.map((pedido) => (
          <li key={pedido._id} className="space-y-1.5">
            <Link to={`${basePath}/${pedido._id}`} className="block rounded-2xl focus-visible:outline-offset-4">
              <Card className="space-y-3 p-4 transition-colors active:bg-celeste-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-tinta">
                      <span className="tabular text-gris">{etiquetaPedido(pedido)}</span> {pedido.nombreCliente}
                    </p>
                    <p className="text-xs text-gris">
                      {formatFecha(pedido.fechaPedido)} · {pedido.zonaNombre}
                      {mostrarVendedor && ` · ${pedido.vendedorNombre}`}
                    </p>
                  </div>
                  <EstadoBadge estado={pedido.estado} asignado={estaAsignado(pedido)} />
                </div>
                <div className="tabular grid grid-cols-3 gap-2 rounded-xl bg-crema/60 px-3 py-2 text-xs">
                  <Monto label="Venta" valor={pedido.totalVenta} />
                  <Monto label="Delivery" valor={pedido.costoDelivery} />
                  <Monto label="A rendir" valor={pedido.montoARendir} destacado />
                </div>
                {nombreRepartidor && pedido.repartidorId && (
                  <p className="flex items-center gap-1.5 text-xs text-gris">
                    <Icon name="truck" className="size-3.5" /> {nombreRepartidor(pedido.repartidorId) ?? 'Delivery'}
                  </p>
                )}
              </Card>
            </Link>
            {onAsignar && asignable(pedido) && (
              <Button size="sm" variant="secondary" block onClick={() => onAsignar(pedido)}>
                <Icon name="assign" className="size-4" /> {pedido.repartidorId ? 'Cambiar delivery' : 'Asignar delivery'}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Card className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-celeste-50 text-xs font-semibold tracking-wide text-azul-900 uppercase">
            <tr>
              <th scope="col" className="px-3 py-3">N.º</th>
              <th scope="col" className="px-3 py-3">Fecha</th>
              <th scope="col" className="px-3 py-3">Cliente</th>
              {mostrarVendedor && <th scope="col" className="px-3 py-3">Vendedor</th>}
              <th scope="col" className="px-3 py-3">Zona</th>
              {nombreRepartidor && <th scope="col" className="px-3 py-3">Delivery</th>}
              <th scope="col" className="px-3 py-3 text-right">Venta</th>
              <th scope="col" className="px-3 py-3 text-right">Delivery</th>
              <th scope="col" className="px-3 py-3 text-right">A rendir</th>
              <th scope="col" className="px-3 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {pedidos.map((pedido) => (
              <tr key={pedido._id} className="group relative transition-colors hover:bg-crema/50">
                <td className="tabular px-3 py-3 font-semibold whitespace-nowrap text-gris">{etiquetaPedido(pedido)}</td>
                <td className="px-3 py-3 whitespace-nowrap text-gris">{formatFecha(pedido.fechaPedido)}</td>
                <td className="max-w-40 px-3 py-3">
                  <Link to={`${basePath}/${pedido._id}`} className="block truncate font-semibold text-tinta after:absolute after:inset-0 group-hover:text-azul">
                    {pedido.nombreCliente}
                  </Link>
                </td>
                {mostrarVendedor && <td className="max-w-32 truncate px-3 py-3">{pedido.vendedorNombre}</td>}
                <td className="max-w-28 truncate px-3 py-3">{pedido.zonaNombre}</td>
                {nombreRepartidor && (
                  <td className="max-w-32 truncate px-3 py-3 text-gris">{pedido.repartidorId ? (nombreRepartidor(pedido.repartidorId) ?? '—') : '—'}</td>
                )}
                <td className="tabular px-3 py-3 text-right whitespace-nowrap">{formatGs(pedido.totalVenta)}</td>
                <td className="tabular px-3 py-3 text-right whitespace-nowrap">{formatGs(pedido.costoDelivery)}</td>
                <td className="tabular px-3 py-3 text-right font-semibold whitespace-nowrap text-cafe">{formatGs(pedido.montoARendir)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <EstadoBadge estado={pedido.estado} asignado={estaAsignado(pedido)} />
                    {onAsignar && asignable(pedido) && (
                      // Por encima del link que cubre la fila.
                      <Button
                        size="sm"
                        variant="secondary"
                        className="relative z-10 min-h-8 px-2"
                        title={pedido.repartidorId ? 'Cambiar delivery' : 'Asignar delivery'}
                        onClick={() => onAsignar(pedido)}
                      >
                        <Icon name="assign" className="size-4" />
                        <span className="sr-only">
                          {pedido.repartidorId ? 'Cambiar' : 'Asignar'} delivery del pedido {etiquetaPedido(pedido)}
                        </span>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}

function Monto({ label, valor, destacado }: { label: string; valor: number; destacado?: boolean }) {
  return (
    <div>
      <p className="text-gris">{label}</p>
      <p className={destacado ? 'font-bold text-cafe' : 'font-semibold text-tinta'}>{formatGs(valor)}</p>
    </div>
  )
}
