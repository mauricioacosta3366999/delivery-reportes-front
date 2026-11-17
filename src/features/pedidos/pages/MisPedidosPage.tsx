import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/Spinner'
import { getErrorMessage } from '@/lib/api/client'
import { usePedidos } from '../api'
import { PedidoFiltrosBar } from '../components/PedidoFiltrosBar'
import { PedidosLista } from '../components/PedidosLista'
import { useFiltrosURL } from '../useFiltrosURL'

/** CU-04: el vendedor ve solo sus pedidos (el alcance lo aplica el backend). */
export function MisPedidosPage() {
  const { filtros, setFiltros, limpiar, activos } = useFiltrosURL()
  const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta)
  const query = usePedidos(rangoInvalido ? { ...filtros, desde: undefined, hasta: undefined } : filtros)

  return (
    <>
      <PageHeader
        title="Mis pedidos"
        description="Seguí el estado de cada pedido que cargaste."
        actions={
          <ButtonLink to="/pedidos/nuevo" className="hidden sm:inline-flex">
            <Icon name="plus" className="size-4" /> Nuevo pedido
          </ButtonLink>
        }
      />
      <PedidoFiltrosBar filtros={filtros} onChange={setFiltros} onLimpiar={limpiar} activos={activos} />

      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.total === 0 ? (
        <EmptyState
          title={activos ? 'Ningún pedido coincide con los filtros' : 'Todavía no cargaste pedidos'}
          description={activos ? 'Probá con otro estado o rango de fechas.' : 'Cuando cargues un pedido, lo vas a ver acá con su estado.'}
          action={!activos && <ButtonLink to="/pedidos/nuevo">Cargar mi primer pedido</ButtonLink>}
        />
      ) : (
        <>
          <PedidosLista pedidos={query.data.datos} basePath="/pedidos" />
          <Pagination pagina={query.data.pagina} limite={query.data.limite} total={query.data.total} onChange={(pagina) => setFiltros({ pagina })} />
        </>
      )}
    </>
  )
}
