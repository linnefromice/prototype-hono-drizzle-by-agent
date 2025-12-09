# マルチデータベース対応実装計画

## 概要

このドキュメントでは、PostgreSQL と D1 (SQLite) の両方をサポートするアーキテクチャの実装計画を定義します。これにより、ローカル開発では PostgreSQL、本番環境では Cloudflare Workers + D1 という柔軟な運用が可能になります。

## 目的

- **開発環境**: PostgreSQL (Docker) を使用した高速な開発サイクル
- **本番環境**: Cloudflare Workers + D1 でのスケーラブルなデプロイ
- **単一コードベース**: 環境に応じて自動的にデータベースを切り替え
- **段階的移行**: 既存の PostgreSQL コードを保持しながら D1 対応を追加

---

## アーキテクチャ設計

### 設計原則

1. **環境による自動切り替え**: 環境変数に基づいてデータベースを選択
2. **型安全性の維持**: TypeScript の型システムを活用
3. **DI パターン**: データベースクライアントを外部から注入
4. **テスト容易性**: モックが簡単に作成できる設計

### レイヤー構成

```
┌─────────────────────────────────────┐
│   Routes (Hono Handlers)            │
├─────────────────────────────────────┤
│   Use Cases / Services              │
├─────────────────────────────────────┤
│   Repositories (DB非依存)           │
├─────────────────────────────────────┤
│   Database Client Factory           │ ← 環境判定
├──────────────┬──────────────────────┤
│ PostgreSQL   │   D1 (SQLite)        │
│ Schema       │   Schema             │
└──────────────┴──────────────────────┘
```

---

## 実装アプローチの比較

### アプローチ1: 条件分岐による動的スキーマ選択

**概要**: ビルド時または実行時に環境変数を参照してスキーマを切り替える

```typescript
// apps/backend/src/infrastructure/db/schema.ts
import { isD1Environment } from '../utils/env'

export * from isD1Environment()
  ? './schema/d1'
  : './schema/postgres'
```

**メリット**:
- ✅ 既存コードの変更が最小限
- ✅ ビルド時に不要なコードを除外可能
- ✅ 型安全性が保たれる

**デメリット**:
- ❌ ランタイムでの切り替えが困難
- ❌ テストで両方のDBを使う場合に工夫が必要

**推奨度**: ⭐⭐⭐

---

### アプローチ2: アダプターパターン

**概要**: データベース層を抽象化し、実装クラスを環境に応じて切り替える

```typescript
export interface DatabaseAdapter {
  users: UserTable
  conversations: ConversationTable
}

class PostgresAdapter implements DatabaseAdapter { /* ... */ }
class D1Adapter implements DatabaseAdapter { /* ... */ }
```

**メリット**:
- ✅ 明確な責任分離
- ✅ テストが容易（モック作成が簡単）
- ✅ 将来的に他のDBへの対応も容易

**デメリット**:
- ❌ ボイラープレートコードが増える
- ❌ Drizzle ORM の型推論の恩恵を受けにくい

**推奨度**: ⭐⭐⭐⭐

---

### アプローチ3: ファクトリーパターン + スキーマ分離（推奨）

**概要**: スキーマファイルを完全に分離し、ファクトリー関数で適切なクライアントを生成

```typescript
export function createDatabase(env: any) {
  if (isD1Database(env)) {
    return { type: 'd1', db: drizzleD1(env.DB), schema: d1Schema }
  } else {
    return { type: 'postgres', db: drizzlePg(pool), schema: pgSchema }
  }
}
```

**メリット**:
- ✅ Drizzle ORM の全機能を活用
- ✅ 型安全性が最も高い
- ✅ 各環境で最適化されたクエリを記述可能
- ✅ テストも柔軟

**デメリット**:
- ⚠️ スキーマを2つ維持する必要がある
- ⚠️ 初期実装コストがやや高い

**推奨度**: ⭐⭐⭐⭐⭐

---

## 推奨実装: ハイブリッドアプローチ

**アプローチ3（ファクトリーパターン）をベースに、アプローチ2（アダプター）の要素を組み合わせる**

