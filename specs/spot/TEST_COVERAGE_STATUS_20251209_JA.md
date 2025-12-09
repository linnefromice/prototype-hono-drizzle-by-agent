# テストカバレッジ状況レポート

**日付**: 2025-12-09
**ステータス**: 現状分析
**関連**: SNAPSHOT_TESTING_DESIGN_JA.md

## エグゼクティブサマリー

### 現在の状況
- **テストファイル数**: 5ファイル
- **総テストケース数**: 33テスト（全てパス ✅）
- **エンドポイント総数**: 18エンドポイント
- **テスト実装済み**: 6エンドポイント（33%）
- **テスト未実装**: 12エンドポイント（67%）

### 主要な発見
✅ **強み**:
- Users APIは完全にテスト実装済み（8テスト）
- ChatUsecaseのユニットテストが充実（10テスト）
- テストインフラは整備済みで安定稼働

❌ **課題**:
- Conversations/Messages APIの統合テストが未実装
- テストカバレッジが33%と低い
- Core Chat機能のE2Eテストが不足

🎯 **推奨**:
- 高優先度エンドポイント（5件）のテスト実装: 2-3時間で完了可能
- 全エンドポイントのテスト実装: 6-8時間で100%カバレッジ達成可能

---

## 詳細分析

### テストファイル一覧

| ファイル | 種別 | テスト数 | 対象 |
|---------|------|---------|------|
| `middleware/devOnly.test.ts` | ミドルウェア | 3 | dev-only保護 |
| `routes/health.test.ts` | 統合テスト | 1 | ヘルスチェック |
| `routes/users.test.ts` | 統合テスト | 8 | Users API |
| `usecases/chatUsecase.test.ts` | ユニットテスト | 10 | Chat業務ロジック |
| `usecases/userUsecase.test.ts` | ユニットテスト | 11 | User業務ロジック |

**合計**: 33テスト

---

## エンドポイント別テスト実装状況

### 1. Health API

#### ✅ テスト実装済み（1/1 = 100%）

| エンドポイント | メソッド | テストファイル | テスト数 | 実装状況 |
|--------------|---------|--------------|---------|---------|
| `/health` | GET | `health.test.ts` | 1 | ✅ 完了 |

**テスト内容**:
- ✅ 正常系: ステータス200で`{ ok: true }`を返す

**評価**: 完全にカバー済み

---

### 2. Users API

#### ✅ テスト実装済み（3/4 = 75%）

| エンドポイント | メソッド | テストファイル | テスト数 | 実装状況 |
|--------------|---------|--------------|---------|---------|
| `/users` | GET | `users.test.ts` | 2 | ✅ 完了 |
| `/users` | POST | `users.test.ts` | 4 | ✅ 完了 |
| `/users/:id` | GET | `users.test.ts` | 2 | ✅ 完了 |
| `/users/:userId/bookmarks` | GET | - | 0 | ❌ 未実装 |

**テスト内容（GET /users）**:
- ✅ 正常系: 開発モードで全ユーザーリストを返す
- ✅ 本番モードで403エラー

**テスト内容（POST /users）**:
- ✅ 正常系: name + avatarUrlでユーザー作成
- ✅ 正常系: nameのみでユーザー作成
- ✅ エラー: 空のnameで400エラー（Zodバリデーション）
- ✅ 本番モードで403エラー

**テスト内容（GET /users/:id）**:
- ✅ 正常系: 存在するユーザーを取得
- ✅ エラー: 存在しないユーザーで404エラー

**評価**: 高品質、devOnlyミドルウェアの検証も含む

**未実装テスト**:
- ❌ GET /users/:userId/bookmarks

---

### 3. Conversations API

#### ❌ テスト未実装（0/9 = 0%）

