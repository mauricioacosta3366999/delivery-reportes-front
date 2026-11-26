import { describe, expect, it } from 'vitest'
import { telefonoParaLlamar, whatsappUrl } from './telefono'

describe('whatsappUrl', () => {
  it('pasa los celulares de Paraguay al formato internacional', () => {
    expect(whatsappUrl('0981 123 456')).toBe('https://wa.me/595981123456')
    expect(whatsappUrl('0991-585-513')).toBe('https://wa.me/595991585513')
    expect(whatsappUrl('981123456')).toBe('https://wa.me/595981123456')
  })

  it('respeta los números que ya traen código de país', () => {
    expect(whatsappUrl('+595 981 123 456')).toBe('https://wa.me/595981123456')
    expect(whatsappUrl('595981123456')).toBe('https://wa.me/595981123456')
    expect(whatsappUrl('00595981123456')).toBe('https://wa.me/595981123456')
    expect(whatsappUrl('+54 9 11 2345 6789')).toBe('https://wa.me/5491123456789')
  })

  it('devuelve null si no parece un teléfono', () => {
    expect(whatsappUrl('llamar a recepción')).toBeNull()
    expect(whatsappUrl('12345')).toBeNull()
  })
})

describe('telefonoParaLlamar', () => {
  it('deja solo dígitos y el + inicial', () => {
    expect(telefonoParaLlamar('0981 123 456')).toBe('0981123456')
    expect(telefonoParaLlamar('+595 981 123 456')).toBe('+595981123456')
    expect(telefonoParaLlamar('sin teléfono')).toBeNull()
  })
})
