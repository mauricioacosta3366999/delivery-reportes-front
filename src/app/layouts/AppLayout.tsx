import { NavLink, Outlet, ScrollRestoration } from 'react-router'
import { cn } from '@/components/ui/cn'
import { Icon, type IconName } from '@/components/ui/Icon'
import { useUsuario, useAuth } from '@/features/auth/useAuth'
import { rolLabels, type Rol } from '@/features/usuarios/types'
import { Brand } from './Brand'

interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

const navPorRol: Record<Rol, NavItem[]> = {
  VENDEDOR: [
    { to: '/pedidos', label: 'Mis pedidos', icon: 'box', end: true },
    { to: '/pedidos/nuevo', label: 'Nuevo', icon: 'plus' },
    { to: '/productos', label: 'Productos', icon: 'tag' },
    { to: '/reportes', label: 'Reportes', icon: 'file' },
  ],
  REPARTIDOR: [
    { to: '/entregas', label: 'Entregas', icon: 'truck' },
    { to: '/reportes', label: 'Reportes', icon: 'file' },
  ],
  ADMIN: [
    { to: '/admin/pedidos', label: 'Pedidos', icon: 'box' },
    { to: '/admin/deliverys', label: 'Deliverys', icon: 'truck' },
    { to: '/admin/zonas', label: 'Zonas', icon: 'map' },
    { to: '/admin/productos', label: 'Productos', icon: 'tag' },
    { to: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
    { to: '/reportes', label: 'Reportes', icon: 'file' },
  ],
}

export function AppLayout() {
  const usuario = useUsuario()
  const { logout } = useAuth()
  const items = navPorRol[usuario.rol]

  return (
    <div className="min-h-dvh">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-linea bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Brand />
          <nav aria-label="Principal" className="hidden flex-1 items-center gap-1 md:flex">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
                    isActive ? 'bg-naranja-50 text-naranja-700' : 'text-gris hover:text-naranja-700',
                  )
                }
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold text-tinta">{usuario.nombre}</p>
              <p className="text-xs text-gris">{rolLabels[usuario.rol]}</p>
            </div>
            <span
              className="grid size-9 place-items-center rounded-full bg-celeste text-sm font-bold text-azul-900 sm:hidden"
              aria-label={`${usuario.nombre}, ${rolLabels[usuario.rol]}`}
            >
              {usuario.nombre.trim().charAt(0).toUpperCase()}
            </span>
            <button
              type="button"
              onClick={logout}
              aria-label="Cerrar sesión"
              className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-gris transition-colors hover:bg-crema hover:text-cafe"
            >
              <Icon name="logout" className="size-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Cada página nueva arranca arriba (y "volver" recupera el scroll anterior). */}
      <ScrollRestoration />
      <main id="contenido" className="mx-auto max-w-6xl px-4 pt-6 pb-28 md:pb-12">
        <Outlet />
      </main>

      <nav aria-label="Principal" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-white/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-md">
          {items.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                    isActive ? 'text-naranja-700' : 'text-gris',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('grid h-7 w-12 place-items-center rounded-full transition-colors', isActive && 'bg-naranja-50')}>
                      <Icon name={item.icon} />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
