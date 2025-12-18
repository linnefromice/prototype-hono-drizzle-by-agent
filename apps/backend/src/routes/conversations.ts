import { Hono } from 'hono'
import { ZodError } from 'zod'
import {
  AddParticipantRequestSchema,
  CreateConversationRequestSchema,
  SendMessageRequestSchema,
  UpdateConversationReadRequestSchema,
} from 'openapi'
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

  if (error instanceof ZodError) {
    return c.json({ message: error.errors[0].message }, 400)
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
    const conversations = await chatUsecase.listConversationsForUser(userId)
    return c.json(conversations)
  } catch (error) {
    return handleError(error, c)
  }
})

router.post('/', requireAuth, async c => {
  try {
    const db = await getDbClient(c)
    const chatUsecase = new ChatUsecase(new DrizzleChatRepository(db))
    const payload = CreateConversationRequestSchema.parse(await c.req.json())
    const created = await chatUsecase.createConversation(payload)
    return c.json(created, 201)
  } catch (error) {
    return handleError(error, c)
  }
})

router.get('/:id', requireAuth, async c => {
  const id = c.req.param('id')
  try {
    const db = await getDbClient(c)
    const chatUsecase = new ChatUsecase(new DrizzleChatRepository(db))
    const conversation = await chatUsecase.getConversation(id)
    return c.json(conversation)
  } catch (error) {
    return handleError(error, c)
  }
})

router.post('/:id/participants', requireAuth, async c => {
  const conversationId = c.req.param('id')

  try {
    const db = await getDbClient(c)
    const chatUsecase = new ChatUsecase(new DrizzleChatRepository(db))
    const payload = AddParticipantRequestSchema.parse(await c.req.json())
    const participant = await chatUsecase.addParticipant(conversationId, payload)
    await chatUsecase.createSystemMessage(conversationId, {
      senderUserId: null,
      systemEvent: 'join',
      text: `${payload.userId} joined`,
    })
    return c.json(participant, 201)
  } catch (error) {
    return handleError(error, c)
  }
})

router.delete('/:id/participants/:userId', requireAuth, async c => {
  const conversationId = c.req.param('id')
  const userId = c.req.param('userId')
  try {
    const db = await getDbClient(c)
    const chatUsecase = new ChatUsecase(new DrizzleChatRepository(db))
    const participant = await chatUsecase.markParticipantLeft(conversationId, userId)
    return c.json(participant)
  } catch (error) {
    return handleError(error, c)
  }
})

router.get('/:id/messages', requireAuth, async c => {
  const conversationId = c.req.param('id')
  const authUser = c.get('authUser')
  const before = c.req.query('before')
  const limitParam = c.req.query('limit')
  const parsedLimit = limitParam ? Number(limitParam) : undefined
  const limit = parsedLimit && !Number.isNaN(parsedLimit) ? parsedLimit : undefined

  try {
    const db = await getDbClient(c)
    const userId = await getChatUserId(db, authUser!)
    const chatUsecase = new ChatUsecase(new DrizzleChatRepository(db))
    const messages = await chatUsecase.listMessages(conversationId, userId, { before, limit })
    return c.json(messages)
  } catch (error) {
    return handleError(error, c)
  }
})

router.post('/:id/messages', requireAuth, async c => {
  const conversationId = c.req.param('id')
  const authUser = c.get('authUser')

  try {
    const db = await getDbClient(c)
    const userId = await getChatUserId(db, authUser!)
    const chatUsecase = new ChatUsecase(new DrizzleChatRepository(db))
    const body = await c.req.json()

    // Override senderUserId with authenticated user's ID
    const payload = SendMessageRequestSchema.parse({
      ...body,
      senderUserId: userId
    })
    const created = await chatUsecase.sendMessage(conversationId, payload)
    return c.json(created, 201)
  } catch (error) {
    return handleError(error, c)
  }
})

router.post('/:id/read', requireAuth, async c => {
  const conversationId = c.req.param('id')
  const authUser = c.get('authUser')

  try {
    const db = await getDbClient(c)
    const userId = await getChatUserId(db, authUser!)
    const chatUsecase = new ChatUsecase(new DrizzleChatRepository(db))
    const body = await c.req.json()

    // Override userId with authenticated user's ID
    const payload = UpdateConversationReadRequestSchema.parse({
      ...body,
      userId: userId
    })
    const read = await chatUsecase.markConversationRead(conversationId, payload)
    return c.json({ status: 'ok', read })
  } catch (error) {
    return handleError(error, c)
  }
})

router.get('/:id/unread-count', requireAuth, async c => {
  const conversationId = c.req.param('id')
  const authUser = c.get('authUser')

  try {
    const db = await getDbClient(c)
    const userId = await getChatUserId(db, authUser!)
    const chatUsecase = new ChatUsecase(new DrizzleChatRepository(db))
    const unreadCount = await chatUsecase.countUnread(conversationId, userId)
    return c.json({ unreadCount })
  } catch (error) {
    return handleError(error, c)
  }
})

export default router
