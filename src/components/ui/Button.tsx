import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from './cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-naranja text-white hover:bg-naranja-700 active:bg-naranja-900',
  secondary: 'bg-white text-azul ring-1 ring-inset ring-celeste hover:bg-celeste-50',
  accent: 'bg-cafe text-white hover:bg-cafe-700',
  ghost: 'text-azul hover:bg-celeste-50',
  danger: 'bg-white text-peligro ring-1 ring-inset ring-peligro/30 hover:bg-peligro-50',
}

const sizes: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-13 px-6 text-base',
}

interface StyleProps {
  variant?: Variant
  size?: Size
  block?: boolean
}

function buttonClasses({ variant = 'primary', size = 'md', block }: StyleProps, className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-55',
    variants[variant],
    sizes[size],
    block && 'w-full',
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  loading?: boolean
}

export function Button({ variant, size, block, loading, disabled, className, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, block }, className)}
      {...props}
    >
      {loading && <Spinner label="Procesando" />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, block, className, ...props }: LinkProps & StyleProps) {
  return <Link className={buttonClasses({ variant, size, block }, className)} {...props} />
}
