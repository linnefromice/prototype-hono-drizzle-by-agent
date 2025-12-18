# BetterAuth 認証機能 実装計画

## 概要

このドキュメントは、現在のプロジェクト（Hono + Drizzle + Cloudflare D1）にBetterAuthを統合するための詳細な実装計画です。

## BetterAuth とは？

**Better Auth** は、TypeScript エコシステムで最も注目されている、**「全部入り（Batteries Included）」かつ「型安全」な認証ライブラリ**です。

### 主な特徴

- **開発者体験 (DX) が圧倒的に高い**: 設定を書くだけで、DBスキーマの管理からAPIエンドポイントの生成、フロントエンドのフックまで一気通貫で提供
- **プラグインシステム**: 2要素認証 (2FA)、パスキー (Passkeys)、組織管理 (Teams)、メール認証などをプラグインとして追加可能
- **フレームワーク非依存**: Hono, Next.js, Nuxt, Astro などどこでも動作
- **Auth.js (NextAuth) の手軽さ** と **Lucia の柔軟性・型安全性** の良いとこ取り

### なぜ Cloudflare + Hono に最適なのか？

1. **Drizzle + D1 ネイティブ対応**: Drizzle ORM を公式サポートし、Cloudflare D1 (SQLite) 用のスキーマをそのまま利用可能
2. **Workers で動く軽量さ**: Node.js 固有の API に依存せず、Web Standard API (Request/Response) ベースで作られているため、Edge 環境（Workers）で高速動作
3. **Hono アダプター**: Hono のコンテキスト (`c`) をうまく扱えるヘルパーがあり、ミドルウェアの実装が非常に楽

## 実装ステップ

### 1. 依存関係のインストール

```bash
npm install better-auth --workspace backend
```

### 2. データベーススキーマの追加

BetterAuthに必要な4つのテーブルを`apps/backend/src/infrastructure/db/schema.ts`に追加します。

#### 必要なテーブル

1. **`user`テーブル** - ユーザー情報の管理

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .default(false)
    .notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
})
```

2. **`session`テーブル** - セッション管理（重要）

```typescript
export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
})
```

3. **`account`テーブル** - ソーシャル認証用（Google, GitHubログインなど）

```typescript
export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
```

4. **`verification`テーブル** - メール認証トークン管理

```typescript
export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})
```

#### 注意点

- 現在の`users`テーブルとBetterAuthの`user`テーブルは別物として扱います
- 将来的に統合を検討する必要がありますが、初期実装では共存させます

### 3. マイグレーション生成と実行

```bash
# マイグレーションファイルを生成
npm run db:generate --workspace backend

# ローカルで確認・テスト
npm run d1:migrate:local --workspace backend

# リモート環境への適用（明示的に実行が必要な場合のみ）
npm run d1:migrate:remote --workspace backend
```

### 4. BetterAuth設定ファイルの作成

`apps/backend/src/infrastructure/auth/index.ts` を作成:

```typescript
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import type { Env } from "../db/client.d1"

export const createAuth = (db: any) => betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite", // D1はSQLiteベース
  }),
  emailAndPassword: {
    enabled: true, // メール・パスワード認証を有効化
  },
  // 将来的な拡張例:
  // socialProviders: {
  //   github: {
  //     clientId: process.env.GITHUB_CLIENT_ID!,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  //   },
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID!,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  //   }
  // }
})
```

### 5. Honoアプリへの統合

`apps/backend/src/index.ts` を更新:

```typescript
import { Hono } from 'hono'
import type { Env } from './infrastructure/db/client.d1'
import { createAuth } from './infrastructure/auth'
import healthRouter from './routes/health'
import conversationsRouter from './routes/conversations'
import messagesRouter from './routes/messages'
import usersRouter from './routes/users'

const app = new Hono<{ Bindings: Env }>()

// BetterAuth ハンドラーをマウント
// これだけで /api/auth/sign-in, /api/auth/sign-up 等が自動生成されます
app.on(['POST', 'GET'], '/api/auth/**', async (c) => {
  const auth = createAuth(c.env.DB)
  return auth.handler(c.req.raw)
})

