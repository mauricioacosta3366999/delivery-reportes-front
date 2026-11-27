import { describe, expect, it } from 'vitest'
import { makePedido } from '@/test/fixtures'
import { numeroWhatsApp } from '@/lib/telefono'
import { calcularCosto, calcularMontos, pedidoFormDefaults, pedidoFormSchema, pedidoToForm, toCreatePayload, toUpdatePayload, type PedidoFormValues } from './form'

function valoresValidos(overrides: Partial<PedidoFormValues> = {}): PedidoFormValues {
  return {
    ...pedidoFormDefaults(),
    zonaId: '6737b000c2b4e8a1d4f00010',
    fechaPedido: '2026-10-05',
    nombreCliente: '  SR. LIMMO PIPO ',
    contactoCliente: '0981 222 333',
    ubicacionEntrega: { direccion: 'Av. Principal 123, Luque' },
    productos: [
      { nombre: 'Remera', cantidad: 2, precioUnitario: 45000, productoId: '', costoUnitario: Number.NaN },
      { nombre: 'Gorra', cantidad: 1, precioUnitario: 29000, productoId: '', costoUnitario: Number.NaN },
    ],
    ...overrides,
  }
}

describe('toCreatePayload', () => {
  it('arma el body de CU-03 con el retiro fijo, sin importes, estado ni vendedor', () => {
    const payload = toCreatePayload(valoresValidos({ observaciones: 'Llamar antes de llegar' }))
    expect(payload).toEqual({
      zonaId: '6737b000c2b4e8a1d4f00010',
      fechaPedido: '2026-10-05',
      nombreCliente: 'SR. LIMMO PIPO',
      contactoCliente: '0981 222 333',
      ubicacionRetiro: { direccion: 'Depósito central', coordenadas: { latitud: -25.413408, longitud: -57.55011 } },
      ubicacionEntrega: { direccion: 'Av. Principal 123, Luque' },
      productos: [
        { nombre: 'Remera', cantidad: 2, precioUnitario: 45000 },
        { nombre: 'Gorra', cantidad: 1, precioUnitario: 29000 },
      ],
      observaciones: 'Llamar antes de llegar',
    })
    for (const calculado of ['costoDelivery', 'totalVenta', 'montoTotal', 'montoARendir', 'estado', 'vendedorId', 'vendedorNombre']) {
      expect(payload).not.toHaveProperty(calculado)
    }
  })

  it('omite los opcionales vacíos (la API es estricta)', () => {
    const payload = toCreatePayload(valoresValidos({ observaciones: '  ' }))
    expect(payload).not.toHaveProperty('observaciones')
    expect(payload).not.toHaveProperty('pagoDirectoVendedor')
    expect(payload).not.toHaveProperty('vendedorId')
  })

  it('envía el vendedor elegido por el admin y el pago directo solo si se marcaron', () => {
    const payload = toCreatePayload(valoresValidos({ vendedorId: '6737a1f0c2b4e8a1d4f00001', pagoDirectoVendedor: true }))
    expect(payload).toMatchObject({ vendedorId: '6737a1f0c2b4e8a1d4f00001', pagoDirectoVendedor: true })
  })

  it('envía el delivery elegido por el admin y, por producto, el vínculo al catálogo y el costo solo si existen', () => {
    const payload = toCreatePayload(
      valoresValidos({
        repartidorId: '6737a1f0c2b4e8a1d4f00002',
        productos: [
          { nombre: ' Remera ', cantidad: 2, precioUnitario: 45000, productoId: '6737d000c2b4e8a1d4f00001', costoUnitario: 30000 },
          { nombre: 'A mano', cantidad: 1, precioUnitario: 10000, productoId: '', costoUnitario: 4000 },
          { nombre: 'Sin costo', cantidad: 1, precioUnitario: 5000, productoId: '', costoUnitario: Number.NaN },
        ],
      }),
    )
    expect(payload.repartidorId).toBe('6737a1f0c2b4e8a1d4f00002')
    expect(payload.productos).toEqual([
      { nombre: 'Remera', cantidad: 2, precioUnitario: 45000, productoId: '6737d000c2b4e8a1d4f00001', costoUnitario: 30000 },
      { nombre: 'A mano', cantidad: 1, precioUnitario: 10000, costoUnitario: 4000 },
      { nombre: 'Sin costo', cantidad: 1, precioUnitario: 5000 },
    ])
    expect(toCreatePayload(valoresValidos())).not.toHaveProperty('repartidorId')
  })
})

describe('entrega con link de Google Maps', () => {
  it('envía el link y las coordenadas que trae', () => {
    const payload = toCreatePayload(valoresValidos({ ubicacionEntrega: { direccion: 'https://www.google.com/maps/@-25.3,-57.6,17z' } }))
    expect(payload.ubicacionEntrega).toEqual({ direccion: 'https://www.google.com/maps/@-25.3,-57.6,17z', coordenadas: { latitud: -25.3, longitud: -57.6 } })
  })

  it('un link corto se envía sin coordenadas', () => {
    const payload = toCreatePayload(valoresValidos({ ubicacionEntrega: { direccion: 'https://maps.app.goo.gl/AbC' } }))
    expect(payload.ubicacionEntrega).toEqual({ direccion: 'https://maps.app.goo.gl/AbC' })
  })
})

