/** Respuesta paginada estándar de la API. */
export interface Paginated<T> {
  datos: T[]
  total: number
  pagina: number
  limite: number
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>
