import type { User } from 'openapi'

export interface UserRepository {
  create(data: { idAlias: string; name: string; avatarUrl?: string | null }): Promise<User>
  findById(id: string): Promise<User | null>
  findByIdAlias(idAlias: string): Promise<User | null>
  listAll(): Promise<User[]>
  isIdAliasAvailable(idAlias: string): Promise<boolean>
}
