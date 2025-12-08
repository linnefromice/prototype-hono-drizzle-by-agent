import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { devOnly } from './devOnly'

describe('devOnly middleware', () => {
  let app: Hono
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    app = new Hono()
    app.get('/test', devOnly, c => c.json({ message: 'success' }))
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    vi.restoreAllMocks()
  })

  it('allows request when NODE_ENV is development', async () => {
    process.env.NODE_ENV = 'development'

    const response = await app.request('/test')

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ message: 'success' })
  })

  it('allows request when NODE_ENV is not set (defaults to development)', async () => {
    delete process.env.NODE_ENV

    const response = await app.request('/test')

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ message: 'success' })
  })

  it('blocks request when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production'

    const response = await app.request('/test')

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body).toEqual({
      message: 'This endpoint is only available in development mode',
    })
  })
})
