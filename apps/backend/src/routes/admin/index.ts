import { Hono } from 'hono'
import { seedAuthUsersByAppUsers } from './seed'
import type { Env } from '../../infrastructure/db/client.d1'
import type { AuthVariables } from '../../infrastructure/auth'

const router = new Hono<{
  Bindings: Env
  Variables: AuthVariables
}>()

router.post('/seed-auth-users-by-app-users', seedAuthUsersByAppUsers)

export default router
