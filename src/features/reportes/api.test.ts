import { describe, expect, it } from 'vitest'
import { filenameDesdeHeader, nombreReporte } from './api'

describe('nombre del reporte', () => {
  it('usa el filename de Content-Disposition (formato real de la API)', () => {
    expect(filenameDesdeHeader('attachment; filename="reporte-mensual-2026-11.pdf"', 'x.pdf')).toBe('reporte-mensual-2026-11.pdf')
  })

  it('sin header usa el nombre estándar con mes de dos dígitos', () => {
    expect(filenameDesdeHeader(null, nombreReporte({ anio: 2026, mes: 3 }))).toBe('reporte-mensual-2026-03.pdf')
  })

  it('el Excel usa la extensión .xlsx (CU-16)', () => {
    expect(nombreReporte({ anio: 2026, mes: 11 }, 'xlsx')).toBe('reporte-mensual-2026-11.xlsx')
    expect(filenameDesdeHeader('attachment; filename="reporte-mensual-2026-11.xlsx"', 'x')).toBe('reporte-mensual-2026-11.xlsx')
  })
})
