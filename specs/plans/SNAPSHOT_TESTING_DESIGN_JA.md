# API スナップショットテスト実装設計（日本語版）

**日付**: 2025-12-08
**ステータス**: 設計検討
**関連**: PROJECT_IMPROVEMENTS_251208_CLAUDE.md - テスト改善セクション

## 概要

JSONリクエスト/レスポンスに対するスナップショットテストを実装し、APIの回帰テストとドキュメント化を強化します。

## 目的

1. **回帰テスト強化**: APIレスポンス形式の意図しない変更を検出
2. **ドキュメント化**: 実際のリクエスト/レスポンス例をスナップショットとして保存
3. **OpenAPI仕様との整合性検証**: 生成されたZodスキーマと実際のレスポンスの一貫性確保
4. **レビュー効率化**: PR時にスナップショット差分でAPI変更を可視化

## スナップショットテストとは

### 従来のテスト方式
```typescript
// 個別プロパティのアサーション
expect(response.status).toBe(200)
const body = await response.json()
expect(body.id).toBeDefined()
expect(body.name).toBe('Test Item')
expect(body.createdAt).toBeDefined()
```

**問題点**:
- レスポンス全体の構造変更を検出しにくい
- 新しいフィールド追加時に既存テストが通ってしまう
- テストコードの記述量が多い

### スナップショットテスト方式
```typescript
// レスポンス全体を保存・比較
expect(response.status).toBe(200)
const body = await response.json()
expect(body).toMatchSnapshot()
```

**利点**:
- レスポンス全体を「写真のように」保存
- 変更があれば自動的に検出
- テストコード記述量の削減

## 現状分析

### テストカバレッジのギャップ

| エンドポイント | メソッド | テスト有無 |
|------------|--------|----------|
| `/health` | GET | ✅ |
| `/items` | GET | ✅ |
| `/items` | POST | ✅ |
| `/users` | GET | ✅ |
| `/users` | POST | ✅ |
| `/users/:userId` | GET | ✅ |
| `/users/:userId/bookmarks` | GET | ❌ |
| `/conversations` | GET | ❌ |
| `/conversations` | POST | ❌ |
| `/conversations/:id` | GET | ❌ |
| `/conversations/:id/participants` | POST | ❌ |
| `/conversations/:id/participants/:userId` | DELETE | ❌ |
| `/conversations/:id/messages` | GET | ❌ |
| `/conversations/:id/messages` | POST | ❌ |
| `/conversations/:id/read` | POST | ❌ |
| `/conversations/:id/unread-count` | GET | ❌ |
| `/messages/:id/reactions` | POST | ❌ |
| `/messages/:id/reactions/:emoji` | DELETE | ❌ |
| `/messages/:id/bookmarks` | POST | ❌ |
| `/messages/:id/bookmarks` | DELETE | ❌ |

**現状**: 20エンドポイント中6エンドポイント（30%）のみテスト実装済み

### 既存テストの課題

1. レスポンス構造の全体検証が不足
2. フィールド追加・削除の検出が困難
3. APIドキュメントとしての価値が低い
4. 動的な値（UUID、タイムスタンプ）の扱いが煩雑

## スナップショットテスト設計

### 1. ディレクトリ構造

```
apps/backend/
├── src/
│   ├── routes/
│   │   ├── health.snapshot.test.ts       # 各エンドポイントのスナップショットテスト
│   │   ├── items.snapshot.test.ts
│   │   ├── conversations.snapshot.test.ts
│   │   ├── messages.snapshot.test.ts
│   │   └── users.snapshot.test.ts
│   └── __tests__/
│       ├── helpers/
│       │   ├── snapshot-serializers.ts    # カスタムシリアライザ（動的値の正規化）
│       │   ├── test-factories.ts          # テストデータ生成ヘルパー
│       │   └── database.ts                # DB操作ヘルパー
│       └── snapshots/                     # 保存されたスナップショット
│           ├── health/
│           │   └── GET_health.snap
│           ├── items/
│           │   ├── GET_items_empty.snap
│           │   ├── GET_items_multiple.snap
│           │   ├── POST_items_success.snap
│           │   └── POST_items_validation_error.snap
│           ├── conversations/
│           └── messages/
```

### 2. 動的値の正規化戦略

#### 問題
UUID、タイムスタンプなどの動的な値をスナップショットに含めると、毎回テストが失敗します。

