import { Badge } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { estadoLabels, type Estado } from '../types'

type Visible = Estado | 'ASIGNADO'

const estilos: Record<Visible, string> = {
  INICIADO: 'bg-celeste-50 text-azul ring-1 ring-inset ring-celeste',
  ASIGNADO: 'bg-naranja-50 text-naranja-700 ring-1 ring-inset ring-naranja/30',
  TOMADO: 'bg-cafe-50 text-cafe ring-1 ring-inset ring-cafe/25',
  ENTREGADO: 'bg-exito-50 text-exito ring-1 ring-inset ring-exito/25',
  CANCELADO: 'bg-apagado-50 text-apagado ring-1 ring-inset ring-apagado/20',
}

const puntos: Record<Visible, string> = {
  INICIADO: 'bg-azul',
  ASIGNADO: 'bg-naranja',
  TOMADO: 'bg-cafe',
  ENTREGADO: 'bg-exito',
  CANCELADO: 'bg-apagado',
}

/** `asignado` muestra "Asignado" para un INICIADO que ya tiene delivery (no es un estado de la base). */
export function EstadoBadge({ estado, asignado, className }: { estado: Estado; asignado?: boolean; className?: string }) {
  const visible: Visible = asignado && estado === 'INICIADO' ? 'ASIGNADO' : estado
  return (
    <Badge className={cn(estilos[visible], className)}>
      <span className={cn('size-1.5 rounded-full', puntos[visible])} aria-hidden="true" />
      {visible === 'ASIGNADO' ? 'Asignado' : estadoLabels[estado]}
    </Badge>
  )
}
