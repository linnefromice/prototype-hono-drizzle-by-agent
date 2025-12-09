# Cloudflare Workers + D1 デプロイ実装計画

## 概要

このドキュメントでは、現在 Node.js + PostgreSQL で動作している Hono アプリケーションを Cloudflare Workers + D1 (SQLite) に移行するための実装計画を定義します。

## 現在の構成

### 技術スタック
- **ランタイム**: Node.js
- **フレームワーク**: Hono 4.6.5
- **データベース**: PostgreSQL (Docker)
- **ORM**: Drizzle ORM 0.35.1
- **デプロイ**: ローカル開発のみ

### データベーススキーマ
- **users**: ユーザー情報
- **conversations**: 会話（direct/group）
- **participants**: 会話参加者
- **messages**: メッセージ（text/system）
- **reactions**: メッセージへのリアクション
- **conversation_reads**: 既読管理
- **bookmarks**: ブックマーク

### 主要な機能
- ユーザー管理 API
- 会話管理 API（ダイレクト・グループチャット）
- メッセージ送受信
- リアクション機能
- ブックマーク機能
- 既読管理

---

## 移行の課題と対応策

### 1. データベースの違い: PostgreSQL → SQLite (D1)

#### 課題
| PostgreSQL 機能 | D1/SQLite 対応 | 影響 | 対応策 |
|----------------|---------------|------|--------|
| `ENUM` 型 | ❌ 非対応 | スキーマ変更必要 | `TEXT` + `CHECK` 制約に変更 |
| `uuid` 型 | ❌ 非対応 | データ型変更必要 | `TEXT` 型で UUID 文字列を保存 |
| `TIMESTAMP WITH TIMEZONE` | ⚠️ 制限あり | タイムゾーン処理 | UTC + ISO 8601 文字列で保存 |
| `CASCADE` 削除 | ✅ 対応 | 問題なし | そのまま使用可能 |
| `UNIQUE INDEX` | ✅ 対応 | 問題なし | そのまま使用可能 |

#### 対応内容

**ENUM → TEXT + CHECK 制約**
```sql
-- PostgreSQL (現在)
CREATE TYPE conversation_type AS ENUM ('direct', 'group');

-- D1/SQLite (移行後)
CREATE TABLE conversations (
  type TEXT NOT NULL CHECK (type IN ('direct', 'group'))
);
```

**UUID → TEXT**
```sql
-- PostgreSQL (現在)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- D1/SQLite (移行後)
id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))
```

**TIMESTAMP → TEXT (ISO 8601)**
```sql
-- PostgreSQL (現在)
created_at TIMESTAMP WITH TIMEZONE DEFAULT NOW()

-- D1/SQLite (移行後)
created_at TEXT NOT NULL DEFAULT (datetime('now'))
```

---

### 2. Drizzle ORM のアダプター変更

#### 現在の実装
```typescript
// apps/backend/src/infrastructure/db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

export const pool = new Pool({ connectionString: env.DATABASE_URL })
export const db = drizzle(pool)
```

#### 移行後の実装
```typescript
// apps/backend/src/infrastructure/db/client.ts
import { drizzle } from 'drizzle-orm/d1'

export function createDb(env: { DB: D1Database }) {
  return drizzle(env.DB)
}
```

#### スキーマ定義の変更

