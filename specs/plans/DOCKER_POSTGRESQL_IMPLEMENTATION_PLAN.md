# Docker Compose PostgreSQL 実装計画

## 概要

このプロジェクトにdocker-composeを使用してPostgreSQLデータベースを起動し、ローカル開発環境で簡単に接続できるようにする。

## 現状分析

### 既存の構成
- **データベース**: PostgreSQL（`pg` パッケージ使用）
- **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **プロジェクト構造**: モノレポ（apps/backend, packages/openapi）
- **環境変数**: `apps/backend/.env.example` に `DATABASE_URL` のサンプルあり
  - 例: `postgres://user:password@localhost:5432/app_db`

### 現在の課題
- README.md:12 に「Local PostgreSQL instance or cloud database for DATABASE_URL」が必要と記載
- 開発者が各自でPostgreSQLをインストール・セットアップする必要がある
- データベースのバージョンや設定が統一されていない可能性

## 実装計画

### 1. Docker Compose ファイルの作成

**ファイル**: `docker-compose.yml` (プロジェクトルート)

#### 実装内容
- PostgreSQL 公式イメージを使用（推奨バージョン: 16-alpine または 15-alpine）
- ポート: 5432 をホストに公開
- データ永続化のためのボリューム設定
- 環境変数による初期設定
  - `POSTGRES_USER`: postgres
  - `POSTGRES_PASSWORD`: password（開発用）
  - `POSTGRES_DB`: app_db
- ヘルスチェック設定

#### サンプル構成
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: hono-drizzle-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: app_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 2. 環境変数ファイルの更新

**ファイル**: `apps/backend/.env.example`

#### 変更内容
既存の `DATABASE_URL` を Docker Compose に合わせて更新:

```diff
-DATABASE_URL=postgres://user:password@localhost:5432/app_db
+DATABASE_URL=postgres://postgres:password@localhost:5432/app_db
PORT=3000
```

**理由**: Docker Compose で設定するユーザー名（postgres）と一致させる

### 3. .gitignore の確認・更新（必要に応じて）

**ファイル**: `.gitignore`

#### 確認項目
- `.env` が既にignoreされているか（✓ 現在は設定済み）
- Docker 関連ファイルでignoreすべきものがあれば追加
  - 現時点では追加不要

### 4. ドキュメントの更新

#### 4.1 README.md の更新

**セクション**: Prerequisites

```diff
 ## Prerequisites

 - Node.js 20+ and npm
-- Local PostgreSQL instance or cloud database for `DATABASE_URL`
+- Docker and Docker Compose (for local database)
+  - OR: Local PostgreSQL instance or cloud database for `DATABASE_URL`
 - Ability to install workspace dependencies (`npm install`)
```

**新セクション追加**: Database Setup (Getting started の前)

```markdown
## Database Setup

### Using Docker (Recommended for local development)

1. Start PostgreSQL with Docker Compose:

   ```bash
   docker compose up -d
   ```

2. Verify the database is running:

   ```bash
   docker compose ps
   ```

3. Stop the database when not needed:

   ```bash
   docker compose down
   ```

4. To remove all data and start fresh:

   ```bash
   docker compose down -v
   ```

### Using an existing PostgreSQL instance

If you prefer to use your own PostgreSQL instance, update `DATABASE_URL` in
`apps/backend/.env` to point to your database.
```

**セクション**: Getting started - Step 2の更新

```diff
 2. Copy the backend environment template and set your database URL:

    ```bash
    cp apps/backend/.env.example apps/backend/.env
-   # Edit apps/backend/.env to point DATABASE_URL at your Postgres instance
+   # If using Docker Compose, no changes needed
+   # Otherwise, edit apps/backend/.env to point DATABASE_URL at your Postgres instance
    ```
```

#### 4.2 CLAUDE.md の更新

**追加内容**:

```markdown
- `docker compose up -d` to start the PostgreSQL database locally.
- `docker compose down` to stop the database.
```

既存の「Context to provide in prompts」セクションに追加:

```diff
 - The backend lives in `apps/backend` and uses Vitest for testing.
 - Shared OpenAPI assets live in `packages/openapi` and are generated with Orval.
 - Environment variables should be loaded from `apps/backend/.env` during local runs.
+- Local PostgreSQL runs via Docker Compose; use `docker compose up -d` to start it.
```

### 5. npm scripts の追加（オプション）

**ファイル**: `package.json` (ルート)

#### 追加するスクリプト
```json
{
  "scripts": {
    "dev:backend": "npm run dev --workspace backend",
    "generate:api": "npm run generate --workspace openapi",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "db:logs": "docker compose logs -f postgres",
    "db:reset": "docker compose down -v && docker compose up -d"
  }
}
```

**メリット**:
- 開発者がDocker Composeコマンドを覚える必要がない
- README で `npm run db:up` のような統一的な記述が可能

### 6. マイグレーション実行手順の追加

**README.md の Database migrations セクションに追加**:

```markdown
## Database migrations

Drizzle Kit reads configuration from `apps/backend/drizzle.config.ts`, which uses
`DATABASE_URL` when present.

**First time setup** (after starting Docker Compose):

```bash
# Generate initial migration files
npx drizzle-kit generate --config apps/backend/drizzle.config.ts

# Apply migrations to create tables
npx drizzle-kit push --config apps/backend/drizzle.config.ts
```

**Making schema changes**:

```bash
# 1. Update apps/backend/src/infrastructure/db/schema.ts
# 2. Generate SQL migrations from schema changes
npx drizzle-kit generate --config apps/backend/drizzle.config.ts

# 3. Apply migrations to your database
npx drizzle-kit push --config apps/backend/drizzle.config.ts
```
```

## 実装順序

1. ✅ **分析フェーズ**: 現状のプロジェクト構成を理解（完了）
2. 📝 **ファイル作成**: `docker-compose.yml` の作成
3. 🔧 **設定更新**: `.env.example` の更新
4. 📚 **ドキュメント更新**:
   - README.md への Database Setup セクション追加
   - Getting started セクションの修正
   - CLAUDE.md の更新
5. 🚀 **スクリプト追加**: package.json への便利スクリプト追加（オプション）
6. ✅ **動作確認**:
   - `docker compose up -d` でPostgreSQLが起動するか
   - `npm run dev:backend` でアプリケーションが接続できるか
   - マイグレーションが正常に実行できるか

## 追加検討事項

### セキュリティ
- **本番環境での注意**: docker-compose.yml の認証情報はあくまで開発用
- 本番環境では環境変数や secrets 管理ツールを使用すること

### データバックアップ（将来的な拡張）
- pgAdmin や Adminer などの管理ツールをdocker-composeに追加
- データのバックアップ・リストアスクリプト

### 開発体験の向上
- データベースの初期シードデータを投入するスクリプト
- テスト用データベースの分離（別コンテナまたは別DB）

## 期待される効果

1. **環境構築の簡素化**: `docker compose up -d` 一つでPostgreSQLが起動
2. **チーム開発の統一**: 全員が同じバージョン・設定のデータベースを使用
3. **オンボーディングの高速化**: 新規参加者がすぐに開発を開始可能
4. **クリーンな環境**: `docker compose down -v` でデータをリセット可能

## 参考リソース

- [Docker Compose 公式ドキュメント](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team/)
