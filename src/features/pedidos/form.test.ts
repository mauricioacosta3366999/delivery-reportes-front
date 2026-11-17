import { describe, expect, it } from 'vitest'
import { makePedido } from '@/test/fixtures'
import { calcularMontos, pedidoFormDefaults, pedidoFormSchema, pedidoToForm, toCreatePayload, toUpdatePayload, type PedidoFormValues } from './form'

function valoresValidos(overrides: Partial<PedidoFormValues> = {}): PedidoFormValues {
  return {
    ...pedidoFormDefaults(),
    zonaId: '6737b000c2b4e8a1d4f00010',
    fechaPedido: '2026-10-05',
    nombreCliente: '  SR. LIMMO PIPO ',
    contactoCliente: '0981 222 333',
    ubicacionEntrega: { direccion: 'Av. Principal 123, Luque' },
    productos: [
      { nombre: 'Remera', cantidad: 2, precioUnitario: 45000 },
      { nombre: 'Gorra', cantidad: 1, precioUnitario: 29000 },
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
    const editado = { ...original, observaciones: 'Portón azul', productos: [{ nombre: 'Router', cantidad: 3, precioUnitario: 155000 }] }
    expect(toUpdatePayload(editado, original)).toEqual({
      observaciones: 'Portón azul',
      productos: [{ nombre: 'Router', cantidad: 3, precioUnitario: 155000 }],
    })
  })

  it('sin cambios devuelve un objeto vacío', () => {
    const original = pedidoToForm(makePedido())
    expect(toUpdatePayload({ ...original }, original)).toEqual({})
  })
})

describe('pedidoFormSchema', () => {
  it('rechaza productos con cantidad 0 o precio vacío', () => {
    const result = pedidoFormSchema.safeParse(valoresValidos({ productos: [{ nombre: 'X', cantidad: 0, precioUnitario: Number.NaN }] }))
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
      montoARendir: 81000,
    })
  })

  it('ignora filas incompletas mientras se escribe', () => {
    expect(calcularMontos([{ cantidad: 2, precioUnitario: Number.NaN }], 25000).montoARendir).toBe(-25000)
  })
})
