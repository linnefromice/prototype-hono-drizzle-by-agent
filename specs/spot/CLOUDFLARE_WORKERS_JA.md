# Cloudflare Workers デプロイメントガイド

このドキュメントでは、Hono API バックエンドを D1（SQLite）データベースとともに Cloudflare Workers へデプロイする方法を説明します。

## 前提条件

- Node.js がインストールされていること
- Cloudflare アカウント
- Wrangler CLI がグローバルまたは npm 経由でインストールされていること

```bash
npm install -g wrangler
# またはプロジェクト固有の使用には npx wrangler を使用
```

## アーキテクチャ概要

このアプリケーションは複数の環境をサポートしています：

- **ローカル開発**: `better-sqlite3` でファイルベースの SQLite（`dev.db`）を使用
- **テスト**: `better-sqlite3` でインメモリ SQLite（`:memory:`）を使用
- **本番環境（Cloudflare Workers）**: Cloudflare D1（マネージド SQLite）を使用

## セットアップ手順

### 1. Cloudflare で認証

```bash
wrangler login
```

### 2. D1 データベースの作成

プロジェクト用の D1 データベースを作成します：

```bash
cd apps/backend
npm run d1:create
```

これによりデータベース ID が出力されます。それをコピーして `wrangler.toml` を更新します：

```toml
[[d1_databases]]
binding = "DB"
database_name = "prototype-hono-drizzle-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ここに ID を貼り付け
```

### 3. マイグレーションの生成と適用

まず、Drizzle から SQL スキーマを生成します：

```bash
npm run db:generate
```

これにより `migrations` ディレクトリにマイグレーションファイルが作成されます。

D1 データベースにマイグレーションを適用します：

```bash
npm run d1:migrations:apply
```

または、特定の SQL ファイルを実行できます：

```bash
npm run d1:execute
```

### 4. Wrangler でのローカル開発

D1 を使用して Workers アプリケーションをローカルでテストします：

```bash
npm run wrangler:dev
```

これにより、Cloudflare Workers 環境をシミュレートするローカル開発サーバーが起動します。

### 5. Cloudflare Workers へのデプロイ

本番環境へデプロイします：

```bash
npm run wrangler:deploy
```

## データベースクライアントアーキテクチャ

このアプリケーションは環境に応じて異なるデータベースクライアントを使用します：

### ローカル/テスト: `better-sqlite3`
- **ファイル**: `src/infrastructure/db/client.ts`
- **使用箇所**: Node.js サーバー（`src/server.ts`）および Vitest テスト
- **データベース**: ファイルベース（`dev.db`）またはインメモリ（`:memory:`）

### 本番環境: Cloudflare D1
- **ファイル**: `src/infrastructure/db/client.d1.ts`
- **使用箇所**: Cloudflare Workers（`src/index.ts`）
- **データベース**: Cloudflare D1（マネージド SQLite）

両方のクライアントは同じ Drizzle ORM スキーマを使用し、環境間の一貫性を保証します。

## 環境変数

Workers 環境では環境変数の代わりにバインディングを使用します：

```typescript
export type Env = {
  DB: D1Database  // D1 データベースバインディング
}
```

`wrangler.toml` でバインディングを設定します：

```toml
[[d1_databases]]
binding = "DB"
database_name = "prototype-hono-drizzle-db"
database_id = "your-database-id"
```

## デプロイメント環境

### 開発環境

```bash
wrangler dev --env dev
```

`wrangler.toml` の `env.dev` 設定を使用します。

### 本番環境

```bash
wrangler deploy --env production
```

`wrangler.toml` の `env.production` 設定を使用します。

## データベースマイグレーション

### マイグレーションの作成

1. `src/infrastructure/db/schema.ts` でスキーマを更新
2. マイグレーションファイルを生成：

```bash
npm run db:generate
```

3. D1 に適用：

```bash
npm run d1:migrations:apply
```

### 手動 SQL 実行

D1 に対して SQL を直接実行します：

```bash
wrangler d1 execute prototype-hono-drizzle-db --command="SELECT * FROM users"
```

またはファイルから：

```bash
wrangler d1 execute prototype-hono-drizzle-db --file=./path/to/script.sql
```

## モニタリングとログ

リアルタイムでログを表示：

```bash
wrangler tail
```

Cloudflare ダッシュボードで過去のログを表示：
1. Workers & Pages に移動
2. ワーカーを選択
3. 「Logs」タブをクリック

## パフォーマンスに関する考慮事項

### D1 の制限（2024年時点）

- **データベースサイズ**: データベースあたり 500 MB（無料枠）
- **読み取り**: 1日あたり 500万回の読み取り（無料枠）
- **書き込み**: 1日あたり 10万回の書き込み（無料枠）
- **応答時間**: 単純なクエリで通常 50ms 未満

### 最適化のヒント

1. **バッチ操作**: 可能な限り複数の挿入/更新をグループ化
2. **インデックス**: 頻繁にクエリされるカラムにインデックスを追加
3. **コネクションプーリング**: 不要 - D1 が自動的に処理
4. **キャッシング**: 頻繁にアクセスされるデータには Workers KV または Cache API の使用を検討

## トラブルシューティング

### エラー: "Cannot find binding 'DB'"

**解決策**: `wrangler.toml` に D1 バインディングが正しく設定されていること、およびデータベースを作成したことを確認してください。

### エラー: "Table does not exist"

**解決策**: マイグレーションを実行してください：

```bash
npm run d1:migrations:apply
```

### ローカル開発の問題

`wrangler dev` が失敗する場合：

1. wrangler が最新であることを確認：`npm install -g wrangler@latest`
2. wrangler キャッシュをクリア：`rm -rf ~/.wrangler`
3. 再認証：`wrangler login`

### D1 の型エラー

D1 の型定義は `@cloudflare/workers-types` によって提供されます。型エラーが発生した場合：

```bash
npm install -D @cloudflare/workers-types
```

`tsconfig.json` を更新：

```json
{
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  }
}
```

## CI/CD 統合

### GitHub Actions の例

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test --workspace backend

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/backend
          command: deploy --env production
```

## コスト見積もり

**無料枠**（月あたり）：
- 1日あたり 10万リクエスト
- リクエストあたり 10ms の CPU 時間
- 1日あたり 500万 D1 読み取り
- 1日あたり 10万 D1 書き込み

**有料プラン**（Workers Paid）：
- 月額 $5 基本料金
- 100万リクエストあたり $0.50
- 追加の D1 使用量は別途請求

## 追加リソース

- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [D1 ドキュメント](https://developers.cloudflare.com/d1/)
- [Hono ドキュメント](https://hono.dev/)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team/)

## サポート

このプロジェクト固有の問題については、GitHub で issue を作成してください。

Cloudflare Workers のサポートについては、[Cloudflare Community](https://community.cloudflare.com/) をご覧ください。
