import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, PageHeader } from '@/components/ui/Card'
import { Field, FormError, Select } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/useToast'
import { useUsuario } from '@/features/auth/useAuth'
import { useUsuariosPorRol } from '@/features/usuarios/api'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import { MESES, mesActual } from '@/lib/format'
import { descargarReporte, type FormatoReporte, type ReporteQuery } from './api'

const descripcionPorRol = {
  VENDEDOR: 'Tus pedidos entregados en el mes, con el delivery descontado: lo que tenés que rendir, con costo y ganancia.',
  REPARTIDOR: 'Los pedidos que entregaste en el mes.',
  ADMIN: 'Pedidos entregados en el mes. Podés filtrar por vendedor o delivery.',
} as const

/** CU-05/16: reporte mensual en PDF o Excel (por fecha de entrega, hora de Paraguay). */
export function ReportesPage() {
  const usuario = useUsuario()
  const toast = useToast()
  const actual = mesActual()
  const [anio, setAnio] = useState(actual.anio)
  const [mes, setMes] = useState(actual.mes)
  const [vendedorId, setVendedorId] = useState('')
  const [repartidorId, setRepartidorId] = useState('')
  const esAdmin = usuario.rol === 'ADMIN'
  const vendedores = useUsuariosPorRol('VENDEDOR', esAdmin)
  const repartidores = useUsuariosPorRol('REPARTIDOR', esAdmin)

  const descarga = useMutation({
    mutationFn: ({ query, formato }: { query: ReporteQuery; formato: FormatoReporte }) => descargarReporte(query, formato),
    onSuccess: (filename) => toast.success(`Descargado ${filename}`),
  })
  const descargando = descarga.isPending ? descarga.variables.formato : null

  function descargar(formato: FormatoReporte) {
    descarga.mutate({
      formato,
      query: {
        anio,
        mes,
        ...(esAdmin && vendedorId ? { vendedorId } : {}),
        ...(esAdmin && repartidorId ? { repartidorId } : {}),
      },
    })
  }

  const anios = Array.from({ length: 6 }, (_, index) => actual.anio - index)
  const mesFuturo = anio === actual.anio && mes > actual.mes
  const error = descarga.error
  const mensajeError = !error
    ? null
    : error instanceof ApiError && error.status === 413
      ? 'El reporte es demasiado grande (más de 5000 pedidos). Filtrá por vendedor o delivery para acotarlo.'
      : getErrorMessage(error)

  return (
    <>
      <PageHeader title="Reporte mensual" description={descripcionPorRol[usuario.rol]} />
      <Card className="max-w-xl space-y-5 p-5 sm:p-6">
        <FormError message={mensajeError} />
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault()
            descargar('pdf')
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mes">
              {(a11y) => (
                <Select {...a11y} value={mes} onChange={(event) => setMes(Number(event.target.value))}>
                  {MESES.map((nombre, index) => (
                    <option key={nombre} value={index + 1}>
                      {nombre}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Año">
              {(a11y) => (
                <Select {...a11y} value={anio} onChange={(event) => setAnio(Number(event.target.value))}>
                  {anios.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {esAdmin && (
              <>
                <Field label="Vendedor" optional>
                  {(a11y) => (
                    <Select {...a11y} value={vendedorId} onChange={(event) => setVendedorId(event.target.value)}>
                      <option value="">Todos</option>
                      {vendedores.data?.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.nombre}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Delivery" optional>
                  {(a11y) => (
                    <Select {...a11y} value={repartidorId} onChange={(event) => setRepartidorId(event.target.value)}>
                      <option value="">Todos</option>
                      {repartidores.data?.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.nombre}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </>
            )}
          </div>

          {mesFuturo && <p className="text-sm text-gris">Ese mes todavía no empezó: el reporte va a salir vacío.</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="submit" size="lg" block loading={descargando === 'pdf'} disabled={descargando === 'xlsx'}>
              <Icon name="download" /> Descargar PDF
            </Button>
            <Button size="lg" block variant="secondary" loading={descargando === 'xlsx'} disabled={descargando === 'pdf'} onClick={() => descargar('xlsx')}>
              <Icon name="download" /> Descargar Excel
            </Button>
          </div>
        </form>
        <ul className="space-y-1.5 border-t border-linea pt-4 text-xs text-gris">
          <li>• Incluye solo pedidos entregados, según la fecha de entrega.</li>
          <li>• "A rendir" = venta de productos − costo de delivery (puede ser negativo).</li>
          <li>• Si el cliente le pagó directo al vendedor, el delivery no cobró nada y se descuenta el costo del delivery.</li>
          <li>• El Excel trae las mismas columnas, con los importes como números para sumar u ordenar.</li>
          <li>• Si no hubo entregas, se descarga igual con los totales en 0.</li>
        </ul>
      </Card>
    </>
  )
}
