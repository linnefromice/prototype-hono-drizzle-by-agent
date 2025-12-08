import { describe, expect, it, beforeEach } from 'vitest'
import { MockUserRepository } from '../repositories/__mocks__/userRepository.mock'
import { UserUsecase } from './userUsecase'

describe('UserUsecase', () => {
  let repo: MockUserRepository
  let usecase: UserUsecase

  beforeEach(() => {
    repo = new MockUserRepository()
    usecase = new UserUsecase(repo)
  })

  describe('createUser', () => {
    it('creates a user with name and avatarUrl successfully', async () => {
      const user = await usecase.createUser({
        name: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      })

      expect(user.name).toBe('John Doe')
      expect(user.avatarUrl).toBe('https://example.com/avatar.jpg')
      expect(user.id).toBeDefined()
      expect(user.createdAt).toBeDefined()

      const allUsers = repo.getAll()
      expect(allUsers).toHaveLength(1)
      expect(allUsers[0].id).toBe(user.id)
    })

    it('creates a user with only name (no avatarUrl)', async () => {
      const user = await usecase.createUser({
        name: 'Jane Smith',
      })

      expect(user.name).toBe('Jane Smith')
      expect(user.avatarUrl).toBeNull()
      expect(user.id).toBeDefined()
    })

    it('trims whitespace from user name', async () => {
      const user = await usecase.createUser({
        name: '  Trimmed Name  ',
      })

      expect(user.name).toBe('Trimmed Name')
    })

    it('throws an error when name is empty string', async () => {
      await expect(
        usecase.createUser({
          name: '',
        })
      ).rejects.toThrow('User name is required')
    })

    it('throws an error when name is only whitespace', async () => {
      await expect(
        usecase.createUser({
          name: '   ',
        })
      ).rejects.toThrow('User name is required')
    })

    it('handles null avatarUrl', async () => {
      const user = await usecase.createUser({
        name: 'User Without Avatar',
        avatarUrl: null,
      })

      expect(user.name).toBe('User Without Avatar')
      expect(user.avatarUrl).toBeNull()
    })
  })
})
