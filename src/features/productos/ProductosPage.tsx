import { zodResolver } from '@hookform/resolvers/zod'
import { useDeferredValue, useState } from 'react'
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
import { getErrorMessage } from '@/lib/api/client'
import { applyApiErrors } from '@/lib/api/errors'
import { formatGs } from '@/lib/format'
import { useGuardarProducto, useProductos, type ProductoCatalogo, type ProductoInput } from './api'

type FiltroActivo = 'activos' | 'archivados' | 'todos'

/** Catálogo del vendedor (el admin ve y carga el de cualquier vendedor). Se usa para completar los pedidos. */
export function ProductosPage() {
  const usuario = useUsuario()
  const esAdmin = usuario.rol === 'ADMIN'
  const toast = useToast()
  const guardar = useGuardarProducto()
  const vendedores = useUsuariosPorRol('VENDEDOR', esAdmin)
  const [busqueda, setBusqueda] = useState('')
  const q = useDeferredValue(busqueda.trim())
  const [filtro, setFiltro] = useState<FiltroActivo>('activos')
  const [vendedorId, setVendedorId] = useState('')
  const [pagina, setPagina] = useState(1)
  const [editando, setEditando] = useState<ProductoCatalogo | 'nuevo' | null>(null)
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
        onSuccess: () => toast.success(producto.activo ? `${producto.nombre} quedó archivado.` : `${producto.nombre} está activo.`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <>
      <PageHeader
        title="Productos"
        description="Tu catálogo: al cargar un pedido elegís el producto y se completan el precio y el costo. El delivery nunca ve los costos."
        actions={
          <Button onClick={() => setEditando('nuevo')}>
            <Icon name="plus" className="size-4" /> Nuevo producto
          </Button>
        }
      />

      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_180px] lg:grid-cols-[minmax(0,1fr)_180px_220px]">
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
              <option value="activos">Activos</option>
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
                {vendedores.data?.map((vendedor) => (
                  <option key={vendedor._id} value={vendedor._id}>
                    {vendedor.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </Card>

      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.total === 0 ? (
        <EmptyState
          title={q ? 'Ningún producto coincide con la búsqueda' : 'Todavía no hay productos'}
          description="Cargá los productos que vendés para elegirlos rápido al crear un pedido."
          action={!q && <Button onClick={() => setEditando('nuevo')}>Cargar un producto</Button>}
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.datos.map((producto) => (
              <li key={producto._id}>
                <Card className={`flex h-full flex-col gap-3 p-4 ${producto.activo ? '' : 'opacity-70'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{producto.nombre}</p>
                      {esAdmin && <p className="truncate text-xs text-gris">{vendedores.porId.get(producto.vendedorId)?.nombre ?? 'Vendedor'}</p>}
                    </div>
                    {!producto.activo && <Badge className="bg-apagado-50 text-apagado">Archivado</Badge>}
                  </div>
                  <dl className="tabular grid grid-cols-3 gap-2 rounded-xl bg-crema/60 px-3 py-2 text-xs">
                    <div>
                      <dt className="text-gris">Precio</dt>
                      <dd className="font-semibold">{formatGs(producto.precioVenta)}</dd>
                    </div>
                    <div>
                      <dt className="text-gris">Costo</dt>
                      <dd className="font-semibold">{formatGs(producto.costo)}</dd>
                    </div>
                    <div>
                      <dt className="text-gris">Ganancia</dt>
                      <dd className="font-bold text-cafe">{formatGs(producto.precioVenta - producto.costo)}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditando(producto)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => toggleActivo(producto)}
                      loading={guardar.isPending && guardar.variables?.id === producto._id}
                    >
                      {producto.activo ? 'Archivar' : 'Activar'}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Pagination pagina={query.data.pagina} limite={query.data.limite} total={query.data.total} onChange={setPagina} />
        </>
      )}

      {editando && (
        <ProductoFormDialog
          producto={editando === 'nuevo' ? null : editando}
          vendedorInicial={vendedorId}
          onClose={() => setEditando(null)}
        />
      )}
    </>
  )
}

const schema = z.object({
  nombre: z.string().trim().min(1, 'Ingresá un nombre').max(150, 'Máximo 150 caracteres'),
  precioVenta: z.number({ error: 'Ingresá el precio' }).int().min(0, 'No puede ser negativo').max(1_000_000_000, 'Máximo 1.000.000.000 Gs'),
  costo: z.number({ error: 'Ingresá el costo' }).int().min(0, 'No puede ser negativo').max(1_000_000_000, 'Máximo 1.000.000.000 Gs'),
  vendedorId: z.string(),
})
type Values = z.infer<typeof schema>

function ProductoFormDialog({ producto, vendedorInicial, onClose }: { producto: ProductoCatalogo | null; vendedorInicial: string; onClose: () => void }) {
  const usuario = useUsuario()
  const elegirVendedor = usuario.rol === 'ADMIN' && !producto
  const vendedores = useUsuariosPorRol('VENDEDOR', elegirVendedor)
  const toast = useToast()
  const guardar = useGuardarProducto()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<Values>({
    resolver: zodResolver(
      elegirVendedor ? schema.refine((values) => values.vendedorId, { path: ['vendedorId'], message: 'Elegí el vendedor' }) : schema,
    ),
    defaultValues: producto
      ? { nombre: producto.nombre, precioVenta: producto.precioVenta, costo: producto.costo, vendedorId: producto.vendedorId }
      : { nombre: '', precioVenta: Number.NaN, costo: Number.NaN, vendedorId: vendedorInicial },
  })

  const onSubmit = handleSubmit(async ({ vendedorId, ...values }) => {
    setFormError(null)
    const input: Partial<ProductoInput> = producto
      ? Object.fromEntries(Object.entries(values).filter(([key]) => dirtyFields[key as keyof Values]))
      : { ...values, ...(elegirVendedor ? { vendedorId } : {}) }
    if (producto && Object.keys(input).length === 0) return onClose()
    try {
      await guardar.mutateAsync({ id: producto?._id, input })
      toast.success(producto ? 'Producto actualizado.' : 'Producto creado.')
      onClose()
    } catch (error) {
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
        {elegirVendedor && (
          <Field label="Vendedor" error={errors.vendedorId?.message}>
            {(a11y) => (
              <Select {...a11y} {...register('vendedorId')}>
                <option value="">Elegí un vendedor…</option>
                {vendedores.data
                  ?.filter((vendedor) => vendedor.activo)
                  .map((vendedor) => (
                    <option key={vendedor._id} value={vendedor._id}>
                      {vendedor.nombre}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Nombre" error={errors.nombre?.message}>
          {(a11y) => <Input {...a11y} placeholder="Ej.: Remera talle M" autoComplete="off" {...register('nombre')} />}
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
