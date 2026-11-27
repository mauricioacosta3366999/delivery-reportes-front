import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Card, CardSection } from '@/components/ui/Card'
import { Checkbox, Field, FormError, Input, Select, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { PageLoader } from '@/components/ui/Spinner'
import { useUsuario } from '@/features/auth/useAuth'
import type { Usuario } from '@/features/usuarios/types'
import { useZonasActivas, type Zona } from '@/features/zonas/api'
import { ApiError } from '@/lib/api/client'
import { applyApiErrors } from '@/lib/api/errors'
import { formatGs } from '@/lib/format'
import { CAMPOS_PEDIDO, calcularMontos, ganancia, pedidoFormSchema, productoVacio, type PedidoFormValues } from '../form'
import { enlaceMapa, normalizarEntrega, UBICACION_RETIRO } from '../ubicacion'
import { ProductoCombobox } from './ProductoCombobox'

/** Zona histórica del pedido en edición (puede estar inactiva y conserva su tarifa). */
export interface ZonaActual {
  id: string
  nombre: string
  costoDelivery: number
  requiereTransportadora: boolean
  repartidorDefaultId?: string | null
}

/** Solo el admin al crear (CU-10, CU-12): a nombre de qué vendedor y qué delivery. */
export interface OpcionesAdmin {
  yo: string
  vendedores: Usuario[]
  repartidores: Usuario[]
}

interface PedidoFormProps {
  defaultValues: PedidoFormValues
  zonaActual?: ZonaActual
  submitLabel: string
  onSubmit: (values: PedidoFormValues) => Promise<unknown>
  onCancel: () => void
  emptyZonas?: ReactNode
  admin?: OpcionesAdmin
}

/** Errores de negocio sin `detalles` que corresponden a un campo puntual. */
const erroresDeCampo: Array<[RegExp, 'vendedorId' | 'repartidorId']> = [
  [/^Vendedor inexistente/i, 'vendedorId'],
  [/^Delivery inexistente/i, 'repartidorId'],
]

export function PedidoForm({ defaultValues, zonaActual, submitLabel, onSubmit, onCancel, emptyZonas, admin }: PedidoFormProps) {
  const zonas = useZonasActivas()
  const usuario = useUsuario()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PedidoFormValues>({ resolver: zodResolver(pedidoFormSchema), defaultValues, mode: 'onTouched' })

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await onSubmit(values)
    } catch (error) {
      const campo = error instanceof ApiError ? erroresDeCampo.find(([patron]) => patron.test(error.message))?.[1] : undefined
      if (campo && error instanceof ApiError) setError(campo, { message: error.message })
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
    repartidorDefaultId: zona.repartidorDefaultId ?? null,
  }))
  const zonaActualInactiva = zonaActual && !opciones.some((zona) => zona.id === zonaActual.id)
  if (opciones.length === 0 && !zonaActual && emptyZonas) return <>{emptyZonas}</>

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-5">
        <FormError message={formError} />

        {admin && <AdminSection control={control} register={register} errors={errors} admin={admin} opciones={opciones} />}

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

        <ProductosSection
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
          getValues={getValues}
          // El vendedor usa su catálogo; el admin, el del vendedor elegido (con "Yo" no hay catálogo).
          catalogo={usuario.rol === 'VENDEDOR' ? 'propio' : admin ? 'del-vendedor-elegido' : 'ninguno'}
        />

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

        <CardSection title="Cobro">
          <Checkbox label="El cliente ya le pagó al vendedor (por ejemplo, por transferencia)" {...register('pagoDirectoVendedor')} />
          <p className="mt-1 text-xs text-gris">El delivery no le cobra nada al cliente y en el reporte se descuenta el costo del delivery.</p>
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

