import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import type { Usuario } from '@/features/usuarios/types'
import { ESTADOS, estadoLabels, type Estado, type PedidoFiltros } from '../types'

interface Props {
  filtros: PedidoFiltros
  onChange: (cambios: Partial<PedidoFiltros>) => void
  onLimpiar: () => void
  activos: boolean
  vendedores?: Usuario[]
  repartidores?: Usuario[]
}

export function PedidoFiltrosBar({ filtros, onChange, onLimpiar, activos, vendedores, repartidores }: Props) {
  const rangoInvalido = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta)
  return (
    <Card className="mb-5 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:flex lg:flex-wrap lg:items-end">
        <Field label="Estado" className="col-span-2 md:col-span-1 lg:w-44">
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
        {repartidores && (
          <Field label="Delivery" className="lg:w-48">
            {(a11y) => (
              <Select {...a11y} value={filtros.repartidorId ?? ''} onChange={(event) => onChange({ repartidorId: event.target.value || undefined })}>
                <option value="">Todos</option>
                {repartidores.map((usuario) => (
                  <option key={usuario._id} value={usuario._id}>
                    {usuario.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
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
