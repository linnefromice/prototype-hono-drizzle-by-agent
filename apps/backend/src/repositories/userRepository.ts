import type { User } from 'openapi'

export interface UserRepository {
  create(data: { name: string; avatarUrl?: string | null }): Promise<User>
}
