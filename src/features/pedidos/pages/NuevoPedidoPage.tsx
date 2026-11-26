import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { EmptyState, PageHeader } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/useToast'
import { useUsuario } from '@/features/auth/useAuth'
import { useUsuariosPorRol } from '@/features/usuarios/api'
import { useCrearPedido } from '../api'
import { PedidoForm, type OpcionesAdmin } from '../components/PedidoForm'
import { pedidoFormDefaults, toCreatePayload } from '../form'
import { codigoPedido } from '../numero'
import { estaAsignado } from '../permisos'

/** CU-03: el vendedor (o un admin) crea un pedido. */
export function NuevoPedidoPage({ basePath = '/pedidos' }: { basePath?: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const crear = useCrearPedido()
  const defaults = useMemo(() => pedidoFormDefaults(), [])
  const usuario = useUsuario()
  const esAdmin = usuario.rol === 'ADMIN'
  const vendedores = useUsuariosPorRol('VENDEDOR', esAdmin)
  const repartidores = useUsuariosPorRol('REPARTIDOR', esAdmin)
  const admin: OpcionesAdmin | undefined = esAdmin
    ? { yo: usuario.nombre, vendedores: vendedores.data ?? [], repartidores: repartidores.data ?? [] }
    : undefined

  if (esAdmin && (vendedores.isPending || repartidores.isPending)) return <PageLoader />

  return (
    <>
      <PageHeader title="Nuevo pedido" description="Completá los datos del cliente, los productos y la zona de entrega." />
      <PedidoForm
        defaultValues={defaults}
        submitLabel="Crear pedido"
        admin={admin}
        onCancel={() => navigate(basePath)}
        onSubmit={async (values) => {
          const pedido = await crear.mutateAsync(toCreatePayload(values))
          toast.success(
            estaAsignado(pedido)
              ? `Pedido ${codigoPedido(pedido)} creado y asignado a un delivery.`
              : `Pedido ${codigoPedido(pedido)} creado. Ya está disponible para los deliverys.`,
          )
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
