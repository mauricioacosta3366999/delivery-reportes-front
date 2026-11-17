import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, FormError, Input } from '@/components/ui/Field'
import { applyApiErrors } from '@/lib/api/errors'
import { homePath, useAuth } from './useAuth'

const schema = z.object({
  correo: z.string().trim().min(1, 'Ingresá tu correo').pipe(z.email('Correo inválido')),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})
type Values = z.infer<typeof schema>

export function LoginPage() {
  const { login, lastLogout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { correo: '', password: '' } })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const usuario = await login(values)
      navigate(from && from !== '/' ? from : homePath(usuario.rol), { replace: true })
    } catch (error) {
      // El backend valida el largo de la contraseña también al ingresar: no revelar la regla.
      setFormError(applyApiErrors(error, setError, ['correo', 'password'], { password: 'Correo o contraseña incorrectos.' }))
    }
  })

  return (
    <Card className="space-y-6 p-6 sm:p-8">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-extrabold text-azul-900">Iniciar sesión</h1>
        <p className="text-sm text-gris">Ingresá con tu correo y contraseña.</p>
      </div>

      {lastLogout === 'expired' && !formError && (
        <div role="status" className="rounded-xl border border-celeste bg-celeste-50 px-4 py-3 text-sm text-azul-900">
          Tu sesión expiró. Volvé a ingresar para continuar.
        </div>
      )}
      <FormError message={formError} />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Correo" error={errors.correo?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" inputMode="email" {...register('correo')} />}
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          {(a11y) => <Input {...a11y} type="password" autoComplete="current-password" {...register('password')} />}
        </Field>
        <Button type="submit" block size="lg" loading={isSubmitting}>
          Ingresar
        </Button>
      </form>

      <p className="text-center text-sm text-gris">
        ¿No tenés cuenta?{' '}
        <Link to="/registro" className="font-semibold text-azul underline-offset-4 hover:underline">
          Registrate
        </Link>
      </p>
    </Card>
  )
}