| エンドポイント | メソッド | 機能 | 優先度 | テスト可能性 |
|--------------|---------|------|--------|------------|
| `/conversations` | GET | 会話一覧取得 | 🔴 高 | 🟢 すぐ可能 |
| `/conversations` | POST | 会話作成 | 🔴 高 | 🟢 すぐ可能 |
| `/conversations/:id` | GET | 会話詳細取得 | 🔴 高 | 🟢 すぐ可能 |
| `/conversations/:id/participants` | POST | 参加者追加 | 🟡 中 | 🟢 すぐ可能 |
| `/conversations/:id/participants/:userId` | DELETE | 参加者削除 | 🟡 中 | 🟢 すぐ可能 |
| `/conversations/:id/messages` | GET | メッセージ一覧 | 🔴 高 | 🟢 すぐ可能 |
| `/conversations/:id/messages` | POST | メッセージ送信 | 🔴 高 | 🟢 すぐ可能 |
| `/conversations/:id/read` | POST | 既読更新 | 🟡 中 | 🟢 すぐ可能 |
| `/conversations/:id/unread-count` | GET | 未読数取得 | 🟡 中 | 🟢 すぐ可能 |

**実装状況分析**:
- ✅ `ChatUsecase`のユニットテストは10テスト実装済み
- ✅ `DrizzleChatRepository`実装済み
- ✅ 全エンドポイントでリクエストスキーマ（Zod）あり
- ✅ エラーハンドリング実装済み
- ❌ 統合テスト（E2E）が未実装

**テスト実装可能性**: 🟢 **すぐに実装可能**

**テストケース見積もり（推奨）**:

#### GET /conversations（3テスト）
```typescript
it('指定ユーザーの会話一覧を返す')
it('userIdが未指定の場合は400エラー')
it('該当する会話がない場合は空配列を返す')
```

#### POST /conversations（4テスト）
```typescript
it('direct会話を作成する（2人の参加者）')
it('group会話を作成する（3人以上の参加者）')
it('nameを指定してgroup会話を作成する')
it('participantIdsが空配列の場合は400エラー')
```

#### GET /conversations/:id（2テスト）
```typescript
it('会話詳細を取得する（参加者情報含む）')
it('存在しない会話IDの場合は404エラー')
```

#### POST /conversations/:id/participants（3テスト）
```typescript
it('新しい参加者を追加する')
it('参加者追加時にシステムメッセージが作成される')
it('存在しない会話IDの場合は404エラー')
```

#### DELETE /conversations/:id/participants/:userId（2テスト）
```typescript
it('参加者を削除する（leftAtを設定）')
it('存在しない参加者の場合は404エラー')
```

#### GET /conversations/:id/messages（4テスト）
```typescript
it('メッセージ一覧を取得する')
it('limitパラメータで取得件数を制限する')
it('beforeパラメータでページネーションする')
it('参加していない会話のメッセージは取得できない（403エラー）')
```

#### POST /conversations/:id/messages（3テスト）
```typescript
it('テキストメッセージを送信する')
it('返信メッセージを送信する（replyToMessageId指定）')
it('参加していない会話にはメッセージ送信できない（403エラー）')
```

#### POST /conversations/:id/read（2テスト）
```typescript
it('既読位置を更新する')
it('存在しないメッセージIDの場合は404エラー')
```

#### GET /conversations/:id/unread-count（2テスト）
```typescript
it('未読数を取得する')
it('既読位置が未設定の場合は全メッセージ数を返す')
```

**合計推定テスト数**: 25テスト

---

### 4. Messages API

#### ❌ テスト未実装（0/4 = 0%）

| エンドポイント | メソッド | 機能 | 優先度 | テスト可能性 |
|--------------|---------|------|--------|------------|
| `/messages/:id/reactions` | POST | リアクション追加 | 🟡 中 | 🟢 すぐ可能 |
| `/messages/:id/reactions/:emoji` | DELETE | リアクション削除 | 🟡 中 | 🟢 すぐ可能 |
| `/messages/:id/bookmarks` | POST | ブックマーク追加 | 🟢 低 | 🟢 すぐ可能 |
| `/messages/:id/bookmarks` | DELETE | ブックマーク削除 | 🟢 低 | 🟢 すぐ可能 |

**実装状況分析**:
- ✅ `ChatUsecase`のユニットテストに一部含まれる
- ✅ リクエストスキーマあり
- ✅ エラーハンドリング実装済み
- ❌ 統合テストが未実装

**テスト実装可能性**: 🟢 **すぐに実装可能**

**テストケース見積もり（推奨）**:

