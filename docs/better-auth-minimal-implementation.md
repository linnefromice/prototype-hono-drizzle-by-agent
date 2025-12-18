# BetterAuth ミニマム実装設計書（ID/パスワード認証のみ）

## 概要

このドキュメントは、BetterAuthを使用した**最小構成のID/パスワード認証**の実装設計です。

### 実装方針

- **現在の要件**: ID/パスワード認証とセッション管理のみ
- **将来の拡張性**: TOTP、ソーシャルログイン、サードパーティプロバイダへの対応を見据えたスキーマ設計
- **既存システムとの共存**: 現在の`users`テーブルを`chat_users`にリネームし、認証用の`auth_user`テーブルと分離

## アーキテクチャ設計

### テーブル構成

```
┌─────────────────┐
│   auth_user     │  ← BetterAuth認証用ユーザー
│  (ID/Pass保持)  │
└────────┬────────┘
         │
         │ 1:1
         │
┌────────▼────────┐
│  chat_users     │  ← チャット機能用プロフィール
│ (既存のusers)   │     (idAlias, avatarUrl等)
└─────────────────┘

┌─────────────────┐
│  auth_session   │  ← セッション管理
└─────────────────┘

┌─────────────────┐
│ auth_account    │  ← 将来のOAuth用（空のまま保持）
└─────────────────┘

┌─────────────────┐
│auth_verification│  ← 将来のメール認証用（空のまま保持）
└─────────────────┘
```

## データベーススキーマ設計

### 1. 認証用ユーザーテーブル: `auth_user`

BetterAuthのコア認証情報を管理するテーブル。

```typescript
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const authUser = sqliteTable('auth_user', {
  // 主キー（UUID）
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  // 認証情報
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .default(false)
    .notNull(),

  // 基本情報（BetterAuthが要求する最小フィールド）
  name: text('name').notNull(),
  image: text('image'), // プロフィール画像URL（オプショナル）

  // タイムスタンプ
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),

  // 将来の拡張用フィールド（初期状態ではnull）
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' })
    .default(false),
})
```

**設計ポイント**:
- `email`のみをユニーク制約とし、シンプルなID/パスワード認証を実現
- `twoFactorEnabled`フィールドを事前に用意（将来のTOTP対応）
- `emailVerified`も将来のメール認証用に準備

### 2. セッション管理テーブル: `auth_session`

ログイン状態とトークンを管理するテーブル。

```typescript
export const authSession = sqliteTable(
  'auth_session',
  {
    // 主キー
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

    // セッショントークン
    token: text('token').notNull().unique(),

    // 有効期限
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),

    // ユーザー参照
    userId: text('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),

    // セキュリティ情報（ログイン元の追跡）
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),

    // タイムスタンプ
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    // トークンによる高速検索用インデックス
    tokenIndex: index('auth_session_token_idx').on(table.token),
    // ユーザーIDによる検索用インデックス
    userIdIndex: index('auth_session_user_id_idx').on(table.userId),
  }),
)
```

**設計ポイント**:
- `token`にユニーク制約とインデックスを設定（セッション検証の高速化）
- `ipAddress`と`userAgent`でセキュリティ監査が可能
- `userId`の外部キー制約により、ユーザー削除時に自動でセッションも削除

### 3. アカウント連携テーブル: `auth_account`（将来用）

OAuth連携やパスワード管理用のテーブル。現在は使用しないが、スキーマは作成しておく。

```typescript
export const authAccount = sqliteTable(
  'auth_account',
  {
    // 主キー
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

    // プロバイダー情報
    accountId: text('account_id').notNull(), // プロバイダー側のユーザーID
    providerId: text('provider_id').notNull(), // 'credential', 'github', 'google'等

    // ユーザー参照
    userId: text('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),

    // OAuth用トークン（将来使用）
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),

    // パスワード（ハッシュ化済み）
    password: text('password'), // ID/パスワード認証時に使用

    // タイムスタンプ
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    // プロバイダーとアカウントIDの複合ユニーク制約
    providerAccountUnique: index('auth_account_provider_account_idx').on(
      table.providerId,
      table.accountId,
    ),
  }),
)
```

