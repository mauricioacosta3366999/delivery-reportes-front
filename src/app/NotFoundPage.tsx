import { isRouteErrorResponse, useRouteError } from 'react-router'
import { ButtonLink } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-extrabold text-celeste">404</p>
      <h1 className="text-xl font-bold text-azul-900">No encontramos esta página</h1>
      <p className="text-sm text-gris">Puede que el enlace esté mal o que ya no tengas acceso.</p>
      <ButtonLink to="/">Ir al inicio</ButtonLink>
    </div>
  )
}

export function RouteErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold text-azul-900">Algo salió mal</h1>
      <p className="text-sm text-gris">Recargá la página. Si el problema sigue, avisá al administrador.</p>
      <ButtonLink to="/">Ir al inicio</ButtonLink>
    </div>
  )
}