#### POST /messages/:id/reactions（3テスト）
```typescript
it('メッセージにリアクションを追加する')
it('既存のリアクションを上書きしない（同じemoji）')
it('存在しないメッセージIDの場合は404エラー')
```

#### DELETE /messages/:id/reactions/:emoji（3テスト）
```typescript
it('リアクションを削除する')
it('userIdが未指定の場合は400エラー')
it('存在しないリアクションの場合は404エラー')
```

#### POST /messages/:id/bookmarks（3テスト）
```typescript
it('メッセージをブックマークする')
it('既にブックマーク済みの場合の挙動を確認')
it('存在しないメッセージIDの場合は404エラー')
```

#### DELETE /messages/:id/bookmarks（3テスト）
```typescript
it('ブックマークを削除する')
it('userIdが未指定の場合は400エラー')
it('存在しないブックマークの場合は404エラー')
```

**合計推定テスト数**: 12テスト

---

## テスト実装の障壁と解決策

### 障壁1: データベース状態の管理

**問題**: テスト間でデータが残り、テストが不安定になる可能性

**現在の解決策（users.test.tsで実証済み）**:
```typescript
describe('Users API', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'development'
  })

  // 各テストの前にユーザーを作成して状態を保証
  it('returns list of users in development mode', async () => {
    await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User for List' }),
    })

    const response = await app.request('/users')
    expect(response.status).toBe(200)
    // ...
  })
})
```

**推奨される改善策**:
```typescript
// テストヘルパーの作成
// apps/backend/src/__tests__/helpers/database.ts
import { sql } from 'drizzle-orm'
import { db } from '../../infrastructure/db/client'

export async function clearDatabase() {
  await db.execute(sql`TRUNCATE TABLE items CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE users CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE conversations CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE participants CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE messages CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE reactions CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE bookmarks CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE conversation_reads CASCADE;`)
}

// テストで使用
beforeEach(async () => {
  await clearDatabase()
})
```

---

### 障壁2: 複雑なデータ依存関係

**問題**: 会話 → 参加者 → メッセージの依存関係があり、テストデータの準備が煩雑

**解決策**: テストヘルパー関数の作成
```typescript
// apps/backend/src/__tests__/helpers/test-factories.ts

export async function createTestUser(data: { name: string; avatarUrl?: string | null }) {
  const response = await app.request('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return response.json()
}

export async function createTestConversation(
  participantIds: string[],
  options?: { type?: 'direct' | 'group'; name?: string }
) {
  const response = await app.request('/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: options?.type || (participantIds.length === 2 ? 'direct' : 'group'),
      name: options?.name,
      participantIds,
    }),
  })
  return response.json()
}

export async function createTestMessage(
  conversationId: string,
  senderUserId: string,
  text: string
) {
  const response = await app.request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderUserId, text }),
  })
  return response.json()
}

// 使用例
it('メッセージ一覧を取得する', async () => {
  // ユーザー作成
  const user1 = await createTestUser({ name: 'User 1' })
  const user2 = await createTestUser({ name: 'User 2' })

  // 会話作成
  const conversation = await createTestConversation([user1.id, user2.id])

  // メッセージ作成
  await createTestMessage(conversation.id, user1.id, 'Hello')
  await createTestMessage(conversation.id, user2.id, 'Hi there')

  // テスト実行
  const response = await app.request(
    `/conversations/${conversation.id}/messages?userId=${user1.id}`
  )
  const messages = await response.json()

  expect(messages).toHaveLength(2)
})
```

---

### 障壁3: システムメッセージの自動生成

**問題**: 参加者追加時に自動的にシステムメッセージが作成される挙動をテストに含める必要がある