// 既存のルート
app.route('/health', healthRouter)
app.route('/conversations', conversationsRouter)
app.route('/messages', messagesRouter)
app.route('/users', usersRouter)

export default app
```

### 6. 認証ミドルウェアの作成

`apps/backend/src/middleware/auth.ts` を作成:

```typescript
import { createMiddleware } from 'hono/factory'
import { createAuth } from '../infrastructure/auth'
import type { Env } from '../infrastructure/db/client.d1'

// セッション情報を含む拡張されたContext型
type AuthVariables = {
  user: any // Better Authのユーザー型
  session: any // Better Authのセッション型
}

export const authMiddleware = createMiddleware<{
  Bindings: Env
  Variables: AuthVariables
}>(async (c, next) => {
  const auth = createAuth(c.env.DB)
  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  })

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', session.user)
  c.set('session', session.session)
  await next()
})

// 使用例:
// app.get('/protected', authMiddleware, (c) => {
//   const user = c.get('user')
//   return c.json({ user })
// })
```

### 7. 環境変数の設定

#### `apps/backend/.env` に追加

```env
# Better Auth
BETTER_AUTH_SECRET=<generate-random-32-char-string>
BETTER_AUTH_URL=http://localhost:8787

# 将来的なソーシャルログイン用（オプション）
# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**シークレットキーの生成方法:**
```bash
# Node.jsで生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# またはオンラインツールを使用
# https://generate-secret.vercel.app/32
```

#### `apps/backend/wrangler.toml` に追加

```toml
compatibility_flags = ["nodejs_compat"]
compatibility_date = "2024-09-23"
```

**重要**: `nodejs_compat`フラグはBetter AuthがAsyncLocalStorageを使用するために必須です。

### 8. テストの追加

`apps/backend/src/routes/auth.test.ts` を作成:

```typescript
import { describe, it, expect } from 'vitest'
import app from '../index'

describe('Authentication Endpoints', () => {
  it('POST /api/auth/sign-up - should create new user', async () => {
    const res = await app.request('/api/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe('test@example.com')
  })

  it('POST /api/auth/sign-in/email - should login with credentials', async () => {
    // まずユーザーを作成
    await app.request('/api/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify({
        email: 'login@example.com',
        password: 'password123',
        name: 'Login User'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // ログイン
    const res = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'login@example.com',
        password: 'password123'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.user).toBeDefined()
  })

  it('GET /api/auth/session - should return session info', async () => {
    // ログイン処理でセッションを取得
    const loginRes = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'login@example.com',
        password: 'password123'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const cookies = loginRes.headers.get('Set-Cookie')

    // セッション取得
    const res = await app.request('/api/auth/session', {
      method: 'GET',
      headers: {
        'Cookie': cookies || ''
      }
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.session).toBeDefined()
    expect(data.user).toBeDefined()
  })

  it('POST /api/auth/sign-out - should logout user', async () => {
    const res = await app.request('/api/auth/sign-out', {
      method: 'POST'
    })

    expect(res.status).toBe(200)
  })
})
```

## 実装後に利用可能なエンドポイント

BetterAuthが自動生成するエンドポイント:

### ユーザー登録・認証

- `POST /api/auth/sign-up` - 新規ユーザー登録
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "User Name"
  }
  ```

- `POST /api/auth/sign-in/email` - メール・パスワードでログイン
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123"
  }
  ```

- `POST /api/auth/sign-out` - ログアウト

### セッション管理

- `GET /api/auth/session` - 現在のセッション情報を取得

### パスワード管理

- `POST /api/auth/forget-password` - パスワードリセット要求
- `POST /api/auth/reset-password` - パスワードリセット実行

### メール認証

- `POST /api/auth/send-verification-email` - 確認メール送信
- `GET /api/auth/verify-email` - メールアドレス確認

## クライアント側の実装例

### TypeScript/React での使用例

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/client"

export const authClient = createAuthClient({
  baseURL: "http://localhost:8787" // または本番環境のURL
})

