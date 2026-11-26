import { apiFetch } from '@/lib/api/client'
import type { Pedido } from './types'

/** Tipos que acepta la API (el Content-Type queda firmado en la URL de subida). */
export const TIPOS_BOLETA = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export type TipoBoleta = (typeof TIPOS_BOLETA)[number]
/** Máximo por defecto de la API (BOLETA_MAX_BYTES). */
export const MAX_BOLETA_BYTES = 5 * 1024 * 1024
/** Lado mayor de la foto comprimida: alcanza para leer la boleta y pesa ~300-600 KB. */
const LADO_MAXIMO = 2000

export class BoletaError extends Error {}

export interface UrlSubida {
  url: string
  key: string
  metodo: 'PUT'
  headers: Record<string, string>
  expiraEn: string
}

export interface UrlLectura {
  url: string
  contentType: string
  expiraEn: string
}

export const boletaApi = {
  pedirUrl: (id: string, body: { contentType: TipoBoleta; tamano: number }) =>
    apiFetch<UrlSubida>(`/pedidos/${id}/boleta/url-subida`, { method: 'POST', body }),
  confirmar: (id: string, key: string) => apiFetch<Pedido>(`/pedidos/${id}/boleta`, { method: 'PATCH', body: { key } }),
  ver: (id: string) => apiFetch<UrlLectura>(`/pedidos/${id}/boleta`),
}

/**
 * PUT directo a R2 con la URL firmada: sin el token de la API y con exactamente los headers
 * que devolvió la API. Devuelve el status para que quien llama pueda reintentar un 403 (URL vencida).
 */
export async function subirAR2({ url, metodo, headers }: UrlSubida, archivo: Blob) {
  const response = await fetch(url, { method: metodo, headers, body: archivo })
  return response.status
}

function cargarImagen(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode'))
    }
    img.src = url
  })
}

function aJpeg(img: HTMLImageElement, lado: number, calidad: number) {
  const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * escala)
  canvas.height = Math.round(img.naturalHeight * escala)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new BoletaError('Tu navegador no pudo procesar la foto. Probá con otra imagen.')
  // Fondo blanco: un PNG con transparencia no queda negro al pasarlo a JPEG.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new BoletaError('No se pudo comprimir la foto.'))), 'image/jpeg', calidad),
  )
}

/**
 * Deja el archivo listo para subir: los PDF van tal cual (si no superan el máximo); las fotos
 * (incluidas HEIC del iPhone, si el navegador las puede abrir) se pasan a JPEG comprimido.
 */
export async function prepararBoleta(file: File): Promise<{ archivo: Blob; contentType: TipoBoleta }> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_BOLETA_BYTES) throw new BoletaError('El PDF supera el máximo de 5 MB.')
    return { archivo: file, contentType: 'application/pdf' }
  }
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new BoletaError('Elegí una foto (JPG, PNG o WebP) o un PDF.')
  }
  let img: HTMLImageElement
  try {
    img = await cargarImagen(file)
  } catch {
    throw new BoletaError('No pudimos abrir esa imagen (¿formato HEIC?). Probá sacando la foto desde la cámara o elegí un JPG.')
  }
  try {
    let archivo = await aJpeg(img, LADO_MAXIMO, 0.82)
    if (archivo.size > MAX_BOLETA_BYTES) archivo = await aJpeg(img, 1400, 0.7)
    if (archivo.size > MAX_BOLETA_BYTES) throw new BoletaError('La foto es demasiado pesada aun comprimida. Probá con otra.')
    return { archivo, contentType: 'image/jpeg' }
  } finally {
    URL.revokeObjectURL(img.src)
  }
}
