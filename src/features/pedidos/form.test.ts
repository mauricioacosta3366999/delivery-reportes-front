import { describe, expect, it } from 'vitest'
import { makePedido } from '@/test/fixtures'
import { calcularMontos, ganancia, pedidoFormDefaults, pedidoFormSchema, pedidoToForm, toCreatePayload, toUpdatePayload, type PedidoFormValues } from './form'

type Fila = PedidoFormValues['productos'][number]
const fila = (nombre: string, cantidad: number, precioUnitario: number, extra: Partial<Fila> = {}): Fila => ({
  nombre,
  cantidad,
  precioUnitario,
  productoId: '',
  costoUnitario: Number.NaN,
  ...extra,
})

function valoresValidos(overrides: Partial<PedidoFormValues> = {}): PedidoFormValues {
  return {
    ...pedidoFormDefaults(),
    zonaId: '6737b000c2b4e8a1d4f00010',
    fechaPedido: '2026-10-05',
    nombreCliente: '  SR. LIMMO PIPO ',
    contactoCliente: '0981 222 333',
    ubicacionEntrega: { direccion: 'Av. Principal 123, Luque' },
    productos: [fila('Remera', 2, 45000), fila('Gorra', 1, 29000)],
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
    for (const calculado of ['costoDelivery', 'totalVenta', 'montoTotal', 'montoARendir', 'estado', 'numero', 'totalCosto', 'vendedorId', 'repartidorId', 'vendedorNombre', 'pagoDirectoVendedor']) {
      expect(payload).not.toHaveProperty(calculado)
    }
  })

  it('omite los opcionales vacíos (la API es estricta)', () => {
    const payload = toCreatePayload(valoresValidos({ observaciones: '  ' }))
    expect(payload).not.toHaveProperty('observaciones')
  })

  it('el admin puede elegir el vendedor y el delivery (CU-10, CU-12)', () => {
    const payload = toCreatePayload(valoresValidos({ vendedorId: '6737a1f0c2b4e8a1d4f00001', repartidorId: '6737a1f0c2b4e8a1d4f00002' }))
    expect(payload).toMatchObject({ vendedorId: '6737a1f0c2b4e8a1d4f00001', repartidorId: '6737a1f0c2b4e8a1d4f00002' })
  })

  it('marca el pago directo al vendedor solo si se eligió (CU-11)', () => {
    expect(toCreatePayload(valoresValidos({ pagoDirectoVendedor: true }))).toMatchObject({ pagoDirectoVendedor: true })
  })

  it('envía el vínculo al catálogo y el costo solo si están cargados (CU-15)', () => {
    const payload = toCreatePayload(
      valoresValidos({ productos: [fila('Remera', 2, 45000, { productoId: '6737d000c2b4e8a1d4f00001', costoUnitario: 30000 }), fila('Gorra', 1, 29000)] }),
    )
    expect(payload.productos).toEqual([
      { nombre: 'Remera', cantidad: 2, precioUnitario: 45000, productoId: '6737d000c2b4e8a1d4f00001', costoUnitario: 30000 },
      { nombre: 'Gorra', cantidad: 1, precioUnitario: 29000 },
    ])
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
    const editado = { ...original, observaciones: 'Portón azul', productos: [fila('Router', 3, 155000)] }
    expect(toUpdatePayload(editado, original)).toEqual({
      observaciones: 'Portón azul',
      productos: [{ nombre: 'Router', cantidad: 3, precioUnitario: 155000 }],
    })
  })

  it('sin cambios devuelve un objeto vacío', () => {
    const original = pedidoToForm(makePedido())
    expect(toUpdatePayload({ ...original }, original)).toEqual({})
  })

  it('envía el cambio del pago directo, pero nunca el vendedor ni el delivery', () => {
    const original = pedidoToForm(makePedido())
    const editado = { ...original, pagoDirectoVendedor: true, vendedorId: '6737a1f0c2b4e8a1d4f00001', repartidorId: '6737a1f0c2b4e8a1d4f00002' }
    expect(toUpdatePayload(editado, original)).toEqual({ pagoDirectoVendedor: true })
  })

  it('conserva el producto del catálogo al editar', () => {
    const pedido = makePedido({ productos: [{ nombre: 'Router', cantidad: 2, precioUnitario: 155000, productoId: '6737d000c2b4e8a1d4f00001', costoUnitario: 100000 }] })
    const original = pedidoToForm(pedido)
    expect(original.productos[0]).toMatchObject({ productoId: '6737d000c2b4e8a1d4f00001', costoUnitario: 100000 })
    expect(toUpdatePayload({ ...original }, original)).toEqual({})
  })
})

describe('pedidoFormSchema', () => {
  it('acepta un pedido válido con el costo vacío', () => {
    expect(pedidoFormSchema.safeParse(valoresValidos()).success).toBe(true)
  })

  it('rechaza un costo con decimales', () => {
    const result = pedidoFormSchema.safeParse(valoresValidos({ productos: [fila('X', 1, 1000, { costoUnitario: 10.5 })] }))
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toContain('productos.0.costoUnitario')
  })

  it('rechaza productos con cantidad 0 o precio vacío', () => {
    const result = pedidoFormSchema.safeParse(valoresValidos({ productos: [fila('X', 0, Number.NaN)] }))
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
      totalCosto: null,
    })
  })

  it('a rendir es la venta completa aunque el delivery cueste más', () => {
    expect(calcularMontos([fila('Llavero', 1, 2000)], 5000)).toMatchObject({ montoTotal: 7000, montoARendir: 2000 })
  })

  it('con pago directo al vendedor el delivery no cobra y se descuenta el delivery (CU-11)', () => {
    // Ejemplo de CU-11: venta 50.000 · delivery 25.000.
    expect(calcularMontos([fila('Remera', 1, 50000)], 25000, true)).toMatchObject({ totalVenta: 50000, montoTotal: 0, montoARendir: -25000 })
  })

  it('suma el costo de los productos que lo tienen y calcula la ganancia (CU-15)', () => {
    const montos = calcularMontos([fila('Remera', 2, 45000, { costoUnitario: 30000 }), fila('Gorra', 1, 29000)], 38000)
    expect(montos.totalCosto).toBe(60000)
    expect(ganancia(montos.totalVenta, montos.totalCosto)).toBe(59000)
    expect(ganancia(119000, null)).toBeNull()
  })

  it('ignora filas incompletas mientras se escribe', () => {
    expect(calcularMontos([{ cantidad: 2, precioUnitario: Number.NaN }], 25000).montoARendir).toBe(0)
  })
})
