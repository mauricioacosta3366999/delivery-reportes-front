import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sessionStore } from '@/features/auth/session'
import { API, server } from '@/test/server'
import { ApiError, apiFetch, buildUrl, configureApi } from './client'

describe('apiFetch', () => {
  const onUnauthorized = vi.fn()

  afterEach(() => {
    onUnauthorized.mockReset()
    configureApi({ getToken: sessionStore.getToken, onUnauthorized: () => sessionStore.clear('expired') })
  })

  it('envía el token y omite parámetros vacíos', async () => {
    configureApi({ getToken: () => 'tok', onUnauthorized })
    let auth: string | null = null
    let url = ''
    server.use(
      http.get(`${API}/pedidos`, ({ request }) => {
        auth = request.headers.get('Authorization')
        url = request.url
        return HttpResponse.json({ ok: true })
      }),
    )
    await apiFetch('/pedidos', { query: { estado: 'TOMADO', desde: undefined, vendedorId: '' } })
    expect(auth).toBe('Bearer tok')
    expect(new URL(url).search).toBe('?estado=TOMADO')
  })

  it('convierte el 400 del backend en ApiError con detalles', async () => {
    configureApi({ getToken: () => 'tok', onUnauthorized })
    server.use(
      http.post(`${API}/zonas`, () =>
        HttpResponse.json({ error: 'Solicitud inválida', detalles: [{ campo: 'costoDelivery', mensaje: 'Too small' }] }, { status: 400 }),
      ),
    )
    const error = await apiFetch('/zonas', { method: 'POST', body: {} }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, message: 'Solicitud inválida', detalles: [{ campo: 'costoDelivery', mensaje: 'Too small' }] })
  })

  it('un 401 con token cierra la sesión; un login fallido no', async () => {
    configureApi({ getToken: () => 'tok', onUnauthorized })
    server.use(
      http.get(`${API}/pedidos`, () => HttpResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })),
      http.post(`${API}/auth/login`, () => HttpResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })),
    )
    await expect(apiFetch('/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({ message: 'Credenciales inválidas' })
    expect(onUnauthorized).not.toHaveBeenCalled()
    await expect(apiFetch('/pedidos')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('un error de red se reporta como status 0', async () => {
    server.use(http.get(`${API}/pedidos`, () => HttpResponse.error()))
    await expect(apiFetch('/pedidos')).rejects.toMatchObject({ status: 0 })
  })

  it('arma la URL contra el origen actual', () => {
    expect(buildUrl('/pedidos', { pagina: 2 })).toBe(`${window.location.origin}/api/v1/pedidos?pagina=2`)
  })
})
