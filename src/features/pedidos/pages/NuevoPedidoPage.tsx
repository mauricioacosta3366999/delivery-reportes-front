import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { EmptyState, PageHeader } from '@/components/ui/Card'
import { useToast } from '@/components/ui/useToast'
import { useCrearPedido } from '../api'
import { PedidoForm } from '../components/PedidoForm'
import { pedidoFormDefaults, toCreatePayload } from '../form'

/** CU-03: el vendedor (o un admin) crea un pedido. */
export function NuevoPedidoPage({ basePath = '/pedidos' }: { basePath?: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const crear = useCrearPedido()
  const defaults = useMemo(() => pedidoFormDefaults(), [])

  return (
    <>
      <PageHeader title="Nuevo pedido" description="Completá los datos del cliente, los productos y la zona de entrega." />
      <PedidoForm
        defaultValues={defaults}
        submitLabel="Crear pedido"
        onCancel={() => navigate(basePath)}
        onSubmit={async (values) => {
          const pedido = await crear.mutateAsync(toCreatePayload(values))
          toast.success('Pedido creado. Ya está disponible para los deliverys.')
          navigate(`${basePath}/${pedido._id}`, { replace: true })
        }}
        emptyZonas={
          <EmptyState
            title="No hay zonas de entrega activas"
            description="Para cargar pedidos, un administrador tiene que dar de alta al menos una zona."
          />
        }
      />
    </>
  )
}
