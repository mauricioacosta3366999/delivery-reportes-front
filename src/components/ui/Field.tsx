import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from './cn'

const control = cn(
  'block w-full rounded-xl border border-linea bg-white px-3.5 text-base text-tinta shadow-xs sm:text-sm',
  'placeholder:text-gris/60 transition-colors',
  'focus:border-azul focus:outline-none focus:ring-3 focus:ring-celeste/60',
  'disabled:bg-crema-100/50 disabled:text-gris',
  'aria-[invalid=true]:border-peligro aria-[invalid=true]:focus:ring-peligro-50',
)

interface FieldProps {
  label: ReactNode
  error?: string
  hint?: ReactNode
  optional?: boolean
  className?: string
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
}

/** Envoltorio accesible: asocia label, ayuda y error con el control. */
export function Field({ label, error, hint, optional, className, children }: FieldProps) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-tinta">
        {label}
        {optional && <span className="ml-1 font-normal text-gris">(opcional)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-gris">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-peligro">
          {error}
        </p>
      )}
    </div>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input className={cn(control, 'min-h-11', className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return <select className={cn(control, 'min-h-11 pr-8', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea className={cn(control, 'min-h-24 py-2.5', className)} {...props} />
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; ref?: Ref<HTMLInputElement> }) {
  return (
    <label className={cn('flex min-h-11 cursor-pointer items-center gap-3 text-sm', className)}>
      <input type="checkbox" className="size-5 rounded accent-azul" {...props} />
      <span>{label}</span>
    </label>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-xl border border-peligro/20 bg-peligro-50 px-4 py-3 text-sm text-peligro">
      {message}
    </div>
  )
}
