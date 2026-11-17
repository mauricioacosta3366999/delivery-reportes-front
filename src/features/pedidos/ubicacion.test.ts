import { describe, expect, it } from 'vitest'
import { coordenadasDeLink, enlaceMapa, normalizarEntrega, parseUrl, textoUbicacion } from './ubicacion'

describe('coordenadasDeLink', () => {
  it('prefiere el pin exacto (!3d!4d) sobre el centro de la vista (@)', () => {
    const link = 'https://www.google.com/maps/place/Tobat%C3%AD/@-25.2500000,-57.0800000,15z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-25.2567891!4d-57.0812345'
    expect(coordenadasDeLink(link)).toEqual({ latitud: -25.2567891, longitud: -57.0812345 })
  })

  it('lee @lat,lng y los parámetros q/query', () => {
    expect(coordenadasDeLink('https://www.google.com/maps/@-25.413408,-57.55011,17z')).toEqual({ latitud: -25.413408, longitud: -57.55011 })
    expect(coordenadasDeLink('https://maps.google.com/?q=-25.3,-57.6')).toEqual({ latitud: -25.3, longitud: -57.6 })
    expect(coordenadasDeLink('https://www.google.com/maps/search/?api=1&query=-25.3,-57.6')).toEqual({ latitud: -25.3, longitud: -57.6 })
  })

  it('los links cortos no traen coordenadas', () => {
    expect(coordenadasDeLink('https://maps.app.goo.gl/AbCdEf123')).toBeNull()
  })

  it('ignora coordenadas fuera de rango', () => {
    expect(coordenadasDeLink('https://maps.google.com/?q=-125.3,-57.6')).toBeNull()
  })
})

describe('normalizarEntrega', () => {
  it('una dirección de texto queda igual', () => {
    expect(normalizarEntrega('  Av. Principal 123, Luque ')).toEqual({ ok: true, direccion: 'Av. Principal 123, Luque', esLink: false })
  })

  it('un link corto se guarda tal cual', () => {
    expect(normalizarEntrega('https://maps.app.goo.gl/AbCdEf123')).toEqual({ ok: true, direccion: 'https://maps.app.goo.gl/AbCdEf123', esLink: true })
  })

  it('un link largo con coordenadas se acorta a ?q=lat,lng (el backend admite 500 caracteres)', () => {
    const largo = `https://www.google.com/maps/place/Lugar/@-25.25,-57.08,15z/data=!3m1!4b1${'!9m1'.repeat(150)}!3d-25.2567891!4d-57.0812345`
    const result = normalizarEntrega(largo)
    expect(result).toEqual({
      ok: true,
      direccion: 'https://www.google.com/maps?q=-25.2567891,-57.0812345',
      coordenadas: { latitud: -25.2567891, longitud: -57.0812345 },
      esLink: true,
    })
  })

  it('vacío o texto demasiado largo es un error', () => {
    expect(normalizarEntrega('   ').ok).toBe(false)
    expect(normalizarEntrega('x'.repeat(501)).ok).toBe(false)
  })
})

describe('mostrar y abrir ubicaciones', () => {
  it('solo trata como link http(s)', () => {
    expect(parseUrl('javascript:alert(1)')).toBeNull()
    expect(parseUrl('Calle 1')).toBeNull()
  })

  it('un link se abre tal cual y no se imprime entero', () => {
    const ubicacion = { direccion: 'https://maps.app.goo.gl/AbCdEf123' }
    expect(enlaceMapa(ubicacion)).toBe('https://maps.app.goo.gl/AbCdEf123')
    expect(textoUbicacion(ubicacion)).toBe('Abrir ubicación en Google Maps')
  })

  it('una dirección con coordenadas busca por coordenadas', () => {
    expect(enlaceMapa({ direccion: 'Depósito central', coordenadas: { latitud: -25.413408, longitud: -57.55011 } })).toBe(
      'https://www.google.com/maps/search/?api=1&query=-25.413408%2C-57.55011',
    )
  })
})
