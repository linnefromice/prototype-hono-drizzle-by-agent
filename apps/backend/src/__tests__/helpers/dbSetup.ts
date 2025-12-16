import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from '../../infrastructure/db/client'
import path from 'node:path'

/**
 * Apply migrations to the test database
 * This should be called in test setup to ensure the database schema is up to date
 */
export async function applyMigrations() {
  try {
    migrate(db, {
      migrationsFolder: path.join(__dirname, '../../../drizzle'),
    })
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

/**
 * Initialize test database with schema
 * Call this in beforeAll or beforeEach in your test files
 */
export async function setupTestDatabase() {
  await applyMigrations()
}
