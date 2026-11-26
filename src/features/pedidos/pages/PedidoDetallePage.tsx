import { Link, useParams } from 'react-router'
import { CardSection, DataList, ErrorState, PageHeader } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { PageLoader } from '@/components/ui/Spinner'
import { useUsuario } from '@/features/auth/useAuth'
import { useUsuariosPorRol } from '@/features/usuarios/api'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import { usePedido } from '../api'
import { AccionesPedido } from '../components/AccionesPedido'
import { PedidoDetalle, TelLink } from '../components/PedidoDetalle'
import { codigoPedido } from '../numero'

interface Props {
  /** Ruta del listado al que vuelve, p. ej. /pedidos, /entregas o /admin/pedidos. */
  basePath: string
  backLabel: string
}

export function PedidoDetallePage({ basePath, backLabel }: Props) {
  const { id = '' } = useParams()
  const usuario = useUsuario()
  const query = usePedido(id)
  const esAdmin = usuario.rol === 'ADMIN'
  const repartidores = useUsuariosPorRol('REPARTIDOR', esAdmin)

  const volver = (
    <Link to={basePath} className="mb-3 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-azul hover:underline">
      <Icon name="back" className="size-4" /> {backLabel}
    </Link>
  )

  if (query.isPending) return <PageLoader />
  if (query.isError) {
    const noEncontrado = query.error instanceof ApiError && query.error.status === 404
    return (
      <>
        {volver}
        <ErrorState
          message={noEncontrado ? 'Este pedido no existe o no tenés acceso a él.' : getErrorMessage(query.error)}
          onRetry={noEncontrado ? undefined : () => query.refetch()}
        />
      </>
    )
  }

  const pedido = query.data
  const repartidor = pedido.repartidorId ? repartidores.porId.get(pedido.repartidorId) : undefined

  return (
    <>
      {volver}
      <PageHeader title={pedido.nombreCliente} description={`Pedido ${codigoPedido(pedido)} · ${pedido.zonaNombre}`} />
      <PedidoDetalle
        pedido={pedido}
        acciones={<AccionesPedido pedido={pedido} usuario={usuario} editarPath={`${basePath}/${pedido._id}/editar`} />}
        extra={
          esAdmin && repartidor ? (
            <CardSection title="Delivery asignado">
              <DataList
                items={[
                  { label: 'Nombre', value: repartidor.nombre },
                  { label: 'Contacto', value: repartidor.contacto ? <TelLink contacto={repartidor.contacto} /> : '—' },
                ]}
              />
            </CardSection>
          ) : undefined
        }
      />
    </>
  )
}
