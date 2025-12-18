# BetterAuth Username認証実装設計書（最小構成 + Username対応）

## 概要

このドキュメントは、BetterAuthを使用した**Username/パスワード認証**の実装設計です。既存の`idAlias`機能を維持しつつ、`username`による認証を実現します。

### 実装方針

- **現在の要件**: Username/パスワード認証とセッション管理
- **既存機能の維持**: `chat_users.idAlias` をチャット表示用として継続利用
- **認証ID**: `auth_user.username` を認証用IDとして使用
- **将来の拡張性**: TOTP、ソーシャルログイン、メール認証への対応を見据えたスキーマ設計

## アーキテクチャ設計

### テーブル構成と役割分担

```
┌─────────────────────────┐
│      auth_user          │  ← 認証用ユーザー
│  - username (unique)    │     ログイン時に使用
│  - email (unique)       │     (オプショナル)
│  - password (hashed)    │
└────────┬────────────────┘
         │
         │ 1:1
         │
┌────────▼────────────────┐
│     chat_users          │  ← チャット機能用プロフィール
│  - idAlias (unique)     │     チャット画面での表示ID
│  - avatarUrl            │     プロフィール画像
│  - displayName          │     表示名
└─────────────────────────┘

┌─────────────────────────┐
│     auth_session        │  ← セッション管理
└─────────────────────────┘

┌─────────────────────────┐
│     auth_account        │  ← 将来のOAuth用
└─────────────────────────┘

┌─────────────────────────┐
│   auth_verification     │  ← 将来のメール認証/TOTP用
└─────────────────────────┘
```

### usernameとidAliasの使い分け

| フィールド | 用途 | 変更可能性 | 表示場所 |
|-----------|------|----------|---------|
| `auth_user.username` | **ログインID** | 変更可能（実装次第） | ログイン画面 |
| `chat_users.idAlias` | **チャット表示ID** | 変更不可（一意性保証） | チャット画面、@メンション |

**推奨運用**:
- 初回登録時: `username` と `idAlias` に同じ値を設定
- 将来的に: `username` の変更を許可しても `idAlias` は固定とすることで、チャット履歴の整合性を保つ

## データベーススキーマ設計

### 1. 認証用ユーザーテーブル: `auth_user`（username対応版）

```typescript
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const authUser = sqliteTable('auth_user', {
  // 主キー（UUID）
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  // === 認証情報 ===
  // Username（ログインIDとして使用）
  username: text('username').notNull().unique(),

  // Email（オプショナル、将来のメール認証用）
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .default(false)
    .notNull(),

  // 基本情報
  name: text('name').notNull(),
  image: text('image'),

  // タイムスタンプ
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),

  // 将来の拡張用フィールド
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' })
    .default(false),

  // Username表示用（@usernameなどで使用する場合）
  displayUsername: text('display_username'),
}, (table) => ({
  // Usernameの高速検索用インデックス
  usernameIndex: index('auth_user_username_idx').on(table.username),
}))
```

**設計ポイント**:
- ✅ `username`を**必須かつユニーク**に設定（ログインIDとして使用）
- ✅ `email`は**オプショナル**（将来のメール認証用に準備）
- ✅ `displayUsername`フィールドを追加（usernameとは別に表示用の名前を持たせる場合に使用）
- ✅ Better Authの`username`プラグインが自動的にこれらのフィールドを管理

### 2. セッション管理テーブル: `auth_session`

```typescript
export const authSession = sqliteTable(
  'auth_session',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    tokenIndex: index('auth_session_token_idx').on(table.token),
    userIdIndex: index('auth_session_user_id_idx').on(table.userId),
  }),
)
```

### 3. アカウント連携テーブル: `auth_account`

```typescript
export const authAccount = sqliteTable(
  'auth_account',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(), // 'credential' for username/password
    userId: text('user_id')
      .notNull()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'), // Hashed password
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    providerAccountIdx: index('auth_account_provider_account_idx').on(
      table.providerId,
      table.accountId,
    ),
  }),
)
```

### 4. 検証テーブル: `auth_verification`（将来用）

```typescript
export const authVerification = sqliteTable(
  'auth_verification',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    identifierIdx: index('auth_verification_identifier_idx').on(table.identifier),
  }),
)
```

### 5. チャット用ユーザーテーブル: `chat_users`

