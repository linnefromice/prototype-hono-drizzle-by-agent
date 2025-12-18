import { defineConfig } from 'drizzle-kit'

// Clear DATABASE_URL if it's set to prevent Drizzle Kit from using PostgreSQL
// This project uses SQLite for local development and Cloudflare D1 for production
if (process.env.DATABASE_URL) {
  delete process.env.DATABASE_URL
}

export default defineConfig({
  schema: './src/infrastructure/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  // Always use SQLite for local development and testing
  dbCredentials: {
    url: process.env.NODE_ENV === 'test' ? ':memory:' : 'dev.db',
  },
})