function AdminSection({
  control,
  register,
  errors,
  admin,
  opciones,
}: {
  control: Control<PedidoFormValues>
  register: UseFormRegister<PedidoFormValues>
  errors: FieldErrors<PedidoFormValues>
  admin: OpcionesAdmin
  opciones: ZonaActual[]
}) {
  const zonaId = useWatch({ control, name: 'zonaId' })
  const zona = opciones.find((opcion) => opcion.id === zonaId)
  const porDefecto = zona?.repartidorDefaultId ? admin.repartidores.find((usuario) => usuario._id === zona.repartidorDefaultId) : undefined
  const automatico = !zona ? 'según la zona' : porDefecto ? porDefecto.nombre : 'sin asignar (disponible para todos)'
  const vendedores = admin.vendedores.filter((usuario) => usuario.activo)
  const repartidores = admin.repartidores.filter((usuario) => usuario.activo)

  return (
    <CardSection title="Vendedor y delivery">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="¿A nombre de quién es el pedido?" hint="Le aparece en sus pedidos y en su reporte." error={errors.vendedorId?.message}>
          {(a11y) => (
            <Select {...a11y} {...register('vendedorId')}>
              <option value="">Yo ({admin.yo})</option>
              {vendedores.map((usuario) => (
                <option key={usuario._id} value={usuario._id}>
                  {usuario.nombre}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Delivery" hint="Solo ese delivery lo va a ver y lo toma al retirarlo." error={errors.repartidorId?.message}>
          {(a11y) => (
            <Select {...a11y} {...register('repartidorId')}>
              <option value="">Automático: {automatico}</option>
              {repartidores.map((usuario) => (
                <option key={usuario._id} value={usuario._id}>
                  {usuario.nombre}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </CardSection>
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

type Catalogo = 'propio' | 'del-vendedor-elegido' | 'ninguno'

function ProductosSection({
  control,
  register,
  errors,
  setValue,
  getValues,
  catalogo,
}: {
  control: Control<PedidoFormValues>
  register: UseFormRegister<PedidoFormValues>
  errors: FieldErrors<PedidoFormValues>
  setValue: UseFormSetValue<PedidoFormValues>
  getValues: UseFormGetValues<PedidoFormValues>
  catalogo: Catalogo
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'productos' })
  const [productos, vendedorId] = useWatch({ control, name: ['productos', 'vendedorId'] })
  const habilitado = catalogo === 'propio' || (catalogo === 'del-vendedor-elegido' && Boolean(vendedorId))

  // Si el admin cambia de vendedor, los productos elegidos del catálogo anterior dejan de valer.
  const vendedorPrevio = useRef(vendedorId)
  useEffect(() => {
    if (vendedorPrevio.current === vendedorId) return
    vendedorPrevio.current = vendedorId
    getValues('productos').forEach((item, index) => {
      if (item.productoId) setValue(`productos.${index}.productoId`, '', { shouldDirty: true })
    })
  }, [vendedorId, getValues, setValue])

  return (
    <CardSection
      title="Productos"
      action={
        <Button variant="secondary" size="sm" onClick={() => append(productoVacio())} disabled={fields.length >= 100}>
          <Icon name="plus" className="size-4" /> Agregar
        </Button>
      }
    >
      <p className="mb-3 text-xs text-gris">
        <strong className="font-semibold text-tinta">Precio de venta:</strong> lo que paga el cliente por unidad.{' '}
        <strong className="font-semibold text-tinta">Costo:</strong> lo que te cuesta a vos por unidad; es opcional, solo sirve para calcular la ganancia y el delivery no lo ve.
      </p>
      <ul className="space-y-3">
        {fields.map((field, index) => {
          const fila = errors.productos?.[index]
          const item = productos?.[index]
          const subtotal = item && Number.isFinite(item.cantidad) && Number.isFinite(item.precioUnitario) ? item.cantidad * item.precioUnitario : null
          return (
            <li key={field.id} className="rounded-xl border border-linea bg-crema/40 p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)]">
                <Controller
                  control={control}
                  name={`productos.${index}.nombre`}
                  render={({ field: nombre }) => (
                    <Field label={`Producto ${index + 1}`} error={fila?.nombre?.message} className="col-span-full">
                      {(a11y) => (
                        <ProductoCombobox
                          a11y={a11y}
                          ref={nombre.ref}
                          name={nombre.name}
                          value={nombre.value}
                          onBlur={nombre.onBlur}
                          habilitado={habilitado}
                          vendedorId={catalogo === 'del-vendedor-elegido' ? vendedorId : undefined}
                          onChange={(valor) => {
                            nombre.onChange(valor)
                            // Cambiar el nombre de uno del catálogo lo desvincula (precio y costo quedan).
                            if (getValues(`productos.${index}.productoId`)) setValue(`productos.${index}.productoId`, '', { shouldDirty: true })
                          }}
                          onElegir={(producto) => {
                            const opciones = { shouldDirty: true, shouldValidate: true }
                            nombre.onChange(producto.nombre)
                            setValue(`productos.${index}.productoId`, producto._id, opciones)
                            setValue(`productos.${index}.precioUnitario`, producto.precioVenta, opciones)
                            setValue(`productos.${index}.costoUnitario`, producto.costo, opciones)
                          }}
                        />
                      )}
                    </Field>
                  )}
                />
                <Field label="Cantidad" error={fila?.cantidad?.message}>
                  {(a11y) => (
                    <Input {...a11y} type="number" inputMode="numeric" min={1} step={1} className="tabular" {...register(`productos.${index}.cantidad`, { valueAsNumber: true })} />
                  )}
                </Field>
                <Controller
                  control={control}
                  name={`productos.${index}.precioUnitario`}
                  render={({ field: precio, fieldState }) => (
                    <Field label="Precio de venta" error={fieldState.error?.message}>
                      {(a11y) => <MoneyInput {...a11y} ref={precio.ref} name={precio.name} value={precio.value} onChange={precio.onChange} onBlur={precio.onBlur} />}
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name={`productos.${index}.costoUnitario`}
                  render={({ field: costo, fieldState }) => (
                    <Field label="Costo" optional error={fieldState.error?.message} className="col-span-2 sm:col-span-1">
                      {(a11y) => <MoneyInput {...a11y} ref={costo.ref} name={costo.name} value={costo.value} onChange={costo.onChange} onBlur={costo.onBlur} />}
                    </Field>
                  )}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex flex-wrap items-center gap-2 text-gris">
                  Subtotal: <span className="tabular font-semibold text-tinta">{subtotal === null ? '—' : formatGs(subtotal)}</span>
                  {item?.productoId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-naranja-50 px-2 py-0.5 text-xs font-semibold text-naranja-700">
                      <Icon name="tag" className="size-3.5" /> Del catálogo
                    </span>
                  )}
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
  const [productos, zonaId, pagoDirecto] = useWatch({ control, name: ['productos', 'zonaId', 'pagoDirectoVendedor'] })
  // Si la zona no cambió, el pedido conserva su tarifa histórica.
  const zona = zonaActual && zonaId === zonaActual.id ? zonaActual : opciones.find((opcion) => opcion.id === zonaId)
  const montos = calcularMontos(productos ?? [], zona?.costoDelivery ?? 0, pagoDirecto)
  const gananciaVendedor = ganancia(montos.totalVenta, montos.totalCosto)

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
          <dt className="font-semibold">El delivery cobra</dt>
          <dd className="font-extrabold text-azul-900">{formatGs(montos.montoTotal)}</dd>
        </div>
        {pagoDirecto && <p className="text-xs text-gris">El cliente ya le pagó al vendedor: el delivery no cobra nada.</p>}
        <div className="rounded-lg bg-cafe-50 px-3 py-2">
          <div className="flex justify-between gap-3">
            <dt className="font-semibold text-cafe">A rendir</dt>
            <dd className="font-extrabold text-cafe">{formatGs(montos.montoARendir)}</dd>
          </div>
        </div>
        {montos.totalCosto !== null && gananciaVendedor !== null && (
          <>
            <div className="flex justify-between gap-3 pt-1">
              <dt className="text-gris">Costo de los productos</dt>
              <dd className="font-semibold">{formatGs(montos.totalCosto)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-semibold text-exito">Ganancia</dt>
              <dd className="font-extrabold text-exito">{formatGs(gananciaVendedor)}</dd>
            </div>
          </>
        )}
      </dl>
      <p className="border-t border-linea px-5 py-3 text-xs text-gris">Los importes finales los calcula el sistema al guardar.</p>
    </Card>
  )
}