**設計ポイント**:
- `password`フィールドに現在のパスワードハッシュを保存
- `providerId`を`credential`として使用することで、ID/パスワード認証を実現
- 将来的に`github`、`google`などのプロバイダーを追加可能

### 4. 検証テーブル: `auth_verification`（将来用）

メール認証、パスワードリセット、TOTPなどの一時トークンを管理。

```typescript
export const authVerification = sqliteTable(
  'auth_verification',
  {
    // 主キー
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

    // 検証識別子（メールアドレスやユーザーID）
    identifier: text('identifier').notNull(),

    // 検証値（トークンやOTPコード）
    value: text('value').notNull(),

    // 有効期限
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),

    // タイムスタンプ
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    // identifierによる高速検索用インデックス
    identifierIndex: index('auth_verification_identifier_idx').on(table.identifier),
  }),
)
```

**設計ポイント**:
- 現在は使用しないが、将来のメール認証やTOTP用に準備
- `identifier`と`value`の組み合わせで柔軟な検証が可能

### 5. 既存テーブルのリネーム: `chat_users`

現在の`users`テーブルを`chat_users`にリネームし、チャット機能専用とする。

```typescript
export const chatUsers = sqliteTable('chat_users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  // 認証ユーザーへの参照（1対1）
  authUserId: text('auth_user_id')
    .notNull()
    .unique()
    .references(() => authUser.id, { onDelete: 'cascade' }),

  // チャット固有のフィールド
  idAlias: text('id_alias').notNull().unique(),
  avatarUrl: text('avatar_url'),

  // 表示名（auth_userのnameと同期させるか、独自に管理）
  displayName: text('display_name').notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
```

**設計ポイント**:
- `authUserId`で認証ユーザーと1対1の関係を構築
- `idAlias`や`avatarUrl`などチャット特有の情報を保持
- 既存のリレーション（conversations、messages等）はそのまま維持

## BetterAuth設定（ミニマム構成）

### ファイル: `apps/backend/src/infrastructure/auth/config.ts`

```typescript
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

export const createAuth = (db: any) => {
  return betterAuth({
    // データベース設定
    database: drizzleAdapter(db, {
      provider: "sqlite",
      // カスタムテーブル名を指定
      schema: {
        user: "auth_user",
        session: "auth_session",
        account: "auth_account",
        verification: "auth_verification",
      }
    }),

    // ID/パスワード認証のみ有効化
    emailAndPassword: {
      enabled: true,
      // メール検証は将来的に有効化する想定
      requireEmailVerification: false,
    },

    // セッション設定
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7日間
      updateAge: 60 * 60 * 24, // 1日ごとにセッション更新
    },

    // 将来の拡張用コメントアウト
    // socialProviders: {
    //   github: {
    //     clientId: process.env.GITHUB_CLIENT_ID!,
    //     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    //   },
    // },

    // plugins: [
    //   twoFactor({
    //     // TOTP設定
    //   })
    // ]
  })
}
```

## 実装ステップ

### Phase 1: スキーマ準備とマイグレーション

#### ステップ1: スキーマファイルの更新

`apps/backend/src/infrastructure/db/schema.ts`に認証テーブルを追加:

```typescript
// 既存のインポートに追加
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// === 認証関連テーブル ===

export const authUser = sqliteTable('auth_user', {
  // ... 上記のスキーマ定義
})

export const authSession = sqliteTable('auth_session', {
  // ... 上記のスキーマ定義
})

export const authAccount = sqliteTable('auth_account', {
  // ... 上記のスキーマ定義
})

export const authVerification = sqliteTable('auth_verification', {
  // ... 上記のスキーマ定義
})

// === チャット関連テーブル（既存のusersをリネーム） ===

export const chatUsers = sqliteTable('chat_users', {
  // ... 上記のスキーマ定義
})

// conversations, messages等は既存のまま（参照先をchatUsersに変更）
```

