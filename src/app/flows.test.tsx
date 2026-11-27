import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
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
    expect(await screen.findByText(/Pedido tomado/)).toBeInTheDocument()

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

describe('admin crea un pedido a nombre de un vendedor', () => {
  it('elige el vendedor, marca el pago directo y ve el número del pedido creado', async () => {
    const zona = makeZona({ _id: '6737b000c2b4e8a1d4f00010', nombre: 'Luque', costoDelivery: 38000, requiereTransportadora: false })
    const vendedor = makeUsuario('VENDEDOR')
    const inactivo = makeUsuario('VENDEDOR', { _id: '6737a1f0c2b4e8a1d4f00009', nombre: 'Vendedor Inactivo', activo: false })
    let body: Record<string, unknown> | undefined
    const creado = makePedido({ numero: 58, pagoDirectoVendedor: true, montoTotal: 0, montoARendir: -38000 })
    server.use(
      http.get(`${API}/zonas`, () => HttpResponse.json(paginated([zona]))),
      http.get(`${API}/usuarios`, ({ request }) => {
        const rol = new URL(request.url).searchParams.get('rol')
        return HttpResponse.json(paginated(rol === 'VENDEDOR' ? [vendedor, inactivo] : []))
      }),
      http.post(`${API}/pedidos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(creado, { status: 201 })
      }),
      http.get(`${API}/pedidos/:id`, () => HttpResponse.json(creado)),
    )
    const { user, router } = renderApp('/admin/pedidos/nuevo', { usuario: makeUsuario('ADMIN') })

    const selector = await screen.findByLabelText('¿A nombre de quién es el pedido?')
    expect(within(selector).getByRole('option', { name: 'Yo (Ana Admin)' })).toBeInTheDocument()
    expect(within(selector).queryByRole('option', { name: 'Vendedor Inactivo' })).not.toBeInTheDocument()
    await user.selectOptions(selector, vendedor._id)
    await user.type(screen.getByLabelText('Nombre del cliente'), 'SR. LIMMO PIPO')
    await user.type(screen.getByLabelText('Contacto'), '0981 222 333')
    await user.selectOptions(screen.getByLabelText('Zona de entrega'), zona._id)
    await user.type(screen.getByLabelText('Producto 1'), 'Remera')
    await user.type(screen.getByLabelText('Precio unitario'), '45000')
    await user.type(screen.getByLabelText(/Entrega: dirección o link/), 'Av. Principal 123, Luque')
    await user.click(screen.getByLabelText(/El cliente ya le pagó al vendedor/))

    const resumen = screen.getByText('Resumen').closest('div')!.parentElement!
    expect(within(resumen).getByText('El delivery cobra')).toBeInTheDocument()
    expect(within(resumen).getByText('-38.000 Gs')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Crear pedido' }))
    expect(await screen.findByText(/Pedido #58 creado/)).toBeInTheDocument()
    expect(body).toMatchObject({ vendedorId: vendedor._id, pagoDirectoVendedor: true, zonaId: zona._id })
    await waitFor(() => expect(router.state.location.pathname).toBe(`/admin/pedidos/${creado._id}`))
    expect(await screen.findByText('Pedido #58 · Tobatí')).toBeInTheDocument()
  })

  it('el vendedor no ve el selector de vendedor y no envía vendedorId', async () => {
    server.use(http.get(`${API}/zonas`, () => HttpResponse.json(paginated([makeZona()]))))
    renderApp('/pedidos/nuevo', { usuario: makeUsuario('VENDEDOR') })
    expect(await screen.findByLabelText('Nombre del cliente')).toBeInTheDocument()
    expect(screen.queryByLabelText('¿A nombre de quién es el pedido?')).not.toBeInTheDocument()
  })
})

describe('delivery entrega y registra quién cobró', () => {
  const repartidor = makeUsuario('REPARTIDOR')
  const tomado = makePedido({ estado: 'TOMADO', repartidorId: repartidor._id, tomadoAt: '2026-11-15T22:00:00.000Z' })

  function handlers(capturar: (body: string) => void) {
    server.use(
      http.get(`${API}/pedidos`, () => HttpResponse.json(paginated([tomado]))),
      http.post(`${API}/pedidos/:id/entregar`, async ({ request }) => {
        capturar(await request.text())
        return HttpResponse.json({ ...tomado, estado: 'ENTREGADO', entregadoAt: '2026-11-15T23:00:00.000Z' })
      }),
    )
  }

  it('muestra número y contacto del vendedor, y corrige el pago directo al entregar', async () => {
    let body: string | undefined
    handlers((value) => { body = value })
    const { user } = renderApp('/entregas?tab=pendientes', { usuario: repartidor })
    expect(await screen.findByText('Pedido #57')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '0981 555 000' })).toHaveAttribute('href', 'tel:0981555000')
    expect(screen.getByRole('link', { name: /WhatsApp\s*a 0981 555 000/ })).toHaveAttribute('href', 'https://wa.me/595981555000')

    await user.click(screen.getByRole('button', { name: /Marcar como entregado/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('350.000 Gs')).toBeInTheDocument()
    await user.click(within(dialog).getByLabelText(/le pagó directo al vendedor/))
    expect(within(dialog).getByText(/No cobraste nada/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Sí, fue entregado' }))

    expect(await screen.findByText('Pedido marcado como entregado.')).toBeInTheDocument()
    expect(JSON.parse(body!)).toEqual({ pagoDirectoVendedor: true })
  })

  it('si no corrige nada, entrega sin body (compatible con la API)', async () => {
    let body: string | undefined
    handlers((value) => { body = value })
    const { user } = renderApp('/entregas?tab=pendientes', { usuario: repartidor })
    await user.click(await screen.findByRole('button', { name: /Marcar como entregado/ }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, fue entregado' }))
    expect(await screen.findByText('Pedido marcado como entregado.')).toBeInTheDocument()
    expect(body).toBe('')
  })

  it('un pedido ya pagado al vendedor avisa que no hay que cobrar', async () => {
    server.use(http.get(`${API}/pedidos`, () => HttpResponse.json(paginated([makePedido({ pagoDirectoVendedor: true, montoTotal: 0 })]))))
    renderApp('/entregas', { usuario: repartidor })
    expect(await screen.findByText(/No cobrar: el cliente ya le pagó al vendedor/)).toBeInTheDocument()
    expect(screen.queryByText('Cobrar al cliente')).not.toBeInTheDocument()
  })
})

describe('admin asigna deliverys (etapa 2)', () => {
  const repartidor = makeUsuario('REPARTIDOR')
  const otro = makeUsuario('REPARTIDOR', { _id: '6737a1f0c2b4e8a1d4f00003', nombre: 'Marta Ruiz' })
  const inactivo = makeUsuario('REPARTIDOR', { _id: '6737a1f0c2b4e8a1d4f00004', nombre: 'Dado de baja', activo: false })

  function usuarios() {
    return http.get(`${API}/usuarios`, ({ request }) => {
      const rol = new URL(request.url).searchParams.get('rol')
      return HttpResponse.json(paginated(rol === 'REPARTIDOR' ? [repartidor, otro, inactivo] : rol === 'VENDEDOR' ? [makeUsuario('VENDEDOR')] : []))
    })
  }

  it('asigna desde el listado y el pedido pasa a "Asignado"', async () => {
    let asignado = false
    let body: unknown
    server.use(
      usuarios(),
      http.get(`${API}/zonas`, () => HttpResponse.json(paginated([makeZona()]))),
      http.get(`${API}/pedidos`, () =>
        HttpResponse.json(paginated([makePedido(asignado ? { repartidorId: otro._id, asignadoPor: 'ADMIN' } : {})])),
      ),
      http.post(`${API}/pedidos/:id/asignar`, async ({ request }) => {
        body = await request.json()
        asignado = true
        return HttpResponse.json(makePedido({ repartidorId: otro._id, asignadoPor: 'ADMIN' }))
      }),
    )
    const { user } = renderApp('/admin/pedidos', { usuario: makeUsuario('ADMIN') })
    await user.click((await screen.findAllByRole('button', { name: /Asignar/ }))[0]!)
    const dialog = await screen.findByRole('dialog')
    const select = within(dialog).getByLabelText('Delivery')
    expect(within(select).queryByRole('option', { name: /Dado de baja/ })).not.toBeInTheDocument()
    await user.selectOptions(select, otro._id)
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Pedido #57 asignado a Marta Ruiz.')).toBeInTheDocument()
    expect(body).toEqual({ repartidorId: otro._id })
    expect((await screen.findAllByText('Asignado')).length).toBeGreaterThan(0)
  })

  it('en un pedido tomado avisa antes de reasignar y permite liberarlo', async () => {
    let body: unknown
    const tomado = makePedido({ estado: 'TOMADO', repartidorId: repartidor._id, tomadoAt: '2026-11-15T22:00:00.000Z' })
    server.use(
      usuarios(),
      http.get(`${API}/pedidos/:id`, () => HttpResponse.json(tomado)),
      http.post(`${API}/pedidos/:id/asignar`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...tomado, estado: 'INICIADO', repartidorId: null, tomadoAt: null })
      }),
    )
    const { user } = renderApp(`/admin/pedidos/${tomado._id}`, { usuario: makeUsuario('ADMIN') })
    await user.click(await screen.findByRole('button', { name: /Cambiar delivery/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Carlos Gómez ya lo tomó/)).toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText('Delivery'), '')
    expect(within(dialog).getByText(/vuelve a estar disponible para todos/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText(/disponible para todos los deliverys/)).toBeInTheDocument()
    expect(body).toEqual({ repartidorId: null })
  })

  it('al crear un pedido el admin ve el delivery automático de la zona o elige otro', async () => {
    let body: Record<string, unknown> | undefined
    const zona = makeZona({ _id: '6737b000c2b4e8a1d4f00010', nombre: 'Luque', repartidorDefaultId: repartidor._id })
    server.use(
      usuarios(),
      http.get(`${API}/zonas`, () => HttpResponse.json(paginated([zona]))),
      http.get(`${API}/productos`, () => HttpResponse.json(paginated([]))),
      http.post(`${API}/pedidos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(makePedido({ repartidorId: otro._id }), { status: 201 })
      }),
      http.get(`${API}/pedidos/:id`, () => HttpResponse.json(makePedido({ repartidorId: otro._id }))),
    )
    const { user } = renderApp('/admin/pedidos/nuevo', { usuario: makeUsuario('ADMIN') })
    await user.selectOptions(await screen.findByLabelText('Zona de entrega'), zona._id)
    const delivery = screen.getByRole('combobox', { name: /^Delivery/ })
    expect(within(delivery).getByRole('option', { name: 'Automático: Carlos Gómez (delivery de la zona)' })).toBeInTheDocument()
    await user.selectOptions(delivery, otro._id)
    await user.type(screen.getByLabelText('Nombre del cliente'), 'Cliente')
    await user.type(screen.getByLabelText('Contacto'), '0981 222 333')
    await user.type(screen.getByLabelText('Producto 1'), 'Remera')
    await user.type(screen.getByLabelText('Precio unitario'), '45000')
    await user.type(screen.getByLabelText(/Entrega: dirección o link/), 'Calle 1')
    await user.click(screen.getByRole('button', { name: 'Crear pedido' }))
    await waitFor(() => expect(body).toMatchObject({ repartidorId: otro._id, zonaId: zona._id }))
  })

  it('el delivery ve primero los asignados a él y puede tomarlos', async () => {
    const libre = makePedido({ _id: '6737c000c2b4e8a1d4f00201', numero: 70, nombreCliente: 'Cliente libre' })
    const mio = makePedido({ _id: '6737c000c2b4e8a1d4f00202', numero: 71, nombreCliente: 'Cliente asignado', repartidorId: repartidor._id, asignadoPor: 'ZONA' })
    server.use(
      http.get(`${API}/pedidos`, () => HttpResponse.json(paginated([libre, mio]))),
      http.post(`${API}/pedidos/:id/tomar`, ({ params }) => HttpResponse.json({ ...mio, _id: params.id, estado: 'TOMADO' })),
    )
    const { user } = renderApp('/entregas', { usuario: repartidor })
    await screen.findByText('Cliente asignado')
    const tarjetas = screen.getAllByRole('listitem').filter((item) => within(item).queryByText(/^Cliente (libre|asignado)$/))
    expect(within(tarjetas[0]!).getByText('Cliente asignado')).toBeInTheDocument()
    expect(within(tarjetas[0]!).getByText(/Asignado a vos/)).toBeInTheDocument()
    expect(within(tarjetas[1]!).queryByText(/Asignado a vos/)).not.toBeInTheDocument()
    await user.click(within(tarjetas[0]!).getByRole('button', { name: 'Tomar pedido' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Tomar pedido' }))
    expect(await screen.findByText(/Pedido tomado/)).toBeInTheDocument()
  })

  it('define el delivery por defecto de una zona y muestra sus pedidos en curso', async () => {
    let body: unknown
    const zona = makeZona({ pedidosActivos: 3 })
    server.use(
      usuarios(),
      http.get(`${API}/zonas`, () => HttpResponse.json(paginated([zona]))),
      http.patch(`${API}/zonas/:id`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...zona, repartidorDefaultId: repartidor._id })
      }),
    )
    const { user } = renderApp('/admin/zonas', { usuario: makeUsuario('ADMIN') })
    expect(await screen.findByRole('link', { name: /3 pedidos en curso\s*en Tobatí/ })).toHaveAttribute('href', `/admin/pedidos?zonaId=${zona._id}&activos=true`)
    expect(screen.getByText('Sin delivery por defecto')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText(/Delivery por defecto/), repartidor._id)
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(body).toEqual({ repartidorDefaultId: repartidor._id }))
  })
})

