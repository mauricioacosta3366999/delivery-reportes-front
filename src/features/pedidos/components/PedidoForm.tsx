import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type Control, type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Card, CardSection } from '@/components/ui/Card'
import { Field, FormError, Input, Select, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { PageLoader } from '@/components/ui/Spinner'
import { useZonasActivas, type Zona } from '@/features/zonas/api'
import { applyApiErrors } from '@/lib/api/errors'
import { formatGs } from '@/lib/format'
import { CAMPOS_PEDIDO, calcularMontos, pedidoFormSchema, productoVacio, type PedidoFormValues } from '../form'
import { enlaceMapa, normalizarEntrega, UBICACION_RETIRO } from '../ubicacion'

/** Zona histórica del pedido en edición (puede estar inactiva y conserva su tarifa). */
export interface ZonaActual {
  id: string
  nombre: string
  costoDelivery: number
  requiereTransportadora: boolean
}

interface PedidoFormProps {
  defaultValues: PedidoFormValues
  zonaActual?: ZonaActual
  submitLabel: string
  onSubmit: (values: PedidoFormValues) => Promise<unknown>
  onCancel: () => void
  emptyZonas?: ReactNode
}

export function PedidoForm({ defaultValues, zonaActual, submitLabel, onSubmit, onCancel, emptyZonas }: PedidoFormProps) {
  const zonas = useZonasActivas()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PedidoFormValues>({ resolver: zodResolver(pedidoFormSchema), defaultValues, mode: 'onTouched' })

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await onSubmit(values)
    } catch (error) {
      setFormError(applyApiErrors(error, setError, CAMPOS_PEDIDO))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, () => setFormError('Revisá los campos marcados.'))

  if (zonas.isPending) return <PageLoader />

  const opciones: ZonaActual[] = (zonas.data ?? []).map((zona: Zona) => ({
    id: zona._id,
    nombre: zona.nombre,
    costoDelivery: zona.costoDelivery,
    requiereTransportadora: zona.requiereTransportadora,
  }))
  const zonaActualInactiva = zonaActual && !opciones.some((zona) => zona.id === zonaActual.id)
  if (opciones.length === 0 && !zonaActual && emptyZonas) return <>{emptyZonas}</>

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-5">
        <FormError message={formError} />

        <CardSection title="Cliente">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del cliente" error={errors.nombreCliente?.message}>
              {(a11y) => <Input {...a11y} autoComplete="off" {...register('nombreCliente')} />}
            </Field>
            <Field label="Contacto" error={errors.contactoCliente?.message}>
              {(a11y) => <Input {...a11y} type="tel" inputMode="tel" placeholder="0981 222 333" {...register('contactoCliente')} />}
            </Field>
          </div>
        </CardSection>

        <CardSection title="Zona y fecha">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Zona de entrega" error={errors.zonaId?.message} className="sm:col-span-2">
              {(a11y) => (
                <Select {...a11y} {...register('zonaId')}>
                  <option value="">Elegí una zona…</option>
                  {zonaActualInactiva && (
                    <option value={zonaActual.id}>
                      {zonaActual.nombre} · {formatGs(zonaActual.costoDelivery)} (zona actual)
                    </option>
                  )}
                  {opciones.map((zona) => (
                    <option key={zona.id} value={zona.id}>
                      {zona.nombre} · {formatGs(zona.costoDelivery)}
                      {zona.requiereTransportadora ? ' · transportadora' : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <AvisoTransportadora control={control} opciones={zonaActual ? [zonaActual, ...opciones] : opciones} />
            <Field label="Fecha del pedido" error={errors.fechaPedido?.message}>
              {(a11y) => <Input {...a11y} type="date" {...register('fechaPedido')} />}
            </Field>
          </div>
        </CardSection>

        <ProductosSection control={control} register={register} errors={errors} />

        <CardSection title="Ubicaciones">
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl bg-celeste-50 px-3.5 py-3 text-sm">
              <Icon name="pin" className="mt-0.5 size-4 shrink-0 text-azul" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-azul-900">Retiro: {UBICACION_RETIRO.direccion}</p>
                <p className="text-xs text-gris">Todos los pedidos se retiran en este punto.</p>
              </div>
              <a href={enlaceMapa(UBICACION_RETIRO)} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-azul underline-offset-4 hover:underline">
                Ver mapa<span className="sr-only"> del punto de retiro (abre Google Maps)</span>
              </a>
            </div>
            <EntregaField control={control} register={register} errors={errors} />
          </div>
        </CardSection>

        <CardSection title="Observaciones">
          <Field label="Notas para el delivery" optional error={errors.observaciones?.message}>
            {(a11y) => <Textarea {...a11y} rows={3} placeholder="Ej.: llamar antes de llegar" {...register('observaciones')} />}
          </Field>
        </CardSection>
      </div>

      <div className="space-y-3 lg:sticky lg:top-24">
        <ResumenMontos control={control} opciones={opciones} zonaActual={zonaActual} />
        <Button type="submit" block size="lg" loading={isSubmitting}>
          {submitLabel}
        </Button>
        <Button variant="ghost" block onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function AvisoTransportadora({ control, opciones }: { control: Control<PedidoFormValues>; opciones: ZonaActual[] }) {
  const zonaId = useWatch({ control, name: 'zonaId' })
  const zona = opciones.find((opcion) => opcion.id === zonaId)
  if (!zona?.requiereTransportadora) return null
  return (
    <p className="flex items-start gap-2 rounded-xl bg-cafe-50 px-3 py-2.5 text-sm text-cafe sm:col-span-2">
      <Icon name="truck" className="mt-0.5 size-4 shrink-0" />
      Esta zona requiere envío por transportadora.
    </p>
  )
}

function ProductosSection({ control, register, errors }: { control: Control<PedidoFormValues>; register: UseFormRegister<PedidoFormValues>; errors: FieldErrors<PedidoFormValues> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'productos' })
  const productos = useWatch({ control, name: 'productos' })

  return (
    <CardSection
      title="Productos"
      action={
        <Button variant="secondary" size="sm" onClick={() => append(productoVacio())} disabled={fields.length >= 100}>
          <Icon name="plus" className="size-4" /> Agregar
        </Button>
      }
    >
      <ul className="space-y-3">
        {fields.map((field, index) => {
          const fila = errors.productos?.[index]
          const item = productos?.[index]
          const subtotal = item && Number.isFinite(item.cantidad) && Number.isFinite(item.precioUnitario) ? item.cantidad * item.precioUnitario : null
          return (
            <li key={field.id} className="rounded-xl border border-linea bg-crema/40 p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_96px_150px]">
                <Field label={`Producto ${index + 1}`} error={fila?.nombre?.message} className="col-span-2 sm:col-span-1">
                  {(a11y) => <Input {...a11y} placeholder="Ej.: Remera" {...register(`productos.${index}.nombre`)} />}
                </Field>
                <Field label="Cantidad" error={fila?.cantidad?.message}>
                  {(a11y) => (
                    <Input {...a11y} type="number" inputMode="numeric" min={1} step={1} className="tabular" {...register(`productos.${index}.cantidad`, { valueAsNumber: true })} />
                  )}
                </Field>
                <Controller
                  control={control}
                  name={`productos.${index}.precioUnitario`}
                  render={({ field: precio, fieldState }) => (
                    <Field label="Precio unitario" error={fieldState.error?.message}>
                      {(a11y) => <MoneyInput {...a11y} ref={precio.ref} name={precio.name} value={precio.value} onChange={precio.onChange} onBlur={precio.onBlur} />}
                    </Field>
                  )}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gris">
                  Subtotal: <span className="tabular font-semibold text-tinta">{subtotal === null ? '—' : formatGs(subtotal)}</span>
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-peligro hover:bg-peligro-50"
                  >
                    <Icon name="trash" className="size-4" /> Quitar
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {errors.productos?.root?.message && <p className="mt-2 text-xs font-medium text-peligro">{errors.productos.root.message}</p>}
      {errors.productos?.message && <p className="mt-2 text-xs font-medium text-peligro">{errors.productos.message}</p>}
    </CardSection>
  )
}

function EntregaField({
  control,
  register,
  errors,
}: {
  control: Control<PedidoFormValues>
  register: UseFormRegister<PedidoFormValues>
  errors: FieldErrors<PedidoFormValues>
}) {
  const direccion = useWatch({ control, name: 'ubicacionEntrega.direccion' })
  const normalizada = direccion ? normalizarEntrega(direccion) : null

  return (
    <div className="space-y-2">
      <Field
        label="Entrega: dirección o link de Google Maps"
        hint='Escribí la dirección o pegá el link del lugar (en Google Maps: "Compartir → Copiar vínculo").'
        error={errors.ubicacionEntrega?.direccion?.message}
      >
        {(a11y) => <Input {...a11y} placeholder="Calle, número, ciudad — o https://maps.app.goo.gl/…" autoComplete="off" {...register('ubicacionEntrega.direccion')} />}
      </Field>
      {normalizada?.ok && normalizada.esLink && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-exito">
          <Icon name="check" className="size-4" />
          Link de Google Maps detectado
          {normalizada.coordenadas && ` (${normalizada.coordenadas.latitud}, ${normalizada.coordenadas.longitud})`}. El delivery lo va a abrir tal cual.
        </p>
      )}
    </div>
  )
}

function ResumenMontos({ control, opciones, zonaActual }: { control: Control<PedidoFormValues>; opciones: ZonaActual[]; zonaActual?: ZonaActual }) {
  const [productos, zonaId] = useWatch({ control, name: ['productos', 'zonaId'] })
  // Si la zona no cambió, el pedido conserva su tarifa histórica.
  const zona = zonaActual && zonaId === zonaActual.id ? zonaActual : opciones.find((opcion) => opcion.id === zonaId)
  const montos = calcularMontos(productos ?? [], zona?.costoDelivery ?? 0)

  return (
    <Card className="overflow-hidden">
      <div className="bg-azul px-5 py-3 text-sm font-bold text-white">Resumen</div>
      <dl className="tabular space-y-2.5 px-5 py-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-gris">Venta de productos</dt>
          <dd className="font-semibold">{formatGs(montos.totalVenta)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gris">Delivery{zona ? ` (${zona.nombre})` : ''}</dt>
          <dd className="font-semibold">{zona ? formatGs(montos.costoDelivery) : '—'}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-linea pt-2.5">
          <dt className="font-semibold">Total a cobrar al cliente</dt>
          <dd className="font-extrabold text-azul-900">{formatGs(montos.montoTotal)}</dd>
        </div>
        <div className="flex justify-between gap-3 rounded-lg bg-cafe-50 px-3 py-2">
          <dt className="font-semibold text-cafe">A rendir</dt>
          <dd className="font-extrabold text-cafe">{formatGs(montos.montoARendir)}</dd>
        </div>
      </dl>
      <p className="border-t border-linea px-5 py-3 text-xs text-gris">Los importes finales los calcula el sistema al guardar.</p>
    </Card>
  )
}
