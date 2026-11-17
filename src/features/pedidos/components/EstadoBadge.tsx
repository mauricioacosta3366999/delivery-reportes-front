import { Badge } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { estadoLabels, type Estado } from '../types'

const estilos: Record<Estado, string> = {
  INICIADO: 'bg-celeste-50 text-azul ring-1 ring-inset ring-celeste',
  TOMADO: 'bg-cafe-50 text-cafe ring-1 ring-inset ring-cafe/25',
  ENTREGADO: 'bg-exito-50 text-exito ring-1 ring-inset ring-exito/25',
  CANCELADO: 'bg-apagado-50 text-apagado ring-1 ring-inset ring-apagado/20',
}

const puntos: Record<Estado, string> = {
  INICIADO: 'bg-azul',
  TOMADO: 'bg-cafe',
  ENTREGADO: 'bg-exito',
  CANCELADO: 'bg-apagado',
}

export function EstadoBadge({ estado, className }: { estado: Estado; className?: string }) {
  return (
    <Badge className={cn(estilos[estado], className)}>
      <span className={cn('size-1.5 rounded-full', puntos[estado])} aria-hidden="true" />
      {estadoLabels[estado]}
    </Badge>
  )
}
