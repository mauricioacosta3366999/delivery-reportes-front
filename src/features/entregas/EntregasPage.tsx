import { useSearchParams } from 'react-router'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/Spinner'
import { Tabs } from '@/components/ui/Tabs'
import { useUsuario } from '@/features/auth/useAuth'
import { usePedidos } from '@/features/pedidos/api'
import { useAccionPedido } from '@/features/pedidos/useAccionPedido'
import type { Estado } from '@/features/pedidos/types'
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

/** CU-06/07/08: el delivery ve disponibles, toma y entrega. */
export function EntregasPage() {
  const usuario = useUsuario()
  const [params, setParams] = useSearchParams()
  const tab: Tab = (['disponibles', 'pendientes', 'entregados'] as const).find((value) => value === params.get('tab')) ?? 'disponibles'
  const pagina = Math.max(1, Number(params.get('pagina')) || 1)
  const config = tabs[tab]

  const query = usePedidos(
    { estado: config.estado, pagina, limite: 20 },
    // Los disponibles cambian solos (otros deliverys los toman): refresco moderado por el rate limit.
    { refetchInterval: tab === 'disponibles' ? 30_000 : undefined },
  )
  const { pedir, enCurso, dialogo } = useAccionPedido()

  function cambiar(next: { tab?: Tab; pagina?: number }) {
    const nextParams = new URLSearchParams()
    const nextTab = next.tab ?? tab
    if (nextTab !== 'disponibles') nextParams.set('tab', nextTab)
    if (next.pagina && next.pagina > 1) nextParams.set('pagina', String(next.pagina))
    setParams(nextParams, { replace: true })
  }

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

      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.total === 0 ? (
        <EmptyState title={config.vacio} description={config.detalle} />
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {query.data.datos.map((pedido) => (
              <li key={pedido._id}>
                <EntregaCard pedido={pedido} usuario={usuario} onAccion={(accion) => pedir(pedido, accion)} cargando={enCurso?.id === pedido._id} />
              </li>
            ))}
          </ul>
          <Pagination pagina={query.data.pagina} limite={query.data.limite} total={query.data.total} onChange={(value) => cambiar({ pagina: value })} />
        </>
      )}
      {dialogo}
    </>
  )
}