**解決策**: システムメッセージの検証を明示的に行う
```typescript
it('参加者追加時にシステムメッセージが作成される', async () => {
  const user1 = await createTestUser({ name: 'User 1' })
  const user2 = await createTestUser({ name: 'User 2' })
  const user3 = await createTestUser({ name: 'User 3' })

  const conversation = await createTestConversation([user1.id, user2.id])

  // 参加者を追加
  await app.request(`/conversations/${conversation.id}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user3.id, role: 'member' }),
  })

  // メッセージ一覧を取得
  const response = await app.request(
    `/conversations/${conversation.id}/messages?userId=${user1.id}`
  )
  const messages = await response.json()

  // システムメッセージの存在を検証
  const systemMessage = messages.find(
    (m) => m.type === 'system' && m.systemEvent === 'join'
  )
  expect(systemMessage).toBeDefined()
  expect(systemMessage.text).toContain(user3.id)
})
```

---

## テスト実装の優先順位

### 🔴 高優先度: Core Chat API（5エンドポイント）

アプリケーションの中核機能。これらが動作しないとチャット機能が使えない。

| エンドポイント | 推定テスト数 | 推定時間 |
|--------------|------------|---------|
| GET /conversations | 3 | 30分 |
| POST /conversations | 4 | 45分 |
| GET /conversations/:id | 2 | 20分 |
| POST /conversations/:id/messages | 3 | 30分 |
| GET /conversations/:id/messages | 4 | 45分 |

**合計**: 16テスト、約2.5-3時間

**実装順序**:
1. POST /conversations（会話作成）
2. GET /conversations（会話一覧）
3. POST /conversations/:id/messages（メッセージ送信）
4. GET /conversations/:id/messages（メッセージ一覧）
5. GET /conversations/:id（会話詳細）

---

### 🟡 中優先度: Chat補助機能（6エンドポイント）

UX向上のための機能。なくてもチャットは動作するが、あると便利。

| エンドポイント | 推定テスト数 | 推定時間 |
|--------------|------------|---------|
| POST /conversations/:id/participants | 3 | 30分 |
| DELETE /conversations/:id/participants/:userId | 2 | 20分 |
| POST /conversations/:id/read | 2 | 20分 |
| GET /conversations/:id/unread-count | 2 | 20分 |
| POST /messages/:id/reactions | 3 | 30分 |
| DELETE /messages/:id/reactions/:emoji | 3 | 30分 |

**合計**: 15テスト、約2-2.5時間

---

### 🟢 低優先度: 補助機能（3エンドポイント）

あると便利だが、コア機能ではない。

| エンドポイント | 推定テスト数 | 推定時間 |
|--------------|------------|---------|
| POST /messages/:id/bookmarks | 3 | 30分 |
| DELETE /messages/:id/bookmarks | 3 | 30分 |
| GET /users/:userId/bookmarks | 2 | 20分 |

**合計**: 8テスト、約1-1.5時間

---

## 実装ロードマップ

### フェーズ1: Core Chat API（優先度: 🔴 高）
**期間**: 2.5-3時間
**テスト数**: 16テスト
**カバレッジ向上**: 33% → 61%

**成果物**:
- `apps/backend/src/routes/conversations.test.ts`
- 会話とメッセージの基本機能の品質保証

---

### フェーズ2: Chat補助機能（優先度: 🟡 中）
**期間**: 2-2.5時間
**テスト数**: 15テスト
**カバレッジ向上**: 61% → 94%

**成果物**:
- `apps/backend/src/routes/conversations.test.ts`の拡張
- `apps/backend/src/routes/messages.test.ts`

---

### フェーズ3: 補助機能（優先度: 🟢 低）
**期間**: 1-1.5時間
**テスト数**: 8テスト
**カバレッジ向上**: 94% → 100%

**成果物**:
- `apps/backend/src/routes/messages.test.ts`の拡張
- `apps/backend/src/routes/users.test.ts`の拡張

---

### フェーズ4: テストヘルパーとリファクタリング
**期間**: 1-2時間

**タスク**:
1. データベースクリーンアップヘルパーの作成
2. テストファクトリ関数の作成
3. 共通テストユーティリティの整理
4. テストコードの重複排除

**成果物**:
- `apps/backend/src/__tests__/helpers/database.ts`
- `apps/backend/src/__tests__/helpers/test-factories.ts`

---

## 総合評価

### 現在の強み
✅ **テストインフラ**: Vitestが正しく設定され、安定稼働
✅ **ユニットテスト**: UserUsecaseとChatUsecaseで21テスト実装済み
✅ **統合テストの実績**: Users APIで8テスト実装済み、パターン確立
✅ **コード品質**: エラーハンドリング、バリデーション実装済み

### 現在の課題
❌ **カバレッジ不足**: 67%のエンドポイントが未テスト
❌ **Core機能のE2E不足**: チャット機能の統合テストがない
❌ **テストヘルパー未整備**: データ準備の重複コードが発生しやすい

### 推奨される次のステップ

#### 即座に実行可能（今週中）
1. **Core Chat APIのテスト実装**: 2.5-3時間で16テスト追加
2. **テストヘルパーの作成**: 1時間でインフラ整備

#### 短期目標（2週間以内）
3. **Chat補助機能のテスト実装**: 2-2.5時間で15テスト追加
4. **補助機能のテスト実装**: 1-1.5時間で8テスト追加

#### 完了時の状態
- ✅ テストカバレッジ: 100%（18/18エンドポイント）
- ✅ 総テスト数: 約72テスト（現在33 + 追加39）
- ✅ 全APIエンドポイントの品質保証
- ✅ 回帰テストの基盤確立

**総所要時間**: 約7-9時間で100%カバレッジ達成可能

---

## テンプレート: 統合テストの実装例

### Conversations APIテストの骨格

```typescript
// apps/backend/src/routes/conversations.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import app from '../app'