**Before (PostgreSQL)**:
```typescript
// apps/backend/src/infrastructure/db/schema.ts
import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const conversationTypeEnum = pgEnum('conversation_type', ['direct', 'group'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

**After (D1/SQLite)**:
```typescript
// apps/backend/src/infrastructure/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text('type', { enum: ['direct', 'group'] }).notNull(),
  name: text('name'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
```

---

### 3. Cloudflare Workers 固有の制約

#### 制約事項
| 項目 | 制限 | 影響 | 対応策 |
|------|------|------|--------|
| CPU 実行時間 | 最大 50ms (無料) / 30秒 (有料) | 長時間クエリ | クエリ最適化、インデックス追加 |
| メモリ | 128MB | 大量データ処理 | ページネーション強制、バッチ処理回避 |
| リクエストサイズ | 100MB | ファイルアップロード | R2 ストレージと併用 |
| D1 クエリ制限 | 1000 rows/query | 大量データ取得 | `LIMIT` 句の強制、複数クエリに分割 |
| Node.js API | ❌ 使用不可 | `pg` パッケージ | Drizzle D1 アダプター使用 |

#### 対応内容

**環境変数アクセスの変更**
```typescript
// Before (Node.js)
const env = process.env.DATABASE_URL

// After (Cloudflare Workers)
export default {
  async fetch(request: Request, env: Env) {
    const db = drizzle(env.DB)
    // ...
  }
}
```

**Web Standards API への移行**
```typescript
// Before (Node.js)
import { readFileSync } from 'fs'

// After (Cloudflare Workers)
// ファイルシステムアクセス不可 → ビルド時に埋め込むか R2 から取得
```

---

## 実装計画

### Phase 1: スキーマ移行と D1 セットアップ

#### Step 1: D1 データベース作成

```bash
# Wrangler CLI のインストール
npm install -g wrangler

# Cloudflare にログイン
wrangler login

# D1 データベース作成
wrangler d1 create prototype-hono-drizzle-db

# 出力例:
# Database ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Step 2: Drizzle スキーマの SQLite 対応

```typescript
// apps/backend/src/infrastructure/db/schema.d1.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text('type', { enum: ['direct', 'group'] }).notNull(),
  name: text('name'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const participants = sqliteTable('participants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['member', 'admin'] }).notNull().default('member'),
  joinedAt: text('joined_at').notNull().$defaultFn(() => new Date().toISOString()),
  leftAt: text('left_at'),
})

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderUserId: text('sender_user_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type', { enum: ['text', 'system'] }).notNull().default('text'),
  text: text('text'),
  replyToMessageId: text('reply_to_message_id'),
  systemEvent: text('system_event', { enum: ['join', 'leave'] }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const reactions = sqliteTable('reactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const conversationReads = sqliteTable('conversation_reads', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastReadMessageId: text('last_read_message_id').references(() => messages.id, { onDelete: 'set null' }),
  lastReadAt: text('last_read_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const bookmarks = sqliteTable('bookmarks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})
```

#### Step 3: マイグレーション生成

```bash
# D1 用の drizzle.config.ts を作成
cat > apps/backend/drizzle.config.d1.ts << 'EOF'
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/infrastructure/db/schema.d1.ts',
  out: './drizzle/d1',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
} satisfies Config
EOF

# マイグレーション生成
npx drizzle-kit generate --config=drizzle.config.d1.ts

# D1 にマイグレーション適用
wrangler d1 migrations apply prototype-hono-drizzle-db --local  # ローカルテスト
wrangler d1 migrations apply prototype-hono-drizzle-db --remote # 本番適用
```

---

### Phase 2: Workers アプリケーション作成

#### Step 1: wrangler.toml 設定

```toml
# apps/backend/wrangler.toml
name = "prototype-hono-drizzle-api"
main = "src/index.ts"
compatibility_date = "2024-12-09"
compatibility_flags = ["nodejs_compat"]

[build]
command = "npm run build"

[[d1_databases]]
binding = "DB"
database_name = "prototype-hono-drizzle-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" # Step 1 で作成した ID

[vars]
NODE_ENV = "production"

# ローカル開発用
[[env.dev.d1_databases]]
binding = "DB"
database_name = "prototype-hono-drizzle-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

#### Step 2: エントリーポイント作成

```typescript
// apps/backend/src/index.ts
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import app from './app'

export interface Env {
  DB: D1Database
  NODE_ENV: string
}

// Cloudflare Workers エントリーポイント
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // D1 データベース接続を Hono コンテキストに注入
    const db = drizzle(env.DB)

    // Hono アプリに環境変数を渡す
    return app.fetch(request, { ...env, db })
  },
}
```

#### Step 3: DB クライアント抽象化

```typescript
// apps/backend/src/infrastructure/db/client.ts
import { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { Pool } from 'pg'
import type { D1Database } from '@cloudflare/workers-types'

// PostgreSQL 用（開発環境）
export function createPostgresDb(connectionString: string) {
  const pool = new Pool({ connectionString })
  return drizzleNodePostgres(pool)
}

// D1 用（本番環境）
export function createD1Db(d1: D1Database) {
  return drizzleD1(d1)
}

// 環境に応じて自動選択
export function createDb(env: any) {
  if (env.DB && typeof env.DB === 'object' && 'prepare' in env.DB) {
    // D1 データベース
    return createD1Db(env.DB as D1Database)
  } else if (env.DATABASE_URL) {
    // PostgreSQL
    return createPostgresDb(env.DATABASE_URL)
  }
  throw new Error('No database configuration found')
}
```

#### Step 4: Hono アプリの修正

```typescript
// apps/backend/src/app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import healthRouter from './routes/health'
import conversationsRouter from './routes/conversations'
import messagesRouter from './routes/messages'
import usersRouter from './routes/users'

// 環境変数の型定義
interface Env {
  DB: D1Database
  NODE_ENV: string
  db?: ReturnType<typeof drizzle> // DI された DB インスタンス
}

const app = new Hono<{ Bindings: Env }>()

// CORS 設定
app.use('*', cors())

// ルーティング
app.route('/health', healthRouter)
app.route('/conversations', conversationsRouter)
app.route('/messages', messagesRouter)
app.route('/users', usersRouter)

export default app
```

---

### Phase 3: リポジトリ層の修正

#### Before (PostgreSQL 用)
```typescript
// apps/backend/src/repositories/drizzleUserRepository.ts
import { db } from '../infrastructure/db/client'
import { users } from '../infrastructure/db/schema'

export class DrizzleUserRepository {
  async findAll() {
    return db.select().from(users)
  }
}
```

#### After (環境対応)
```typescript
// apps/backend/src/repositories/drizzleUserRepository.ts
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { users } from '../infrastructure/db/schema.d1'

export class DrizzleUserRepository {
  constructor(private db: DrizzleD1Database) {}

  async findAll() {
    return this.db.select().from(users)
  }

  async findById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    return user
  }
}
```

#### ルーター層での DI

```typescript
// apps/backend/src/routes/users.ts
import { Hono } from 'hono'
import { DrizzleUserRepository } from '../repositories/drizzleUserRepository'