#### 解決策: カスタムシリアライザ

```typescript
// src/__tests__/helpers/snapshot-serializers.ts
import { expect } from 'vitest'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

export function normalizeSnapshot(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(normalizeSnapshot)
  }

  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    // UUIDの正規化
    if (typeof value === 'string' && UUID_REGEX.test(value)) {
      normalized[key] = '<UUID>'
    }
    // ISO 8601 datetimeの正規化
    else if (typeof value === 'string' && ISO_DATETIME_REGEX.test(value)) {
      normalized[key] = '<DATETIME>'
    }
    // ネストされたオブジェクトの再帰処理
    else if (typeof value === 'object' && value !== null) {
      normalized[key] = normalizeSnapshot(value)
    }
    else {
      normalized[key] = value
    }
  }
  return normalized
}

// Vitestカスタムシリアライザの登録
expect.addSnapshotSerializer({
  test: (val) => typeof val === 'object' && val !== null,
  serialize: (val, config, indentation, depth, refs, printer) => {
    const normalized = normalizeSnapshot(val)
    return printer(normalized, config, indentation, depth, refs)
  },
})
```

#### 正規化の例

**元のレスポンス**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Alice",
  "createdAt": "2025-12-08T10:30:00.123Z"
}
```

**正規化後（スナップショット）**:
```json
{
  "id": "<UUID>",
  "name": "Alice",
  "createdAt": "<DATETIME>"
}
```

### 3. テストパターン

#### パターンA: 正常系スナップショット

```typescript
// src/routes/items.snapshot.test.ts
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import app from '../app'
import { setupTestDatabase, teardownTestDatabase, clearDatabase } from '../__tests__/helpers/database'
import { createTestItem } from '../__tests__/helpers/test-factories'

describe('Items API Snapshots', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  beforeEach(async () => {
    await clearDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  describe('GET /items', () => {
    it('空のアイテムリストを返す', async () => {
      const response = await app.request('/items')
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toMatchSnapshot()
    })

    it('複数のアイテムを返す', async () => {
      // テストデータの作成
      await createTestItem({ name: 'アイテム1' })
      await createTestItem({ name: 'アイテム2' })
      await createTestItem({ name: 'アイテム3' })

      const response = await app.request('/items')
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toMatchSnapshot()
    })
  })

  describe('POST /items', () => {
    it('アイテムの作成に成功する', async () => {
      const response = await app.request('/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '新しいアイテム' }),
      })
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body).toMatchSnapshot()
    })
  })
})
```

#### パターンB: エラーレスポンススナップショット

```typescript
describe('POST /items - エラーケース', () => {
  it('名前が短すぎる場合は400エラー', async () => {
    const response = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ab' }), // 3文字未満
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchSnapshot()
  })

  it('不正なJSONの場合は400エラー', async () => {
    const response = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchSnapshot()
  })

  it('nameフィールドが欠けている場合は400エラー', async () => {
    const response = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toMatchSnapshot()
  })
})
```

#### パターンC: OpenAPI契約テストとの組み合わせ

```typescript
import { CreateItemRequestSchema } from 'openapi'

describe('POST /items - 契約テスト & スナップショット', () => {
  it('OpenAPIスキーマとスナップショットに一致する', async () => {
    const requestData = { name: '契約テストアイテム' }

    // リクエストのスキーマ検証
    const validation = CreateItemRequestSchema.safeParse(requestData)
    expect(validation.success).toBe(true)

    const response = await app.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    })
    const body = await response.json()

    // レスポンスの基本検証
    expect(response.status).toBe(201)
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('name')
    expect(body).toHaveProperty('createdAt')

    // スナップショット検証
    expect(body).toMatchSnapshot()
  })
})
```

### 4. テストヘルパーの実装

#### データファクトリ

```typescript
// src/__tests__/helpers/test-factories.ts
import { db } from '../../infrastructure/db/client'
import { items, users, conversations } from '../../infrastructure/db/schema'

export async function createTestItem(data: { name: string }) {
  const [item] = await db.insert(items).values(data).returning()
  return item
}

export async function createTestUser(data: { name: string; avatarUrl?: string | null }) {
  const [user] = await db.insert(users).values(data).returning()
  return user
}

