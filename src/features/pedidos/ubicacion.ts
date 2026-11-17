import type { Coordenadas, Ubicacion } from './types'

/** Punto de retiro único: todos los pedidos salen de acá. */
export const UBICACION_RETIRO: Ubicacion = {
  direccion: 'Depósito central',
  coordenadas: { latitud: -25.413408, longitud: -57.55011 },
}

/** Largo máximo de `direccion` en el backend. */
const MAX_DIRECCION = 500
const NUMERO = String.raw`(-?\d{1,3}(?:\.\d+)?)`

/** Devuelve la URL solo si es http(s): nunca se arma un link con otros esquemas (javascript:, data:…). */
export function parseUrl(texto: string): URL | null {
  try {
    const url = new URL(texto.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function coordenadasValidas(latitud: number, longitud: number): Coordenadas | null {
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) return null
  if (Math.abs(latitud) > 90 || Math.abs(longitud) > 180) return null
  return { latitud, longitud }
}

/**
 * Coordenadas contenidas en un link de Google Maps, si las trae. Los links cortos
 * (maps.app.goo.gl) no las incluyen: se guardan igual y se abren tal cual.
 */
export function coordenadasDeLink(texto: string): Coordenadas | null {
  const url = parseUrl(texto)
  if (!url) return null
  let decoded = url.href
  try {
    decoded = decodeURIComponent(url.href)
  } catch {
    // secuencia % inválida: se busca sobre el href tal cual
  }
  // Pin exacto del lugar (!3dLAT!4dLNG) antes que el centro de la vista (@LAT,LNG).
  for (const pattern of [new RegExp(`!3d${NUMERO}!4d${NUMERO}`), new RegExp(`@${NUMERO},${NUMERO}`)]) {
    const match = decoded.match(pattern)
    if (match) {
      const coords = coordenadasValidas(Number(match[1]), Number(match[2]))
      if (coords) return coords
    }
  }
  for (const param of ['q', 'query', 'll', 'destination', 'daddr', 'center']) {
    const match = url.searchParams.get(param)?.match(new RegExp(`^\\s*${NUMERO}\\s*,\\s*${NUMERO}\\s*$`))
    if (match) {
      const coords = coordenadasValidas(Number(match[1]), Number(match[2]))
      if (coords) return coords
    }
  }
  return null
}

export type EntregaNormalizada = { ok: true; direccion: string; coordenadas?: Coordenadas; esLink: boolean } | { ok: false; error: string }

/**
 * Convierte lo que escribió el vendedor (dirección o link de Maps) en algo que el
 * backend acepta: los links largos se acortan para no superar los 500 caracteres.
 */
export function normalizarEntrega(texto: string): EntregaNormalizada {
  const valor = texto.trim()
  if (!valor) return { ok: false, error: 'Ingresá la dirección o el link de Google Maps' }
  const url = parseUrl(valor)
  if (!url) {
    return valor.length > MAX_DIRECCION ? { ok: false, error: `Máximo ${MAX_DIRECCION} caracteres` } : { ok: true, direccion: valor, esLink: false }
  }

  const coordenadas = coordenadasDeLink(valor) ?? undefined
  let direccion = valor
  if (direccion.length > MAX_DIRECCION) {
    direccion = coordenadas
      ? `https://www.google.com/maps?q=${coordenadas.latitud},${coordenadas.longitud}`
      : `${url.origin}${url.pathname.split('/data=')[0]}`
  }
  if (direccion.length > MAX_DIRECCION) {
    return { ok: false, error: 'El link es demasiado largo. En Google Maps usá "Compartir → Copiar vínculo".' }
  }
  return { ok: true, direccion, coordenadas, esLink: true }
}

/** Link para abrir la ubicación: el propio link de Maps si lo es; si no, una búsqueda. */
export function enlaceMapa(ubicacion: Ubicacion) {
  const url = parseUrl(ubicacion.direccion)
  if (url) return url.href
  const query = ubicacion.coordenadas ? `${ubicacion.coordenadas.latitud},${ubicacion.coordenadas.longitud}` : ubicacion.direccion
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** Texto a mostrar: un link largo no se imprime entero. */
export function textoUbicacion(ubicacion: Ubicacion) {
  return parseUrl(ubicacion.direccion) ? 'Abrir ubicación en Google Maps' : ubicacion.direccion
}
