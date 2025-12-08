import { describe, expect, it, beforeAll } from 'vitest'
import app from '../app'

describe('GET /health', () => {
  beforeAll(() => {
    // Set NODE_ENV for tests
    process.env.NODE_ENV = 'development'
  })

  it('responds with ok status', async () => {
    const response = await app.request('/health')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
