import { useState } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/Spinner'
import { usePedidos } from '@/features/pedidos/api'
import { AsignarDeliveryDialog } from '@/features/pedidos/components/AsignarDeliveryDialog'
import { PedidoFiltrosBar } from '@/features/pedidos/components/PedidoFiltrosBar'
import type { Pedido } from '@/features/pedidos/types'
import { PedidosLista } from '@/features/pedidos/components/PedidosLista'
import { useFiltrosURL } from '@/features/pedidos/useFiltrosURL'
import { useUsuariosPorRol } from '@/features/usuarios/api'
import { useZonas } from '@/features/zonas/api'
import { getErrorMessage } from '@/lib/api/client'

/** El admin ve todos los pedidos, con filtros por vendedor y delivery. */
export function AdminPedidosPage() {
  const { filtros, setFiltros, limpiar, activos } = useFiltrosURL()
  const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta)
  const query = usePedidos(rangoInvalido ? { ...filtros, desde: undefined, hasta: undefined } : filtros)
  const vendedores = useUsuariosPorRol('VENDEDOR')
  const repartidores = useUsuariosPorRol('REPARTIDOR')
  const [asignando, setAsignando] = useState<Pedido | null>(null)
  // Todas las zonas (también las inactivas, que pueden tener pedidos en curso).
  const zonas = useZonas({ limite: 100 })

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Todos los pedidos del sistema."
        actions={
          <ButtonLink to="/admin/pedidos/nuevo">
            <Icon name="plus" className="size-4" /> Nuevo pedido
          </ButtonLink>
        }
      />
      <PedidoFiltrosBar
        filtros={filtros}
        onChange={setFiltros}
        onLimpiar={limpiar}
        activos={activos}
        vendedores={vendedores.data ?? []}
        repartidores={repartidores.data ?? []}
        zonas={zonas.data?.datos ?? []}
      />

      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.total === 0 ? (
        <EmptyState title={activos ? 'Ningún pedido coincide con los filtros' : 'Todavía no hay pedidos'} />
      ) : (
        <>
          <PedidosLista
            pedidos={query.data.datos}
            basePath="/admin/pedidos"
            mostrarVendedor
            nombreRepartidor={(id) => repartidores.porId.get(id)?.nombre}
            onAsignar={setAsignando}
          />
          <Pagination pagina={query.data.pagina} limite={query.data.limite} total={query.data.total} onChange={(pagina) => setFiltros({ pagina })} />
        </>
      )}
      {asignando && <AsignarDeliveryDialog pedido={asignando} repartidores={repartidores.data ?? []} onClose={() => setAsignando(null)} />}
    </>
  )
}
