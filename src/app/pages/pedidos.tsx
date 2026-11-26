import { EditarPedidoPage } from '@/features/pedidos/pages/EditarPedidoPage'
import { MisPedidosPage } from '@/features/pedidos/pages/MisPedidosPage'
import { NuevoPedidoPage } from '@/features/pedidos/pages/NuevoPedidoPage'
import { PedidoDetallePage } from '@/features/pedidos/pages/PedidoDetallePage'
import { ProductosPage } from '@/features/productos/ProductosPage'

/** Páginas del vendedor (chunk lazy). */
export const MisPedidos = MisPedidosPage
export const NuevoPedido = () => <NuevoPedidoPage />
export const DetallePedido = () => <PedidoDetallePage basePath="/pedidos" backLabel="Mis pedidos" />
export const EditarPedido = () => <EditarPedidoPage />
export const Productos = ProductosPage