#### ステップ2: マイグレーション生成

```bash
cd apps/backend
npx drizzle-kit generate
```

生成されたマイグレーションファイルを確認し、以下の順序で実行されることを確認:

1. `auth_user`テーブル作成
2. `auth_session`、`auth_account`、`auth_verification`テーブル作成
3. `users`テーブルを`chat_users`にリネーム
4. `chat_users`に`auth_user_id`カラム追加

#### ステップ3: データ移行スクリプト作成（必要に応じて）

既存の`users`データを新しい構造に移行するスクリプト:

```typescript
// apps/backend/scripts/migrate-users-to-auth.ts
import { db } from '../src/infrastructure/db/client'
import { users, authUser, chatUsers } from '../src/infrastructure/db/schema'

async function migrateUsers() {
  // 既存のusersを取得
  const existingUsers = await db.select().from(users).all()

  for (const user of existingUsers) {
    // 1. auth_userを作成
    const [newAuthUser] = await db.insert(authUser).values({
      email: `${user.idAlias}@temp.local`, // 仮のメールアドレス
      name: user.name,
      emailVerified: false,
    }).returning()

    // 2. chat_usersを作成
    await db.insert(chatUsers).values({
      id: user.id, // 既存のIDを維持
      authUserId: newAuthUser.id,
      idAlias: user.idAlias,
      avatarUrl: user.avatarUrl,
      displayName: user.name,
    })
  }

  console.log(`Migrated ${existingUsers.length} users`)
}

migrateUsers()
```

### Phase 2: BetterAuth統合

#### ステップ4: 依存関係インストール

```bash
npm install better-auth --workspace backend
```

#### ステップ5: Auth設定ファイル作成

`apps/backend/src/infrastructure/auth/config.ts`を作成（上記の設定内容）

#### ステップ6: 型定義ファイル作成

`apps/backend/src/infrastructure/auth/types.ts`:

```typescript
import type { createAuth } from './config'

export type Auth = ReturnType<typeof createAuth>
export type AuthUser = Auth['$Infer']['Session']['user']
export type AuthSession = Auth['$Infer']['Session']['session']
```

### Phase 3: Hono統合

#### ステップ7: 認証エンドポイントの追加

`apps/backend/src/index.ts`を更新:

```typescript
import { Hono } from 'hono'
import type { Env } from './infrastructure/db/client.d1'
import { createAuth } from './infrastructure/auth/config'
import { getDbClient } from './infrastructure/db/client.d1'

const app = new Hono<{ Bindings: Env }>()

// BetterAuth ハンドラーをマウント
app.on(['POST', 'GET'], '/api/auth/**', async (c) => {
  const db = getDbClient(c.env.DB)
  const auth = createAuth(db)
  return auth.handler(c.req.raw)
})

// 既存のルート
app.route('/health', healthRouter)
app.route('/conversations', conversationsRouter)
app.route('/messages', messagesRouter)
app.route('/users', usersRouter)

export default app
```

#### ステップ8: 認証ミドルウェアの作成

`apps/backend/src/middleware/requireAuth.ts`:

```typescript
import { createMiddleware } from 'hono/factory'
import { createAuth } from '../infrastructure/auth/config'
import { getDbClient } from '../infrastructure/db/client.d1'
import type { Env } from '../infrastructure/db/client.d1'
import type { AuthUser, AuthSession } from '../infrastructure/auth/types'

// 認証情報を含むContext型
type AuthVariables = {
  authUser: AuthUser
  authSession: AuthSession
}

/**
 * 認証必須ミドルウェア
 * セッションがない場合は401エラーを返す
 */
export const requireAuth = createMiddleware<{
  Bindings: Env
  Variables: AuthVariables
}>(async (c, next) => {
  const db = getDbClient(c.env.DB)
  const auth = createAuth(db)

  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  })

  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('authUser', session.user)
  c.set('authSession', session.session)

  await next()
})
```

#### ステップ9: 保護されたルートの作成例

