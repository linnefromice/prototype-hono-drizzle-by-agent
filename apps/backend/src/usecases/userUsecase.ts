import type { UserRepository } from '../repositories/userRepository'

export class UserUsecase {
  constructor(private readonly repo: UserRepository) {}

  async createUser(data: { name: string; avatarUrl?: string | null }) {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('User name is required')
    }

    return this.repo.create({
      name: data.name.trim(),
      avatarUrl: data.avatarUrl,
    })
  }
}
