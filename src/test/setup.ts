import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { sessionStore } from '@/features/auth/session'
import { server } from './server'

// jsdom no implementa scrollTo.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  sessionStore.clear('manual')
  localStorage.clear()
})
afterAll(() => server.close())
