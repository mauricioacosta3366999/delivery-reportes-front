import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Checkbox, Field, Input, Select } from '@/components/ui/Field'
import type { Usuario } from '@/features/usuarios/types'
import type { Zona } from '@/features/zonas/api'
import { ESTADOS, estadoLabels, type Estado, type PedidoFiltros } from '../types'

interface Props {
  filtros: PedidoFiltros
  onChange: (cambios: Partial<PedidoFiltros>) => void
  onLimpiar: () => void
  activos: boolean
  vendedores?: Usuario[]
  repartidores?: Usuario[]
  /** Solo ADMIN (CU-14): filtro por zona y "solo en curso". */
  zonas?: Zona[]
}

/** Valor especial del select de delivery para `sinAsignar=true`. */
const SIN_ASIGNAR = 'sin-asignar'

export function PedidoFiltrosBar({ filtros, onChange, onLimpiar, activos, vendedores, repartidores, zonas }: Props) {
  const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta)
  return (
    <Card className="mb-5 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:flex lg:flex-wrap lg:items-end">
        {/* La key reinicia el texto cuando el filtro cambia desde afuera (p. ej. "Limpiar"). */}
        <NumeroFiltro key={filtros.numero ?? 'vacio'} valor={filtros.numero} onChange={(numero) => onChange({ numero })} />
        <Field label="Estado" className="lg:w-44">
          {(a11y) => (
            <Select {...a11y} value={filtros.estado ?? ''} onChange={(event) => onChange({ estado: (event.target.value || undefined) as Estado | undefined })}>
              <option value="">Todos</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estadoLabels[estado]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Creado desde" className="lg:w-44">
          {(a11y) => <Input {...a11y} type="date" value={filtros.desde ?? ''} max={filtros.hasta} onChange={(event) => onChange({ desde: event.target.value || undefined })} />}
        </Field>
        <Field label="Hasta" className="lg:w-44" error={rangoInvalido ? 'Debe ser posterior a "desde"' : undefined}>
          {(a11y) => <Input {...a11y} type="date" value={filtros.hasta ?? ''} min={filtros.desde} onChange={(event) => onChange({ hasta: event.target.value || undefined })} />}
        </Field>
        {vendedores && (
          <Field label="Vendedor" className="lg:w-48">
            {(a11y) => (
              <Select {...a11y} value={filtros.vendedorId ?? ''} onChange={(event) => onChange({ vendedorId: event.target.value || undefined })}>
                <option value="">Todos</option>
                {vendedores.map((usuario) => (
                  <option key={usuario._id} value={usuario._id}>
                    {usuario.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {zonas && (
          <Field label="Zona" className="lg:w-44">
            {(a11y) => (
              <Select {...a11y} value={filtros.zonaId ?? ''} onChange={(event) => onChange({ zonaId: event.target.value || undefined })}>
                <option value="">Todas</option>
                {zonas.map((zona) => (
                  <option key={zona._id} value={zona._id}>
                    {zona.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {repartidores && (
          <Field label="Delivery" className="lg:w-48">
            {(a11y) => (
              <Select
                {...a11y}
                value={filtros.sinAsignar ? SIN_ASIGNAR : (filtros.repartidorId ?? '')}
                onChange={(event) => {
                  const value = event.target.value
                  onChange(value === SIN_ASIGNAR ? { repartidorId: undefined, sinAsignar: true } : { repartidorId: value || undefined, sinAsignar: undefined })
                }}
              >
                <option value="">Todos</option>
                <option value={SIN_ASIGNAR}>Sin asignar</option>
                {repartidores.map((usuario) => (
                  <option key={usuario._id} value={usuario._id}>
                    {usuario.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {zonas && (
          <Checkbox
            label="Solo en curso"
            className="col-span-2 md:col-span-1 lg:pb-0"
            checked={Boolean(filtros.activos)}
            onChange={(event) => onChange({ activos: event.target.checked || undefined })}
          />
        )}
        {activos && (
          <button type="button" onClick={onLimpiar} className="col-span-2 min-h-11 rounded-xl px-3 text-sm font-semibold text-azul hover:bg-celeste-50 md:col-span-1">
            Limpiar filtros
          </button>
        )}
      </div>
    </Card>
  )
}

/** N.º de pedido: se aplica al terminar de escribir (no en cada tecla). */
function NumeroFiltro({ valor, onChange }: { valor?: number; onChange: (numero: number | undefined) => void }) {
  const [texto, setTexto] = useState(valor ? String(valor) : '')

  function aplicar() {
    const numero = Number(texto.replace(/\D/g, ''))
    const siguiente = Number.isSafeInteger(numero) && numero >= 1 ? numero : undefined
    if (siguiente !== valor) onChange(siguiente)
  }

  return (
    <Field label="N.º de pedido" className="lg:w-36">
      {(a11y) => (
        <Input
          {...a11y}
          type="search"
          inputMode="numeric"
          placeholder="Ej.: 57"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          onBlur={aplicar}
          onKeyDown={(event) => event.key === 'Enter' && aplicar()}
        />
      )}
    </Field>
  )
}