describe('admin ve los deliverys y sus pedidos por zona (etapa 3)', () => {
  it('lista de más a menos pedidos, con chips por zona y la fila "Sin asignar"', async () => {
    server.use(
      http.get(`${API}/pedidos/resumen-deliverys`, () =>
        HttpResponse.json({
          datos: [
            {
              repartidorId: '6737a1f0c2b4e8a1d4f00002', nombre: 'Carlos Gómez', contacto: '0981 123 456', activo: true,
              total: 3, asignados: 2, tomados: 1,
              zonas: [{ zonaId: '6737b000c2b4e8a1d4f00012', zonaNombre: 'Tobatí', total: 3, asignados: 2, tomados: 1 }],
            },
            { repartidorId: '6737a1f0c2b4e8a1d4f00003', nombre: 'Marta Ruiz', contacto: '', activo: true, total: 0, asignados: 0, tomados: 0, zonas: [] },
          ],
          sinAsignar: { total: 2, asignados: 2, tomados: 0, zonas: [{ zonaId: '6737b000c2b4e8a1d4f00012', zonaNombre: 'Tobatí', total: 2, asignados: 2, tomados: 0 }] },
        }),
      ),
    )
    renderApp('/admin/deliverys', { usuario: makeUsuario('ADMIN') })
    expect(await screen.findByRole('heading', { name: 'Deliverys' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /3\s*pedidos\s*en curso\s*de Carlos Gómez/ }))
      .toHaveAttribute('href', '/admin/pedidos?activos=true&repartidorId=6737a1f0c2b4e8a1d4f00002')
    const zonas = screen.getByRole('list', { name: 'Zonas de Carlos Gómez' })
    expect(within(zonas).getByRole('link', { name: /Tobatí\s*3/ }))
      .toHaveAttribute('href', '/admin/pedidos?activos=true&repartidorId=6737a1f0c2b4e8a1d4f00002&zonaId=6737b000c2b4e8a1d4f00012')
    expect(screen.getByRole('link', { name: /2\s*pedidos\s*en curso\s*de Sin asignar/ })).toHaveAttribute('href', '/admin/pedidos?activos=true&sinAsignar=true')
    expect(screen.getByRole('link', { name: /0\s*pedidos\s*en curso\s*de Marta Ruiz/ })).toBeInTheDocument()
  })

  it('el listado aplica los filtros de zona, "solo en curso" y "sin asignar" que vienen en el link', async () => {
    let params: URLSearchParams | undefined
    server.use(
      http.get(`${API}/usuarios`, () => HttpResponse.json(paginated([]))),
      http.get(`${API}/zonas`, () => HttpResponse.json(paginated([makeZona()]))),
      http.get(`${API}/pedidos`, ({ request }) => {
        params = new URL(request.url).searchParams
        return HttpResponse.json(paginated([]))
      }),
    )
    renderApp('/admin/pedidos?zonaId=6737b000c2b4e8a1d4f00012&activos=true&sinAsignar=true', { usuario: makeUsuario('ADMIN') })
    expect(await screen.findByText('Ningún pedido coincide con los filtros')).toBeInTheDocument()
    expect(params?.get('zonaId')).toBe('6737b000c2b4e8a1d4f00012')
    expect(params?.get('activos')).toBe('true')
    expect(params?.get('sinAsignar')).toBe('true')
    expect(screen.getByLabelText('Solo en curso')).toBeChecked()
    expect(screen.getByLabelText('Delivery')).toHaveDisplayValue('Sin asignar')
  })
})

