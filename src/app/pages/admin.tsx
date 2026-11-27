import { AdminPedidosPage } from '@/features/admin/AdminPedidosPage'
import { DeliverysPage } from '@/features/admin/DeliverysPage'
import { UsuariosPage } from '@/features/admin/UsuariosPage'
import { ZonasPage } from '@/features/admin/ZonasPage'
import { EditarPedidoPage } from '@/features/pedidos/pages/EditarPedidoPage'
import { NuevoPedidoPage } from '@/features/pedidos/pages/NuevoPedidoPage'
import { PedidoDetallePage } from '@/features/pedidos/pages/PedidoDetallePage'

/** Páginas del administrador (chunk lazy). */
export const AdminPedidos = AdminPedidosPage
export const AdminNuevoPedido = () => <NuevoPedidoPage basePath="/admin/pedidos" elegirVendedor />
export const AdminDetallePedido = () => <PedidoDetallePage basePath="/admin/pedidos" backLabel="Pedidos" />
export const AdminEditarPedido = () => <EditarPedidoPage basePath="/admin/pedidos" />
export const Zonas = ZonasPage
export const Usuarios = UsuariosPage
export const Deliverys = DeliverysPage
