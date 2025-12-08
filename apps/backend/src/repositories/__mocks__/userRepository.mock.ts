import { randomUUID } from 'node:crypto'
import type { User } from 'openapi'
import type { UserRepository } from '../userRepository'

export class MockUserRepository implements UserRepository {
  private users: User[] = []

  async create(data: { name: string; avatarUrl?: string | null }): Promise<User> {
    const user: User = {
      id: randomUUID(),
      name: data.name,
      avatarUrl: data.avatarUrl || null,
      createdAt: new Date().toISOString(),
    }
    this.users.push(user)
    return user
  }

  // Helper method for testing
  getAll(): User[] {
    return this.users
  }

  clear(): void {
    this.users = []
  }
}
