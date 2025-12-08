import { config } from 'dotenv'

export type EnvConfig = {
  DATABASE_URL: string
  PORT: number
  NODE_ENV: 'development' | 'production'
}

export const loadEnvConfig = (): EnvConfig => {
  config()

  const databaseUrl = process.env.DATABASE_URL
  const port = process.env.PORT ? Number(process.env.PORT) : 3000
  const nodeEnv = process.env.NODE_ENV || 'development'

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  if (!['development', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development or production')
  }

  return {
    DATABASE_URL: databaseUrl,
    PORT: port,
    NODE_ENV: nodeEnv as 'development' | 'production',
  }
}
