import type { Auth } from './config'

/**
 * Better Auth user type
 * Inferred from the auth instance
 */
export type AuthUser = Auth['$Infer']['Session']['user']

/**
 * Better Auth session type
 * Inferred from the auth instance
 */
export type AuthSession = Auth['$Infer']['Session']['session']

/**
 * Context variables for authenticated requests
 * Used in Hono middleware to store auth information
 */
export type AuthVariables = {
  authUser: AuthUser | null
  authSession: AuthSession | null
}
