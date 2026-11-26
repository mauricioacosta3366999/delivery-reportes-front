import { useEffect, useState } from 'react'

/** Devuelve `value` recién cuando dejó de cambiar durante `ms` (para búsquedas mientras se escribe). */
export function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(timer)
  }, [value, ms])
  return debounced
}
