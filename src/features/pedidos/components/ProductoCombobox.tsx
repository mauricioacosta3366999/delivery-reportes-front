import { useId, useState, type KeyboardEvent, type Ref } from 'react'
import { Input } from '@/components/ui/Field'
import { useProductos, type ProductoCatalogo } from '@/features/productos/api'
import { formatGs } from '@/lib/format'
import { useDebounced } from '@/lib/useDebounced'

interface Props {
  /** id, aria-describedby y aria-invalid que arma <Field>. */
  a11y: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }
  value: string
  name: string
  ref?: Ref<HTMLInputElement>
  onBlur: () => void
  onChange: (nombre: string) => void
  onElegir: (producto: ProductoCatalogo) => void
  /** false = sin catálogo (p. ej. el admin carga a su propio nombre): texto libre. */
  habilitado: boolean
  /** Solo ADMIN: catálogo del vendedor del pedido. */
  vendedorId?: string
}

/**
 * Nombre del producto con sugerencias del catálogo (CU-15). Sigue aceptando texto libre:
 * elegir una sugerencia completa precio y costo; escribir otra cosa no obliga a nada.
 */
export function ProductoCombobox({ a11y, value, name, ref, onBlur, onChange, onElegir, habilitado, vendedorId }: Props) {
  const listboxId = useId()
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(-1)
  const q = useDebounced(value.trim(), 250)
  const query = useProductos({ q: q || undefined, activo: true, vendedorId, limite: 8 }, { enabled: habilitado && abierto })
  const opciones = habilitado && abierto ? (query.data?.datos ?? []) : []
  const visible = opciones.length > 0

  function elegir(producto: ProductoCatalogo) {
    onElegir(producto)
    setAbierto(false)
    setActivo(-1)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!habilitado) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setAbierto(true)
      setActivo((actual) => (opciones.length ? (actual + 1) % opciones.length : -1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActivo((actual) => (opciones.length ? (actual - 1 + opciones.length) % opciones.length : -1))
    } else if (event.key === 'Enter' && visible && activo >= 0) {
      event.preventDefault()
      elegir(opciones[activo])
    } else if (event.key === 'Escape' && abierto) {
      event.preventDefault()
      setAbierto(false)
    }
  }

  if (!habilitado) {
    return <Input {...a11y} ref={ref} name={name} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} placeholder="Ej.: Remera" autoComplete="off" />
  }

  return (
    <div className="relative">
      <Input
        {...a11y}
        ref={ref}
        name={name}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listboxId}
        aria-activedescendant={visible && activo >= 0 ? `${listboxId}-${activo}` : undefined}
        placeholder={vendedorId ? 'Escribí para buscar en su catálogo' : 'Escribí para buscar en tu catálogo'}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value)
          setAbierto(true)
          setActivo(-1)
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          setAbierto(false)
          onBlur()
        }}
        onKeyDown={onKeyDown}
      />
      <ul
        id={listboxId}
        role="listbox"
        aria-label="Productos del catálogo"
        hidden={!visible}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-linea bg-white py-1 shadow-xl"
      >
        {opciones.map((producto, index) => (
          <li
            key={producto._id}
            id={`${listboxId}-${index}`}
            role="option"
            aria-selected={index === activo}
            // mousedown (no click) para elegir antes de que el input pierda el foco.
            onMouseDown={(event) => {
              event.preventDefault()
              elegir(producto)
            }}
            className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2.5 text-sm ${index === activo ? 'bg-naranja-50' : 'hover:bg-crema'}`}
          >
            <span className="min-w-0 truncate font-semibold">{producto.nombre}</span>
            <span className="tabular shrink-0 text-xs text-gris">
              {formatGs(producto.precioVenta)} · costo {formatGs(producto.costo)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
