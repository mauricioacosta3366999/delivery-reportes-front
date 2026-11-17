import type { InputHTMLAttributes, Ref } from 'react'
import { formatNumero, parseEntero } from '@/lib/format'
import { Input } from './Field'

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | null | undefined
  onChange: (value: number) => void
  ref?: Ref<HTMLInputElement>
  /** Sufijo visual, por defecto "Gs". */
  suffix?: string
}

/** Entero en guaraníes mostrado con separador de miles ("45.000"). Vacío → NaN para que la validación lo marque. */
export function MoneyInput({ value, onChange, suffix = 'Gs', className, ...props }: MoneyInputProps) {
  const display = value === null || value === undefined || Number.isNaN(value) ? '' : formatNumero(value)
  return (
    <div className="relative">
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={(event) => onChange(parseEntero(event.target.value) ?? Number.NaN)}
        className={`tabular pr-11 text-right ${className ?? ''}`}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-gris">{suffix}</span>}
    </div>
  )
}
