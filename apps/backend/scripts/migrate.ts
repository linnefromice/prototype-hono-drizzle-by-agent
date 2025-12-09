import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import * as schema from '../src/infrastructure/db/schema'

const sqlite = new Database('dev.db')
sqlite.pragma('foreign_keys = ON')

const db = drizzle(sqlite, { schema })

console.log('Running migrations...')
migrate(db, { migrationsFolder: './drizzle' })
console.log('Migrations complete!')

sqlite.close()
