import { apiRequest } from '@/lib/api/client'

export type FormatoReporte = 'pdf' | 'xlsx'

export interface ReporteQuery {
  anio: number
  mes: number
  vendedorId?: string
  repartidorId?: string
  /** Por defecto PDF (es lo que devuelve la API si no se indica). */
  formato?: FormatoReporte
}

export function nombreReporte({ anio, mes, formato = 'pdf' }: ReporteQuery) {
  return `reporte-mensual-${anio}-${String(mes).padStart(2, '0')}.${formato}`
}

/** Toma el filename de Content-Disposition; si no viene, usa el nombre estándar. */
export function filenameDesdeHeader(header: string | null, fallback: string) {
  const match = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  return match ? decodeURIComponent(match[1]) : fallback
}

/** GET /reportes/mensual devuelve un PDF o un Excel binario; los errores vienen en JSON (apiRequest los convierte en ApiError). */
export async function descargarReporte(query: ReporteQuery) {
  const response = await apiRequest('/reportes/mensual', { query: { ...query } })
  const blob = await response.blob()
  const filename = filenameDesdeHeader(response.headers.get('Content-Disposition'), nombreReporte(query))
  guardarArchivo(blob, filename)
  return filename
}

function guardarArchivo(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Dar tiempo al navegador a iniciar la descarga antes de liberar el blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
