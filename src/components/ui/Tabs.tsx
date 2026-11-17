import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from './cn'

interface TabsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  items: Array<{ value: T; label: ReactNode }>
  label: string
}

/** Control segmentado accesible (role="tablist") con navegación por flechas. */
export function Tabs<T extends string>({ value, onChange, items, label }: TabsProps<T>) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const index = items.findIndex((item) => item.value === value)
    const next = event.key === 'ArrowRight' ? (index + 1) % items.length : (index - 1 + items.length) % items.length
    onChange(items[next].value)
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    buttons[next]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1 rounded-2xl bg-white p-1 ring-1 ring-linea">
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              'min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold transition-colors',
              selected ? 'bg-azul text-white shadow-sm' : 'text-gris hover:bg-celeste-50 hover:text-azul',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