`apps/backend/src/routes/protected.ts`:

```typescript
import { Hono } from 'hono'
import type { Env } from '../infrastructure/db/client.d1'
import { requireAuth } from '../middleware/requireAuth'

const router = new Hono<{ Bindings: Env }>()

// 認証が必要なエンドポイント
router.get('/me', requireAuth, (c) => {
  const user = c.get('authUser')
  return c.json({ user })
})

router.get('/profile', requireAuth, async (c) => {
  const authUser = c.get('authUser')

  // chat_usersからプロフィール情報を取得
  const db = getDbClient(c.env.DB)
  const chatUser = await db
    .select()
    .from(chatUsers)
    .where(eq(chatUsers.authUserId, authUser.id))
    .get()

  return c.json({
    auth: authUser,
    profile: chatUser,
  })
})

export default router
```

### Phase 4: 環境変数設定

#### ステップ10: `.env`ファイルの更新

`apps/backend/.env`:

```env
# Better Auth
BETTER_AUTH_SECRET=<generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
BETTER_AUTH_URL=http://localhost:8787

# Database
DATABASE_URL=...
```

#### ステップ11: `wrangler.toml`の更新

`apps/backend/wrangler.toml`:

```toml
name = "prototype-hono-drizzle-backend"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]  # AsyncLocalStorage対応

[[d1_databases]]
binding = "DB"
database_name = "prototype-hono-drizzle-db"
database_id = "59d1bb59-6480-433f-9f7d-3f24330873cc"
```

### Phase 5: テスト作成

#### ステップ12: 認証エンドポイントのテスト

`apps/backend/src/routes/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../index'
import { setupTestDb, cleanupTestDb } from '../__tests__/helpers/dbSetup'

describe('Auth Endpoints', () => {
  beforeEach(async () => {
    await setupTestDb()
  })

  afterEach(async () => {
    await cleanupTestDb()
  })

  describe('POST /api/auth/sign-up', () => {
    it('新規ユーザーを作成できる', async () => {
      const res = await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Test User',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('test@example.com')
      expect(data.user.name).toBe('Test User')
    })

    it('重複メールアドレスでエラーを返す', async () => {
      // 1回目の登録
      await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'Pass123!',
          name: 'User 1',
        }),
      })

      // 2回目の登録（重複）
      const res = await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'Pass456!',
          name: 'User 2',
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/sign-in/email', () => {
    beforeEach(async () => {
      // テストユーザーを作成
      await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'MyPassword123!',
          name: 'Login User',
        }),
      })
    })

    it('正しい認証情報でログインできる', async () => {
      const res = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'MyPassword123!',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('login@example.com')

      // セッションクッキーが設定されていることを確認
      const cookies = res.headers.get('Set-Cookie')
      expect(cookies).toContain('sessionToken')
    })

    it('間違ったパスワードでエラーを返す', async () => {
      const res = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'WrongPassword',
        }),
      })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/auth/session', () => {
    it('ログイン後にセッション情報を取得できる', async () => {
      // ログイン
      const loginRes = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'MyPassword123!',
        }),
      })

      const cookies = loginRes.headers.get('Set-Cookie')

      // セッション取得
      const res = await app.request('/api/auth/session', {
        headers: { Cookie: cookies || '' },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.session).toBeDefined()
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('login@example.com')
    })

    it('未ログイン時はnullを返す', async () => {
      const res = await app.request('/api/auth/session')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.session).toBeNull()
      expect(data.user).toBeNull()
    })
  })

  describe('POST /api/auth/sign-out', () => {
    it('ログアウトできる', async () => {
      // ログイン
      const loginRes = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login@example.com',
          password: 'MyPassword123!',
        }),
      })

      const cookies = loginRes.headers.get('Set-Cookie')

      // ログアウト
      const res = await app.request('/api/auth/sign-out', {
        method: 'POST',
        headers: { Cookie: cookies || '' },
      })

      expect(res.status).toBe(200)

      // セッション確認（無効になっているはず）
      const sessionRes = await app.request('/api/auth/session', {
        headers: { Cookie: cookies || '' },
      })

      const data = await sessionRes.json()
      expect(data.session).toBeNull()
    })
  })
})
```