### 実装詳細

#### Phase 1: ディレクトリ構成の整理

```
apps/backend/src/
├── infrastructure/
│   └── db/
│       ├── schema/
│       │   ├── postgres.ts      # PostgreSQL 用スキーマ
│       │   ├── d1.ts             # D1/SQLite 用スキーマ
│       │   ├── types.ts          # 共通型定義
│       │   └── index.ts          # 環境に応じたスキーマエクスポート
│       ├── client.ts             # データベースクライアントファクトリー
│       └── migrations/
│           ├── postgres/         # PostgreSQL マイグレーション
│           └── d1/               # D1 マイグレーション
├── repositories/
│   ├── userRepository.ts         # DB非依存のリポジトリ
│   └── chatRepository.ts
├── utils/
│   └── env.ts                    # 環境判定ユーティリティ
└── ...
```

---

#### Phase 2: 環境判定ユーティリティ

```typescript
// apps/backend/src/utils/env.ts
import type { D1Database } from '@cloudflare/workers-types'

/**
 * 環境が開発モードかどうかを判定
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * 環境が本番モードかどうかを判定
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * 環境が D1 データベースを使用しているかを判定
 */
export function isD1Database(env: any): env is { DB: D1Database } {
  return env.DB && typeof env.DB === 'object' && 'prepare' in env.DB
}

/**
 * 環境が PostgreSQL を使用しているかを判定
 */
export function isPostgresDatabase(env: any): env is { DATABASE_URL: string } {
  return typeof env.DATABASE_URL === 'string' && env.DATABASE_URL.length > 0
}

/**
 * データベースタイプを取得
 */
export type DatabaseType = 'postgres' | 'd1' | 'unknown'

export function getDatabaseType(env: any): DatabaseType {
  if (isD1Database(env)) return 'd1'
  if (isPostgresDatabase(env)) return 'postgres'
  return 'unknown'
}
```

---

#### Phase 3: スキーマ定義の分離

**PostgreSQL スキーマ**:

```typescript
// apps/backend/src/infrastructure/db/schema/postgres.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// Enum 定義
export const conversationTypeEnum = pgEnum('conversation_type', ['direct', 'group'])
export const participantRoleEnum = pgEnum('participant_role', ['member', 'admin'])
export const messageTypeEnum = pgEnum('message_type', ['text', 'system'])
export const systemEventEnum = pgEnum('system_event', ['join', 'leave'])

// Users テーブル
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Conversations テーブル
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: conversationTypeEnum('type').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Participants テーブル
export const participants = pgTable('participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: participantRoleEnum('role').notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  leftAt: timestamp('left_at', { withTimezone: true }),
}, (table) => ({
  conversationUserUnique: uniqueIndex('participants_conversation_user_unique').on(
    table.conversationId,
    table.userId,
  ),
}))

// Messages テーブル
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderUserId: uuid('sender_user_id').references(() => users.id, { onDelete: 'set null' }),
  type: messageTypeEnum('type').notNull().default('text'),
  text: text('text'),
  replyToMessageId: uuid('reply_to_message_id'),
  systemEvent: systemEventEnum('system_event'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Reactions テーブル
export const reactions = pgTable('reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  reactionUnique: uniqueIndex('reaction_unique').on(
    table.messageId,
    table.userId,
    table.emoji,
  ),
}))

// ConversationReads テーブル
export const conversationReads = pgTable('conversation_reads', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  lastReadMessageId: uuid('last_read_message_id').references(() => messages.id, {
    onDelete: 'set null',
  }),
  lastReadAt: timestamp('last_read_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  conversationUserUnique: uniqueIndex('conversation_reads_conversation_user_unique').on(
    table.conversationId,
    table.userId,
  ),
}))

// Bookmarks テーブル
export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  bookmarkUnique: uniqueIndex('bookmark_unique').on(table.messageId, table.userId),
}))
```

**D1/SQLite スキーマ**:

