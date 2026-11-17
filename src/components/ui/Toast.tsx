import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from './cn'
import { ToastContext, type ToastApi } from './useToast'

type Tone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  tone: Tone
  message: string
}

const tones: Record<Tone, string> = {
  success: 'border-exito/25 bg-exito-50 text-exito',
  error: 'border-peligro/25 bg-peligro-50 text-peligro',
  info: 'border-celeste bg-celeste-50 text-azul-900',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), [])
  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = nextId.current++
      setItems((current) => [...current.slice(-2), { id, tone, message }])
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000)
    },
    [dismiss],
  )
  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  )

  return (
    <ToastContext value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:top-20 md:bottom-auto md:items-end"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-suave',
              tones[item.tone],
            )}
          >
            <span className="flex-1">{item.message}</span>
            <button type="button" onClick={() => dismiss(item.id)} className="-m-1 rounded-md p-1 opacity-70 hover:opacity-100" aria-label="Cerrar aviso">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
