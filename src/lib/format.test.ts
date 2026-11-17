import { describe, expect, it } from 'vitest'
import { finDiaExclusivoISO, formatGs, inicioDiaISO, mesActual, parseEntero, toISODate } from './format'

describe('formatGs', () => {
  it('usa punto como separador de miles, también con 4 dígitos', () => {
    expect(formatGs(350000)).toBe('350.000 Gs')
    expect(formatGs(5000)).toBe('5.000 Gs')
    expect(formatGs(0)).toBe('0 Gs')
  })

  it('muestra importes negativos (a rendir puede ser negativo)', () => {
    expect(formatGs(-25000)).toMatch(/^[-−]25\.000 Gs$/)
  })
})

describe('parseEntero', () => {
  it('ignora separadores y caracteres no numéricos', () => {
    expect(parseEntero('1.250.000')).toBe(1250000)
    expect(parseEntero('45.000 Gs')).toBe(45000)
  })

  it('devuelve null si no hay dígitos', () => {
    expect(parseEntero('')).toBeNull()
    expect(parseEntero('abc')).toBeNull()
  })
})

describe('fechas en hora de Paraguay', () => {
  it('convierte un día en un rango ISO [desde, hasta) con offset', () => {
    expect(inicioDiaISO('2026-11-05')).toBe('2026-11-05T00:00:00-03:00')
    expect(finDiaExclusivoISO('2026-11-05')).toBe('2026-11-06T00:00:00-03:00')
    expect(finDiaExclusivoISO('2026-12-31')).toBe('2027-01-01T00:00:00-03:00')
    expect(finDiaExclusivoISO('2028-02-28')).toBe('2028-02-29T00:00:00-03:00')
  })

  it('calcula la fecha calendario en America/Asuncion, no en UTC', () => {
    // 02:00 UTC del 15 = 23:00 del 14 en Paraguay.
    expect(toISODate('2026-11-15T02:00:00.000Z')).toBe('2026-11-14')
    expect(mesActual(new Date('2026-12-01T01:00:00.000Z'))).toEqual({ anio: 2026, mes: 11 })
  })
})