```typescript
// apps/backend/src/infrastructure/db/schema/d1.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Users テーブル
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// Conversations テーブル
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text('type', { enum: ['direct', 'group'] }).notNull(),
  name: text('name'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// Participants テーブル
export const participants = sqliteTable('participants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['member', 'admin'] }).notNull().default('member'),
  joinedAt: text('joined_at').notNull().$defaultFn(() => new Date().toISOString()),
  leftAt: text('left_at'),
}, (table) => ({
  // SQLite では UNIQUE INDEX をサポート
  conversationUserUnique: sql`UNIQUE(${table.conversationId}, ${table.userId})`,
}))

// Messages テーブル
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderUserId: text('sender_user_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type', { enum: ['text', 'system'] }).notNull().default('text'),
  text: text('text'),
  replyToMessageId: text('reply_to_message_id'),
  systemEvent: text('system_event', { enum: ['join', 'leave'] }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

// Reactions テーブル
export const reactions = sqliteTable('reactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  messageId: text('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  reactionUnique: sql`UNIQUE(${table.messageId}, ${table.userId}, ${table.emoji})`,
}))

// ConversationReads テーブル
export const conversationReads = sqliteTable('conversation_reads', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  lastReadMessageId: text('last_read_message_id').references(() => messages.id, {
    onDelete: 'set null',
  }),
  lastReadAt: text('last_read_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  conversationUserUnique: sql`UNIQUE(${table.conversationId}, ${table.userId})`,
}))

// Bookmarks テーブル
export const bookmarks = sqliteTable('bookmarks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  messageId: text('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  bookmarkUnique: sql`UNIQUE(${table.messageId}, ${table.userId})`,
}))
```

**共通型定義**:

```typescript
// apps/backend/src/infrastructure/db/schema/types.ts
import type * as pgSchema from './postgres'
import type * as d1Schema from './d1'

// 共通の型定義
export type ConversationType = 'direct' | 'group'
export type ParticipantRole = 'member' | 'admin'
export type MessageType = 'text' | 'system'
export type SystemEvent = 'join' | 'leave'

// ユニオン型でどちらのスキーマも受け入れる
export type UsersTable = typeof pgSchema.users | typeof d1Schema.users
export type ConversationsTable = typeof pgSchema.conversations | typeof d1Schema.conversations
export type ParticipantsTable = typeof pgSchema.participants | typeof d1Schema.participants
export type MessagesTable = typeof pgSchema.messages | typeof d1Schema.messages
export type ReactionsTable = typeof pgSchema.reactions | typeof d1Schema.reactions
export type ConversationReadsTable = typeof pgSchema.conversationReads | typeof d1Schema.conversationReads
export type BookmarksTable = typeof pgSchema.bookmarks | typeof d1Schema.bookmarks

// スキーマ全体の型
export type DatabaseSchema = {
  users: UsersTable
  conversations: ConversationsTable
  participants: ParticipantsTable
  messages: MessagesTable
  reactions: ReactionsTable
  conversationReads: ConversationReadsTable
  bookmarks: BookmarksTable
}
```

---

#### Phase 4: データベースクライアントファクトリー

