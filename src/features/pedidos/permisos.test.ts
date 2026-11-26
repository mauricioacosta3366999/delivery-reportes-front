import { describe, expect, it } from 'vitest'
import { makePedido, makeUsuario } from '@/test/fixtures'
import { codigoPedido } from './numero'
import { accionesDisponibles, estaAsignado } from './permisos'

const vendedor = makeUsuario('VENDEDOR')
const delivery = makeUsuario('REPARTIDOR')
const otroDelivery = makeUsuario('REPARTIDOR', { _id: '6737a1f0c2b4e8a1d4f00099' })
const admin = makeUsuario('ADMIN')

describe('accionesDisponibles con pedidos asignados (CU-12/13)', () => {
  const asignado = makePedido({ repartidorId: delivery._id, asignadoPor: 'ZONA' })

  it('el vendedor puede editar y cancelar mientras nadie lo tomó', () => {
    expect(estaAsignado(asignado)).toBe(true)
    expect(accionesDisponibles(asignado, vendedor)).toMatchObject({ editar: true, cancelar: true })
  })

  it('solo el delivery asignado puede tomarlo', () => {
    expect(accionesDisponibles(asignado, delivery).tomar).toBe(true)
    expect(accionesDisponibles(asignado, otroDelivery).tomar).toBe(false)
    expect(accionesDisponibles(makePedido(), otroDelivery).tomar).toBe(true)
  })

  it('el admin puede asignar en INICIADO y TOMADO, nunca en ENTREGADO ni CANCELADO', () => {
    expect(accionesDisponibles(asignado, admin).asignar).toBe(true)
    expect(accionesDisponibles(makePedido({ estado: 'TOMADO', repartidorId: delivery._id }), admin).asignar).toBe(true)
    expect(accionesDisponibles(makePedido({ estado: 'ENTREGADO' }), admin).asignar).toBe(false)
    expect(accionesDisponibles(makePedido({ estado: 'CANCELADO' }), admin).asignar).toBe(false)
    expect(accionesDisponibles(asignado, vendedor).asignar).toBe(false)
  })

  it('un pedido tomado ya no se edita', () => {
    const tomado = makePedido({ estado: 'TOMADO', repartidorId: delivery._id })
    expect(accionesDisponibles(tomado, vendedor)).toMatchObject({ editar: false, cancelar: false })
    expect(accionesDisponibles(tomado, delivery).entregar).toBe(true)
    expect(accionesDisponibles(tomado, otroDelivery).entregar).toBe(false)
  })
})

describe('codigoPedido', () => {
  it('usa el número correlativo, o un código corto si el pedido no tiene número', () => {
    expect(codigoPedido(makePedido({ numero: 57 }))).toBe('#57')
    expect(codigoPedido(makePedido({ numero: undefined, _id: '6737c000c2b4e8a1d4f0abcd' }))).toBe('#F0ABCD')
  })
})
