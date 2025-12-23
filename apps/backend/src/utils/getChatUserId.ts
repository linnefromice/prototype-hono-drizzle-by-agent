import { eq } from 'drizzle-orm'
import { chatUsers } from '../infrastructure/db/schema'
import type { User } from 'better-auth/types'
import type { DbClient } from './dbClient'

/**
 * Get the chat user ID from an auth user
 * This resolves the mapping between auth_user table and users (chat_users) table
 *
 * @param db - Drizzle database instance (D1 or BetterSQLite3)
 * @param authUser - Authenticated user from better-auth session
 * @returns Chat user ID, or throws an error if not found
 */
export async function getChatUserId(
  db: DbClient,
  authUser: User
): Promise<string> {
  // Cast to any to work with both D1 and SQLite databases
  const results = await (db as any)
    .select({ id: chatUsers.id })
    .from(chatUsers)
    .where(eq(chatUsers.authUserId, authUser.id))

  const chatUser = Array.isArray(results) ? results[0] : results

  if (!chatUser) {
    throw new Error(`Chat user not found for auth user ${authUser.id}`)
  }

  return chatUser.id
}
