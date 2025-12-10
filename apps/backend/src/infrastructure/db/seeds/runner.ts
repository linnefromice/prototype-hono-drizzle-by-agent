import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { db } from '../client'
import { sql } from 'drizzle-orm'
import { loadEnvConfig } from '../../../utils/env'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Executes SQL seed files for local development
 * Uses the same seed data as D1 environments for consistency
 */
export async function runSeeds() {
  const env = loadEnvConfig()

  // Only run in development mode
  if (env.NODE_ENV !== 'development') {
    console.log('⏭️  Skipping seed execution (not in development mode)')
    return
  }

  try {
    // Check if data already exists
    const existingUsers = await db.all<{ count: number }>(sql`SELECT COUNT(*) as count FROM users`)
    const userCount = existingUsers[0]?.count ?? 0

    if (userCount > 0) {
      console.log('ℹ️  Database already contains data, skipping seed')
      return
    }

    // Read and execute seed file
    const seedFilePath = join(__dirname, '../../../../drizzle/seeds/001_initial_data.sql')
    const seedSQL = readFileSync(seedFilePath, 'utf-8')

    // Split by semicolons and execute each statement
    const statements = seedSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📦 Executing seed file: 001_initial_data.sql`)

    for (const statement of statements) {
      await db.run(sql.raw(statement))
    }

    console.log(`✅ Successfully seeded database with initial data`)

    // Log what was seeded
    const users = await db.all<{ count: number }>(sql`SELECT COUNT(*) as count FROM users`)
    const conversations = await db.all<{ count: number }>(sql`SELECT COUNT(*) as count FROM conversations`)
    const messages = await db.all<{ count: number }>(sql`SELECT COUNT(*) as count FROM messages`)

    console.log(`   - Users: ${users[0]?.count ?? 0}`)
    console.log(`   - Conversations: ${conversations[0]?.count ?? 0}`)
    console.log(`   - Messages: ${messages[0]?.count ?? 0}`)
  } catch (error) {
    console.error('❌ Failed to run seeds:', error)
    throw error
  }
}
