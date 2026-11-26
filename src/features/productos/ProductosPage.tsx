import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, ErrorState, PageHeader } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Field, FormError, Input, Select } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Pagination } from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/useToast'
import { useUsuario } from '@/features/auth/useAuth'
import { useUsuariosPorRol } from '@/features/usuarios/api'
import type { Usuario } from '@/features/usuarios/types'
import { ApiError, getErrorMessage } from '@/lib/api/client'
import { applyApiErrors } from '@/lib/api/errors'
import { formatGs } from '@/lib/format'
import { useDebounced } from '@/lib/useDebounced'
import { useGuardarProducto, useProductos, type ProductoCatalogo, type ProductoInput } from './api'

type FiltroActivo = 'activos' | 'archivados' | 'todos'

/** CU-15: catálogo de productos con precio de venta y costo. El admin ve el de cada vendedor. */
export function ProductosPage() {
  const usuario = useUsuario()
  const esAdmin = usuario.rol === 'ADMIN'
  const toast = useToast()
  const guardar = useGuardarProducto()
  const vendedores = useUsuariosPorRol('VENDEDOR', esAdmin)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroActivo>('activos')
  const [vendedorId, setVendedorId] = useState('')
  const [pagina, setPagina] = useState(1)
  const [editando, setEditando] = useState<ProductoCatalogo | 'nuevo' | null>(null)
  const q = useDebounced(busqueda.trim())
  const query = useProductos({
    q: q || undefined,
    activo: filtro === 'todos' ? undefined : filtro === 'activos',
    vendedorId: esAdmin && vendedorId ? vendedorId : undefined,
    pagina,
    limite: 20,
  })

  function toggleActivo(producto: ProductoCatalogo) {
    guardar.mutate(
      { id: producto._id, input: { activo: !producto.activo } },
      {
        onSuccess: () => toast.success(producto.activo ? `${producto.nombre} quedó archivado.` : `${producto.nombre} volvió al catálogo.`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <>
      <PageHeader
        title="Productos"
        description={
          esAdmin
            ? 'Catálogos de los vendedores. Al cargar un pedido se completan el precio y el costo.'
            : 'Tu catálogo: al cargar un pedido elegís el producto y se completan el precio y el costo.'
        }
        actions={
          <Button onClick={() => setEditando('nuevo')}>
            <Icon name="plus" className="size-4" /> Nuevo producto
          </Button>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_220px]">
          <Field label="Buscar">
            {(a11y) => (
              <Input
                {...a11y}
                type="search"
                placeholder="Nombre del producto"
                value={busqueda}
                onChange={(event) => {
                  setBusqueda(event.target.value)
                  setPagina(1)
                }}
              />
            )}
          </Field>
          <Field label="Mostrar">
            {(a11y) => (
              <Select
                {...a11y}
                value={filtro}
                onChange={(event) => {
                  setFiltro(event.target.value as FiltroActivo)
                  setPagina(1)
                }}
              >
                <option value="activos">En el catálogo</option>
                <option value="archivados">Archivados</option>
                <option value="todos">Todos</option>
              </Select>
            )}
          </Field>
          {esAdmin && (
            <Field label="Vendedor">
              {(a11y) => (
                <Select
                  {...a11y}
                  value={vendedorId}
                  onChange={(event) => {
                    setVendedorId(event.target.value)
                    setPagina(1)
                  }}
                >
                  <option value="">Todos</option>
                  {(vendedores.data ?? []).map((vendedor) => (
                    <option key={vendedor._id} value={vendedor._id}>
                      {vendedor.nombre}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>
      </Card>

      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.total === 0 ? (
        <EmptyState
          title={q || filtro !== 'activos' ? 'Ningún producto coincide' : 'Todavía no hay productos'}
          description={q || filtro !== 'activos' ? undefined : 'Cargá tus productos con su precio de venta y su costo para armar pedidos más rápido.'}
          action={!q && filtro === 'activos' ? <Button onClick={() => setEditando('nuevo')}>Crear producto</Button> : undefined}
        />
      ) : (
        <>
          <Card className="divide-y divide-linea">
            {query.data.datos.map((producto) => (
              <div key={producto._id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${producto.activo ? '' : 'opacity-75'}`}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {producto.nombre}
                    {!producto.activo && <Badge className="bg-apagado-50 text-apagado">Archivado</Badge>}
                  </p>
                  <p className="tabular text-sm text-gris">
                    Venta {formatGs(producto.precioVenta)} · Costo {formatGs(producto.costo)} ·{' '}
                    <span className="font-semibold text-exito">Ganancia {formatGs(producto.precioVenta - producto.costo)}</span>
                  </p>
                  {esAdmin && <p className="text-xs text-gris">De {vendedores.porId.get(producto.vendedorId)?.nombre ?? 'un vendedor'}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditando(producto)}>
                    <Icon name="edit" className="size-4" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActivo(producto)} loading={guardar.isPending && guardar.variables?.id === producto._id}>
                    {producto.activo ? 'Archivar' : 'Reactivar'}
                  </Button>
                </div>
              </div>
            ))}
          </Card>
          <Pagination pagina={query.data.pagina} limite={query.data.limite} total={query.data.total} onChange={setPagina} />
        </>
      )}

      {editando && (
        <ProductoFormDialog
          producto={editando === 'nuevo' ? null : editando}
          vendedores={esAdmin ? (vendedores.data ?? []).filter((vendedor) => vendedor.activo) : undefined}
          vendedorInicial={vendedorId}
          onClose={() => setEditando(null)}
        />
      )}
    </>
  )
}

const schema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá un nombre').max(150, 'Máximo 150 caracteres'),
  precioVenta: z.number({ error: 'Ingresá el precio de venta' }).int().min(0, 'No puede ser negativo').max(1_000_000_000, 'Máximo 1.000.000.000 Gs'),
  costo: z.number({ error: 'Ingresá el costo' }).int().min(0, 'No puede ser negativo').max(1_000_000_000, 'Máximo 1.000.000.000 Gs'),
  vendedorId: z.string(),
})
type Values = z.infer<typeof schema>

function ProductoFormDialog({
  producto,
  vendedores,
  vendedorInicial,
  onClose,
}: {
  producto: ProductoCatalogo | null
  /** Solo ADMIN: al crear tiene que elegir de qué vendedor es. */
  vendedores?: Usuario[]
  vendedorInicial: string
  onClose: () => void
}) {
  const toast = useToast()
  const guardar = useGuardarProducto()
  const [formError, setFormError] = useState<string | null>(null)
  const eligeVendedor = Boolean(vendedores && !producto)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<Values>({
    resolver: zodResolver(
      eligeVendedor ? schema.extend({ vendedorId: z.string().min(1, 'Elegí el vendedor') }) : schema,
    ),
    defaultValues: producto
      ? { nombre: producto.nombre, precioVenta: producto.precioVenta, costo: producto.costo, vendedorId: producto.vendedorId }
      : { nombre: '', precioVenta: Number.NaN, costo: Number.NaN, vendedorId: vendedorInicial },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    const { vendedorId, ...datos } = values
    // En edición solo lo que cambió; el vendedor nunca se edita.
    const input: Partial<ProductoInput> = producto
      ? Object.fromEntries(Object.entries(datos).filter(([key]) => dirtyFields[key as keyof Values]))
      : { ...datos, ...(eligeVendedor ? { vendedorId } : {}) }
    if (producto && Object.keys(input).length === 0) return onClose()
    try {
      await guardar.mutateAsync({ id: producto?._id, input })
      toast.success(producto ? 'Producto actualizado.' : 'Producto agregado al catálogo.')
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('nombre', { message: 'Ya tenés un producto con ese nombre.' })
        return
      }
      setFormError(applyApiErrors(error, setError, Object.keys(schema.shape)))
    }
  })

  return (
    <Dialog
      open
      onClose={onClose}
      title={producto ? 'Editar producto' : 'Nuevo producto'}
      description={producto ? 'Los pedidos ya cargados conservan el precio y el costo que tenían.' : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="producto-form" loading={isSubmitting}>
            {producto ? 'Guardar' : 'Crear producto'}
          </Button>
        </>
      }
    >
      <form id="producto-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        {eligeVendedor && (
          <Field label="Vendedor" error={errors.vendedorId?.message}>
            {(a11y) => (
              <Select {...a11y} {...register('vendedorId')}>
                <option value="">Elegí un vendedor…</option>
                {vendedores!.map((vendedor) => (
                  <option key={vendedor._id} value={vendedor._id}>
                    {vendedor.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Nombre" error={errors.nombre?.message}>
          {(a11y) => <Input {...a11y} placeholder="Ej.: Remera" autoComplete="off" {...register('nombre')} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="precioVenta"
            render={({ field, fieldState }) => (
              <Field label="Precio de venta" hint="Lo que paga el cliente." error={fieldState.error?.message}>
                {(a11y) => <MoneyInput {...a11y} ref={field.ref} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
              </Field>
            )}
          />
          <Controller
            control={control}
            name="costo"
            render={({ field, fieldState }) => (
              <Field label="Costo" hint="Lo que te cuesta a vos." error={fieldState.error?.message}>
                {(a11y) => <MoneyInput {...a11y} ref={field.ref} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
              </Field>
            )}
          />
        </div>
      </form>
    </Dialog>
  )
}
