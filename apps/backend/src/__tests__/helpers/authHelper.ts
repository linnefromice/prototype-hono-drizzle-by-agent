import app from '../../index'
import { db } from '../../infrastructure/db/client'
import { authSession } from '../../infrastructure/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Creates a test user with authentication and returns the session cookie
 * @param username - Username for the test user
 * @param email - Email for the test user
 * @param password - Password for the test user (defaults to 'TestPass123!')
 * @returns Object containing user data and session token
 */
export async function createAuthenticatedUser(
  username: string,
  email: string,
  password: string = 'TestPass123!'
) {
  // Sign up the user
  const signUpRes = await app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password,
      name: username,
    }),
  })

  if (!signUpRes.ok) {
    throw new Error(`Failed to create authenticated user: ${signUpRes.status}`)
  }

  const data = await signUpRes.json()

  // Extract session token from Set-Cookie header
  const setCookieHeader = signUpRes.headers.get('Set-Cookie')
  let sessionToken = ''

  if (setCookieHeader) {
    const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/)
    if (match) {
      sessionToken = match[1]
    }
  }

  // If we couldn't get the token from cookies, fetch it from the database
  if (!sessionToken) {
    const sessions = await db
      .select()
      .from(authSession)
      .where(eq(authSession.userId, data.user.id))
      .limit(1)

    if (sessions.length > 0) {
      sessionToken = sessions[0].token
    }
  }

  return {
    user: data.user,
    sessionToken,
  }
}

/**
 * Creates authentication headers with session cookie
 * @param sessionToken - Session token to include in the cookie
 * @returns Headers object with Cookie header
 */
export function createAuthHeaders(sessionToken: string): Record<string, string> {
  return {
    'Cookie': `better-auth.session_token=${sessionToken}`,
  }
}

/**
 * Performs a sign in and returns the session token
 * @param username - Username to sign in with
 * @param password - Password to sign in with
 * @returns Session token
 */
export async function signInAndGetToken(
  username: string,
  password: string
): Promise<string> {
  const signInRes = await app.request('/api/auth/sign-in/username', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  if (!signInRes.ok) {
    throw new Error(`Failed to sign in: ${signInRes.status}`)
  }

  const data = await signInRes.json()

  // Extract session token from Set-Cookie header
  const setCookieHeader = signInRes.headers.get('Set-Cookie')
  let sessionToken = ''

  if (setCookieHeader) {
    const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/)
    if (match) {
      sessionToken = match[1]
    }
  }

  // If we couldn't get the token from cookies, fetch it from the database
  if (!sessionToken) {
    const sessions = await db
      .select()
      .from(authSession)
      .where(eq(authSession.userId, data.user.id))
      .limit(1)

    if (sessions.length > 0) {
      sessionToken = sessions[0].token
    }
  }

  return sessionToken
}
