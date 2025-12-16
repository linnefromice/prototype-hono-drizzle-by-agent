import { Hono } from 'hono'
import { CreateUserRequestSchema } from 'openapi'
import { ZodError } from 'zod'
import { DrizzleChatRepository } from '../repositories/drizzleChatRepository'
import { DrizzleUserRepository } from '../repositories/drizzleUserRepository'
import { ChatUsecase } from '../usecases/chatUsecase'
import { UserUsecase } from '../usecases/userUsecase'
import { HttpError } from '../utils/errors'
import { devOnly } from '../middleware/devOnly'
import { getDbClient } from '../utils/dbClient'

const router = new Hono()

const handleError = (error: unknown, c: any) => {
  if (error instanceof HttpError) {
    return c.json({ message: error.message }, error.status)
  }

  if (error instanceof ZodError) {
    return c.json({ message: error.errors[0].message }, 400)
  }

  // Log unexpected errors
  console.error('Unexpected error:', error)

  // Return a generic error response
  const message = error instanceof Error ? error.message : 'Internal Server Error'
  return c.json({ message }, 500)
}

router.get('/', devOnly, async c => {
  try {
    const db = await getDbClient(c)
    const userUsecase = new UserUsecase(new DrizzleUserRepository(db))
    const users = await userUsecase.listAllUsers()
    return c.json(users)
  } catch (error) {
    return handleError(error, c)
  }
})

router.post('/', devOnly, async c => {
  try {
    const db = await getDbClient(c)
    const userUsecase = new UserUsecase(new DrizzleUserRepository(db))
    const body = await c.req.json()
    const payload = CreateUserRequestSchema.parse(body)

    const created = await userUsecase.createUser({
      idAlias: payload.idAlias,
      name: payload.name,
      avatarUrl: payload.avatarUrl,
    })
    return c.json(created, 201)
  } catch (error) {
    return handleError(error, c)
  }
})

router.post('/login', async c => {
  try {
    const db = await getDbClient(c)
    const userUsecase = new UserUsecase(new DrizzleUserRepository(db))
    const body = await c.req.json()
    const { idAlias } = body

    if (!idAlias || typeof idAlias !== 'string') {
      return c.json({ message: 'idAlias is required' }, 400)
    }

    const user = await userUsecase.getUserByIdAlias(idAlias)
    return c.json(user)
  } catch (error) {
    return handleError(error, c)
  }
})

router.get('/:id', async c => {
  const userId = c.req.param('id')

  try {
    const db = await getDbClient(c)
    const userUsecase = new UserUsecase(new DrizzleUserRepository(db))
    const user = await userUsecase.getUserById(userId)
    return c.json(user)
  } catch (error) {
    return handleError(error, c)
  }
})

router.get('/:id/bookmarks', async c => {
  const userId = c.req.param('id')

  try {
    const db = await getDbClient(c)
    const chatUsecase = new ChatUsecase(new DrizzleChatRepository(db))
    const bookmarks = await chatUsecase.listBookmarks(userId)
    return c.json(bookmarks)
  } catch (error) {
    return handleError(error, c)
  }
})

export default router
