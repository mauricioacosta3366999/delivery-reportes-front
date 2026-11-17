import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { Field, FormError, Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { applyApiErrors } from '@/lib/api/errors'
import { homePath, useAuth } from './useAuth'

// La contraseña no tiene reglas en el front: las aplica el backend (hoy, 12 a 128 caracteres).
const schema = z.object({
  rol: z.enum(['VENDEDOR', 'REPARTIDOR'], { error: 'Elegí un tipo de usuario' }),
  nombre: z.string().trim().min(1, 'Ingresá tu nombre').max(150, 'Máximo 150 caracteres'),
  correo: z.string().trim().min(1, 'Ingresá tu correo').max(254).pipe(z.email('Correo inválido')),
  contacto: z.string().trim().max(150, 'Máximo 150 caracteres'),
  password: z.string().min(1, 'Ingresá una contraseña'),
})
type Values = z.input<typeof schema>

/** Traducción de los rechazos del backend (sus mensajes vienen en inglés). */
const mensajesServidor = { password: 'La contraseña debe tener entre 12 y 128 caracteres.' }

const tipos = [
  { value: 'VENDEDOR', titulo: 'Vendedor', detalle: 'Cargo pedidos y descargo mis reportes', icon: 'box' },
  { value: 'REPARTIDOR', titulo: 'Delivery', detalle: 'Tomo pedidos y los entrego', icon: 'truck' },
] as const

export function RegisterPage() {
  const { register: registrar } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', correo: '', contacto: '', password: '' },
  })

  const onSubmit = handleSubmit(async ({ rol, nombre, correo, password, contacto }) => {
    setFormError(null)
    try {
      // El backend rechaza campos extra y `contacto` vacío: solo se envía si tiene valor.
      const usuario = await registrar({ rol, nombre, correo, password, ...(contacto ? { contacto } : {}) })
      navigate(homePath(usuario.rol), { replace: true })
    } catch (error) {
      setFormError(applyApiErrors(error, setError, ['nombre', 'correo', 'password', 'rol', 'contacto'], mensajesServidor))
    }
  })

  return (
    <Card className="space-y-6 p-6 sm:p-8">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-extrabold text-azul-900">Crear cuenta</h1>
        <p className="text-sm text-gris">Elegí cómo vas a usar el sistema.</p>
      </div>
      <FormError message={formError} />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Controller
          control={control}
          name="rol"
          render={({ field, fieldState }) => (
            <fieldset className="space-y-1.5">
              <legend className="mb-1.5 text-sm font-semibold">Tipo de usuario</legend>
              <div className="grid grid-cols-2 gap-3">
                {tipos.map((tipo) => {
                  const selected = field.value === tipo.value
                  return (
                    <label
                      key={tipo.value}
                      className={cn(
                        'relative flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 transition-colors',
                        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-azul',
                        selected ? 'border-azul bg-celeste-50' : 'border-linea bg-white hover:border-celeste',
                      )}
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value={tipo.value}
                        checked={selected}
                        onChange={() => field.onChange(tipo.value)}
                        onBlur={field.onBlur}
                        className="sr-only"
                      />
                      <span className={cn('grid size-10 place-items-center rounded-xl', selected ? 'bg-azul text-white' : 'bg-crema text-cafe')}>
                        <Icon name={tipo.icon} />
                      </span>
                      <span className="font-bold text-tinta">{tipo.titulo}</span>
                      <span className="text-xs leading-snug text-gris">{tipo.detalle}</span>
                    </label>
                  )
                })}
              </div>
              {fieldState.error && <p className="text-xs font-medium text-peligro">{fieldState.error.message}</p>}
            </fieldset>
          )}
        />

        <Field label="Nombre" error={errors.nombre?.message}>
          {(a11y) => <Input {...a11y} autoComplete="name" {...register('nombre')} />}
        </Field>
        <Field label="Correo" error={errors.correo?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" inputMode="email" {...register('correo')} />}
        </Field>
        <Field label="Contacto" optional hint="Teléfono o WhatsApp" error={errors.contacto?.message}>
          {(a11y) => <Input {...a11y} type="tel" autoComplete="tel" inputMode="tel" placeholder="0981 123 456" {...register('contacto')} />}
        </Field>
        <Field label="Contraseña" hint="Entre 12 y 128 caracteres" error={errors.password?.message}>
          {(a11y) => <Input {...a11y} type="password" autoComplete="new-password" {...register('password')} />}
        </Field>

        <Button type="submit" block size="lg" loading={isSubmitting}>
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-gris">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="font-semibold text-azul underline-offset-4 hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </Card>
  )
}
