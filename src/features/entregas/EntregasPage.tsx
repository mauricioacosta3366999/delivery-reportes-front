import { useSearchParams } from 'react-router'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/Spinner'
import { Tabs } from '@/components/ui/Tabs'
import { useUsuario } from '@/features/auth/useAuth'
import { usePedidos } from '@/features/pedidos/api'
import { useAccionPedido } from '@/features/pedidos/useAccionPedido'
import type { Estado, Pedido } from '@/features/pedidos/types'
import type { Usuario } from '@/features/usuarios/types'
import { getErrorMessage } from '@/lib/api/client'
import { EntregaCard } from './EntregaCard'

type Tab = 'disponibles' | 'pendientes' | 'entregados'

const tabs: Record<Tab, { estado: Estado; vacio: string; detalle: string }> = {
  disponibles: {
    estado: 'INICIADO',
    vacio: 'No hay pedidos disponibles',
    detalle: 'Cuando un vendedor cargue un pedido nuevo, va a aparecer acá. La lista se actualiza sola.',
  },
  pendientes: {
    estado: 'TOMADO',
    vacio: 'No tenés entregas pendientes',
    detalle: 'Tomá un pedido de la pestaña "Disponibles" para empezar.',
  },
  entregados: {
    estado: 'ENTREGADO',
    vacio: 'Todavía no entregaste pedidos',
    detalle: 'Los pedidos que marques como entregados quedan registrados acá.',
  },
}

// Los disponibles cambian solos (otros deliverys los toman, el admin asigna): refresco moderado por el rate limit.
const REFRESCO = 30_000

/** CU-06/07/08: el delivery ve sus asignados y los disponibles, toma y entrega. */
export function EntregasPage() {
  const usuario = useUsuario()
  const [params, setParams] = useSearchParams()
  const tab: Tab = (['disponibles', 'pendientes', 'entregados'] as const).find((value) => value === params.get('tab')) ?? 'disponibles'
  const pagina = Math.max(1, Number(params.get('pagina')) || 1)
  const config = tabs[tab]
  const enDisponibles = tab === 'disponibles'

  // En "Disponibles": primero los asignados a mí (por un admin o por la zona), después los libres.
  const asignados = usePedidos({ estado: 'INICIADO', repartidorId: usuario._id, limite: 100 }, { refetchInterval: REFRESCO, enabled: enDisponibles })
  const query = usePedidos(
    enDisponibles ? { estado: 'INICIADO', sinAsignar: true, pagina, limite: 20 } : { estado: config.estado, pagina, limite: 20 },
    { refetchInterval: enDisponibles ? REFRESCO : undefined },
  )
  const { pedir, enCurso, dialogo } = useAccionPedido()
  const misAsignados = enDisponibles ? (asignados.data?.datos ?? []) : []

  function cambiar(next: { tab?: Tab; pagina?: number }) {
    const nextParams = new URLSearchParams()
    const nextTab = next.tab ?? tab
    if (nextTab !== 'disponibles') nextParams.set('tab', nextTab)
    if (next.pagina && next.pagina > 1) nextParams.set('pagina', String(next.pagina))
    setParams(nextParams, { replace: true })
  }

  const cargando = query.isPending || (enDisponibles && asignados.isPending)
  const error = query.error ?? (enDisponibles ? asignados.error : null)

  return (
    <>
      <PageHeader title="Entregas" description={`Hola, ${usuario.nombre.split(' ')[0]}. Elegí un pedido para llevar o terminá tus pendientes.`} />
      <div className="mb-5">
        <Tabs
          label="Pedidos por estado"
          value={tab}
          onChange={(value) => cambiar({ tab: value })}
          items={[
            { value: 'disponibles', label: 'Disponibles' },
            { value: 'pendientes', label: 'Pendientes' },
            { value: 'entregados', label: 'Entregados' },
          ]}
        />
      </div>

      {cargando ? (
        <PageLoader />
      ) : error || !query.data ? (
        <ErrorState
          message={getErrorMessage(error)}
          onRetry={() => {
            void query.refetch()
            if (enDisponibles) void asignados.refetch()
          }}
        />
      ) : query.data.total === 0 && misAsignados.length === 0 ? (
        <EmptyState title={config.vacio} description={config.detalle} />
      ) : (
        <div className="space-y-8">
          {misAsignados.length > 0 && (
            <section aria-labelledby="asignados-titulo" className="space-y-3">
              <h2 id="asignados-titulo" className="text-base font-bold text-naranja-700">
                Asignados a vos ({misAsignados.length})
              </h2>
              <ListaEntregas pedidos={misAsignados} usuario={usuario} pedir={pedir} enCurso={enCurso?.id} />
            </section>
          )}
          {enDisponibles && misAsignados.length > 0 && query.data.total === 0 ? null : (
            <section aria-labelledby={enDisponibles ? 'libres-titulo' : undefined} className="space-y-3">
              {enDisponibles && misAsignados.length > 0 && (
                <h2 id="libres-titulo" className="text-base font-bold text-tinta">
                  Disponibles para todos
                </h2>
              )}
              <ListaEntregas pedidos={query.data.datos} usuario={usuario} pedir={pedir} enCurso={enCurso?.id} />
              <Pagination pagina={query.data.pagina} limite={query.data.limite} total={query.data.total} onChange={(value) => cambiar({ pagina: value })} />
            </section>
          )}
        </div>
      )}
      {dialogo}
    </>
  )
}

function ListaEntregas({
  pedidos,
  usuario,
  pedir,
  enCurso,
}: {
  pedidos: Pedido[]
  usuario: Usuario
  pedir: (pedido: Pedido, accion: 'tomar' | 'entregar') => void
  enCurso?: string
}) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {pedidos.map((pedido) => (
        <li key={pedido._id}>
          <EntregaCard pedido={pedido} usuario={usuario} onAccion={(accion) => pedir(pedido, accion)} cargando={enCurso === pedido._id} />
        </li>
      ))}
    </ul>
  )
}
