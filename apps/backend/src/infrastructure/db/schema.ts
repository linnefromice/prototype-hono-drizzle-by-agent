import { sqliteTable, text, index, uniqueIndex, integer, type SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ==============================================================================
// Authentication Tables (Better Auth)
// ==============================================================================

/**
 * Authentication user table
 * Stores core authentication information including username and password
 */
export const authUser = sqliteTable('auth_user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Authentication credentials
  username: text('username').notNull().unique(),
  email: text('email').unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .default(false)
    .notNull(),

  // Basic profile info
  name: text('name').notNull(),
  image: text('image'),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),

  // Future expansion fields
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).default(false),
  displayUsername: text('display_username'),
}, (table) => ({
  usernameIdx: index('auth_user_username_idx').on(table.username),
}))

/**
 * Session management table
 * Tracks active user sessions with tokens and security info
 */
export const authSession = sqliteTable('auth_session', {
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
}, (table) => ({
  tokenIdx: index('auth_session_token_idx').on(table.token),
  userIdIdx: index('auth_session_user_id_idx').on(table.userId),
}))

/**
 * Account linkage table
 * Manages OAuth connections and password storage
 */
export const authAccount = sqliteTable('auth_account', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => ({
  providerAccountIdx: index('auth_account_provider_account_idx').on(table.providerId, table.accountId),
}))

/**
 * Verification table
 * Stores temporary tokens for email verification, password reset, TOTP, etc.
 */
export const authVerification = sqliteTable('auth_verification', {
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
}, (table) => ({
  identifierIdx: index('auth_verification_identifier_idx').on(table.identifier),
}))

// ==============================================================================
// Chat Application Tables
// ==============================================================================

// Enum types as const arrays for type safety
const conversationTypes = ['direct', 'group'] as const
const participantRoles = ['member', 'admin'] as const
const messageTypes = ['text', 'system'] as const
const systemEvents = ['join', 'leave'] as const
const messageStatuses = ['active', 'deleted'] as const

/**
 * Chat user profiles
 * Links to auth_user and stores chat-specific information
 * Note: This is separate from auth_user to maintain chat history integrity
 *
 * Table name kept as 'users' for backward compatibility with existing foreign keys
 */
export const chatUsers = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  authUserId: text('auth_user_id')
    .unique()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  idAlias: text('id_alias').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  idAliasIdx: index('users_id_alias_idx').on(table.idAlias),
  authUserIdIdx: index('users_auth_user_id_idx').on(table.authUserId),
}))

// Keep legacy export for backward compatibility during migration
export const users = chatUsers

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text('type', { enum: conversationTypes }).notNull(),
  name: text('name'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const participants = sqliteTable(
  'participants',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: participantRoles }).notNull().default('member'),
    joinedAt: text('joined_at').notNull().$defaultFn(() => new Date().toISOString()),
    leftAt: text('left_at'),
  },
  table => ({
    conversationUserUnique: uniqueIndex('participants_conversation_user_unique').on(
      table.conversationId,
      table.userId,
    ),
  }),
)

export const messages: SQLiteTableWithColumns<any> = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderUserId: text('sender_user_id').references(() => users.id, { onDelete: 'set null' }),
    type: text('type', { enum: messageTypes }).notNull().default('text'),
    text: text('text'),
    replyToMessageId: text('reply_to_message_id').references((): any => messages.id, {
      onDelete: 'set null',
    }),
    systemEvent: text('system_event', { enum: systemEvents }),
    status: text('status', { enum: messageStatuses }).notNull().default('active'),
    deletedAt: text('deleted_at'),
    deletedByUserId: text('deleted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  },
  table => ({}),
)

export const reactions = sqliteTable(
  'reactions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  },
  table => ({
    reactionUnique: uniqueIndex('reaction_unique').on(table.messageId, table.userId, table.emoji),
  }),
)

export const conversationReads = sqliteTable(
  'conversation_reads',
  {
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
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  },
  table => ({
    conversationUserUnique: uniqueIndex('conversation_reads_conversation_user_unique').on(
      table.conversationId,
      table.userId,
    ),
    lastReadMessageIndex: index('conversation_reads_last_read_message_idx').on(
      table.lastReadMessageId,
    ),
  }),
)

export const messageBookmarks = sqliteTable(
  'message_bookmarks',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  },
  table => ({
    messageUserUnique: uniqueIndex('message_bookmarks_message_user_unique').on(
      table.messageId,
      table.userId,
    ),
  }),
)