const router = new Hono<{ Bindings: Env }>()

router.get('/', async (c) => {
  const db = c.env.db // DI された DB インスタンス
  const userRepo = new DrizzleUserRepository(db)

  const users = await userRepo.findAll()
  return c.json(users)
})

export default router
```

---

### Phase 4: ビルドとデプロイ設定

#### Step 1: package.json スクリプト更新

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "dev:local": "wrangler dev --local",
    "build": "tsc && esbuild src/index.ts --bundle --format=esm --outfile=dist/index.js",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging",
    "deploy:production": "wrangler deploy --env production",
    "d1:shell": "wrangler d1 execute prototype-hono-drizzle-db --command 'SELECT * FROM users'",
    "d1:migrate": "wrangler d1 migrations apply prototype-hono-drizzle-db",
    "test": "vitest"
  }
}
```

#### Step 2: TypeScript 設定

```json
// apps/backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

#### Step 3: 依存パッケージ追加

```bash
npm install --save-dev @cloudflare/workers-types wrangler
npm install drizzle-orm@latest
```

---

### Phase 5: データ移行

#### PostgreSQL → D1 データ移行スクリプト

```typescript
// scripts/migrate-pg-to-d1.ts
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../apps/backend/src/infrastructure/db/schema.d1'

async function migrate() {
  // PostgreSQL からデータ取得
  const pgPool = new Pool({ connectionString: process.env.DATABASE_URL })
  const pgDb = drizzle(pgPool)

  const users = await pgDb.select().from(schema.users)
  const conversations = await pgDb.select().from(schema.conversations)
  // ... 他のテーブル

  // D1 にデータ挿入
  // wrangler d1 execute コマンドで一括挿入
  const insertStatements = users.map(user =>
    `INSERT INTO users (id, name, avatar_url, created_at) VALUES ('${user.id}', '${user.name}', ${user.avatarUrl ? `'${user.avatarUrl}'` : 'NULL'}, '${user.createdAt}');`
  ).join('\n')

  console.log(insertStatements)
}

migrate()
```

---

## デプロイフロー

### ローカル開発
```bash
# D1 ローカルインスタンス起動
wrangler dev --local

# または PostgreSQL を使用（既存の開発環境）
npm run dev
```

### ステージング環境
```bash
# D1 ステージング DB 作成
wrangler d1 create prototype-hono-drizzle-db-staging

# マイグレーション適用
wrangler d1 migrations apply prototype-hono-drizzle-db-staging

# デプロイ
npm run deploy:staging
```

### 本番環境
```bash
# マイグレーション適用
wrangler d1 migrations apply prototype-hono-drizzle-db

# デプロイ
npm run deploy:production
```

---

## テスト戦略

### ユニットテスト
- ローカル D1 (SQLite) を使用
- Vitest + drizzle-orm/better-sqlite3

### 統合テスト
```typescript
// apps/backend/src/routes/users.test.ts
import { unstable_dev } from 'wrangler'

