# Implementation Plan: Dev-Mode User Creation API

## Overview

Add a `POST /users` endpoint that creates users, protected to only work in development mode (`NODE_ENV=development`).

## Current State

- ✅ No explicit dev mode configuration (need to add `NODE_ENV` support)
- ✅ No user creation API exists (only `GET /users/:id/bookmarks`)
- ✅ Existing architecture: Repository → UseCase → Route (3-layer pattern)
- ✅ Users schema exists in `apps/backend/src/infrastructure/db/schema.ts`
- ✅ OpenAPI-driven type generation with Orval

---

## Implementation Steps

### 1. Environment Configuration

**File to modify:** `apps/backend/src/utils/env.ts`

**Changes:**
- Add `NODE_ENV` to `EnvConfig` type (optional, defaults to 'development')
- Update `loadEnvConfig()` to read and validate NODE_ENV
- Only 'development' and 'production' modes (test mode not currently needed)

```typescript
export type EnvConfig = {
  DATABASE_URL: string
  PORT: number
  NODE_ENV: 'development' | 'production'
}

// In loadEnvConfig():
const nodeEnv = process.env.NODE_ENV || 'development'
if (!['development', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development or production')
}

return {
  DATABASE_URL: databaseUrl,
  PORT: port,
  NODE_ENV: nodeEnv as 'development' | 'production',
}
```

**Rationale:**
- Test mode is not currently used (tests use `.env.test` for DATABASE_URL switching)
- YAGNI principle - can add test mode later if needed
- Simpler configuration with fewer states

---

### 2. OpenAPI Schema

**File to modify:** `packages/openapi/openapi.yaml`

**Changes:**

Add POST /users endpoint definition (before components section):

```yaml
  /users:
    post:
      summary: Create user (development only)
      description: Creates a new user. Only available in development mode.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: Created user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '403':
          description: Forbidden - only available in development mode
```

Add schema in components section (after User schema):

```yaml
    CreateUserRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
        avatarUrl:
          type: string
          nullable: true
      required:
        - name
```

**Post-modification:** Run `npm run generate:api` to regenerate Zod schemas

---

### 3. Dev-Only Middleware

**File to create:** `apps/backend/src/middleware/devOnly.ts`

```typescript
import type { Context, Next } from 'hono'
import { loadEnvConfig } from '../utils/env'

export const devOnly = async (c: Context, next: Next) => {
  const env = loadEnvConfig()

  if (env.NODE_ENV !== 'development') {
    return c.json(
      { message: 'This endpoint is only available in development mode' },
      403
    )
  }

  await next()
}
```

**Purpose:** Protects dev-only endpoints from being called in production

---

### 4. Repository Layer

**File to create:** `apps/backend/src/repositories/userRepository.ts`

```typescript
import type { User } from 'openapi'

export interface UserRepository {
  create(data: { name: string; avatarUrl?: string | null }): Promise<User>
}
```

**File to create:** `apps/backend/src/repositories/drizzleUserRepository.ts`

```typescript
import type { User } from 'openapi'
import { db } from '../infrastructure/db/client'
import { users } from '../infrastructure/db/schema'
import type { UserRepository } from './userRepository'

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly client = db) {}

  async create(data: { name: string; avatarUrl?: string | null }): Promise<User> {
    const [created] = await this.client
      .insert(users)
      .values({
        name: data.name,
        avatarUrl: data.avatarUrl || null
      })
      .returning()

    return {
      ...created,
      createdAt: created.createdAt.toISOString()
    }
  }
}
```

---

### 5. UseCase Layer

**File to create:** `apps/backend/src/usecases/userUsecase.ts`

```typescript
import type { UserRepository } from '../repositories/userRepository'

export class UserUsecase {
  constructor(private readonly repo: UserRepository) {}

  async createUser(data: { name: string; avatarUrl?: string | null }) {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('User name is required')
    }

    return this.repo.create({
      name: data.name.trim(),
      avatarUrl: data.avatarUrl
    })
  }
}
```

**Business Logic:**
- Validates user name is not empty
- Trims whitespace from name
- Delegates to repository for database operations

---

### 6. Route Layer

**File to modify:** `apps/backend/src/routes/users.ts`