```typescript
export const chatUsers = sqliteTable('chat_users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  // 認証ユーザーへの参照（1対1）
  authUserId: text('auth_user_id')
    .notNull()
    .unique()
    .references(() => authUser.id, { onDelete: 'cascade' }),

  // チャット固有のフィールド
  idAlias: text('id_alias').notNull().unique(), // @メンション用の固定ID
  avatarUrl: text('avatar_url'),
  displayName: text('display_name').notNull(), // チャット画面での表示名

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  // idAliasの高速検索用インデックス
  idAliasIdx: index('chat_users_id_alias_idx').on(table.idAlias),
  // authUserIdの検索用インデックス
  authUserIdIdx: index('chat_users_auth_user_id_idx').on(table.authUserId),
}))
```

**設計ポイント**:
- ✅ `idAlias`は**変更不可**の一意なID（チャット履歴の整合性を保つ）
- ✅ `displayName`はユーザーが変更可能な表示名
- ✅ `authUserId`で認証情報と紐付け

## BetterAuth設定（Username対応版）

### ファイル: `apps/backend/src/infrastructure/auth/config.ts`

```typescript
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { username } from "better-auth/plugins" // Usernameプラグイン

export const createAuth = (db: any) => {
  return betterAuth({
    // データベース設定
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: "auth_user",
        session: "auth_session",
        account: "auth_account",
        verification: "auth_verification",
      }
    }),

    // Email/Password認証を有効化（Usernameプラグインの前提条件）
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // 初期段階ではメール認証不要
    },

    // Usernameプラグインを有効化
    plugins: [
      username({
        minUsernameLength: 3,   // 最小3文字
        maxUsernameLength: 20,  // 最大20文字
        allowedCharacters: /^[a-zA-Z0-9_-]+$/, // 英数字、アンダースコア、ハイフンのみ
      })
    ],

    // セッション設定
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7日間
      updateAge: 60 * 60 * 24,     // 1日ごとに更新
    },

    // Username重複チェックエンドポイントを無効化（セキュリティ強化）
    // disablePaths: ["/is-username-available"],

    // 将来の拡張用
    // socialProviders: { ... },
    // plugins: [ twoFactor(), ... ]
  })
}
```

**設定ポイント**:
- ✅ `username()`プラグインを追加することで、username認証が有効化
- ✅ `allowedCharacters`で使用可能な文字を制限（セキュリティ向上）
- ✅ `emailAndPassword.enabled: true`が必須（usernameプラグインの前提条件）

## 実装ステップ

### Phase 1: スキーマ更新とマイグレーション

#### ステップ1: スキーマファイルの更新

`apps/backend/src/infrastructure/db/schema.ts`:

```typescript
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

// === チャット関連テーブル ===
export const chatUsers = sqliteTable('chat_users', {
  // ... 上記のスキーマ定義
})

// conversations, messages等は既存のまま
// ただし、参照先を `users` → `chatUsers` に変更
```

#### ステップ2: マイグレーション生成

```bash
cd apps/backend
npx drizzle-kit generate
```

#### ステップ3: データ移行スクリプト

既存の`users`データを新構造に移行:

```typescript
// apps/backend/scripts/migrate-to-username-auth.ts
import { db } from '../src/infrastructure/db/client'
import { users, authUser, chatUsers } from '../src/infrastructure/db/schema'

async function migrateToUsernameAuth() {
  const existingUsers = await db.select().from(users).all()

  for (const user of existingUsers) {
    // 1. auth_userを作成（username = idAlias）
    const [newAuthUser] = await db.insert(authUser).values({
      username: user.idAlias,  // 既存のidAliasをusernameとして使用
      name: user.name,
      email: null, // 初期段階ではメールアドレスなし
      emailVerified: false,
    }).returning()

    // 2. デフォルトパスワードを設定（初回ログイン時に変更を促す）
    // または、別途パスワード設定フローを用意

    // 3. chat_usersを作成
    await db.insert(chatUsers).values({
      id: user.id,              // 既存のIDを維持
      authUserId: newAuthUser.id,
      idAlias: user.idAlias,    // 既存のidAliasを維持
      avatarUrl: user.avatarUrl,
      displayName: user.name,
    })
  }

  console.log(`Migrated ${existingUsers.length} users`)
}

migrateToUsernameAuth()
```

### Phase 2: BetterAuth統合

#### ステップ4: 依存関係インストール

```bash
npm install better-auth --workspace backend
```

#### ステップ5: Auth設定ファイル作成

上記の`apps/backend/src/infrastructure/auth/config.ts`を作成

### Phase 3: Hono統合

#### ステップ6: 認証エンドポイントの追加

`apps/backend/src/index.ts`:

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

#### ステップ7: 認証ミドルウェアの作成

`apps/backend/src/middleware/requireAuth.ts`:

