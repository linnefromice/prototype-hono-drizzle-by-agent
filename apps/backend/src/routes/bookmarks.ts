import { Hono } from 'hono'
import { DrizzleChatRepository } from '../repositories/drizzleChatRepository'
import { ChatUsecase } from '../usecases/chatUsecase'
import { HttpError } from '../utils/errors'
import { getDbClient } from '../utils/dbClient'
import { getChatUserId } from '../utils/getChatUserId'
import { requireAuth } from '../middleware/requireAuth'
import type { Env } from '../infrastructure/db/client.d1'
import type { AuthVariables } from '../infrastructure/auth'

const router = new Hono<{
  Bindings: Env
  Variables: AuthVariables
}>()

const handleError = (error: unknown, c: any) => {
  if (error instanceof HttpError) {
    return c.json({ message: error.message }, error.status)
  }

  // Log unexpected errors
  console.error('Unexpected error:', error)

  // Return a generic error response
  const message = error instanceof Error ? error.message : 'Internal Server Error'
  return c.json({ message }, 500)
}

router.get('/', requireAuth, async c => {
  const authUser = c.get('authUser')

  try {
    const db = await getDbClient(c)
    const userId = await getChatUserId(db, authUser!)
    const chatUsecase = new ChatUsecase(new DrizzleChatRepository(db))
    const bookmarks = await chatUsecase.listBookmarks(userId)
    return c.json(bookmarks)
  } catch (error) {
    return handleError(error, c)
  }
})

export default router