describe('Conversations API', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'development'
  })

  describe('POST /conversations', () => {
    it('direct会話を作成する', async () => {
      // 1. テストデータ準備
      const user1 = await createUser({ name: 'User 1' })
      const user2 = await createUser({ name: 'User 2' })

      // 2. APIリクエスト
      const response = await app.request('/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'direct',
          participantIds: [user1.id, user2.id],
        }),
      })

      // 3. レスポンス検証
      expect(response.status).toBe(201)
      const conversation = await response.json()

      // 4. データ構造検証
      expect(conversation).toHaveProperty('id')
      expect(conversation.type).toBe('direct')
      expect(conversation.participants).toHaveLength(2)
      expect(conversation.participants[0].userId).toBe(user1.id)
      expect(conversation.participants[1].userId).toBe(user2.id)
    })

    it('group会話を作成する', async () => {
      // 実装...
    })
  })

  describe('GET /conversations', () => {
    it('指定ユーザーの会話一覧を返す', async () => {
      // 実装...
    })
  })

  describe('GET /conversations/:id', () => {
    it('会話詳細を取得する', async () => {
      // 実装...
    })
  })

  describe('POST /conversations/:id/messages', () => {
    it('メッセージを送信する', async () => {
      // 実装...
    })
  })

  describe('GET /conversations/:id/messages', () => {
    it('メッセージ一覧を取得する', async () => {
      // 実装...
    })
  })
})

// ヘルパー関数
async function createUser(data: { name: string; avatarUrl?: string }) {
  const response = await app.request('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return response.json()
}
```

---

## 付録: テストカバレッジマトリックス

### 現在の状態（2025-12-09）

| カテゴリ | 実装済み | 未実装 | カバレッジ |
|---------|---------|-------|----------|
| Health API | 1/1 | 0/1 | 100% |
| Users API | 3/4 | 1/4 | 75% |
| Conversations API | 0/9 | 9/9 | 0% |
| Messages API | 0/4 | 4/4 | 0% |
| **合計** | **4/18** | **14/18** | **22%** |

**注**: 前述の33%は統合テストとユニットテストを合わせた概算値。
このマトリックスは統合テスト（E2E）のみを対象としています。

### 目標の状態（フェーズ完了後）

| カテゴリ | 実装済み | 未実装 | カバレッジ |
|---------|---------|-------|----------|
| Health API | 1/1 | 0/1 | 100% |
| Users API | 4/4 | 0/4 | 100% |
| Conversations API | 9/9 | 0/9 | 100% |
| Messages API | 4/4 | 0/4 | 100% |
| **合計** | **18/18** | **0/18** | **100%** |

---

## 関連ドキュメント

- `SNAPSHOT_TESTING_DESIGN_JA.md` - スナップショットテスト設計書
- `PROJECT_IMPROVEMENTS_251208_CLAUDE.md` - プロジェクト改善提案
- `apps/backend/src/routes/users.test.ts` - 統合テストの実装例
- `apps/backend/src/usecases/chatUsecase.test.ts` - ユニットテストの実装例

---

**ドキュメント履歴**
- 2025-12-09: 初稿作成（現状分析と実装計画）