```typescript
// apps/backend/src/infrastructure/db/client.ts
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import type { D1Database } from '@cloudflare/workers-types'
import * as pgSchema from './schema/postgres'
import * as d1Schema from './schema/d1'
import { isD1Database, isPostgresDatabase, getDatabaseType } from '../../utils/env'

/**
 * PostgreSQL データベースクライアント型
 */
export type PostgresClient = {
  type: 'postgres'
  db: ReturnType<typeof drizzlePg<typeof pgSchema>>
  schema: typeof pgSchema
  close: () => Promise<void>
}

/**
 * D1 データベースクライアント型
 */
export type D1Client = {
  type: 'd1'
  db: ReturnType<typeof drizzleD1<typeof d1Schema>>
  schema: typeof d1Schema
  close: () => Promise<void>
}

/**
 * データベースクライアントのユニオン型
 */
export type DatabaseClient = PostgresClient | D1Client

/**
 * PostgreSQL データベースクライアントを作成
 */
export function createPostgresClient(connectionString: string): PostgresClient {
  const pool = new Pool({ connectionString })
  const db = drizzlePg(pool, { schema: pgSchema })

  return {
    type: 'postgres',
    db,
    schema: pgSchema,
    close: async () => {
      await pool.end()
    },
  }
}

/**
 * D1 データベースクライアントを作成
 */
export function createD1Client(d1: D1Database): D1Client {
  const db = drizzleD1(d1, { schema: d1Schema })

  return {
    type: 'd1',
    db,
    schema: d1Schema,
    close: async () => {
      // D1 には明示的なクローズは不要
    },
  }
}

/**
 * 環境に応じて適切なデータベースクライアントを作成
 *
 * @param env - 環境変数オブジェクト
 * @returns データベースクライアント
 * @throws {Error} データベース設定が見つからない場合
 *
 * @example
 * // Node.js 環境
 * const client = createDatabase({ DATABASE_URL: 'postgresql://...' })
 *
 * @example
 * // Cloudflare Workers 環境
 * const client = createDatabase({ DB: env.DB })
 */
export function createDatabase(env: any): DatabaseClient {
  const dbType = getDatabaseType(env)

  switch (dbType) {
    case 'd1':
      return createD1Client(env.DB)

    case 'postgres':
      return createPostgresClient(env.DATABASE_URL)

    case 'unknown':
    default:
      throw new Error(
        'No database configuration found. Please set DATABASE_URL (PostgreSQL) or DB (D1).'
      )
  }
}

/**
 * グローバルなデータベースクライアントインスタンス（シングルトン）
 * Node.js 環境でのみ使用
 */
let globalDbClient: DatabaseClient | null = null

/**
 * グローバルデータベースクライアントを取得または作成
 *
 * @param env - 環境変数オブジェクト
 * @returns データベースクライアント
 */
export function getOrCreateDatabase(env: any): DatabaseClient {
  if (!globalDbClient) {
    globalDbClient = createDatabase(env)
  }
  return globalDbClient
}

/**
 * グローバルデータベースクライアントをクローズ
 */
export async function closeGlobalDatabase(): Promise<void> {
  if (globalDbClient) {
    await globalDbClient.close()
    globalDbClient = null
  }
}
```

---

#### Phase 5: リポジトリ層の実装

```typescript
// apps/backend/src/repositories/userRepository.ts
import { eq } from 'drizzle-orm'
import type { DatabaseClient } from '../infrastructure/db/client'

/**
 * ユーザーリポジトリ
 * データベース非依存の実装
 */
export class UserRepository {
  constructor(private dbClient: DatabaseClient) {}

  /**
   * 全ユーザーを取得
   */
  async findAll() {
    const { db, schema } = this.dbClient
    return db.select().from(schema.users)
  }

  /**
   * ID でユーザーを検索
   */
  async findById(id: string) {
    const { db, schema } = this.dbClient
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1)

    return user ?? null
  }

  /**
   * ユーザーを作成
   */
  async create(data: { name: string; avatarUrl?: string | null }) {
    const { db, schema, type } = this.dbClient

    // PostgreSQL と D1 で挿入方法が同じ
    const [user] = await db
      .insert(schema.users)
      .values({
        name: data.name,
        avatarUrl: data.avatarUrl ?? null,
      })
      .returning()

    return user
  }

  /**
   * ユーザーを更新
   */
  async update(id: string, data: Partial<{ name: string; avatarUrl: string | null }>) {
    const { db, schema } = this.dbClient

    const [user] = await db
      .update(schema.users)
      .set(data)
      .where(eq(schema.users.id, id))
      .returning()

    return user ?? null
  }

  /**
   * ユーザーを削除
   */
  async delete(id: string): Promise<boolean> {
    const { db, schema } = this.dbClient

    const result = await db
      .delete(schema.users)
      .where(eq(schema.users.id, id))
      .returning()

    return result.length > 0
  }
}
```