describe('Users API (D1)', () => {
  let worker: any

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    })
  })

  afterAll(async () => {
    await worker.stop()
  })

  it('GET /users returns users', async () => {
    const resp = await worker.fetch('http://localhost/users')
    expect(resp.status).toBe(200)
    const users = await resp.json()
    expect(Array.isArray(users)).toBe(true)
  })
})
```

---

## コスト見積もり

### Cloudflare Workers (無料プラン)
- **リクエスト数**: 100,000 req/日
- **CPU 時間**: 10ms/req (合計 50ms/req 以内)
- **無料枠**: 十分

### Cloudflare D1 (無料プラン)
- **読み取り**: 500万 rows/日
- **書き込み**: 10万 rows/日
- **ストレージ**: 5GB
- **無料枠**: 十分（中規模アプリまで対応可能）

### 有料プラン移行タイミング
- リクエスト > 100,000 req/日
- D1 読み取り > 500万 rows/日
- ストレージ > 5GB

---

## リスクと軽減策

### リスク1: SQLite の機能制限

**リスク**: PostgreSQL の高度な機能が使えない
- Window関数、CTE、Full-text search

**軽減策**:
- アプリケーション層で実装
- Cloudflare Vectorize (ベクトル検索) と併用
- 必要に応じて PostgreSQL を Hyperdrive 経由で使用

### リスク2: D1 のレイテンシ

**リスク**: 地理的に離れた場所からのアクセスが遅い

**軽減策**:
- Cloudflare KV でキャッシュ
- Durable Objects でステートフル処理
- エッジロケーション最適化

### リスク3: デバッグの難しさ

**リスク**: Workers 環境でのデバッグが難しい

**軽減策**:
- `wrangler dev --local` でローカルテスト
- `console.log` + Cloudflare Logs
- Sentry などのエラートラッキング

---

## 実装スケジュール

### Week 1-2: 準備と調査
- [x] Cloudflare Workers と D1 の調査
- [ ] スキーマ変換設計
- [ ] 移行計画ドキュメント作成

### Week 3-4: スキーマ移行
- [ ] D1 用スキーマ作成
- [ ] マイグレーションスクリプト作成
- [ ] ローカル D1 環境セットアップ

### Week 5-6: アプリケーション移行
- [ ] DB クライアント抽象化
- [ ] リポジトリ層修正
- [ ] Workers エントリーポイント作成

### Week 7: テストと検証
- [ ] ユニットテスト更新
- [ ] 統合テスト実行
- [ ] パフォーマンステスト

### Week 8: デプロイと監視
- [ ] ステージング環境デプロイ
- [ ] 本番環境デプロイ
- [ ] 監視設定

---

## 代替案: Hyperdrive を使用して PostgreSQL を継続

Cloudflare Workers から PostgreSQL を使い続けたい場合、**Hyperdrive** を使用する選択肢もあります。

### Hyperdrive とは
- Cloudflare の PostgreSQL コネクションプーリングサービス
- Workers から PostgreSQL に高速接続
- Supabase, Neon, AWS RDS などに対応

### メリット
- ✅ 既存のスキーマをそのまま使用可能
- ✅ PostgreSQL の全機能が使える
- ✅ 移行コストが低い

### デメリット
- ❌ D1 より高コスト
- ❌ レイテンシが D1 より若干高い
- ❌ 外部データベースの管理が必要

### 実装例
```toml
# wrangler.toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

```typescript
// src/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

export default {
  async fetch(request: Request, env: Env) {
    const client = postgres(env.HYPERDRIVE.connectionString)
    const db = drizzle(client)
    // 既存のコードをそのまま使用可能
  }
}
```

---

## まとめ

### 推奨アプローチ: D1 移行

**理由:**
- Cloudflare エコシステムとの統合
- 低レイテンシ（エッジでの実行）
- 無料枠が大きい
- スケーラビリティ

**次のアクション:**
1. D1 データベース作成
2. スキーマ変換（PostgreSQL → SQLite）
3. ローカル開発環境セットアップ
4. 段階的な移行

### 代替案: Hyperdrive + PostgreSQL

**適用ケース:**
- PostgreSQL 固有機能が必須
- 既存データベースを活用したい
- 移行コストを最小化したい

---

この計画に基づいて実装を開始しますか？まずはローカル D1 環境のセットアップから始めることをお勧めします。
