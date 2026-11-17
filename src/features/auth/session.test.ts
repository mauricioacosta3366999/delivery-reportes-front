import { describe, expect, it } from 'vitest'
import { makeToken, makeUsuario } from '@/test/fixtures'
import { isExpired, sessionStore, tokenExpiresAt } from './session'

describe('session', () => {
  it('lee el exp del JWT', () => {
    const token = makeToken(60)
    expect(tokenExpiresAt(token)).toBeGreaterThan(Date.now())
    expect(isExpired(token)).toBe(false)
    expect(isExpired(makeToken(-1))).toBe(true)
    expect(isExpired('no-es-un-jwt')).toBe(true)
  })

  it('persiste en localStorage y registra el motivo del cierre', () => {
    const usuario = makeUsuario('VENDEDOR')
    sessionStore.set({ token: makeToken(), usuario })
    expect(JSON.parse(localStorage.getItem('delivery-reportes.session') ?? '{}').usuario.nombre).toBe(usuario.nombre)
    sessionStore.clear('expired')
    expect(sessionStore.get()).toEqual({ session: null, lastLogout: 'expired' })
    expect(localStorage.getItem('delivery-reportes.session')).toBeNull()
  })
})
