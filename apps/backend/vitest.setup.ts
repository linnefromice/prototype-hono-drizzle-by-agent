// Set NODE_ENV for all tests before any modules are loaded
process.env.NODE_ENV = 'test'

// Clear DATABASE_URL to ensure tests use SQLite (better-sqlite3) instead of PostgreSQL
// This prevents Drizzle from trying to connect to PostgreSQL in test environment
delete process.env.DATABASE_URL

// Note: Database setup is handled in individual test files using setupTestDatabase()
// from src/__tests__/helpers/dbSetup.ts because each test uses an in-memory database