export async function createTestConversation(data: {
  type: 'direct' | 'group'
  name?: string | null
  participantIds: string[]
}) {
  const [conversation] = await db.insert(conversations).values({
    type: data.type,
    name: data.name,
  }).returning()

  // participantsの追加は別の関数で実装
  return conversation
}
```

#### データベースヘルパー

```typescript
// src/__tests__/helpers/database.ts
import { sql } from 'drizzle-orm'
import { db, closeDbConnection } from '../../infrastructure/db/client'

export async function setupTestDatabase() {
  // テーブル作成は既存のマイグレーションを使用
}

export async function clearDatabase() {
  // すべてのテーブルをTRUNCATE
  await db.execute(sql`TRUNCATE TABLE items CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE users CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE conversations CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE messages CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE participants CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE reactions CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE bookmarks CASCADE;`)
  await db.execute(sql`TRUNCATE TABLE conversation_reads CASCADE;`)
}

export async function teardownTestDatabase() {
  await closeDbConnection()
}
```

### 5. スナップショット例

#### GET /items (空配列)
```
// src/__tests__/snapshots/items/GET_items_empty.snap
exports[`Items API Snapshots > GET /items > 空のアイテムリストを返す 1`] = `[]`;
```

#### GET /items (複数アイテム)
```
// src/__tests__/snapshots/items/GET_items_multiple.snap
exports[`Items API Snapshots > GET /items > 複数のアイテムを返す 1`] = `
[
  {
    "id": "<UUID>",
    "name": "アイテム1",
    "createdAt": "<DATETIME>",
  },
  {
    "id": "<UUID>",
    "name": "アイテム2",
    "createdAt": "<DATETIME>",
  },
  {
    "id": "<UUID>",
    "name": "アイテム3",
    "createdAt": "<DATETIME>",
  },
]
`;
```

#### POST /items (成功)
```
// src/__tests__/snapshots/items/POST_items_success.snap
exports[`Items API Snapshots > POST /items > アイテムの作成に成功する 1`] = `
{
  "id": "<UUID>",
  "name": "新しいアイテム",
  "createdAt": "<DATETIME>",
}
`;
```

#### POST /items (バリデーションエラー)
```
// src/__tests__/snapshots/items/POST_items_validation_error.snap
exports[`Items API Snapshots > POST /items - エラーケース > 名前が短すぎる場合は400エラー 1`] = `
{
  "message": "Item name too short",
}
`;
```

## 3層テスト戦略（推奨アプローチ）

スナップショットテストは、以下の3つのテスト手法を組み合わせることで最大の効果を発揮します。

### 1. 契約テスト: OpenAPIスキーマとの整合性
```typescript
const validation = CreateUserRequestSchema.safeParse(body)
expect(validation.success).toBe(true)
```
**役割**: 型とスキーマの検証

### 2. ビジネスロジックテスト: 特定フィールドの値検証
```typescript
expect(body.name).toBe('Expected Name')
expect(body.status).toBe('active')
```
**役割**: 動的な値とビジネスルールの検証

### 3. スナップショットテスト: レスポンス全体の構造検証
```typescript
expect(body).toMatchSnapshot()
```
**役割**: レスポンス形式の回帰テストとドキュメント化

### 組み合わせ例

```typescript
describe('POST /users', () => {
  it('新しいユーザーを作成する', async () => {
    const userData = { name: 'テストユーザー', avatarUrl: 'https://example.com/avatar.jpg' }

    // 1. 契約テスト
    const validation = CreateUserRequestSchema.safeParse(userData)
    expect(validation.success).toBe(true)

    const response = await app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })
    const body = await response.json()

    // 2. ビジネスロジックテスト
    expect(response.status).toBe(201)
    expect(body.name).toBe('テストユーザー')
    expect(body.avatarUrl).toBe('https://example.com/avatar.jpg')

    // 3. スナップショットテスト
    expect(body).toMatchSnapshot()
  })
})
```

## 実装フェーズ

### フェーズ1: 基盤整備（1週間）

**タスク**:
1. スナップショットシリアライザの実装
   - UUID正規化
   - タイムスタンプ正規化
   - Vitestへの登録

2. テストヘルパーの実装
   - データファクトリ（createTestItem, createTestUser等）
   - データベースヘルパー（setup, teardown, clear）

3. Vitest設定の更新
   - スナップショットパス設定
   - セットアップファイルの整備

**成果物**:
- `src/__tests__/helpers/snapshot-serializers.ts`
- `src/__tests__/helpers/test-factories.ts`
- `src/__tests__/helpers/database.ts`
- 更新された `vitest.config.ts`

### フェーズ2: 既存エンドポイントのスナップショット化（1週間）

**タスク**:
1. Health APIのスナップショットテスト
   - `GET /health` 正常系

2. Items APIのスナップショットテスト
   - `GET /items` 空配列
   - `GET /items` 複数アイテム
   - `POST /items` 成功
   - `POST /items` バリデーションエラー

3. Users APIのスナップショットテスト
   - `GET /users` 一覧取得
   - `POST /users` 作成
   - `GET /users/:id` 取得

**成果物**:
- `src/routes/health.snapshot.test.ts`
- `src/routes/items.snapshot.test.ts`
- `src/routes/users.snapshot.test.ts`
- スナップショットファイル（`__tests__/snapshots/`）

### フェーズ3: 未テストエンドポイントのカバレッジ拡大（2週間）

**優先度順**:

#### 高優先度: Core Chat API
- `POST /conversations` - 会話作成
- `GET /conversations` - 会話一覧
- `POST /conversations/:id/messages` - メッセージ送信
- `GET /conversations/:id/messages` - メッセージ一覧

#### 中優先度: Chat補助機能
- `POST /messages/:id/reactions` - リアクション追加
- `DELETE /messages/:id/reactions/:emoji` - リアクション削除
- `POST /conversations/:id/read` - 既読更新
- `GET /conversations/:id/unread-count` - 未読数取得

#### 低優先度: 管理機能
- `POST /conversations/:id/participants` - 参加者追加
- `DELETE /conversations/:id/participants/:userId` - 参加者削除
- `POST /messages/:id/bookmarks` - ブックマーク追加
- `DELETE /messages/:id/bookmarks` - ブックマーク削除
- `GET /users/:userId/bookmarks` - ブックマーク一覧

**成果物**:
- `src/routes/conversations.snapshot.test.ts`
- `src/routes/messages.snapshot.test.ts`
- 全エンドポイントのスナップショット

### フェーズ4: エラーケースとエッジケースの拡充（1週間）

**タスク**:
1. 全エンドポイントの4xxエラーケース
   - 400: バリデーションエラー
   - 403: アクセス拒否（devOnlyミドルウェア）
   - 404: リソース不在

2. エッジケース
   - 空文字列、null、undefined
   - 境界値（最小/最大長）
   - 不正な形式（UUID、datetime）

**成果物**:
- エラーケーススナップショット
- エッジケーステスト

## メリットとデメリット

### メリット

✅ **回帰テストの強化**
   - APIレスポンス形式の意図しない変更を即座に検出
   - フィールド追加・削除・型変更を可視化

✅ **ドキュメント化**
   - スナップショットが実際のレスポンス例として機能
   - OpenAPI仕様と実装の乖離を検出

✅ **開発効率の向上**
   - テストコードの記述量削減（`expect(body).toMatchSnapshot()`のみ）
   - 新規エンドポイント追加時のテスト作成が容易

✅ **レビュー効率化**
   - PRでAPI変更が差分として可視化
   - 影響範囲の把握が容易

✅ **リファクタリングの安全性**
   - 内部実装変更時にレスポンス形式の一貫性を保証

### デメリット

❌ **スナップショットの肥大化**
   - レスポンスが大きい場合、スナップショットファイルが巨大化
   - Gitリポジトリサイズの増加

❌ **過剰な更新**
   - 正当なAPI変更時にすべてのスナップショットを更新する必要
   - `--update`の誤用で意図しない変更を承認するリスク

❌ **動的値の扱い**
   - UUID、タイムスタンプの正規化が必要
   - カスタムシリアライザの保守コスト

❌ **テスト実行時間**
   - スナップショット比較のオーバーヘッド
   - 大量のエンドポイントでは実行時間が増加

❌ **スナップショットの可読性**
   - 大きなJSONの差分は読みにくい
   - どのフィールドが重要かわかりにくい

### デメリットへの対策

**スナップショットサイズ対策**:
- 大きなレスポンスは部分的にスナップショット化
- ページネーション結果は最初の数件のみテスト

**更新プロセスの確立**:
- スナップショット更新時は必ず差分をレビュー
- CIでスナップショット不一致を明示的にエラー化

**シリアライザの保守**:
- 動的値パターンのドキュメント化
- 正規化ルールのテスト

**パフォーマンス対策**:
- スナップショットテストと統合テストを分離
- 並列実行の最適化

## npmスクリプト

```json
// package.json (backend)
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:snapshot": "vitest --run",
    "test:snapshot:update": "vitest --run -u",
    "test:coverage": "vitest --coverage"
  }
}
```

### 使用例

```bash
# 通常のテスト実行
npm run test

