import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge, Card, EmptyState, ErrorState, PageHeader } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { PageLoader } from '@/components/ui/Spinner'
import { useResumenDeliverys, type ConteoActivos, type ZonaResumen } from '@/features/pedidos/api'
import { TelLink } from '@/features/pedidos/components/PedidoDetalle'
import { getErrorMessage } from '@/lib/api/client'

/** Link al listado de pedidos en curso con los filtros ya aplicados. */
function pedidosUrl(filtros: { repartidorId?: string; zonaId?: string }) {
  const params = new URLSearchParams({ activos: 'true' })
  if (filtros.repartidorId) params.set('repartidorId', filtros.repartidorId)
  if (filtros.zonaId) params.set('zonaId', filtros.zonaId)
  return `/admin/pedidos?${params}`
}

const plural = (total: number) => (total === 1 ? 'pedido' : 'pedidos')

/** Deliverys de más a menos pedidos en curso; cada número abre el listado de Pedidos filtrado. */
export function DeliverysPage() {
  const query = useResumenDeliverys()

  return (
    <>
      <PageHeader
        title="Deliverys"
        description="Pedidos en curso (asignados y tomados) de cada delivery, por zona. Tocá un número para ver esos pedidos."
      />
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (
        <div className="space-y-4">
          {query.data.sinAsignar.total > 0 && (
            <Fila
              titulo="Sin asignar"
              detalle="Disponibles para cualquier delivery"
              conteo={query.data.sinAsignar}
              zonas={query.data.sinAsignar.zonas}
              url={(zonaId) => `${pedidosUrl({ zonaId })}&sinAsignar=true`}
              destacado
            />
          )}
          {query.data.datos.length === 0 ? (
            <EmptyState title="Todavía no hay deliverys" description="Cuando un delivery se registre o lo crees en Usuarios, va a aparecer acá." />
          ) : (
            <ul className="space-y-3">
              {query.data.datos.map((delivery) => (
                <li key={delivery.repartidorId}>
                  <Fila
                    titulo={delivery.nombre}
                    detalle={delivery.contacto ? <TelLink contacto={delivery.contacto} /> : undefined}
                    inactivo={!delivery.activo}
                    conteo={delivery}
                    zonas={delivery.zonas}
                    url={(zonaId) => pedidosUrl({ repartidorId: delivery.repartidorId, zonaId })}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}

interface FilaProps {
  titulo: string
  detalle?: ReactNode
  conteo: ConteoActivos
  zonas: ZonaResumen[]
  url: (zonaId?: string) => string
  inactivo?: boolean
  destacado?: boolean
}

function Fila({ titulo, detalle, conteo, zonas, url, inactivo, destacado }: FilaProps) {
  return (
    <Card className={`space-y-3 p-4 sm:p-5 ${destacado ? 'border-naranja/30 bg-naranja-50/40' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 font-bold text-tinta">
            {titulo}
            {inactivo && <Badge className="bg-apagado-50 text-apagado">Inactivo</Badge>}
          </p>
          {detalle && <div className="text-sm text-gris">{detalle}</div>}
        </div>
        <Link
          to={url()}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-right text-naranja-700 hover:bg-naranja-50"
        >
          <span className="tabular text-2xl font-extrabold">{conteo.total}</span>
          <span className="text-xs leading-tight font-semibold">
            {plural(conteo.total)}
            <br />
            en curso
          </span>
          <span className="sr-only"> de {titulo}</span>
        </Link>
      </div>
      {conteo.total > 0 && (
        <p className="text-xs text-gris">
          {conteo.asignados} asignados sin retirar · {conteo.tomados} tomados
        </p>
      )}
      {zonas.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`Zonas de ${titulo}`}>
          {zonas.map((zona) => (
            <li key={zona.zonaId}>
              <Link
                to={url(zona.zonaId)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-celeste-50 px-3 text-sm font-semibold text-azul ring-1 ring-celeste ring-inset hover:bg-celeste-100"
              >
                <Icon name="map" className="size-3.5" />
                {zona.zonaNombre} <span className="tabular">{zona.total}</span>
                <span className="sr-only"> {plural(zona.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
