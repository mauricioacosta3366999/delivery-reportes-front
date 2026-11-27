import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { EmptyState, PageHeader } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/useToast'
import { useUsuario } from '@/features/auth/useAuth'
import { useUsuariosPorRol } from '@/features/usuarios/api'
import { useCrearPedido } from '../api'
import { PedidoForm } from '../components/PedidoForm'
import { pedidoFormDefaults, toCreatePayload } from '../form'
import { etiquetaPedido } from '../types'

/** CU-03: el vendedor (o un admin, opcionalmente a nombre de un vendedor) crea un pedido. */
export function NuevoPedidoPage({ basePath = '/pedidos', elegirVendedor = false }: { basePath?: string; elegirVendedor?: boolean }) {
  const navigate = useNavigate()
  const toast = useToast()
  const usuario = useUsuario()
  const crear = useCrearPedido()
  const defaults = useMemo(() => pedidoFormDefaults(), [])
  const vendedores = useUsuariosPorRol('VENDEDOR', elegirVendedor)
  const repartidores = useUsuariosPorRol('REPARTIDOR', elegirVendedor)
  const activos = useMemo(() => vendedores.data?.filter((vendedor) => vendedor.activo), [vendedores.data])

  if (elegirVendedor && (vendedores.isPending || repartidores.isPending)) return <PageLoader />

  return (
    <>
      <PageHeader title="Nuevo pedido" description="Completá los datos del cliente, los productos y la zona de entrega." />
      <PedidoForm
        defaultValues={defaults}
        submitLabel="Crear pedido"
        vendedores={elegirVendedor ? (activos ?? []) : undefined}
        repartidores={elegirVendedor ? (repartidores.data ?? []) : undefined}
        nombrePropio={usuario.nombre}
        onCancel={() => navigate(basePath)}
        onSubmit={async (values) => {
          const pedido = await crear.mutateAsync(toCreatePayload(values))
          toast.success(`Pedido ${etiquetaPedido(pedido)} creado. Ya está disponible para los deliverys.`)
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