```typescript
import { Hono } from 'hono'
import { CreateUserRequestSchema } from 'openapi'
import { DrizzleChatRepository } from '../repositories/drizzleChatRepository'
import { DrizzleUserRepository } from '../repositories/drizzleUserRepository'
import { ChatUsecase } from '../usecases/chatUsecase'
import { UserUsecase } from '../usecases/userUsecase'
import { HttpError } from '../utils/errors'
import { devOnly } from '../middleware/devOnly'

const router = new Hono()
const chatUsecase = new ChatUsecase(new DrizzleChatRepository())
const userUsecase = new UserUsecase(new DrizzleUserRepository())

const handleError = (error: unknown, c: any) => {
  if (error instanceof HttpError) {
    return c.json({ message: error.message }, error.status)
  }

  throw error
}

// Existing endpoint
router.get('/:id/bookmarks', async c => {
  const userId = c.req.param('id')

  try {
    const bookmarks = await chatUsecase.listBookmarks(userId)
    return c.json(bookmarks)
  } catch (error) {
    return handleError(error, c)
  }
})

// New dev-only endpoint
router.post('/', devOnly, async c => {
  const body = await c.req.json()
  const payload = CreateUserRequestSchema.parse(body)

  try {
    const created = await userUsecase.createUser({
      name: payload.name,
      avatarUrl: payload.avatarUrl
    })
    return c.json(created, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'User name is required') {
      return c.json({ message: error.message }, 400)
    }

    throw error
  }
})

export default router
```

---

## Files Summary

### Files to Create (4)

1. `apps/backend/src/middleware/devOnly.ts` - Dev mode protection middleware
2. `apps/backend/src/repositories/userRepository.ts` - User repository interface
3. `apps/backend/src/repositories/drizzleUserRepository.ts` - Drizzle implementation
4. `apps/backend/src/usecases/userUsecase.ts` - User business logic

### Files to Modify (3)

1. `apps/backend/src/utils/env.ts` - Add NODE_ENV support
2. `packages/openapi/openapi.yaml` - Add POST /users endpoint and CreateUserRequest schema
3. `apps/backend/src/routes/users.ts` - Add POST handler with devOnly middleware

---

## Implementation Order

1. ✅ Modify `env.ts` to add NODE_ENV support
2. ✅ Create `devOnly.ts` middleware
3. ✅ Modify `openapi.yaml` and run `npm run generate:api`
4. ✅ Create `userRepository.ts` interface
5. ✅ Create `drizzleUserRepository.ts` implementation
6. ✅ Create `userUsecase.ts`
7. ✅ Modify `users.ts` route to add POST endpoint

---

## Testing Strategy

### Development Mode (Should Work)

```bash
# Start server in development mode
NODE_ENV=development npm run dev:backend

# Create a user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "avatarUrl": "https://example.com/avatar.jpg"}'

# Expected response (201):
# {
#   "id": "uuid-here",
#   "name": "Test User",
#   "avatarUrl": "https://example.com/avatar.jpg",
#   "createdAt": "2024-01-01T00:00:00.000Z"
# }
```

### Production Mode (Should Return 403)

```bash
# Start server in production mode
NODE_ENV=production npm run dev:backend

# Attempt to create a user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User"}'

# Expected response (403):
# {
#   "message": "This endpoint is only available in development mode"
# }
```

### Validation Tests

```bash
# Test with empty name (should return 400)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": ""}'

# Test with missing name (should return validation error)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"avatarUrl": "https://example.com/avatar.jpg"}'

# Test with only name (should work)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Simple User"}'
```

---

## Optional Enhancements (Future Iterations)

Consider adding later:

1. **Unit Tests**
   - `userUsecase.test.ts` for business logic testing
   - Mock repository for isolated testing

2. **Integration Tests**
   - `users.integration.test.ts` for full endpoint testing
   - Database setup/teardown

3. **Additional Validations**
   - URL format validation for `avatarUrl`
   - Name length constraints
   - Email field (if needed)

4. **Security Enhancements**
   - Rate limiting for the endpoint
   - Request size limits
   - Input sanitization

5. **Developer Experience**
   - Seed script to create test users
   - Admin UI for user management
   - Bulk user creation endpoint

---

## Environment Variables

Update `.env.example` to include:

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/app_db
PORT=3000
NODE_ENV=development
```

---

## Notes

- The `devOnly` middleware is reusable for other development-only endpoints
- The user creation endpoint follows the same error handling pattern as existing endpoints
- OpenAPI schema ensures type safety throughout the application
- The implementation maintains consistency with the existing codebase architecture
