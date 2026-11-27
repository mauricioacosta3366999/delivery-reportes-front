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
    await user.type(screen.getByLabelText('Precio de venta'), '45000')
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
      http.get(`${API}/pedidos`, ({ request }) => {
        // "Asignados a vos" (repartidorId) vacío; los libres (sinAsignar) cambian tras el 409.
        if (new URL(request.url).searchParams.get('repartidorId')) return HttpResponse.json(paginated([]))
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
        const params = new URL(request.url).searchParams
        if (params.get('estado') === 'INICIADO' && params.get('repartidorId')) return HttpResponse.json(paginated([]))
        if (params.get('estado') === 'INICIADO') return HttpResponse.json(paginated(tomadoOk ? [] : [makePedido()]))
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

  it('descarga el Excel con formato=xlsx (CU-16)', async () => {
    let formato: string | null = null
    server.use(
      http.get(`${API}/reportes/mensual`, ({ request }) => {
        formato = new URL(request.url).searchParams.get('formato')
        return new HttpResponse('xlsx', {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="reporte-mensual-2026-11.xlsx"',
          },
        })
      }),
    )
    // jsdom no implementa object URLs ni descargas.
    URL.createObjectURL = vi.fn(() => 'blob:reporte')
    URL.revokeObjectURL = vi.fn()
    const { user } = renderApp('/reportes', { usuario: makeUsuario('VENDEDOR') })
    await user.click(await screen.findByRole('button', { name: /Descargar Excel/ }))
    expect(await screen.findByText('Descargado reporte-mensual-2026-11.xlsx')).toBeInTheDocument()
    expect(formato).toBe('xlsx')
  })
})