## 利用可能なエンドポイント

### 認証エンドポイント（自動生成）

#### 1. ユーザー登録
```
POST /api/auth/sign-up
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "User Name"
}

Response:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "session": {
    "id": "session-uuid",
    "userId": "uuid",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    ...
  }
}
```

#### 2. ログイン
```
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "user": { ... },
  "session": { ... }
}

Set-Cookie: sessionToken=...; Path=/; HttpOnly; Secure; SameSite=Lax
```

#### 3. セッション取得
```
GET /api/auth/session
Cookie: sessionToken=...

Response:
{
  "user": { ... },
  "session": { ... }
}
```

#### 4. ログアウト
```
POST /api/auth/sign-out
Cookie: sessionToken=...

Response:
{
  "success": true
}
```

## 将来の拡張計画

### Phase A: TOTP（2要素認証）追加

**必要な変更**:
1. `auth_user.twoFactorEnabled`を使用開始
2. BetterAuthの`twoFactor`プラグインを有効化
3. QRコード生成エンドポイントの追加

**追加テーブル**: なし（`auth_verification`を使用）

**設定変更**:
```typescript
import { twoFactor } from "better-auth/plugins"

export const auth = betterAuth({
  // ... 既存の設定
  plugins: [
    twoFactor({
      issuer: "YourAppName",
    })
  ]
})
```

### Phase B: ソーシャルログイン（GitHub/Google）追加

**必要な変更**:
1. `auth_account`テーブルを使用開始
2. OAuth認証フローの追加
3. 環境変数に各プロバイダーのクレデンシャルを追加

**設定変更**:
```typescript
export const auth = betterAuth({
  // ... 既存の設定
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }
  }
})
```

### Phase C: メール認証追加

**必要な変更**:
1. `auth_verification`テーブルを使用開始
2. メール送信サービスの統合（Resend、SendGrid等）
3. `emailAndPassword.requireEmailVerification`を`true`に変更

**設定変更**:
```typescript
export const auth = betterAuth({
  // ... 既存の設定
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: async ({ email, token }) => {
      // メール送信ロジック
      await sendEmail({
        to: email,
        subject: 'メールアドレスの確認',
        html: `確認リンク: ${process.env.BETTER_AUTH_URL}/verify-email?token=${token}`
      })
    }
  }
})
```

## スキーマ拡張性の検証

### 1. TOTP対応
- ✅ `auth_user.twoFactorEnabled`フィールド準備済み
- ✅ `auth_verification`テーブルでTOTPシークレット保存可能

### 2. OAuth対応
- ✅ `auth_account`テーブルでOAuthトークン管理可能
- ✅ `providerId`で複数プロバイダーを区別

### 3. メール認証対応
- ✅ `auth_user.emailVerified`フィールド準備済み
- ✅ `auth_verification`テーブルで確認トークン管理可能

### 4. パスワードレス認証（Magic Link）
- ✅ `auth_verification`テーブルでマジックリンクトークン管理可能

## まとめ

### 現在の実装範囲
- ✅ ID/パスワード認証（メールアドレス + パスワード）
- ✅ セッション管理（トークンベース、7日間有効）
- ✅ 既存チャット機能との分離（`auth_user` ⇔ `chat_users`）

### 将来への準備
- ✅ TOTP用フィールド配置済み
- ✅ OAuth用テーブル準備済み
- ✅ メール認証用テーブル準備済み
- ✅ プラグインシステムによる機能追加が容易

### 技術スタック
- **認証**: Better Auth
- **ORM**: Drizzle
- **データベース**: Cloudflare D1 (SQLite)
- **フレームワーク**: Hono
- **ランタイム**: Cloudflare Workers

この設計により、ミニマムな実装で開始しつつ、将来的な拡張を妨げないアーキテクチャを実現しています。