# スナップショット更新（差分を確認してから実行）
npm run test:snapshot:update

# カバレッジ付きテスト
npm run test:coverage

# ウォッチモードでテスト
npm run test:watch
```

## リスクと対策

### リスク1: スナップショット更新の誤用

**リスク**: 開発者が差分を確認せずに`--update`を実行し、意図しない変更を承認

**対策**:
1. CIでスナップショット不一致を検出
2. PRテンプレートにスナップショット変更のチェックリスト追加
3. スナップショット更新のガイドラインをドキュメント化
4. レビュー時にスナップショット差分を必ず確認

### リスク2: テスト実行時間の増加

**リスク**: 全エンドポイントのスナップショットテストでCI実行時間が大幅に増加

**対策**:
1. テストを並列実行
2. スナップショットテストを別ジョブとして分離
3. 変更のあったファイルに関連するテストのみ実行（オプション）

### リスク3: データベース状態の管理

**リスク**: テスト間でデータベース状態が干渉し、不安定なテストになる

**対策**:
1. 各テストの`beforeEach`でデータベースをクリア
2. トランザクションロールバックの活用（オプション）
3. テストデータのファクトリ化で一貫性を保証

## 成功指標（KPI）

1. **テストカバレッジ**
   - 目標: 全エンドポイント（20）のスナップショットテスト実装
   - 測定: テスト済みエンドポイント数 / 全エンドポイント数

2. **回帰テスト検出率**
   - 目標: API変更の100%をスナップショット不一致で検出
   - 測定: スナップショット不一致で検出された変更 / 全API変更

3. **テスト実行時間**
   - 目標: 全テスト実行時間 < 30秒
   - 測定: CIでのテストジョブ実行時間

4. **スナップショット更新頻度**
   - 目標: 適切な頻度での更新（月2-5回程度）
   - 測定: スナップショット更新コミット数

## 次のステップ

### 即座に実行可能なアクション

1. **スナップショットシリアライザの実装**
   - `src/__tests__/helpers/snapshot-serializers.ts`作成
   - UUID、タイムスタンプ正規化の実装
   - Vitestセットアップファイルへの登録

2. **Health APIのスナップショットテスト作成**
   - `src/routes/health.snapshot.test.ts`作成
   - 最初のスナップショット生成
   - CIでの実行確認

3. **テストヘルパーの実装**
   - データファクトリの基本実装
   - データベースヘルパーの実装

### 承認が必要な決定事項

1. **スナップショット配置戦略**
   - 提案: `src/__tests__/snapshots/`に集約
   - 代替: 各テストファイルと同じディレクトリ

2. **テスト実行戦略**
   - 提案: 既存テストとスナップショットテストを統合
   - 代替: 別のnpmスクリプトとして分離

3. **CI統合方法**
   - 提案: 既存のCIパイプラインに追加
   - 代替: 別のCIジョブとして実行

## 参考資料

- [Vitest Snapshot Testing](https://vitest.dev/guide/snapshot.html)
- [Jest Snapshot Testing Best Practices](https://jestjs.io/docs/snapshot-testing)
- [Effective Snapshot Testing](https://kentcdodds.com/blog/effective-snapshot-testing)
- [OpenAPI Contract Testing](https://swagger.io/blog/api-testing/openapi-driven-api-testing/)

## 関連ドキュメント

- `PROJECT_IMPROVEMENTS_251208_CLAUDE.md` - 全体的なプロジェクト改善提案
- `specs/openapi.yml` - API仕様定義
- `packages/openapi/dist/index.ts` - 生成されたZodスキーマ
- `SNAPSHOT_TESTING_DESIGN.md` - 本ドキュメントの英語版

---

**ドキュメント履歴**
- 2025-12-09: 日本語版作成
- 2025-12-08: 英語版初稿作成（設計検討フェーズ）
