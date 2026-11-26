import { apiRequest } from '@/lib/api/client'

export interface ReporteQuery {
  anio: number
  mes: number
  vendedorId?: string
  repartidorId?: string
}

/** PDF (por defecto en la API) o planilla Excel (CU-16). */
export type FormatoReporte = 'pdf' | 'xlsx'

export function nombreReporte({ anio, mes }: ReporteQuery, formato: FormatoReporte = 'pdf') {
  return `reporte-mensual-${anio}-${String(mes).padStart(2, '0')}.${formato}`
}

/** Toma el filename de Content-Disposition; si no viene, usa el nombre estándar. */
export function filenameDesdeHeader(header: string | null, fallback: string) {
  const match = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  return match ? decodeURIComponent(match[1]) : fallback
}

/** GET /reportes/mensual devuelve un PDF o un .xlsx binario; los errores vienen en JSON (apiRequest los convierte en ApiError). */
export async function descargarReporte(query: ReporteQuery, formato: FormatoReporte = 'pdf') {
  // Sin `formato` la API devuelve PDF: solo se envía para Excel.
  const response = await apiRequest('/reportes/mensual', { query: { ...query, ...(formato === 'xlsx' ? { formato } : {}) } })
  const blob = await response.blob()
  const filename = filenameDesdeHeader(response.headers.get('Content-Disposition'), nombreReporte(query, formato))
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
