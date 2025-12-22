import type { UserRepository } from '../repositories/userRepository'
import { HttpError } from '../utils/errors'
import {
  HTTP_ERRORS,
  required,
  userNotFoundByIdAlias,
} from '../utils/errorMessages'

export class UserUsecase {
  constructor(private readonly repo: UserRepository) {}

  async createUser(data: { idAlias: string; name: string; avatarUrl?: string | null }) {
    if (!data.name || data.name.trim().length === 0) {
      throw HTTP_ERRORS.required('name')
    }

    if (!data.idAlias || data.idAlias.trim().length === 0) {
      throw HTTP_ERRORS.required('idAlias')
    }

    return this.repo.create({
      idAlias: data.idAlias.trim(),
      name: data.name.trim(),
      avatarUrl: data.avatarUrl,
    })
  }

  async getUserById(id: string) {
    const user = await this.repo.findById(id)

    if (!user) {
      throw HTTP_ERRORS.notFound('User')
    }

    return user
  }

  async getUserByIdAlias(idAlias: string) {
    const user = await this.repo.findByIdAlias(idAlias)

    if (!user) {
      throw new HttpError(404, userNotFoundByIdAlias(idAlias))
    }

    return user
  }

  async listAllUsers() {
    return this.repo.listAll()
  }
}
