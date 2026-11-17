import { EntregasPage } from '@/features/entregas/EntregasPage'
import { PedidoDetallePage } from '@/features/pedidos/pages/PedidoDetallePage'

/** Páginas del delivery (chunk lazy). */
export const Entregas = EntregasPage
export const DetalleEntrega = () => <PedidoDetallePage basePath="/entregas" backLabel="Entregas" />
