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

    // Note: chatUsers schema has authUserId for Better Auth integration
    // This is a legacy endpoint that creates users without authentication
    // TODO: Migrate to use Better Auth user creation flow
    const [created] = await this.client
      .insert(users)
      .values({
        idAlias: data.idAlias,
        name: data.name,
        avatarUrl: data.avatarUrl || null,
        // authUserId is null for legacy users created without authentication
      })
      .returning()

    return {
      id: created.id,
      idAlias: created.idAlias,
      name: created.name,
      avatarUrl: created.avatarUrl,
      createdAt: created.createdAt,
    }
  }

  async findById(id: string): Promise<User | null> {
    const [found] = await this.client.select().from(users).where(eq(users.id, id))

    if (!found) {
      return null
    }

    return {
      id: found.id,
      idAlias: found.idAlias,
      name: found.name,
      avatarUrl: found.avatarUrl,
      createdAt: found.createdAt,
    }
  }

  async findByIdAlias(idAlias: string): Promise<User | null> {
    const [found] = await this.client
      .select()
      .from(users)
      .where(eq(users.idAlias, idAlias))

    if (!found) {
      return null
    }

    return {
      id: found.id,
      idAlias: found.idAlias,
      name: found.name,
      avatarUrl: found.avatarUrl,
      createdAt: found.createdAt,
    }
  }

  async listAll(): Promise<User[]> {
    const allUsers = await this.client.select().from(users)

    return allUsers.map(user => ({
      id: user.id,
      idAlias: user.idAlias,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    }))
  }

  async isIdAliasAvailable(idAlias: string): Promise<boolean> {
    const existing = await this.findByIdAlias(idAlias)
    return existing === null
  }
}