describe('toUpdatePayload', () => {
  it('envía solo lo que cambió', () => {
    const original = pedidoToForm(makePedido())
    const editado = { ...original, observaciones: 'Portón azul', productos: [{ nombre: 'Router', cantidad: 3, precioUnitario: 155000, productoId: '', costoUnitario: Number.NaN }] }
    expect(toUpdatePayload(editado, original)).toEqual({
      observaciones: 'Portón azul',
      productos: [{ nombre: 'Router', cantidad: 3, precioUnitario: 155000 }],
    })
  })

  it('sin cambios devuelve un objeto vacío', () => {
    const original = pedidoToForm(makePedido())
    expect(toUpdatePayload({ ...original }, original)).toEqual({})
  })

  it('envía el cambio de pago directo (en ambos sentidos) y nunca el vendedor', () => {
    const original = pedidoToForm(makePedido({ pagoDirectoVendedor: true }))
    expect(original.pagoDirectoVendedor).toBe(true)
    expect(toUpdatePayload({ ...original, pagoDirectoVendedor: false, vendedorId: 'otro' }, original)).toEqual({ pagoDirectoVendedor: false })
    const legacy = pedidoToForm(makePedido({ pagoDirectoVendedor: undefined }))
    expect(toUpdatePayload({ ...legacy, pagoDirectoVendedor: true }, legacy)).toEqual({ pagoDirectoVendedor: true })
  })
})

describe('pedidoFormSchema', () => {
  it('rechaza productos con cantidad 0 o precio vacío', () => {
    const result = pedidoFormSchema.safeParse(valoresValidos({ productos: [{ nombre: 'X', cantidad: 0, precioUnitario: Number.NaN, productoId: '', costoUnitario: Number.NaN }] }))
    expect(result.success).toBe(false)
    const paths = result.error?.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('productos.0.cantidad')
    expect(paths).toContain('productos.0.precioUnitario')
  })

  it('exige la dirección o el link de entrega', () => {
    const result = pedidoFormSchema.safeParse(valoresValidos({ ubicacionEntrega: { direccion: '  ' } }))
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('ubicacionEntrega.direccion')
  })
})

describe('calcularMontos', () => {
  it('replica las fórmulas del backend', () => {
    // Ejemplo de CU-03: venta 119.000 + delivery 38.000.
    expect(calcularMontos(valoresValidos().productos, 38000)).toEqual({
      totalVenta: 119000,
      costoDelivery: 38000,
      montoTotal: 157000,
      montoARendir: 119000,
    })
  })

  it('ignora filas incompletas mientras se escribe', () => {
    expect(calcularMontos([{ cantidad: 2, precioUnitario: Number.NaN }], 25000).montoARendir).toBe(0)
  })

  it('con pago directo al vendedor el delivery no cobra y se rinde menos el delivery', () => {
    expect(calcularMontos(valoresValidos().productos, 38000, true)).toEqual({
      totalVenta: 119000,
      costoDelivery: 38000,
      montoTotal: 0,
      montoARendir: -38000,
    })
  })
})

describe('calcularCosto', () => {
  it('suma solo los productos con costo y es null si ninguno lo tiene', () => {
    expect(calcularCosto([{ cantidad: 2, costoUnitario: 30000 }, { cantidad: 1, costoUnitario: Number.NaN }])).toBe(60000)
    expect(calcularCosto([{ cantidad: 2, costoUnitario: Number.NaN }])).toBeNull()
  })

  it('conserva catálogo y costo al editar un pedido y solo envía productos si cambiaron', () => {
    const original = pedidoToForm(
      makePedido({ productos: [{ nombre: 'Router', cantidad: 2, precioUnitario: 155000, productoId: '6737d000c2b4e8a1d4f00009', costoUnitario: 120000 }] }),
    )
    expect(original.productos[0]).toMatchObject({ productoId: '6737d000c2b4e8a1d4f00009', costoUnitario: 120000 })
    expect(toUpdatePayload({ ...original }, original)).toEqual({})
    const legacy = pedidoToForm(makePedido())
    expect(legacy.productos[0]).toMatchObject({ productoId: '' })
    expect(Number.isNaN(legacy.productos[0]!.costoUnitario)).toBe(true)
  })
})

describe('numeroWhatsApp', () => {
  it.each([
    ['0981 123 456', '595981123456'],
    ['+595 991 585 513', '595991585513'],
    ['981123456', '595981123456'],
    ['00595981123456', '595981123456'],
    ['123', null],
  ])('%s → %s', (contacto, esperado) => {
    expect(numeroWhatsApp(contacto)).toBe(esperado)
  })
})