describe('pedidos asignados (CU-07, CU-12, CU-13)', () => {
  const delivery = makeUsuario('REPARTIDOR')

  it('el delivery ve primero los asignados a él y puede tomarlos', async () => {
    const asignado = makePedido({ _id: '6737c000c2b4e8a1d4f00201', numero: 61, nombreCliente: 'CLIENTE ASIGNADO', repartidorId: delivery._id, asignadoPor: 'ZONA' })
    let tomarBody: string | undefined
    server.use(
      http.get(`${API}/pedidos`, ({ request }) => {
        const params = new URL(request.url).searchParams
        if (params.get('repartidorId') === delivery._id) return HttpResponse.json(paginated([asignado]))
        expect(params.get('sinAsignar')).toBe('true')
        return HttpResponse.json(paginated([makePedido()]))
      }),
      http.post(`${API}/pedidos/:id/tomar`, async ({ request, params }) => {
        expect(params.id).toBe(asignado._id)
        tomarBody = await request.text()
        return HttpResponse.json({ ...asignado, estado: 'TOMADO', asignadoPor: null, tomadoAt: '2026-11-24T14:00:00.000Z' })
      }),
    )
    const { user } = renderApp('/entregas', { usuario: delivery })

    const seccion = (await screen.findByRole('heading', { name: /Asignados a vos/ })).closest('section')!
    expect(within(seccion).getByText('CLIENTE ASIGNADO')).toBeInTheDocument()
    expect(within(seccion).getByText(/tomalo cuando lo retires/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Disponibles para todos' })).toBeInTheDocument()

    await user.click(within(seccion).getByRole('button', { name: 'Tomar pedido' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('¿Tomar el pedido #61?')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Tomar pedido' }))
    expect(await screen.findByText(/Pedido #61 tomado/)).toBeInTheDocument()
    expect(tomarBody).toBe('')
  })

  it('al entregar no pide confirmar quién cobró: manda la transición sin body (CU-08)', async () => {
    const tomado = makePedido({ estado: 'TOMADO', repartidorId: delivery._id, tomadoAt: '2026-11-15T22:00:00.000Z' })
    let body: string | undefined
    server.use(
      http.get(`${API}/pedidos`, () => HttpResponse.json(paginated([tomado]))),
      http.post(`${API}/pedidos/:id/entregar`, async ({ request }) => {
        body = await request.text()
        return HttpResponse.json({ ...tomado, estado: 'ENTREGADO' })
      }),
    )
    const { user } = renderApp('/entregas?tab=pendientes', { usuario: delivery })

    await user.click(await screen.findByRole('button', { name: /Marcar como entregado/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Sí, fue entregado' }))

    expect(await screen.findByText(/marcado como entregado/)).toBeInTheDocument()
    expect(body).toBe('')
  })

  it('un pedido con pago directo le avisa al delivery que no cobre', async () => {
    server.use(http.get(`${API}/pedidos`, ({ request }) => {
      const params = new URL(request.url).searchParams
      return HttpResponse.json(paginated(params.get('sinAsignar') ? [makePedido({ pagoDirectoVendedor: true, montoTotal: 0 })] : []))
    }))
    renderApp('/entregas', { usuario: delivery })
    expect(await screen.findByText(/No cobrar: el cliente ya le pagó al vendedor/)).toBeInTheDocument()
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toContain('https://wa.me/595985444777')
  })

  it('el admin asigna un pedido a un delivery', async () => {
    const pedido = makePedido()
    let body: unknown
    server.use(
      http.get(`${API}/pedidos`, () => HttpResponse.json(paginated([pedido]))),
      http.get(`${API}/usuarios`, ({ request }) => {
        const rol = new URL(request.url).searchParams.get('rol')
        return HttpResponse.json(paginated(rol === 'REPARTIDOR' ? [delivery] : [makeUsuario('VENDEDOR')]))
      }),
      http.post(`${API}/pedidos/:id/asignar`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...pedido, repartidorId: delivery._id, asignadoPor: 'ADMIN' })
      }),
    )
    const { user } = renderApp('/admin/pedidos', { usuario: makeUsuario('ADMIN') })

    await user.click((await screen.findAllByRole('button', { name: /^Asignar/ }))[0])
    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('Delivery'), delivery._id)
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Pedido #58 asignado a Carlos Gómez.')).toBeInTheDocument()
    expect(body).toEqual({ repartidorId: delivery._id })
  })

  it('el vendedor puede editar un pedido asignado que nadie tomó', async () => {
    const pedido = makePedido({ repartidorId: delivery._id, asignadoPor: 'ZONA' })
    server.use(http.get(`${API}/pedidos/:id`, () => HttpResponse.json(pedido)))
    renderApp(`/pedidos/${pedido._id}`, { usuario: makeUsuario('VENDEDOR') })
    expect(await screen.findByText('Asignado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar pedido' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar pedido' })).toBeInTheDocument()
  })
})

describe('pantalla Deliverys (CU-14)', () => {
  it('lista la carga de cada delivery y enlaza al listado filtrado', async () => {
    const delivery = makeUsuario('REPARTIDOR')
    server.use(
      http.get(`${API}/pedidos/resumen-deliverys`, () =>
        HttpResponse.json({
          datos: [
            {
              repartidorId: delivery._id,
              nombre: 'Carlos Gómez',
              contacto: '0991 585 513',
              activo: true,
              total: 7,
              asignados: 3,
              tomados: 4,
              zonas: [{ zonaId: '6737b000c2b4e8a1d4f00010', zonaNombre: 'Asunción', total: 4, asignados: 1, tomados: 3 }],
            },
          ],
          sinAsignar: { total: 2, asignados: 2, tomados: 0, zonas: [] },
        }),
      ),
    )
    renderApp('/admin/deliverys', { usuario: makeUsuario('ADMIN') })

    expect(await screen.findByText('Carlos Gómez')).toBeInTheDocument()
    expect(screen.getByText('3 asignados sin retirar · 4 tomados')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver 7 pedidos en curso de Carlos Gómez' })).toHaveAttribute(
      'href',
      `/admin/pedidos?activos=true&repartidorId=${delivery._id}`,
    )
    expect(screen.getByRole('link', { name: /Asunción/ })).toHaveAttribute(
      'href',
      `/admin/pedidos?activos=true&repartidorId=${delivery._id}&zonaId=6737b000c2b4e8a1d4f00010`,
    )
    expect(screen.getByRole('link', { name: 'Ver 2 pedidos sin asignar' })).toHaveAttribute('href', '/admin/pedidos?activos=true&sinAsignar=true')
  })
})

describe('catálogo de productos (CU-15)', () => {
  it('elegir un producto del catálogo completa precio y costo y muestra la ganancia', async () => {
    const zona = makeZona({ _id: '6737b000c2b4e8a1d4f00010', nombre: 'Luque', costoDelivery: 38000, requiereTransportadora: false })
    const remera = {
      _id: '6737d000c2b4e8a1d4f00001',
      vendedorId: makeUsuario('VENDEDOR')._id,
      nombre: 'Remera',
      precioVenta: 45000,
      costo: 30000,
      activo: true,
      createdAt: '2026-11-24T14:00:00.000Z',
      updatedAt: '2026-11-24T14:00:00.000Z',
    }
    let body: Record<string, unknown> | undefined
    server.use(
      http.get(`${API}/zonas`, () => HttpResponse.json(paginated([zona]))),
      http.get(`${API}/productos`, ({ request }) => {
        const params = new URL(request.url).searchParams
        expect(params.get('activo')).toBe('true')
        return HttpResponse.json(paginated([remera]))
      }),
      http.post(`${API}/pedidos`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(makePedido({ _id: '6737c000c2b4e8a1d4f00300', numero: 62 }), { status: 201 })
      }),
      http.get(`${API}/pedidos/:id`, () => HttpResponse.json(makePedido({ _id: '6737c000c2b4e8a1d4f00300', numero: 62 }))),
    )
    const { user } = renderApp('/pedidos/nuevo', { usuario: makeUsuario('VENDEDOR') })

    await user.type(await screen.findByLabelText('Nombre del cliente'), 'SR. LIMMO PIPO')
    await user.type(screen.getByLabelText('Contacto'), '0981 222 333')
    await user.selectOptions(screen.getByLabelText('Zona de entrega'), zona._id)
    await user.type(screen.getByRole('combobox', { name: 'Producto 1' }), 'Rem')
    await user.click(await screen.findByRole('option', { name: /Remera/ }))
    expect(screen.getByLabelText('Precio de venta')).toHaveValue('45.000')
    expect(screen.getByText('Del catálogo')).toBeInTheDocument()
    const resumen = screen.getByText('Resumen').closest('div')!.parentElement!
    expect(within(resumen).getByText('Ganancia')).toBeInTheDocument()
    expect(within(resumen).getByText('15.000 Gs')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Entrega: dirección o link/), 'Av. Principal 123, Luque')
    await user.click(screen.getByLabelText(/El cliente ya le pagó al vendedor/))
    expect(within(resumen).getByText('-38.000 Gs')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crear pedido' }))

    expect(await screen.findByText(/Pedido #62 creado/)).toBeInTheDocument()
    expect(body).toMatchObject({
      productos: [{ nombre: 'Remera', cantidad: 1, precioUnitario: 45000, productoId: remera._id, costoUnitario: 30000 }],
      pagoDirectoVendedor: true,
    })
    expect(body).not.toHaveProperty('vendedorId')
  })
})

describe('boleta de depósito (CU-17)', () => {
  const delivery = makeUsuario('REPARTIDOR')
  const KEY = 'pedidos/6737c000c2b4e8a1d4f00101/boleta-3f2b8c1e-9a4d-4e7b-b1c2-5d6e7f8a9b0c.pdf'
  const R2 = 'https://boletas.r2.test/pedidos/6737c000c2b4e8a1d4f00101/boleta.pdf'

  it('el delivery sube la boleta: pide URL, la sube directo a R2 y confirma la key', async () => {
    const tomado = makePedido({ estado: 'TOMADO', repartidorId: delivery._id, tomadoAt: '2026-11-26T14:00:00.000Z' })
    const llamadas: string[] = []
    let pedirBody: unknown
    let putHeaders: Headers | undefined
    let confirmarBody: unknown
    server.use(
      http.get(`${API}/pedidos/:id`, () => HttpResponse.json(tomado)),
      http.post(`${API}/pedidos/:id/boleta/url-subida`, async ({ request }) => {
        llamadas.push('url')
        pedirBody = await request.json()
        return HttpResponse.json(
          { url: R2, key: KEY, metodo: 'PUT', headers: { 'Content-Type': 'application/pdf' }, expiraEn: '2026-11-26T18:05:00.000Z' },
          { status: 201 },
        )
      }),
      http.put(R2, ({ request }) => {
        llamadas.push('put')
        putHeaders = request.headers
        return new HttpResponse(null, { status: 200 })
      }),
      http.patch(`${API}/pedidos/:id/boleta`, async ({ request }) => {
        llamadas.push('confirmar')
        confirmarBody = await request.json()
        return HttpResponse.json({
          ...tomado,
          boleta: { key: KEY, contentType: 'application/pdf', tamano: 4, subidaAt: '2026-11-26T18:01:12.000Z', subidaPor: delivery._id },
        })
      }),
    )
    const { user, container } = renderApp(`/entregas/${tomado._id}`, { usuario: delivery })

    expect(await screen.findByRole('heading', { name: 'Boleta de depósito' })).toBeInTheDocument()
    const archivo = new File(['%PDF'], 'boleta.pdf', { type: 'application/pdf' })
    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, archivo)

    expect(await screen.findByText('Boleta del pedido #58 subida.')).toBeInTheDocument()
    expect(llamadas).toEqual(['url', 'put', 'confirmar'])
    expect(pedirBody).toEqual({ contentType: 'application/pdf', tamano: 4 })
    // Directo a R2: con el Content-Type firmado y sin el token de la API.
    expect(putHeaders?.get('content-type')).toBe('application/pdf')
    expect(putHeaders?.get('authorization')).toBeNull()
    expect(confirmarBody).toEqual({ key: KEY })
    expect(screen.getByRole('button', { name: /Reemplazar boleta/ })).toBeInTheDocument()
  })

  it('el vendedor ve la boleta con una URL firmada', async () => {
    const entregado = makePedido({
      estado: 'ENTREGADO',
      repartidorId: delivery._id,
      boleta: { key: KEY.replace('.pdf', '.jpg'), contentType: 'image/jpeg', tamano: 284512, subidaAt: '2026-11-26T18:01:12.000Z', subidaPor: delivery._id },
    })
    server.use(
      http.get(`${API}/pedidos/:id/boleta`, () =>
        HttpResponse.json({ url: 'https://boletas.r2.test/firmada.jpg', contentType: 'image/jpeg', expiraEn: '2026-11-26T18:10:00.000Z' }),
      ),
      http.get(`${API}/pedidos/:id`, () => HttpResponse.json(entregado)),
    )
    const { user } = renderApp(`/pedidos/${entregado._id}`, { usuario: makeUsuario('VENDEDOR') })

    await user.click(await screen.findByRole('button', { name: 'Ver boleta' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByRole('img', { name: /Boleta de depósito del pedido #58/ })).toHaveAttribute('src', 'https://boletas.r2.test/firmada.jpg')
    // El vendedor no puede subirla.
    expect(screen.queryByRole('button', { name: /Subir boleta|Reemplazar boleta/ })).not.toBeInTheDocument()
  })

  it('en una zona sin transportadora no aparece la boleta', async () => {
    const pedido = makePedido({ estado: 'TOMADO', repartidorId: delivery._id, zonaRequiereTransportadora: false })
    server.use(http.get(`${API}/pedidos/:id`, () => HttpResponse.json(pedido)))
    renderApp(`/entregas/${pedido._id}`, { usuario: delivery })
    expect(await screen.findByRole('button', { name: /Marcar como entregado/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Boleta de depósito' })).not.toBeInTheDocument()
  })
})
