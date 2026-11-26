import { Badge } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { estaAsignado } from '../permisos'
import { estadoLabels, type Estado, type Pedido } from '../types'

type Visual = Estado | 'ASIGNADO'

const estilos: Record<Visual, string> = {
  INICIADO: 'bg-celeste-50 text-azul ring-1 ring-inset ring-celeste',
  ASIGNADO: 'bg-naranja-50 text-naranja-700 ring-1 ring-inset ring-naranja/25',
  TOMADO: 'bg-cafe-50 text-cafe ring-1 ring-inset ring-cafe/25',
  ENTREGADO: 'bg-exito-50 text-exito ring-1 ring-inset ring-exito/25',
  CANCELADO: 'bg-apagado-50 text-apagado ring-1 ring-inset ring-apagado/20',
}

const puntos: Record<Visual, string> = {
  INICIADO: 'bg-azul',
  ASIGNADO: 'bg-naranja',
  TOMADO: 'bg-cafe',
  ENTREGADO: 'bg-exito',
  CANCELADO: 'bg-apagado',
}

/** Estado del pedido; un INICIADO con delivery se muestra como "Asignado" (sigue siendo INICIADO en la API). */
export function EstadoBadge({ pedido, className }: { pedido: Pick<Pedido, 'estado' | 'repartidorId'>; className?: string }) {
  const visual: Visual = estaAsignado(pedido as Pedido) ? 'ASIGNADO' : pedido.estado
  return (
    <Badge className={cn(estilos[visual], className)}>
      <span className={cn('size-1.5 rounded-full', puntos[visual])} aria-hidden="true" />
      {visual === 'ASIGNADO' ? 'Asignado' : estadoLabels[visual]}
    </Badge>
  )
}
