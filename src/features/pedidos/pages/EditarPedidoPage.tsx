import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { ErrorState, PageHeader } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/useToast'
import { useUsuario } from '@/features/auth/useAuth'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import { useActualizarPedido, usePedido } from '../api'
import { accionesDisponibles } from '../permisos'
import { PedidoForm } from '../components/PedidoForm'
import { pedidoToForm, toUpdatePayload } from '../form'

/** Edición de un pedido INICIADO (solo su vendedor o un admin). */
export function EditarPedidoPage({ basePath = '/pedidos' }: { basePath?: string }) {
  const { id = '' } = useParams()
  const usuario = useUsuario()
  const navigate = useNavigate()
  const toast = useToast()
  const query = usePedido(id)
  const actualizar = useActualizarPedido(id)
  const original = useMemo(() => (query.data ? pedidoToForm(query.data) : null), [query.data])

  if (query.isPending) return <PageLoader />
  if (query.isError) return <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
  const pedido = query.data
  if (!original) return null

  // Si ya lo tomaron (o no es suyo), no se puede editar: volver al detalle.
  if (!accionesDisponibles(pedido, usuario).editar) return <Navigate to={`${basePath}/${id}`} replace />

  return (
    <>
      <PageHeader title="Editar pedido" description={`Pedido de ${pedido.nombreCliente}. Solo se puede editar mientras nadie lo tomó.`} />
      <PedidoForm
        defaultValues={original}
        zonaActual={{
          id: pedido.zonaId,
          nombre: pedido.zonaNombre,
          costoDelivery: pedido.costoDelivery,
          requiereTransportadora: pedido.zonaRequiereTransportadora,
        }}
        submitLabel="Guardar cambios"
        onCancel={() => navigate(`${basePath}/${id}`)}
        onSubmit={async (values) => {
          const payload = toUpdatePayload(values, original)
          if (Object.keys(payload).length === 0) {
            toast.info('No hay cambios para guardar.')
            navigate(`${basePath}/${id}`)
            return
          }
          try {
            await actualizar.mutateAsync(payload)
          } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
              // Lo tomaron o lo editaron en paralelo: mostrar el estado real.
              await query.refetch()
              throw new ApiError(409, `${error.message}. Recargamos el pedido con los datos actuales.`)
            }
            throw error
          }
          toast.success('Cambios guardados.')
          navigate(`${basePath}/${id}`, { replace: true })
        }}
      />
    </>
  )
}
