import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type Control, type UseFormRegister, type UseFormSetValue, type FieldErrors } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Card, CardSection } from '@/components/ui/Card'
import { Checkbox, Field, FormError, Input, Select, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { PageLoader } from '@/components/ui/Spinner'
import { useUsuario } from '@/features/auth/useAuth'
import { useCatalogo, type ProductoCatalogo } from '@/features/productos/api'
import type { Usuario } from '@/features/usuarios/types'
import { useZonasActivas, type Zona } from '@/features/zonas/api'
import { applyApiErrors } from '@/lib/api/errors'
import { formatGs } from '@/lib/format'
import { CAMPOS_PEDIDO, calcularCosto, calcularMontos, pedidoFormSchema, productoVacio, type PedidoFormValues } from '../form'
import { enlaceMapa, normalizarEntrega, UBICACION_RETIRO } from '../ubicacion'

/** Zona histórica del pedido en edición (puede estar inactiva y conserva su tarifa). */
export interface ZonaActual {
  id: string
  nombre: string
  costoDelivery: number
  requiereTransportadora: boolean
  repartidorDefaultId?: string | null
}

interface PedidoFormProps {
  defaultValues: PedidoFormValues
  zonaActual?: ZonaActual
  submitLabel: string
  onSubmit: (values: PedidoFormValues) => Promise<unknown>
  onCancel: () => void
  emptyZonas?: ReactNode
  /** Solo admin al crear: permite cargar el pedido a nombre de un vendedor. */
  vendedores?: Usuario[]
  /** Nombre de quien carga el pedido (opción por defecto del selector de vendedor). */
  nombrePropio?: string
  /** Solo admin al crear: permite asignar el delivery (si no, el de la zona). */
  repartidores?: Usuario[]
  /** Vendedor cuyo catálogo se ofrece (admin editando un pedido ajeno). Sin esto, el del vendedor elegido o el propio. */
  catalogoVendedorId?: string
}

export function PedidoForm({
  defaultValues,
  zonaActual,
  submitLabel,
  onSubmit,
  onCancel,
  emptyZonas,
  vendedores,
  nombrePropio,
  repartidores,
  catalogoVendedorId,
}: PedidoFormProps) {
  const zonas = useZonasActivas()
  const usuario = useUsuario()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PedidoFormValues>({ resolver: zodResolver(pedidoFormSchema), defaultValues, mode: 'onTouched' })
  const vendedorElegido = useWatch({ control, name: 'vendedorId' })
  // El vendedor usa su propio catálogo; el admin, el del vendedor del pedido.
  const vendedorCatalogo = vendedorElegido || catalogoVendedorId
  const catalogo = useCatalogo(vendedorCatalogo, usuario.rol === 'VENDEDOR' || Boolean(vendedorCatalogo))

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
    repartidorDefaultId: zona.repartidorDefaultId ?? null,
  }))
  const zonaActualInactiva = zonaActual && !opciones.some((zona) => zona.id === zonaActual.id)
  if (opciones.length === 0 && !zonaActual && emptyZonas) return <>{emptyZonas}</>

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-5">
        <FormError message={formError} />

        {vendedores && (
          <CardSection title="Vendedor">
            <Field
              label="¿A nombre de quién es el pedido?"
              hint="El vendedor lo va a ver en sus pedidos y en su reporte, y el delivery verá su nombre y contacto."
              error={errors.vendedorId?.message}
            >
              {(a11y) => (
                <Select {...a11y} {...register('vendedorId')}>
                  <option value="">{nombrePropio ? `Yo (${nombrePropio})` : 'Yo'}</option>
                  {vendedores.map((vendedor) => (
                    <option key={vendedor._id} value={vendedor._id}>
                      {vendedor.nombre}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </CardSection>
        )}

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
            {repartidores && <DeliveryField control={control} register={register} opciones={opciones} repartidores={repartidores} />}
            <Field label="Fecha del pedido" error={errors.fechaPedido?.message}>
              {(a11y) => <Input {...a11y} type="date" {...register('fechaPedido')} />}
            </Field>
          </div>
        </CardSection>

        <ProductosSection control={control} register={register} errors={errors} setValue={setValue} catalogo={catalogo.data ?? []} />

        <CardSection title="Cobro">
          <Checkbox label="El cliente ya le pagó al vendedor (por ejemplo, por transferencia)" {...register('pagoDirectoVendedor')} />
          <p className="mt-1 text-xs text-gris">El delivery no le cobra nada al cliente y el costo del delivery se descuenta en "A rendir".</p>
        </CardSection>

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

const normalizar = (texto: string) => texto.trim().toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '')

function ProductosSection({
  control,
  register,
  errors,
  setValue,
  catalogo,
}: {
  control: Control<PedidoFormValues>
  register: UseFormRegister<PedidoFormValues>
  errors: FieldErrors<PedidoFormValues>
  setValue: UseFormSetValue<PedidoFormValues>
  catalogo: ProductoCatalogo[]
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'productos' })
  const productos = useWatch({ control, name: 'productos' })
  const porNombre = new Map(catalogo.map((producto) => [normalizar(producto.nombre), producto]))

  /** Al escribir o elegir un nombre del catálogo, completa precio y costo; si se aparta, deja de estar vinculado. */
  function alCambiarNombre(index: number, nombre: string) {
    const producto = porNombre.get(normalizar(nombre))
    const opciones = { shouldDirty: true, shouldValidate: true }
    if (producto) {
      setValue(`productos.${index}.productoId`, producto._id, opciones)
      setValue(`productos.${index}.precioUnitario`, producto.precioVenta, opciones)
      setValue(`productos.${index}.costoUnitario`, producto.costo, opciones)
    } else if (productos?.[index]?.productoId) {
      setValue(`productos.${index}.productoId`, '', opciones)
    }
  }

  return (
    <CardSection
      title="Productos"
      action={
        <Button variant="secondary" size="sm" onClick={() => append(productoVacio())} disabled={fields.length >= 100}>
          <Icon name="plus" className="size-4" /> Agregar
        </Button>
      }
    >
      {catalogo.length > 0 && (
        <>
          <p className="mb-3 flex items-center gap-1.5 text-xs text-gris">
            <Icon name="tag" className="size-4 shrink-0" /> Escribí el nombre y elegí un producto de tu catálogo: se completan el precio y el costo.
          </p>
          <datalist id="catalogo-productos">
            {catalogo.map((producto) => (
              <option key={producto._id} value={producto.nombre}>
                {formatGs(producto.precioVenta)}
              </option>
            ))}
          </datalist>
        </>
      )}
      <ul className="space-y-3">
        {fields.map((field, index) => {
          const fila = errors.productos?.[index]
          const item = productos?.[index]
          const subtotal = item && Number.isFinite(item.cantidad) && Number.isFinite(item.precioUnitario) ? item.cantidad * item.precioUnitario : null
          return (
            <li key={field.id} className="rounded-xl border border-linea bg-crema/40 p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_80px_136px_150px]">
                <Field label={`Producto ${index + 1}`} error={fila?.nombre?.message} className="col-span-2 sm:col-span-1">
                  {(a11y) => (
                    <Input
                      {...a11y}
                      placeholder="Ej.: Remera"
                      autoComplete="off"
                      list={catalogo.length ? 'catalogo-productos' : undefined}
                      {...register(`productos.${index}.nombre`, { onChange: (event) => alCambiarNombre(index, event.target.value) })}
                    />
                  )}
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
                <Controller
                  control={control}
                  name={`productos.${index}.costoUnitario`}
                  render={({ field: costo, fieldState }) => (
                    <Field label="Costo" optional error={fieldState.error?.message}>
                      {(a11y) => <MoneyInput {...a11y} ref={costo.ref} name={costo.name} value={costo.value} onChange={costo.onChange} onBlur={costo.onBlur} />}
                    </Field>
                  )}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-gris">
                  Subtotal: <span className="tabular font-semibold text-tinta">{subtotal === null ? '—' : formatGs(subtotal)}</span>
                  {item?.productoId && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-exito">
                      <Icon name="check" className="size-3.5" /> Del catálogo
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

/** Solo admin: delivery del pedido; "Automático" usa el delivery por defecto de la zona elegida. */
function DeliveryField({
  control,
  register,
  opciones,
  repartidores,
}: {
  control: Control<PedidoFormValues>
  register: UseFormRegister<PedidoFormValues>
  opciones: ZonaActual[]
  repartidores: Usuario[]
}) {
  const zonaId = useWatch({ control, name: 'zonaId' })
  const zona = opciones.find((opcion) => opcion.id === zonaId)
  const porDefecto = zona?.repartidorDefaultId ? repartidores.find((usuario) => usuario._id === zona.repartidorDefaultId) : undefined
  const automatico = porDefecto ? `Automático: ${porDefecto.nombre} (delivery de la zona)` : 'Automático: sin asignar (disponible para todos)'
  return (
    <Field label="Delivery" optional className="sm:col-span-2">
      {(a11y) => (
        <Select {...a11y} {...register('repartidorId')}>
          <option value="">{automatico}</option>
          {repartidores
            .filter((usuario) => usuario.activo)
            .map((usuario) => (
              <option key={usuario._id} value={usuario._id}>
                {usuario.nombre}
              </option>
            ))}
        </Select>
      )}
    </Field>
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
  const costo = calcularCosto(productos ?? [])

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
          <dt className="font-semibold">{pagoDirecto ? 'El delivery cobra' : 'Total a cobrar al cliente'}</dt>
          <dd className="font-extrabold text-azul-900">{formatGs(montos.montoTotal)}</dd>
        </div>
        {pagoDirecto && <p className="text-xs text-gris">El cliente ya le pagó al vendedor.</p>}
        <div className="flex justify-between gap-3 rounded-lg bg-cafe-50 px-3 py-2">
          <dt className="font-semibold text-cafe">A rendir</dt>
          <dd className="font-extrabold text-cafe">{formatGs(montos.montoARendir)}</dd>
        </div>
        {costo !== null && (
          <>
            <div className="flex justify-between gap-3 pt-1">
              <dt className="text-gris">Costo de los productos</dt>
              <dd className="font-semibold">{formatGs(costo)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gris">Tu ganancia</dt>
              <dd className="font-semibold text-exito">{formatGs(montos.totalVenta - costo)}</dd>
            </div>
          </>
        )}
      </dl>
      <p className="border-t border-linea px-5 py-3 text-xs text-gris">Los importes finales los calcula el sistema al guardar.</p>
    </Card>
  )
}
