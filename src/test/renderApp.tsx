import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '@/app/Providers'
import { routes } from '@/app/routes'
import { sessionStore } from '@/features/auth/session'
import type { Usuario } from '@/features/usuarios/types'
import { createQueryClient } from '@/lib/queryClient'
import { makeToken } from './fixtures'

/** Monta la app completa en `path`, opcionalmente con una sesión iniciada. */
export function renderApp(path: string, { usuario }: { usuario?: Usuario } = {}) {
  if (usuario) sessionStore.set({ token: makeToken(), usuario })
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  const result = render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { ...result, router, user }
}