```typescript
import { createMiddleware } from 'hono/factory'
import { createAuth } from '../infrastructure/auth/config'
import { getDbClient } from '../infrastructure/db/client.d1'
import type { Env } from '../infrastructure/db/client.d1'

export const requireAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
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

### Phase 4: 環境変数設定

#### ステップ8: `.env`ファイル

```env
# Better Auth
BETTER_AUTH_SECRET=<generate-random-32-char-string>
BETTER_AUTH_URL=http://localhost:8787
```

#### ステップ9: `wrangler.toml`

```toml
compatibility_flags = ["nodejs_compat"]
compatibility_date = "2024-09-23"
```

### Phase 5: テスト作成

#### ステップ10: Username認証のテスト

`apps/backend/src/routes/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../index'

describe('Username Authentication', () => {
  describe('POST /api/auth/sign-up/username', () => {
    it('usernameで新規ユーザーを作成できる', async () => {
      const res = await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'SecurePass123!',
          name: 'Test User',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBeDefined()
      expect(data.user.username).toBe('testuser')
      expect(data.user.name).toBe('Test User')
    })

    it('重複usernameでエラーを返す', async () => {
      // 1回目の登録
      await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'duplicate',
          password: 'Pass123!',
          name: 'User 1',
        }),
      })

      // 2回目の登録（重複）
      const res = await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'duplicate',
          password: 'Pass456!',
          name: 'User 2',
        }),
      })

      expect(res.status).toBe(400)
    })

    it('無効な文字を含むusernameでエラーを返す', async () => {
      const res = await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test user!', // スペースと記号を含む
          password: 'Pass123!',
          name: 'Test User',
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/sign-in/username', () => {
    beforeEach(async () => {
      // テストユーザーを作成
      await app.request('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'loginuser',
          password: 'MyPassword123!',
          name: 'Login User',
        }),
      })
    })

    it('usernameとパスワードでログインできる', async () => {
      const res = await app.request('/api/auth/sign-in/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'loginuser',
          password: 'MyPassword123!',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBeDefined()
      expect(data.user.username).toBe('loginuser')

      // セッションクッキーが設定されている
      const cookies = res.headers.get('Set-Cookie')
      expect(cookies).toContain('sessionToken')
    })

    it('間違ったパスワードでエラーを返す', async () => {
      const res = await app.request('/api/auth/sign-in/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'loginuser',
          password: 'WrongPassword',
        }),
      })

      expect(res.status).toBe(401)
    })

    it('存在しないusernameでエラーを返す', async () => {
      const res = await app.request('/api/auth/sign-in/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'nonexistent',
          password: 'Password123!',
        }),
      })

      expect(res.status).toBe(401)
    })
  })
})
```

## 利用可能なエンドポイント

### Username認証エンドポイント（自動生成）

#### 1. ユーザー登録（Username）
```http
POST /api/auth/sign-up
Content-Type: application/json

{
  "username": "johndoe",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "email": "john@example.com"  // オプショナル
}

Response:
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "name": "John Doe",
    "email": "john@example.com",
    "emailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "session": { ... }
}
```

#### 2. ログイン（Username）
```http
POST /api/auth/sign-in/username
Content-Type: application/json

{
  "username": "johndoe",
  "password": "SecurePassword123!"
}

Response:
{
  "user": { ... },
  "session": { ... }
}

Set-Cookie: sessionToken=...; Path=/; HttpOnly; Secure
```

#### 3. セッション取得
```http
GET /api/auth/session
Cookie: sessionToken=...

Response:
{
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "name": "John Doe",
    ...
  },
  "session": { ... }
}
```

#### 4. ログアウト
```http
POST /api/auth/sign-out
Cookie: sessionToken=...

Response:
{
  "success": true
}
```

#### 5. Username重複チェック（オプショナル）
```http
GET /api/auth/is-username-available?username=johndoe

Response:
{
  "available": false
}
```

**セキュリティ注意**: このエンドポイントはUsername列挙攻撃に利用される可能性があるため、`disablePaths`で無効化することを推奨します。

## クライアント側の実装例

### TypeScript/React での使用例

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/client"
import { usernameClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: "http://localhost:8787",
  plugins: [
    usernameClient() // Usernameプラグインを有効化
  ]
})

// === ユーザー登録 ===
const handleSignUp = async () => {
  const { data, error } = await authClient.signUp.username({
    username: "johndoe",
    password: "SecurePassword123!",
    name: "John Doe",
    email: "john@example.com", // オプショナル
  })

  if (error) {
    console.error("Sign up failed:", error)
    return
  }

  console.log("User created:", data)
}

// === ログイン ===
const handleSignIn = async () => {
  const { data, error } = await authClient.signIn.username({
    username: "johndoe",
    password: "SecurePassword123!",
  })

  if (error) {
    console.error("Sign in failed:", error)
    return
  }

  console.log("Logged in:", data)
}

// === セッション取得 ===
const fetchSession = async () => {
  const { data } = await authClient.getSession()
  console.log("Current session:", data)
}

// === ログアウト ===
const handleSignOut = async () => {
  await authClient.signOut()
  console.log("Logged out")
}
```