// コンポーネント内での使用例
const SignUpComponent = () => {
  const handleSignUp = async () => {
    try {
      const { data, error } = await authClient.signUp.email({
        email: "test@example.com",
        password: "password123",
        name: "Test User"
      })

      if (error) {
        console.error("Sign up failed:", error)
        return
      }

      console.log("User created:", data)
    } catch (err) {
      console.error("Unexpected error:", err)
    }
  }

  return <button onClick={handleSignUp}>Sign Up</button>
}

// ログインの例
const SignInComponent = () => {
  const handleSignIn = async () => {
    const { data, error } = await authClient.signIn.email({
      email: "test@example.com",
      password: "password123"
    })

    if (error) {
      console.error("Sign in failed:", error)
      return
    }

    console.log("Logged in:", data)
  }

  return <button onClick={handleSignIn}>Sign In</button>
}

// セッション取得の例
const SessionComponent = () => {
  const [session, setSession] = useState(null)

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await authClient.getSession()
      setSession(data)
    }

    fetchSession()
  }, [])

  return session ? (
    <div>Logged in as {session.user.name}</div>
  ) : (
    <div>Not logged in</div>
  )
}
```

## 将来的な拡張可能性

BetterAuthはプラグインシステムを通じて、以下の機能を簡単に追加できます:

### 1. 2要素認証 (2FA)

```typescript
import { twoFactor } from "better-auth/plugins"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  plugins: [
    twoFactor({
      // OTP (ワンタイムパスワード) の設定
    })
  ]
})
```

### 2. ソーシャルログイン

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
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

### 3. パスキー (Passkeys) 認証

指紋認証や FaceID を使ったログイン機能:

```typescript
import { passkey } from "better-auth/plugins"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  plugins: [
    passkey()
  ]
})
```

### 4. 組織管理 (Multi-tenant)

SaaS向けのチーム・組織機能:

```typescript
import { organization } from "better-auth/plugins"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  plugins: [
    organization({
      // ユーザーが複数の組織に属し、
      // 組織ごとに権限（Admin, Memberなど）を持つ
    })
  ]
})
```

## 注意点・制約事項

### 1. 既存の`users`テーブルとの共存

- 現在のチャット機能で使用している`users`テーブル（`id_alias`, `avatar_url`などを含む）とBetterAuthの`user`テーブルは別管理
- 将来的には以下のいずれかの方法で統合を検討:
  - BetterAuthの`user`テーブルをカスタマイズして既存のフィールドを追加
  - 既存の`users`テーブルを`user_profiles`などにリネームし、BetterAuthの`user`と1対1の関係を持たせる

### 2. Cloudflare D1の制約

- D1はSQLiteベースのため、一部の高度な機能が制限される可能性があります
- トランザクションやロックの動作が通常のPostgreSQLやMySQLと異なる場合があります

### 3. Cloudflare Workers の要件

- **必須**: `wrangler.toml`に`nodejs_compat`フラグを設定
- AsyncLocalStorageのサポートが必要なため、この設定なしでは動作しません

### 4. セキュリティ考慮事項

- `BETTER_AUTH_SECRET`は本番環境では必ず強力なランダム文字列を使用
- 本番環境では`BETTER_AUTH_URL`を適切なドメインに設定
- HTTPS を強制することを推奨

### 5. データ所有権

- ユーザーデータは完全に自社のD1データベース内に保存されます
- Clerk等のSaaS型認証サービスと異なり、「データが人質になる」リスクがありません

## 参考リンク

- [Better Auth 公式ドキュメント](https://www.better-auth.com)
- [Hono との統合例](https://hono.dev/examples/better-auth)
- [Drizzle Adapter](https://www.better-auth.com/docs/adapters/drizzle)
- [Cloudflare Workers 設定](https://www.better-auth.com/docs/installation)

## まとめ

BetterAuthは、Cloudflare Workers × D1 の環境で認証を実装する場合のデファクトスタンダードになりつつあります。

### 選ぶべき理由

- **手間いらず**: `auth.handler`を置くだけでバックエンドAPIが完成
- **データ所有権**: ユーザーデータは完全に自社のD1データベース内
- **型安全性**: バックエンドのDrizzle定義からフロントエンドの関数呼び出しまで、TypeScriptの型が効き続ける
- **拡張性**: プラグインシステムで高度な機能を簡単に追加可能
