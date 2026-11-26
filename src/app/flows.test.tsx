import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { makePedido, makeToken, makeUsuario, makeZona, paginated } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'
import { API, server } from '@/test/server'

describe('autenticación y rutas por rol', () => {
  it('sin sesión, una ruta privada lleva al login', async () => {
    renderApp('/pedidos')
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('el login redirige al inicio de cada rol (delivery → Entregas)', async () => {
    const repartidor = makeUsuario('REPARTIDOR')
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        expect(await request.json()).toEqual({ correo: 'carlos@example.com', password: 'OtraClaveSegura456' })
        return HttpResponse.json({ token: makeToken(), usuario: repartidor })
      }),
      http.get(`${API}/pedidos`, () => HttpResponse.json(paginated([]))),
    )
    const { user, router } = renderApp('/login')
    await user.type(await screen.findByLabelText('Correo'), 'carlos@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'OtraClaveSegura456')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('heading', { name: 'Entregas' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/entregas')
  })

  it('muestra el error de credenciales sin cerrar nada', async () => {
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })))
    const { user } = renderApp('/login')
    await user.type(await screen.findByLabelText('Correo'), 'x@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas')
  })

  it('un vendedor no puede entrar al panel admin', async () => {
    server.use(http.get(`${API}/pedidos`, () => HttpResponse.json(paginated([]))))
    const { router } = renderApp('/admin/zonas', { usuario: makeUsuario('VENDEDOR') })
    expect(await screen.findByRole('heading', { name: 'Mis pedidos' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/pedidos')
  })

  it('un 401 en medio de la sesión vuelve al login avisando que expiró', async () => {
    server.use(http.get(`${API}/pedidos`, () => HttpResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })))
    renderApp('/pedidos', { usuario: makeUsuario('VENDEDOR') })
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByText(/Tu sesión expiró/)).toBeInTheDocument()
  })

  it('el registro envía solo los campos del contrato y deja la sesión iniciada', async () => {
    let body: unknown
    server.use(
      http.post(`${API}/auth/register`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ token: makeToken(), usuario: makeUsuario('VENDEDOR') }, { status: 201 })
      }),
      http.get(`${API}/pedidos`, () => HttpResponse.json(paginated([]))),
    )
    const { user } = renderApp('/registro')
    await user.click(await screen.findByLabelText(/Vendedor/))
    await user.type(screen.getByLabelText('Nombre'), 'Luciano Benítez')
    await user.type(screen.getByLabelText('Correo'), 'luciano@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'UnaClaveSegura123')
    expect(screen.queryByLabelText('Repetir contraseña')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByRole('heading', { name: 'Mis pedidos' })).toBeInTheDocument()
    // Sin contacto (vacío).
    expect(body).toEqual({ rol: 'VENDEDOR', nombre: 'Luciano Benítez', correo: 'luciano@example.com', password: 'UnaClaveSegura123' })
  })
})

