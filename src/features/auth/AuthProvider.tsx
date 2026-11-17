import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { configureApi } from '@/lib/api/client'
import { authApi, type LoginInput, type RegisterInput } from './api'
import { AuthContext, type AuthContextValue } from './context'
import { sessionStore, tokenExpiresAt } from './session'

configureApi({
  getToken: sessionStore.getToken,
  onUnauthorized: () => sessionStore.clear('expired'),
})


export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(sessionStore.subscribe, sessionStore.get)
  const queryClient = useQueryClient()
  const token = state.session?.token ?? null

  // Sesión compartida entre pestañas.
  useEffect(() => {
    const onStorage = () => sessionStore.syncFromStorage()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Al cambiar de usuario (o cerrar sesión) no debe quedar data cacheada del anterior.
  useEffect(() => {
    if (!token) queryClient.clear()
  }, [token, queryClient])

  // Logout automático al vencer el JWT (no hay refresh token).
  useEffect(() => {
    if (!token) return
    const expiresAt = tokenExpiresAt(token)
    if (!expiresAt) return
    const timer = window.setTimeout(() => sessionStore.clear('expired'), Math.max(0, expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [token])

  // Al iniciar, refresca el usuario (rol/estado pueden haber cambiado). Un 401 cierra la sesión.
  useEffect(() => {
    if (!token) return
    authApi
      .me()
      .then((usuario) => sessionStore.updateUsuario(usuario))
      .catch(() => {})
    // Solo al montar con la sesión guardada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    queryClient.clear()
    const session = await authApi.login(input)
    sessionStore.set(session)
    return session.usuario
  }, [queryClient])

  const register = useCallback(async (input: RegisterInput) => {
    queryClient.clear()
    const session = await authApi.register(input)
    sessionStore.set(session)
    return session.usuario
  }, [queryClient])

  const logout = useCallback(() => sessionStore.clear('manual'), [])

  const value = useMemo<AuthContextValue>(
    () => ({ usuario: state.session?.usuario ?? null, lastLogout: state.lastLogout, login, register, logout }),
    [state, login, register, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
