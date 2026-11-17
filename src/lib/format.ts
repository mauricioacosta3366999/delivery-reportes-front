/** Zona horaria de negocio: los reportes y fechas se interpretan en Paraguay. */
export const TIME_ZONE = 'America/Asuncion'
/** Paraguay usa UTC-3 fijo desde 2024; aislado aquí por si cambia. */
const PY_OFFSET = '-03:00'

// `useGrouping: 'always'` evita que es-* deje sin separador los números de 4 dígitos (5000 → 5.000).
const guaranies = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0, useGrouping: 'always' })

export function formatNumero(value: number) {
  return guaranies.format(value)
}

/** 350000 → "350.000 Gs" */
export function formatGs(value: number) {
  return `${guaranies.format(value)} Gs`
}

/** Convierte texto con separadores ("1.250.000") en entero; vacío → null. */
export function parseEntero(text: string): number | null {
  const digits = text.replace(/\D/g, '')
  if (!digits) return null
  return Number(digits)
}

const fecha = new Intl.DateTimeFormat('es-PY', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' })
const fechaHora = new Intl.DateTimeFormat('es-PY', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatFecha(value: string | Date | null | undefined) {
  if (!value) return '—'
  return fecha.format(new Date(value))
}

export function formatFechaHora(value: string | Date | null | undefined) {
  if (!value) return '—'
  return fechaHora.format(new Date(value))
}

const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Fecha calendario (YYYY-MM-DD) en Paraguay para un instante dado. */
export function toISODate(value: string | Date = new Date()) {
  return isoDay.format(new Date(value))
}

/** Inicio del día en Paraguay, con offset: "2026-11-05" → "2026-11-05T00:00:00-03:00". */
export function inicioDiaISO(date: string) {
  return `${date}T00:00:00${PY_OFFSET}`
}

/** Inicio del día siguiente: sirve como límite exclusivo de un rango [desde, hasta). */
export function finDiaExclusivoISO(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  return inicioDiaISO(next.toISOString().slice(0, 10))
}

/** Año y mes actuales en Paraguay. */
export function mesActual(now = new Date()) {
  const [anio, mes] = toISODate(now).split('-').map(Number)
  return { anio, mes }
}

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const
