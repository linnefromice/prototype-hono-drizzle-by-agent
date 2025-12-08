import type { Context, Next } from 'hono'
import { loadEnvConfig } from '../utils/env'

export const devOnly = async (c: Context, next: Next) => {
  const env = loadEnvConfig()

  if (env.NODE_ENV !== 'development') {
    return c.json(
      { message: 'This endpoint is only available in development mode' },
      403
    )
  }

  await next()
}
