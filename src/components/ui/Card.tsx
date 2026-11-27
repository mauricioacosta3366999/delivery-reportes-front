import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-linea bg-white shadow-suave', className)} {...props} />
}

export function CardSection({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('p-4 sm:p-6', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-bold text-tinta">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </Card>
  )
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-azul-900 sm:text-3xl">{title}</h1>
        {description && <p className="text-sm text-gris">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', className)}
      {...props}
    />
  )
}

export function EmptyState({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-celeste bg-white/60 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-celeste-50 text-azul" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
          <path d="M3 7.5 12 12l9-4.5M12 12v9" />
        </svg>
      </div>
      <p className="font-semibold text-tinta">{title}</p>
      {description && <p className="max-w-sm text-sm text-gris">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-peligro/20 bg-peligro-50 px-6 py-10 text-center">
      <p className="font-semibold text-peligro">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-azul underline-offset-4 hover:underline">
          Reintentar
        </button>
      )}
    </div>
  )
}

/** Lista de pares etiqueta/valor para detalles. */
export function DataList({ items }: { items: Array<{ label: ReactNode; value: ReactNode; full?: boolean }> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={index} className={cn('space-y-0.5', item.full && 'sm:col-span-2')}>
          <dt className="text-xs font-semibold tracking-wide text-gris uppercase">{item.label}</dt>
          <dd className="text-sm break-words text-tinta">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
