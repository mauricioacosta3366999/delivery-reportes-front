import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, ErrorState, PageHeader } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Checkbox, Field, FormError, Input, Select, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Pagination } from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/useToast'
import { useUsuariosPorRol } from '@/features/usuarios/api'
import type { Usuario } from '@/features/usuarios/types'
import { useGuardarZona, useZonas, type Zona, type ZonaInput } from '@/features/zonas/api'
import { getErrorMessage } from '@/lib/api/client'
import { applyApiErrors } from '@/lib/api/errors'
import { formatGs } from '@/lib/format'

type FiltroActiva = 'todas' | 'activas' | 'inactivas'

/** CU-09: alta y mantenimiento de zonas de entrega. */
export function ZonasPage() {
  const [filtro, setFiltro] = useState<FiltroActiva>('todas')
  const [pagina, setPagina] = useState(1)
  const [editando, setEditando] = useState<Zona | 'nueva' | null>(null)
  const toast = useToast()
  const guardar = useGuardarZona()
  const query = useZonas({ activa: filtro === 'todas' ? undefined : filtro === 'activas', pagina, limite: 20 })
  const repartidores = useUsuariosPorRol('REPARTIDOR')

  function toggleActiva(zona: Zona) {
    guardar.mutate(
      { id: zona._id, input: { activa: !zona.activa } },
      {
        onSuccess: () => toast.success(zona.activa ? `${zona.nombre} quedó oculta para los vendedores.` : `${zona.nombre} está activa.`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <>
      <PageHeader
        title="Zonas de entrega"
        description="Los vendedores eligen una zona activa al crear un pedido. Cambiar el costo no afecta pedidos ya creados."
        actions={
          <Button onClick={() => setEditando('nueva')}>
            <Icon name="plus" className="size-4" /> Nueva zona
          </Button>
        }
      />

      <div className="mb-4 max-w-48">
        <Field label="Mostrar">
          {(a11y) => (
            <Select
              {...a11y}
              value={filtro}
              onChange={(event) => {
                setFiltro(event.target.value as FiltroActiva)
                setPagina(1)
              }}
            >
              <option value="todas">Todas</option>
              <option value="activas">Activas</option>
              <option value="inactivas">Inactivas</option>
            </Select>
          )}
        </Field>
      </div>

      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.total === 0 ? (
        <EmptyState
          title="No hay zonas"
          description="Creá la primera zona para que los vendedores puedan cargar pedidos."
          action={<Button onClick={() => setEditando('nueva')}>Crear zona</Button>}
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.datos.map((zona) => (
              <li key={zona._id}>
                <Card className={`flex h-full flex-col gap-3 p-4 ${zona.activa ? '' : 'opacity-70'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{zona.nombre}</p>
                      {zona.descripcion && <p className="line-clamp-2 text-xs text-gris">{zona.descripcion}</p>}
                    </div>
                    <Badge className={zona.activa ? 'bg-exito-50 text-exito' : 'bg-apagado-50 text-apagado'}>{zona.activa ? 'Activa' : 'Inactiva'}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tabular text-xl font-extrabold text-azul-900">{formatGs(zona.costoDelivery)}</span>
                    {zona.requiereTransportadora && (
                      <Badge className="bg-cafe-50 text-cafe">
                        <Icon name="truck" className="size-3.5" /> Transportadora
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-1.5 text-gris">
                      <Icon name="truck" className="size-4 shrink-0" />
                      {zona.repartidorDefaultId
                        ? `Delivery por defecto: ${repartidores.porId.get(zona.repartidorDefaultId)?.nombre ?? '…'}`
                        : 'Sin delivery por defecto'}
                    </p>
                    {zona.pedidosActivos !== undefined && (
                      <Link
                        to={`/admin/pedidos?activos=true&zonaId=${zona._id}`}
                        className="inline-flex min-h-9 items-center gap-1.5 font-semibold text-azul underline-offset-4 hover:underline"
                      >
                        <Icon name="box" className="size-4" />
                        {zona.pedidosActivos === 1 ? '1 pedido en curso' : `${zona.pedidosActivos} pedidos en curso`}
                      </Link>
                    )}
                  </div>
                  <div className="mt-auto flex gap-2 pt-1">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditando(zona)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => toggleActiva(zona)}
                      loading={guardar.isPending && guardar.variables?.id === zona._id}
                    >
                      {zona.activa ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Pagination pagina={query.data.pagina} limite={query.data.limite} total={query.data.total} onChange={setPagina} />
        </>
      )}

      {editando && <ZonaFormDialog zona={editando === 'nueva' ? null : editando} repartidores={repartidores.data ?? []} onClose={() => setEditando(null)} />}
    </>
  )
}

const schema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá un nombre').max(150, 'Máximo 150 caracteres'),
  descripcion: z.string().trim().max(500, 'Máximo 500 caracteres'),
  costoDelivery: z.number({ error: 'Ingresá el costo' }).int().min(0, 'No puede ser negativo').max(1_000_000_000, 'Máximo 1.000.000.000 Gs'),
  requiereTransportadora: z.boolean(),
  /** '' = ninguno (los pedidos quedan disponibles para todos). */
  repartidorDefaultId: z.string(),
  activa: z.boolean(),
})
type Values = z.infer<typeof schema>

function ZonaFormDialog({ zona, repartidores, onClose }: { zona: Zona | null; repartidores: Usuario[]; onClose: () => void }) {
  const toast = useToast()
  const guardar = useGuardarZona()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: zona
      ? {
          nombre: zona.nombre,
          descripcion: zona.descripcion ?? '',
          costoDelivery: zona.costoDelivery,
          requiereTransportadora: zona.requiereTransportadora,
          repartidorDefaultId: zona.repartidorDefaultId ?? '',
          activa: zona.activa,
        }
      : { nombre: '', descripcion: '', costoDelivery: Number.NaN, requiereTransportadora: false, repartidorDefaultId: '', activa: true },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    // '' en el formulario = ninguno; la API espera null (y al crear, mejor omitirlo).
    const { repartidorDefaultId, ...resto } = values
    const completo: Partial<ZonaInput> = { ...resto, repartidorDefaultId: repartidorDefaultId || null }
    // En edición solo se envía lo que cambió.
    const input: Partial<ZonaInput> = zona
      ? Object.fromEntries(Object.entries(completo).filter(([key]) => dirtyFields[key as keyof Values]))
      : { ...resto, ...(repartidorDefaultId ? { repartidorDefaultId } : {}) }
    if (zona && Object.keys(input).length === 0) return onClose()
    try {
      await guardar.mutateAsync({ id: zona?._id, input })
      toast.success(zona ? 'Zona actualizada.' : 'Zona creada.')
      onClose()
    } catch (error) {
      setFormError(applyApiErrors(error, setError, Object.keys(schema.shape)))
    }
  })

  return (
    <Dialog
      open
      onClose={onClose}
      title={zona ? 'Editar zona' : 'Nueva zona'}
      description={zona ? 'Los pedidos existentes conservan el nombre y el costo que tenían.' : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="zona-form" loading={isSubmitting}>
            {zona ? 'Guardar' : 'Crear zona'}
          </Button>
        </>
      }
    >
      <form id="zona-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        <Field label="Nombre" error={errors.nombre?.message}>
          {(a11y) => <Input {...a11y} placeholder="Ej.: Lambaré" {...register('nombre')} />}
        </Field>
        <Field label="Descripción" optional error={errors.descripcion?.message}>
          {(a11y) => <Textarea {...a11y} rows={2} {...register('descripcion')} />}
        </Field>
        <Controller
          control={control}
          name="costoDelivery"
          render={({ field, fieldState }) => (
            <Field label="Costo de delivery" error={fieldState.error?.message}>
              {(a11y) => <MoneyInput {...a11y} ref={field.ref} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} placeholder="20.000" />}
            </Field>
          )}
        />
        <Field
          label="Delivery por defecto"
          optional
          hint="Los pedidos nuevos de la zona se le asignan solos. No cambia los pedidos que ya existen."
          error={errors.repartidorDefaultId?.message}
        >
          {(a11y) => (
            <Select {...a11y} {...register('repartidorDefaultId')}>
              <option value="">Ninguno (disponible para todos)</option>
              {repartidores
                .filter((usuario) => usuario.activo || usuario._id === zona?.repartidorDefaultId)
                .map((usuario) => (
                  <option key={usuario._id} value={usuario._id}>
                    {usuario.nombre}
                    {usuario.activo ? '' : ' (inactivo)'}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Checkbox label="Requiere transportadora" {...register('requiereTransportadora')} />
        <Checkbox label="Activa (visible para los vendedores)" {...register('activa')} />
      </form>
    </Dialog>
  )
}
