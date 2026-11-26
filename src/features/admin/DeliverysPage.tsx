import { Link } from 'react-router'
import { Badge, Card, EmptyState, ErrorState, PageHeader } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { Icon } from '@/components/ui/Icon'
import { PageLoader } from '@/components/ui/Spinner'
import { useResumenDeliverys, type CargaZona } from '@/features/pedidos/api'
import { TelLink } from '@/features/pedidos/components/PedidoDetalle'
import { getErrorMessage } from '@/lib/api/client'

/** Listado de pedidos en curso con los filtros del resumen ya aplicados. */
function enlace(filtros: { repartidorId?: string; zonaId?: string; sinAsignar?: boolean }) {
  const params = new URLSearchParams({ activos: 'true' })
  if (filtros.repartidorId) params.set('repartidorId', filtros.repartidorId)
  if (filtros.sinAsignar) params.set('sinAsignar', 'true')
  if (filtros.zonaId) params.set('zonaId', filtros.zonaId)
  return `/admin/pedidos?${params}`
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** CU-14: carga de trabajo de cada delivery por zona, de más a menos pedidos en curso. */
export function DeliverysPage() {
  const query = useResumenDeliverys()

  return (
    <>
      <PageHeader
        title="Deliverys"
        description='Pedidos en curso de cada delivery (asignados sin retirar + tomados). Tocá un número para ver el listado.'
      />
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (
        <div className="space-y-5">
          <Card className={cn('p-4 sm:p-5', query.data.sinAsignar.total > 0 && 'border-naranja/30 bg-naranja-50/40')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-tinta">Sin asignar</h2>
                <p className="text-sm text-gris">Pedidos que ningún delivery tiene todavía.</p>
              </div>
              <Link
                to={enlace({ sinAsignar: true })}
                className="tabular inline-flex min-h-11 items-center rounded-xl px-3 text-2xl font-extrabold text-naranja-700 hover:bg-naranja-50"
                aria-label={`Ver ${plural(query.data.sinAsignar.total, 'pedido sin asignar', 'pedidos sin asignar')}`}
              >
                {query.data.sinAsignar.total}
              </Link>
            </div>
            <ChipsZonas zonas={query.data.sinAsignar.zonas} filtros={{ sinAsignar: true }} />
          </Card>

          {query.data.datos.length === 0 ? (
            <EmptyState title="No hay deliverys" description="Cuando se registre un delivery, va a aparecer acá con su carga de pedidos." />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {query.data.datos.map((delivery) => (
                <li key={delivery.repartidorId}>
                  <Card className={cn('flex h-full flex-col gap-3 p-4 sm:p-5', !delivery.activo && 'opacity-80')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-bold text-tinta">
                          {delivery.nombre}
                          {!delivery.activo && <Badge className="bg-apagado-50 text-apagado">Inactivo</Badge>}
                        </p>
                        {delivery.contacto && (
                          <div className="text-sm">
                            <TelLink contacto={delivery.contacto} />
                          </div>
                        )}
                      </div>
                      <Link
                        to={enlace({ repartidorId: delivery.repartidorId })}
                        className="tabular inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-2xl font-extrabold text-azul-900 hover:bg-celeste-50"
                        aria-label={`Ver ${plural(delivery.total, 'pedido en curso', 'pedidos en curso')} de ${delivery.nombre}`}
                      >
                        {delivery.total}
                      </Link>
                    </div>
                    <p className="tabular text-sm text-gris">
                      {plural(delivery.asignados, 'asignado sin retirar', 'asignados sin retirar')} · {plural(delivery.tomados, 'tomado', 'tomados')}
                    </p>
                    <ChipsZonas zonas={delivery.zonas} filtros={{ repartidorId: delivery.repartidorId }} />
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}

function ChipsZonas({ zonas, filtros }: { zonas: CargaZona[]; filtros: { repartidorId?: string; sinAsignar?: boolean } }) {
  if (zonas.length === 0) return <p className="mt-3 text-sm text-gris">Sin pedidos en curso.</p>
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Pedidos en curso por zona">
      {zonas.map((zona) => (
        <li key={zona.zonaId}>
          <Link
            to={enlace({ ...filtros, zonaId: zona.zonaId })}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-celeste-50 px-3 text-sm font-semibold text-azul ring-1 ring-celeste ring-inset hover:bg-celeste-100"
          >
            <Icon name="map" className="size-3.5" />
            {zona.zonaNombre} <span className="tabular">{zona.total}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
