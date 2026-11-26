import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, ErrorState, PageHeader } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Checkbox, Field, FormError, Input, Select } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/useToast'
import { useUsuario } from '@/features/auth/useAuth'
import { useGuardarUsuario, useUsuarios, type UsuarioInput } from '@/features/usuarios/api'
import { ROLES, rolLabels, type Rol, type Usuario } from '@/features/usuarios/types'
import { getErrorMessage } from '@/lib/api/client'
import { applyApiErrors } from '@/lib/api/errors'
import { formatFecha } from '@/lib/format'

const rolBadge: Record<Rol, string> = {
  ADMIN: 'bg-azul text-white',
  VENDEDOR: 'bg-celeste-50 text-azul ring-1 ring-inset ring-celeste',
  REPARTIDOR: 'bg-cafe-50 text-cafe ring-1 ring-inset ring-cafe/25',
}

/** Gestión de usuarios (solo ADMIN). */
export function UsuariosPage() {
  const yo = useUsuario()
  const toast = useToast()
  const [rol, setRol] = useState<Rol | ''>('')
  const [activo, setActivo] = useState<'' | 'true' | 'false'>('')
  const [pagina, setPagina] = useState(1)
  const [editando, setEditando] = useState<Usuario | 'nuevo' | null>(null)
  const guardar = useGuardarUsuario()
  const query = useUsuarios({ rol: rol || undefined, activo: activo === '' ? undefined : activo === 'true', pagina, limite: 20 })

  function toggleActivo(usuario: Usuario) {
    guardar.mutate(
      { id: usuario._id, input: { activo: !usuario.activo } },
      {
        onSuccess: () => toast.success(usuario.activo ? `${usuario.nombre} ya no puede ingresar.` : `${usuario.nombre} fue reactivado.`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Vendedores, deliverys y administradores. Desactivar a alguien le corta el acceso al instante."
        actions={
          <Button onClick={() => setEditando('nuevo')}>
            <Icon name="plus" className="size-4" /> Nuevo usuario
          </Button>
        }
      />

      <div className="mb-4 grid max-w-md grid-cols-2 gap-3">
        <Field label="Rol">
          {(a11y) => (
            <Select
              {...a11y}
              value={rol}
              onChange={(event) => {
                setRol(event.target.value as Rol | '')
                setPagina(1)
              }}
            >
              <option value="">Todos</option>
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {rolLabels[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Estado">
          {(a11y) => (
            <Select
              {...a11y}
              value={activo}
              onChange={(event) => {
                setActivo(event.target.value as '' | 'true' | 'false')
                setPagina(1)
              }}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </Select>
          )}
        </Field>
      </div>

      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.total === 0 ? (
        <EmptyState title="No hay usuarios con esos filtros" />
      ) : (
        <>
          <Card className="divide-y divide-linea">
            {query.data.datos.map((usuario) => {
              const soyYo = usuario._id === yo._id
              return (
                <div key={usuario._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-crema font-bold text-cafe" aria-hidden="true">
                      {usuario.nombre.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {usuario.nombre} {soyYo && <span className="text-xs font-normal text-gris">(vos)</span>}
                      </p>
                      <p className="truncate text-xs text-gris">
                        {usuario.correo}
                        {usuario.contacto && ` · ${usuario.contacto}`} · desde {formatFecha(usuario.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={rolBadge[usuario.rol]}>{rolLabels[usuario.rol]}</Badge>
                    {!usuario.activo && <Badge className="bg-apagado-50 text-apagado">Inactivo</Badge>}
                    <Button size="sm" variant="secondary" onClick={() => setEditando(usuario)}>
                      Editar
                    </Button>
                    {!soyYo && (
                      <Button size="sm" variant={usuario.activo ? 'danger' : 'ghost'} onClick={() => toggleActivo(usuario)} loading={guardar.isPending && guardar.variables?.id === usuario._id}>
                        {usuario.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </Card>
          <Pagination pagina={query.data.pagina} limite={query.data.limite} total={query.data.total} onChange={setPagina} />
        </>
      )}

      {editando && <UsuarioFormDialog usuario={editando === 'nuevo' ? null : editando} soyYo={editando !== 'nuevo' && editando._id === yo._id} onClose={() => setEditando(null)} />}
    </>
  )
}

function crearSchema(esNuevo: boolean) {
  return z.object({
    nombre: z.string().trim().min(1, 'Ingresá un nombre').max(150, 'Máximo 150 caracteres'),
    correo: z.string().trim().min(1, 'Ingresá un correo').max(254).pipe(z.email('Correo inválido')),
    contacto: z.string().trim().max(150, 'Máximo 150 caracteres'),
    rol: z.enum(ROLES),
    activo: z.boolean(),
    // Sin reglas en el front (las aplica el backend). En edición, vacío = no cambiar la contraseña.
    password: esNuevo ? z.string().min(1, 'Ingresá una contraseña') : z.string(),
  })
}
type Values = z.infer<ReturnType<typeof crearSchema>>

function UsuarioFormDialog({ usuario, soyYo, onClose }: { usuario: Usuario | null; soyYo: boolean; onClose: () => void }) {
  const toast = useToast()
  const guardar = useGuardarUsuario()
  const [formError, setFormError] = useState<string | null>(null)
  const schema = crearSchema(!usuario)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: usuario
      ? { nombre: usuario.nombre, correo: usuario.correo, contacto: usuario.contacto ?? '', rol: usuario.rol, activo: usuario.activo, password: '' }
      : { nombre: '', correo: '', contacto: '', rol: 'VENDEDOR', activo: true, password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    let input: Partial<UsuarioInput>
    if (usuario) {
      input = {}
      if (dirtyFields.nombre) input.nombre = values.nombre
      if (dirtyFields.correo) input.correo = values.correo
      // `contacto` exige al menos 1 carácter: vacío no se puede enviar.
      if (dirtyFields.contacto && values.contacto) input.contacto = values.contacto
      if (dirtyFields.rol) input.rol = values.rol
      if (dirtyFields.activo) input.activo = values.activo
      if (values.password) input.password = values.password
      if (Object.keys(input).length === 0) return onClose()
    } else {
      const { contacto, ...rest } = values
      input = { ...rest, ...(contacto ? { contacto } : {}) }
    }
    try {
      await guardar.mutateAsync({ id: usuario?._id, input })
      toast.success(usuario ? 'Usuario actualizado.' : 'Usuario creado.')
      onClose()
    } catch (error) {
      setFormError(
        applyApiErrors(error, setError, Object.keys(schema.shape)),
      )
    }
  })

  return (
    <Dialog
      open
      onClose={onClose}
      title={usuario ? 'Editar usuario' : 'Nuevo usuario'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="usuario-form" loading={isSubmitting}>
            {usuario ? 'Guardar' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <form id="usuario-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormError message={formError} />
        <Field label="Nombre" error={errors.nombre?.message}>
          {(a11y) => <Input {...a11y} {...register('nombre')} />}
        </Field>
        <Field label="Correo" error={errors.correo?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="off" {...register('correo')} />}
        </Field>
        <Field label="Contacto" optional error={errors.contacto?.message}>
          {(a11y) => <Input {...a11y} type="tel" {...register('contacto')} />}
        </Field>
        {soyYo ? (
          <p className="rounded-xl bg-celeste-50 px-3 py-2.5 text-sm text-azul-900">
            Sos {rolLabels[usuario?.rol ?? 'ADMIN'].toLowerCase()}. No podés cambiar tu propio rol ni desactivarte.
          </p>
        ) : (
        <Field label="Rol" error={errors.rol?.message}>
          {(a11y) => (
            <Select {...a11y} {...register('rol')}>
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {rolLabels[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        )}
        <Field
          label={usuario ? 'Nueva contraseña' : 'Contraseña'}
          optional={Boolean(usuario)}
          hint={usuario ? 'Dejala vacía para no cambiarla.' : 'Compartila con la persona por un canal seguro.'}
          error={errors.password?.message}
        >
          {(a11y) => <Input {...a11y} type="password" autoComplete="new-password" {...register('password')} />}
        </Field>
        {!soyYo && <Checkbox label="Activo (puede iniciar sesión)" {...register('activo')} />}
      </form>
    </Dialog>
  )
}