## 既存システムとの統合例

### チャット機能でのユーザー情報取得

```typescript
// apps/backend/src/routes/chat.ts
import { Hono } from 'hono'
import { requireAuth } from '../middleware/requireAuth'
import { eq } from 'drizzle-orm'
import { chatUsers } from '../infrastructure/db/schema'

const router = new Hono()

router.get('/me', requireAuth, async (c) => {
  const authUser = c.get('authUser') // Better Authのユーザー情報
  const db = getDbClient(c.env.DB)

  // チャットプロフィール情報を取得
  const chatProfile = await db
    .select()
    .from(chatUsers)
    .where(eq(chatUsers.authUserId, authUser.id))
    .get()

  return c.json({
    auth: {
      username: authUser.username,
      name: authUser.name,
    },
    chat: {
      idAlias: chatProfile.idAlias,
      displayName: chatProfile.displayName,
      avatarUrl: chatProfile.avatarUrl,
    }
  })
})

export default router
```

## 将来の拡張計画

### Phase A: メール認証追加

**必要な変更**:
1. `email`フィールドを**必須**に変更
2. `emailAndPassword.requireEmailVerification`を`true`に設定
3. メール送信サービスの統合

**ユーザー登録フロー**:
```
1. username + email + password で登録
2. 確認メール送信
3. メール内のリンクをクリックして認証
4. emailVerified = true に更新
```

### Phase B: TOTP（2要素認証）追加

**必要な変更**:
1. `twoFactor`プラグインを追加
2. ユーザー設定画面でTOTP有効化UI追加

**ログインフロー**:
```
1. username + password でログイン
2. twoFactorEnabled = true のユーザーはOTPを要求
3. OTPコード入力
4. セッション確立
```

### Phase C: ソーシャルログイン追加

**必要な変更**:
1. `socialProviders`設定に GitHub/Google等を追加
2. `auth_account`テーブルを使用開始
3. OAuth callback URLを設定

**アカウント連携**:
```
既存のusernameアカウント + GitHubアカウントを紐付け
→ auth_accountテーブルに両方のプロバイダー情報が保存される
```

## usernameとidAliasの運用パターン

### パターン1: 完全一致（シンプル）

```typescript
// 登録時
const username = "johndoe"
await createAuthUser({ username, ... })
await createChatUser({
  idAlias: username, // 同じ値を使用
  ...
})
```

**メリット**: シンプルで分かりやすい
**デメリット**: usernameを変更した場合、idAliasとの不整合が発生

### パターン2: 独立管理（推奨）

```typescript
// 登録時
const username = "johndoe"
const idAlias = generateUniqueIdAlias() // ランダムまたは連番

await createAuthUser({ username, ... })
await createChatUser({
  idAlias: idAlias, // 独自の固定ID
  displayName: username, // 表示名は変更可能
  ...
})
```

**メリット**: username変更に柔軟に対応、チャット履歴の整合性を保証
**デメリット**: やや複雑

### パターン3: ハイブリッド（バランス型）

```typescript
// 登録時
const username = "johndoe"
const idAlias = `${username}_${shortUUID()}` // "johndoe_a1b2c3"

await createAuthUser({ username, ... })
await createChatUser({
  idAlias: idAlias, // 一意性保証
  displayName: username, // 表示用
  ...
})
```

**メリット**: 可読性と一意性を両立
**デメリット**: idAliasがやや長くなる

## まとめ

### 実装内容

- ✅ **Username認証**: `username` + `password` でログイン可能
- ✅ **既存idAlias維持**: `chat_users.idAlias` はチャット表示用として継続使用
- ✅ **柔軟な運用**: username と idAlias を独立管理可能
- ✅ **将来の拡張**: Email認証、TOTP、OAuth追加が容易

### 技術スタック

- **認証**: Better Auth + Username Plugin
- **ORM**: Drizzle
- **DB**: Cloudflare D1 (SQLite)
- **Framework**: Hono
- **Runtime**: Cloudflare Workers

この設計により、既存の`idAlias`機能を維持しつつ、柔軟なusername認証を実現できます。
