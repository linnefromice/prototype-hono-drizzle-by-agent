import type { Context, Next } from 'hono'

export const devOnly = async (c: Context, next: Next) => {
  // In Workers environment (Cloudflare), always allow access
  // Workers can be detected by checking for c.env (bindings)
  if (c.env) {
    // This is Workers environment - allow access
    await next()
    return
  }

  // In Local Node.js environment, check NODE_ENV
  const nodeEnv = process.env.NODE_ENV

  // If NODE_ENV is explicitly set to production in Local environment, deny access
  if (nodeEnv === 'production') {
    return c.json(
      { message: 'This endpoint is only available in development mode' },
      403
    )
  }

  // Otherwise allow (development or undefined)
  await next()
}