```typescript
// apps/backend/src/repositories/chatRepository.ts
import { eq, and, desc, isNull, sql } from 'drizzle-orm'
import type { DatabaseClient } from '../infrastructure/db/client'

/**
 * チャットリポジトリ
 */
export class ChatRepository {
  constructor(private dbClient: DatabaseClient) {}

  /**
   * ユーザーの会話一覧を取得
   */
  async findConversationsByUserId(userId: string) {
    const { db, schema } = this.dbClient

    return db
      .select({
        conversation: schema.conversations,
        participant: schema.participants,
      })
      .from(schema.participants)
      .innerJoin(
        schema.conversations,
        eq(schema.participants.conversationId, schema.conversations.id)
      )
      .where(
        and(
          eq(schema.participants.userId, userId),
          isNull(schema.participants.leftAt)
        )
      )
      .orderBy(desc(schema.conversations.createdAt))
  }

  /**
   * 会話にメッセージを追加
   */
  async createMessage(data: {
    conversationId: string
    senderUserId: string
    text: string
    replyToMessageId?: string | null
  }) {
    const { db, schema } = this.dbClient

    const [message] = await db
      .insert(schema.messages)
      .values({
        conversationId: data.conversationId,
        senderUserId: data.senderUserId,
        type: 'text',
        text: data.text,
        replyToMessageId: data.replyToMessageId ?? null,
      })
      .returning()

    return message
  }

  /**
   * メッセージにリアクションを追加
   */
  async addReaction(data: {
    messageId: string
    userId: string
    emoji: string
  }) {
    const { db, schema } = this.dbClient

    const [reaction] = await db
      .insert(schema.reactions)
      .values(data)
      .returning()

    return reaction
  }
}
```

---

#### Phase 6: Hono アプリケーション統合

**Node.js サーバー（開発環境）**:

```typescript
// apps/backend/src/server.ts
import { serve } from '@hono/node-server'
import app from './app'
import { createDatabase, closeGlobalDatabase } from './infrastructure/db/client'
import { loadEnvConfig } from './utils/env'

const env = loadEnvConfig()
const dbClient = createDatabase(env)

// Hono コンテキストに DB クライアントを注入
const server = serve({
  fetch: (request) => app.fetch(request, { ...env, dbClient }),
  port: 3000,
})

console.log('Server running on http://localhost:3000')

// グレースフルシャットダウン
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...')
  await closeGlobalDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...')
  await closeGlobalDatabase()
  process.exit(0)
})
```

**Cloudflare Workers（本番環境）**:

```typescript
// apps/backend/src/index.ts
import { Hono } from 'hono'
import app from './app'
import { createDatabase } from './infrastructure/db/client'
import type { D1Database } from '@cloudflare/workers-types'

export interface Env {
  DB: D1Database
  NODE_ENV: string
}

/**
 * Cloudflare Workers エントリーポイント
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // D1 データベースクライアントを作成
    const dbClient = createDatabase(env)

    // Hono アプリに環境変数と DB クライアントを渡す
    return app.fetch(request, { ...env, dbClient })
  },
}
```

**Hono アプリ本体**:

```typescript
// apps/backend/src/app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { DatabaseClient } from './infrastructure/db/client'
import healthRouter from './routes/health'
import conversationsRouter from './routes/conversations'
import messagesRouter from './routes/messages'
import usersRouter from './routes/users'

// 環境変数の型定義
export interface AppEnv {
  NODE_ENV: string
  dbClient: DatabaseClient
}

const app = new Hono<{ Bindings: AppEnv }>()

// CORS 設定
app.use('*', cors())

// ルーティング
app.route('/health', healthRouter)
app.route('/conversations', conversationsRouter)
app.route('/messages', messagesRouter)
app.route('/users', usersRouter)

export default app
```

**ルーター実装例**:

```typescript
// apps/backend/src/routes/users.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { AppEnv } from '../app'
import { UserRepository } from '../repositories/userRepository'
import { devOnly } from '../middleware/devOnly'

const router = new Hono<{ Bindings: AppEnv }>()

// GET /users - ユーザー一覧取得（開発環境のみ）
router.get('/', devOnly, async (c) => {
  const { dbClient } = c.env
  const userRepo = new UserRepository(dbClient)

  const users = await userRepo.findAll()
  return c.json(users)
})

// POST /users - ユーザー作成（開発環境のみ）
router.post(
  '/',
  devOnly,
  zValidator(
    'json',
    z.object({
      name: z.string().min(1),
      avatarUrl: z.string().url().optional(),
    })
  ),
  async (c) => {
    const { dbClient } = c.env
    const userRepo = new UserRepository(dbClient)

    const body = c.req.valid('json')
    const user = await userRepo.create(body)

    return c.json(user, 201)
  }
)

// GET /users/:id - ユーザー詳細取得
router.get('/:id', async (c) => {
  const { dbClient } = c.env
  const userRepo = new UserRepository(dbClient)

  const id = c.req.param('id')
  const user = await userRepo.findById(id)

  if (!user) {
    return c.json({ message: 'User not found' }, 404)
  }

  return c.json(user)
})

export default router
```

---

#### Phase 7: Drizzle Kit 設定

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

const dbType = (process.env.DB_TYPE || 'postgres') as 'postgres' | 'd1'

const configs: Record<'postgres' | 'd1', Config> = {
  postgres: {
    schema: './src/infrastructure/db/schema/postgres.ts',
    out: './drizzle/postgres',
    dialect: 'postgresql',
    dbCredentials: {
      connectionString: process.env.DATABASE_URL!,
    },
  },
  d1: {
    schema: './src/infrastructure/db/schema/d1.ts',
    out: './drizzle/d1',
    dialect: 'sqlite',
    driver: 'd1-http',
    dbCredentials: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
      token: process.env.CLOUDFLARE_API_TOKEN!,
    },
  },
}

export default configs[dbType]
```

---

#### Phase 8: NPM スクリプト設定

```json
// apps/backend/package.json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "dev:d1": "wrangler dev",
    "build": "tsc",

    "db:generate": "DB_TYPE=postgres drizzle-kit generate",
    "db:generate:d1": "DB_TYPE=d1 drizzle-kit generate",

    "db:push": "DB_TYPE=postgres drizzle-kit push",
    "db:push:d1": "DB_TYPE=d1 wrangler d1 migrations apply prototype-hono-drizzle-db",

    "db:studio": "DB_TYPE=postgres drizzle-kit studio",
    "db:studio:d1": "DB_TYPE=d1 wrangler d1 execute prototype-hono-drizzle-db --command 'SELECT * FROM users'",

    "test": "DB_TYPE=postgres vitest",
    "test:d1": "DB_TYPE=d1 vitest",

    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging"
  }
}
```

---

## テスト戦略

### ユニットテスト

```typescript
// apps/backend/src/repositories/userRepository.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createDatabase, closeGlobalDatabase } from '../infrastructure/db/client'
import { UserRepository } from './userRepository'
import { loadEnvConfig } from '../utils/env'

describe('UserRepository', () => {
  let dbClient: ReturnType<typeof createDatabase>
  let userRepo: UserRepository

  beforeAll(() => {
    const env = loadEnvConfig()
    dbClient = createDatabase(env)
    userRepo = new UserRepository(dbClient)
  })

  afterAll(async () => {
    await closeGlobalDatabase()
  })

  it('should create and find a user', async () => {
    const user = await userRepo.create({ name: 'Test User' })
    expect(user).toBeDefined()
    expect(user.name).toBe('Test User')

    const foundUser = await userRepo.findById(user.id)
    expect(foundUser).toEqual(user)
  })

  it('should return null for non-existent user', async () => {
    const user = await userRepo.findById('00000000-0000-0000-0000-000000000000')
    expect(user).toBeNull()
  })
})
```

### 両方のデータベースでテストを実行

```bash
# PostgreSQL でテスト
DB_TYPE=postgres npm test

# D1 (SQLite) でテスト
DB_TYPE=d1 npm test

# 両方でテスト（CI/CD）
npm run test:all
```

```json
// package.json
{
  "scripts": {
    "test:all": "npm run test && npm run test:d1"
  }
}
```

---

## マイグレーション戦略

### PostgreSQL マイグレーション

```bash
# マイグレーション生成
DB_TYPE=postgres npm run db:generate

