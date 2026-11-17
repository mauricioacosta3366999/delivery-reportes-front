import type { Pedido } from '@/features/pedidos/types'
import type { Rol, Usuario } from '@/features/usuarios/types'
import type { Zona } from '@/features/zonas/api'

const ids: Record<Rol, string> = {
  ADMIN: '6737a1f0c2b4e8a1d4f00000',
  VENDEDOR: '6737a1f0c2b4e8a1d4f00001',
  REPARTIDOR: '6737a1f0c2b4e8a1d4f00002',
}

/** JWT falso con `exp` (solo el payload importa en el front). */
export function makeToken(expiresInSeconds = 3600) {
  const payload = btoa(JSON.stringify({ sub: 'x', exp: Math.floor(Date.now() / 1000) + expiresInSeconds }))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.firma`
}

export function makeUsuario(rol: Rol, overrides: Partial<Usuario> = {}): Usuario {
  const nombres: Record<Rol, string> = { ADMIN: 'Ana Admin', VENDEDOR: 'Luciano Benítez', REPARTIDOR: 'Carlos Gómez' }
  return {
    _id: ids[rol],
    nombre: nombres[rol],
    correo: `${rol.toLowerCase()}@example.com`,
    rol,
    contacto: '0981 123 456',
    activo: true,
    createdAt: '2026-11-15T21:00:00.000Z',
    updatedAt: '2026-11-15T21:00:00.000Z',
    ...overrides,
  }
}

export function makeZona(overrides: Partial<Zona> = {}): Zona {
  return {
    _id: '6737b000c2b4e8a1d4f00012',
    nombre: 'Tobatí',
    descripcion: 'Interior, envío por transportadora',
    costoDelivery: 40000,
    requiereTransportadora: true,
    activa: true,
    createdAt: '2026-11-15T20:00:00.000Z',
    updatedAt: '2026-11-15T20:00:00.000Z',
    ...overrides,
  }
}

export function makePedido(overrides: Partial<Pedido> = {}): Pedido {
  return {
    _id: '6737c000c2b4e8a1d4f00101',
    vendedorId: ids.VENDEDOR,
    vendedorNombre: 'Luciano Benítez',
    fechaPedido: '2026-10-05T03:00:00.000Z',
    repartidorId: null,
    zonaId: '6737b000c2b4e8a1d4f00012',
    zonaNombre: 'Tobatí',
    zonaRequiereTransportadora: true,
    nombreCliente: 'P.A NETWORKS',
    contactoCliente: '0985 444 777',
    ubicacionRetiro: { direccion: 'Depósito central, Asunción' },
    ubicacionEntrega: { direccion: 'Ruta 2 km 60, Tobatí' },
    productos: [{ nombre: 'Router', cantidad: 2, precioUnitario: 155000 }],
    costoDelivery: 40000,
    totalVenta: 310000,
    montoTotal: 350000,
    montoARendir: 270000,
    estado: 'INICIADO',
    observaciones: '',
    tomadoAt: null,
    entregadoAt: null,
    canceladoAt: null,
    createdAt: '2026-11-15T21:10:00.000Z',
    updatedAt: '2026-11-15T21:10:00.000Z',
    ...overrides,
  }
}

export function paginated<T>(datos: T[]) {
  return { datos, total: datos.length, pagina: 1, limite: 20 }
}
