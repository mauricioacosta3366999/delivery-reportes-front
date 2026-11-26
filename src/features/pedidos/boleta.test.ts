import { describe, expect, it } from 'vitest'
import { MAX_BOLETA_BYTES, prepararBoleta } from './boleta'

describe('prepararBoleta', () => {
  it('un PDF se sube tal cual', async () => {
    const pdf = new File(['%PDF-1.7'], 'boleta.pdf', { type: 'application/pdf' })
    await expect(prepararBoleta(pdf)).resolves.toEqual({ archivo: pdf, contentType: 'application/pdf' })
  })

  it('rechaza un PDF de más de 5 MB antes de subirlo', async () => {
    const grande = new File([new Uint8Array(MAX_BOLETA_BYTES + 1)], 'boleta.pdf', { type: 'application/pdf' })
    await expect(prepararBoleta(grande)).rejects.toThrow('supera el máximo de 5 MB')
  })

  it('rechaza archivos que no son fotos ni PDF', async () => {
    const texto = new File(['hola'], 'notas.txt', { type: 'text/plain' })
    await expect(prepararBoleta(texto)).rejects.toThrow('Elegí una foto')
  })
})