# マイグレーション適用
DB_TYPE=postgres npm run db:push

# または Docker Compose 経由
npm run db:migrate
```

### D1 マイグレーション

```bash
# マイグレーション生成
DB_TYPE=d1 npm run db:generate:d1

# ローカル D1 に適用
wrangler d1 migrations apply prototype-hono-drizzle-db --local

# リモート D1 に適用
wrangler d1 migrations apply prototype-hono-drizzle-db --remote
```

---

## デプロイフロー

### ローカル開発（PostgreSQL）

```bash
# Docker で PostgreSQL 起動
npm run db:up

# マイグレーション適用
npm run db:push

# サーバー起動
npm run dev
```

### ローカル開発（D1）

```bash
# D1 ローカルインスタンスで起動
npm run dev:d1
```

### ステージング環境（D1）

```bash
# D1 ステージング DB 作成
wrangler d1 create prototype-hono-drizzle-db-staging

# マイグレーション適用
wrangler d1 migrations apply prototype-hono-drizzle-db-staging

# デプロイ
npm run deploy:staging
```

### 本番環境（D1）

```bash
# マイグレーション適用
wrangler d1 migrations apply prototype-hono-drizzle-db

# デプロイ
npm run deploy
```

---

## データ移行

PostgreSQL から D1 へのデータ移行が必要な場合:

```typescript
// scripts/migrate-pg-to-d1.ts
import { createDatabase } from '../apps/backend/src/infrastructure/db/client'

async function migrate() {
  // PostgreSQL からデータ取得
  const pgClient = createDatabase({ DATABASE_URL: process.env.DATABASE_URL })
  const users = await pgClient.db.select().from(pgClient.schema.users)

  // D1 にデータ挿入
  const d1Client = createDatabase({ DB: /* ... */ })
  await d1Client.db.insert(d1Client.schema.users).values(users)

  console.log(`Migrated ${users.length} users`)
}

migrate()
```

---

## 実装スケジュール

### Week 1: 基盤整備
- [x] 環境判定ユーティリティ作成
- [ ] スキーマファイル分離（PostgreSQL/D1）
- [ ] データベースクライアントファクトリー実装

### Week 2: リポジトリ層移行
- [ ] UserRepository を DB 非依存に修正
- [ ] ChatRepository を DB 非依存に修正
- [ ] その他のリポジトリを順次移行

### Week 3: テストとドキュメント
- [ ] ユニットテスト更新
- [ ] 統合テスト実行（PostgreSQL/D1 両方）
- [ ] ドキュメント整備

### Week 4: デプロイ準備
- [ ] Cloudflare Workers エントリーポイント作成
- [ ] wrangler.toml 設定
- [ ] CI/CD パイプライン更新

---

## トラブルシューティング

### 問題1: 型エラーが発生する

**原因**: PostgreSQL と D1 のスキーマ型が一致していない

**解決策**:
```typescript
// 共通の型定義を使用
import type { UsersTable } from '../infrastructure/db/schema/types'
```

### 問題2: マイグレーションが適用されない

**原因**: `DB_TYPE` 環境変数が正しく設定されていない

**解決策**:
```bash
# 明示的に指定
DB_TYPE=d1 npm run db:generate:d1
```

### 問題3: テストで DB 接続エラー

**原因**: テスト環境の環境変数が未設定

**解決策**:
```typescript
// .env.test ファイルを作成
DATABASE_URL=postgresql://localhost:5432/test_db
```

---

## まとめ

### 実装の利点

1. **柔軟性**: 環境に応じて最適なデータベースを使用
2. **段階的移行**: 既存コードを壊さずに D1 対応を追加
3. **型安全性**: TypeScript の恩恵を最大限活用
4. **テスト容易性**: モックや環境切り替えが簡単
5. **保守性**: スキーマが分離され、変更が容易

### 次のアクション

1. 環境判定ユーティリティの実装
2. スキーマファイルの分離
3. データベースクライアントファクトリーの実装
4. リポジトリ層の段階的移行

この計画に基づいて実装を開始しますか？