describe('vendedor crea un pedido (CU-03)', () => {
  it('envía el pedido sin importes y muestra el error del servidor en el campo', async () => {
    const zona = makeZona({ _id: '6737b000c2b4e8a1d4f00010', nombre: 'Luque', costoDelivery: 38000, requiereTransportadora: false })
    let body: Record<string, unknown> | undefined
    server.use(
      http.get(`${API}/zonas`, () => HttpResponse.json(paginated([zona]))),
      http.post(`${API}/pedidos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { error: 'Solicitud inválida', detalles: [{ campo: 'contactoCliente', mensaje: 'Contacto rechazado por el servidor' }] },
          { status: 400 },
        )
      }),
    )
    const { user } = renderApp('/pedidos/nuevo', { usuario: makeUsuario('VENDEDOR') })

    await user.type(await screen.findByLabelText('Nombre del cliente'), 'SR. LIMMO PIPO')
    await user.type(screen.getByLabelText('Contacto'), '0981 222 333')
    await user.selectOptions(screen.getByLabelText('Zona de entrega'), zona._id)
    await user.type(screen.getByLabelText('Producto 1'), 'Remera')
    const cantidad = screen.getByLabelText('Cantidad')
    await user.clear(cantidad)
    await user.type(cantidad, '2')
    await user.type(screen.getByLabelText('Precio unitario'), '45000')
    await user.type(screen.getByLabelText(/Entrega: dirección o link/), 'https://www.google.com/maps/@-25.3,-57.6,17z')
    expect(screen.getByText(/Link de Google Maps detectado/)).toBeInTheDocument()

    // Vista previa de importes (la calcula el front solo para mostrar).
    const resumen = screen.getByText('Resumen').closest('div')!.parentElement!
    expect(within(resumen).getByText('128.000 Gs')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Crear pedido' }))

    expect(await screen.findByText('Contacto rechazado por el servidor')).toBeInTheDocument()
    expect(body).toMatchObject({
      zonaId: zona._id,
      nombreCliente: 'SR. LIMMO PIPO',
      productos: [{ nombre: 'Remera', cantidad: 2, precioUnitario: 45000 }],
      ubicacionRetiro: { direccion: 'Depósito central', coordenadas: { latitud: -25.413408, longitud: -57.55011 } },
      ubicacionEntrega: { direccion: 'https://www.google.com/maps/@-25.3,-57.6,17z', coordenadas: { latitud: -25.3, longitud: -57.6 } },
    })
    expect(body).not.toHaveProperty('montoTotal')
    expect(body).not.toHaveProperty('costoDelivery')
    expect(body).not.toHaveProperty('estado')
  })
})

describe('delivery toma un pedido (CU-07)', () => {
  it('si otro delivery lo tomó primero (409), avisa y refresca la lista', async () => {
    let listados = 0
    server.use(
      http.get(`${API}/pedidos`, () => {
        listados++
        return HttpResponse.json(paginated(listados === 1 ? [makePedido()] : []))
      }),
      http.post(`${API}/pedidos/:id/tomar`, async ({ request }) => {
        // Las transiciones no llevan body.
        expect(await request.text()).toBe('')
        return HttpResponse.json({ error: 'El pedido ya no está disponible' }, { status: 409 })
      }),
    )
    const { user } = renderApp('/entregas', { usuario: makeUsuario('REPARTIDOR') })

    expect(await screen.findByText('P.A NETWORKS')).toBeInTheDocument()
    expect(screen.getByText('350.000 Gs')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tomar pedido' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Tomar pedido' }))

    expect(await screen.findByText(/otro delivery lo tomó/)).toBeInTheDocument()
    expect(await screen.findByText('No hay pedidos disponibles')).toBeInTheDocument()
  })

  it('al tomarlo con éxito queda en pendientes', async () => {
    const tomado = makePedido({ estado: 'TOMADO', repartidorId: makeUsuario('REPARTIDOR')._id, tomadoAt: '2026-11-15T22:00:00.000Z' })
    let tomadoOk = false
    server.use(
      http.get(`${API}/pedidos`, ({ request }) => {
        const estado = new URL(request.url).searchParams.get('estado')
        if (estado === 'INICIADO') return HttpResponse.json(paginated(tomadoOk ? [] : [makePedido()]))
        return HttpResponse.json(paginated(tomadoOk ? [tomado] : []))
      }),
      http.post(`${API}/pedidos/:id/tomar`, () => {
        tomadoOk = true
        return HttpResponse.json(tomado)
      }),
    )
    const { user } = renderApp('/entregas', { usuario: makeUsuario('REPARTIDOR') })
    await user.click(await screen.findByRole('button', { name: 'Tomar pedido' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Tomar pedido' }))
    expect(await screen.findByText(/Pedido #58 tomado/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Pendientes' }))
    expect(await screen.findByRole('button', { name: /Marcar como entregado/ })).toBeInTheDocument()
  })
})

describe('reporte mensual (CU-05)', () => {
  it('muestra un mensaje claro ante un 413', async () => {
    server.use(
      http.get(`${API}/reportes/mensual`, ({ request }) => {
        const params = new URL(request.url).searchParams
        expect(params.get('anio')).toMatch(/^\d{4}$/)
        expect(params.get('mes')).toMatch(/^\d{1,2}$/)
        return HttpResponse.json({ error: 'Reporte demasiado grande' }, { status: 413 })
      }),
    )
    const { user } = renderApp('/reportes', { usuario: makeUsuario('VENDEDOR') })
    await user.click(await screen.findByRole('button', { name: /Descargar PDF/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/demasiado grande/))
  })
})