describe('catálogo de productos (etapa 4)', () => {
  const remera = {
    _id: '6737d000c2b4e8a1d4f00001', vendedorId: makeUsuario('VENDEDOR')._id, nombre: 'Remera', precioVenta: 45000, costo: 30000,
    activo: true, createdAt: '2026-11-15T20:00:00.000Z', updatedAt: '2026-11-15T20:00:00.000Z',
  }

  it('al elegir un producto del catálogo se completan precio y costo, y se envían con el pedido', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      http.get(`${API}/zonas`, () => HttpResponse.json(paginated([makeZona({ _id: '6737b000c2b4e8a1d4f00010', costoDelivery: 20000 })]))),
      http.get(`${API}/productos`, () => HttpResponse.json(paginated([remera]))),
      http.post(`${API}/pedidos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
      }),
    )
    const { user } = renderApp('/pedidos/nuevo', { usuario: makeUsuario('VENDEDOR') })
    await user.type(await screen.findByLabelText('Producto 1'), 'remera')
    expect(screen.getByLabelText('Precio unitario')).toHaveValue('45.000')
    expect(screen.getByLabelText(/^Costo/)).toHaveValue('30.000')
    expect(screen.getByText('Del catálogo')).toBeInTheDocument()
    const resumen = screen.getByText('Resumen').closest('div')!.parentElement!
    expect(within(resumen).getByText('Tu ganancia')).toBeInTheDocument()
    expect(within(resumen).getByText('15.000 Gs')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nombre del cliente'), 'Cliente')
    await user.type(screen.getByLabelText('Contacto'), '0981 222 333')
    await user.selectOptions(screen.getByLabelText('Zona de entrega'), '6737b000c2b4e8a1d4f00010')
    await user.type(screen.getByLabelText(/Entrega: dirección o link/), 'Calle 1')
    await user.click(screen.getByRole('button', { name: 'Crear pedido' }))
    await waitFor(() =>
      expect(body?.productos).toEqual([{ nombre: 'remera', cantidad: 1, precioUnitario: 45000, productoId: remera._id, costoUnitario: 30000 }]),
    )
  })

  it('si cambia el nombre deja de estar vinculado al catálogo', async () => {
    server.use(
      http.get(`${API}/zonas`, () => HttpResponse.json(paginated([makeZona()]))),
      http.get(`${API}/productos`, () => HttpResponse.json(paginated([remera]))),
    )
    const { user } = renderApp('/pedidos/nuevo', { usuario: makeUsuario('VENDEDOR') })
    const nombre = await screen.findByLabelText('Producto 1')
    await user.type(nombre, 'Remera')
    expect(screen.getByText('Del catálogo')).toBeInTheDocument()
    await user.type(nombre, ' roja')
    expect(screen.queryByText('Del catálogo')).not.toBeInTheDocument()
  })

  it('el vendedor crea un producto con precio y costo', async () => {
    let body: unknown
    server.use(
      http.get(`${API}/productos`, () => HttpResponse.json(paginated([]))),
      http.post(`${API}/productos`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(remera, { status: 201 })
      }),
    )
    const { user } = renderApp('/productos', { usuario: makeUsuario('VENDEDOR') })
    await user.click(await screen.findByRole('button', { name: /Nuevo producto/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByLabelText('Vendedor')).not.toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Nombre'), 'Remera')
    await user.type(within(dialog).getByLabelText('Precio de venta'), '45000')
    await user.type(within(dialog).getByLabelText('Costo'), '30000')
    await user.click(within(dialog).getByRole('button', { name: 'Crear producto' }))
    expect(await screen.findByText('Producto creado.')).toBeInTheDocument()
    expect(body).toEqual({ nombre: 'Remera', precioVenta: 45000, costo: 30000 })
  })

  it('el admin tiene que elegir el vendedor del producto', async () => {
    let body: unknown
    server.use(
      http.get(`${API}/usuarios`, () => HttpResponse.json(paginated([makeUsuario('VENDEDOR')]))),
      http.get(`${API}/productos`, () => HttpResponse.json(paginated([]))),
      http.post(`${API}/productos`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(remera, { status: 201 })
      }),
    )
    const { user } = renderApp('/productos', { usuario: makeUsuario('ADMIN') })
    await user.click(await screen.findByRole('button', { name: /Nuevo producto/ }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nombre'), 'Remera')
    await user.type(within(dialog).getByLabelText('Precio de venta'), '45000')
    await user.type(within(dialog).getByLabelText('Costo'), '30000')
    await user.click(within(dialog).getByRole('button', { name: 'Crear producto' }))
    expect(await within(dialog).findByText('Elegí el vendedor')).toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText('Vendedor'), makeUsuario('VENDEDOR')._id)
    await user.click(within(dialog).getByRole('button', { name: 'Crear producto' }))
    await waitFor(() => expect(body).toEqual({ nombre: 'Remera', precioVenta: 45000, costo: 30000, vendedorId: makeUsuario('VENDEDOR')._id }))
  })

  it('el detalle muestra costo y ganancia al vendedor', async () => {
    server.use(http.get(`${API}/pedidos/:id`, () => HttpResponse.json(makePedido({ totalCosto: 200000 }))))
    renderApp('/pedidos/6737c000c2b4e8a1d4f00101', { usuario: makeUsuario('VENDEDOR') })
    expect(await screen.findByText('Costo de los productos')).toBeInTheDocument()
    expect(screen.getByText('110.000 Gs')).toBeInTheDocument()
  })
})

describe('reporte en Excel (etapa 5)', () => {
  it('descarga el Excel pidiendo formato=xlsx', async () => {
    let formato: string | null = null
    server.use(
      http.get(`${API}/reportes/mensual`, ({ request }) => {
        formato = new URL(request.url).searchParams.get('formato')
        return new HttpResponse(new Blob(['PK']), {
          headers: { 'Content-Disposition': 'attachment; filename="reporte-mensual-2026-11.xlsx"' },
        })
      }),
    )
    const createObjectURL = vi.fn(() => 'blob:reporte')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const { user } = renderApp('/reportes', { usuario: makeUsuario('VENDEDOR') })
    await user.click(await screen.findByRole('button', { name: /Descargar Excel/ }))
    expect(await screen.findByText('Descargado reporte-mensual-2026-11.xlsx')).toBeInTheDocument()
    expect(formato).toBe('xlsx')
    expect(screen.getByText(/"Costo compra" y "Ganancia"/)).toBeInTheDocument()
  })
})
