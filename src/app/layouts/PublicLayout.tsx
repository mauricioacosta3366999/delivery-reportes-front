import { Outlet } from 'react-router'
import { Brand } from './Brand'

export function PublicLayout() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden px-4 py-10 sm:justify-center">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-32 size-96 rounded-full bg-celeste/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 size-96 rounded-full bg-cafe/10 blur-3xl" />
      <div className="relative w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Brand size="lg" />
        </div>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
