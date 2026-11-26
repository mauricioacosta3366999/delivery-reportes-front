import type { RouteObject } from 'react-router'
import { PageLoader } from '@/components/ui/Spinner'
import { HomeRedirect, PublicOnly, RequireAuth, RequireRole } from '@/features/auth/guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { AppLayout } from './layouts/AppLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { NotFoundPage, RouteErrorPage } from './NotFoundPage'

// Las páginas de cada rol se cargan bajo demanda: un delivery no descarga el panel admin.
const pedidos = () => import('./pages/pedidos')
const entregas = () => import('./pages/entregas')
const admin = () => import('./pages/admin')
const reportes = () => import('./pages/reportes')

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    HydrateFallback: PageLoader,
    children: [
      {
        element: <PublicOnly />,
        children: [
          {
            element: <PublicLayout />,
            children: [
              { path: '/login', element: <LoginPage /> },
              { path: '/registro', element: <RegisterPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <HomeRedirect /> },
          {
            element: <AppLayout />,
            children: [
              {
                element: <RequireRole roles={['VENDEDOR']} />,
                children: [
                  { path: '/pedidos', lazy: async () => ({ Component: (await pedidos()).MisPedidos }) },
                  { path: '/pedidos/nuevo', lazy: async () => ({ Component: (await pedidos()).NuevoPedido }) },
                  { path: '/pedidos/:id', lazy: async () => ({ Component: (await pedidos()).DetallePedido }) },
                  { path: '/pedidos/:id/editar', lazy: async () => ({ Component: (await pedidos()).EditarPedido }) },
                  { path: '/productos', lazy: async () => ({ Component: (await pedidos()).Productos }) },
                ],
              },
              {
                element: <RequireRole roles={['REPARTIDOR']} />,
                children: [
                  { path: '/entregas', lazy: async () => ({ Component: (await entregas()).Entregas }) },
                  { path: '/entregas/:id', lazy: async () => ({ Component: (await entregas()).DetalleEntrega }) },
                ],
              },
              {
                element: <RequireRole roles={['ADMIN']} />,
                children: [
                  { path: '/admin/pedidos', lazy: async () => ({ Component: (await admin()).AdminPedidos }) },
                  { path: '/admin/pedidos/nuevo', lazy: async () => ({ Component: (await admin()).AdminNuevoPedido }) },
                  { path: '/admin/pedidos/:id', lazy: async () => ({ Component: (await admin()).AdminDetallePedido }) },
                  { path: '/admin/pedidos/:id/editar', lazy: async () => ({ Component: (await admin()).AdminEditarPedido }) },
                  { path: '/admin/deliverys', lazy: async () => ({ Component: (await admin()).Deliverys }) },
                  { path: '/admin/zonas', lazy: async () => ({ Component: (await admin()).Zonas }) },
                  { path: '/admin/productos', lazy: async () => ({ Component: (await admin()).Productos }) },
                  { path: '/admin/usuarios', lazy: async () => ({ Component: (await admin()).Usuarios }) },
                ],
              },
              { path: '/reportes', lazy: async () => ({ Component: (await reportes()).Reportes }) },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]
