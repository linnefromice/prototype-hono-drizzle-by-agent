import { eq } from 'drizzle-orm'
import type { User } from 'openapi'
import { users } from '../infrastructure/db/schema'
import type { UserRepository } from './userRepository'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

type DbClient = DrizzleD1Database<any> | BetterSQLite3Database<any>

export class DrizzleUserRepository implements UserRepository {
  private readonly client: DbClient

  constructor(client?: DbClient) {
    // Client must be provided (will be injected from context)
    if (!client) {
      throw new Error('Database client is required')
    }
    this.client = client
  }

  async create(data: { idAlias: string; name: string; avatarUrl?: string | null }): Promise<User> {
    // Validate idAlias availability before insertion
    const available = await this.isIdAliasAvailable(data.idAlias)
    if (!available) {
      throw new Error(`ID Alias "${data.idAlias}" is already in use`)
    }

    const [created] = await this.client
      .insert(users)
      .values({
        idAlias: data.idAlias,
        name: data.name,
        avatarUrl: data.avatarUrl || null,
      })
      .returning()

    // SQLite stores createdAt as ISO 8601 string, no need to convert
    return created
  }

  async findById(id: string): Promise<User | null> {
    const [found] = await this.client.select().from(users).where(eq(users.id, id))

    if (!found) {
      return null
    }

    // SQLite stores createdAt as ISO 8601 string, no need to convert
    return found
  }

  async findByIdAlias(idAlias: string): Promise<User | null> {
    const [found] = await this.client
      .select()
      .from(users)
      .where(eq(users.idAlias, idAlias))

    return found || null
  }

  async listAll(): Promise<User[]> {
    const allUsers = await this.client.select().from(users)

    // SQLite stores createdAt as ISO 8601 string, no need to convert
    return allUsers
  }

  async isIdAliasAvailable(idAlias: string): Promise<boolean> {
    const existing = await this.findByIdAlias(idAlias)
    return existing === null
  }
}
