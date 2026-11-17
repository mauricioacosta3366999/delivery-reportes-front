export const ROLES = ['ADMIN', 'VENDEDOR', 'REPARTIDOR'] as const
export type Rol = (typeof ROLES)[number]

export const rolLabels: Record<Rol, string> = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  REPARTIDOR: 'Delivery',
}

export interface Usuario {
  _id: string
  nombre: string
  correo: string
  rol: Rol
  contacto: string
  activo: boolean
  createdAt: string
  updatedAt: string
}
