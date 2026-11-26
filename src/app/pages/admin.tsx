import { AdminPedidosPage } from '@/features/admin/AdminPedidosPage'
import { DeliverysPage } from '@/features/admin/DeliverysPage'
import { UsuariosPage } from '@/features/admin/UsuariosPage'
import { ZonasPage } from '@/features/admin/ZonasPage'
import { EditarPedidoPage } from '@/features/pedidos/pages/EditarPedidoPage'
import { NuevoPedidoPage } from '@/features/pedidos/pages/NuevoPedidoPage'
import { PedidoDetallePage } from '@/features/pedidos/pages/PedidoDetallePage'
import { ProductosPage } from '@/features/productos/ProductosPage'

/** Páginas del administrador (chunk lazy). */
export const AdminPedidos = AdminPedidosPage
export const AdminNuevoPedido = () => <NuevoPedidoPage basePath="/admin/pedidos" />
export const AdminDetallePedido = () => <PedidoDetallePage basePath="/admin/pedidos" backLabel="Pedidos" />
export const AdminEditarPedido = () => <EditarPedidoPage basePath="/admin/pedidos" />
export const Deliverys = DeliverysPage
export const Zonas = ZonasPage
export const Productos = ProductosPage
export const Usuarios = UsuariosPage
