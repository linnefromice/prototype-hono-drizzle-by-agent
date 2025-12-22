# ローカル開発環境セットアップガイド

このガイドでは、ローカルのD1データベースを使用してフロントエンド開発を進めるための手順を説明します。

## 前提条件

- Node.js と npm がインストールされている
- プロジェクトのルートディレクトリで `npm install` を実行済み

## セットアップ手順

### 1. 初回セットアップ（データベースのリセットとシードデータ投入）

初めてローカル環境を構築する場合、または完全にリセットしたい場合:

```bash
# apps/backend ディレクトリに移動
cd apps/backend

# データベースのリセット（クリーンアップ、マイグレーション、シードデータ投入）
npm run d1:reset:local
```

このコマンドは以下を順番に実行します:
1. 既存のデータをクリーンアップ (`d1:clean:local`)
2. マイグレーションを実行してテーブル作成 (`d1:migrate:local`)
3. チャットユーザーのシードデータを投入 (`d1:seed:users:local`)
4. 認証ユーザーのシードデータを投入 (`operation:seed:auth-users:local`)

### 2. APIサーバーの起動

別のターミナルで以下のコマンドを実行:

```bash
cd apps/backend
npm run wrangler:dev
```

APIサーバーが起動し、`http://localhost:8787` でアクセス可能になります。

### 3. 動作確認

以下のコマンドでAPIが正常に動作しているか確認できます:

```bash
# ヘルスチェック
curl http://localhost:8787/health

# ユーザー一覧取得
curl http://localhost:8787/users
```

## その他の便利なコマンド

### データベース操作

```bash
# マイグレーションのみ実行
npm run d1:migrate:local

# ユーザーシードデータのみ投入
npm run d1:seed:users:local

# 認証ユーザーシードデータのみ投入
npm run operation:seed:auth-users:local

# データベースのクリーンアップのみ
npm run d1:clean:local
```

### データベース確認

```bash
# ユーザー一覧表示
npm run d1:list-users:local

# 認証ユーザー一覧表示
npm run d1:list-auth-users:local

# カスタムクエリ実行
npm run d1:query:local "SELECT * FROM conversations"
```

### Drizzle Studio（データベースGUI）

```bash
npm run db:studio
```

ブラウザで Drizzle Studio が開き、データベースの内容を視覚的に確認・編集できます。

## シードデータについて

### チャットユーザー

以下のユーザーがシードデータとして作成されます（`drizzle/seeds/002_chat_users.sql`）:
- alice
- bob
- charlie
- diana
- eve

### 認証ユーザー

認証システムのユーザーは、チャットユーザーと紐付けられます:
- ユーザー名: チャットユーザーのidAlias（例: alice, bob など）
- パスワード: すべて `Password`
- メール: `{idAlias}@example.com`（例: alice@example.com）

## トラブルシューティング

### シードデータ投入がタイムアウトする場合

Cloudflare Workers の CPU 時間制限により、認証ユーザー作成時のパスワードハッシュ化が制限にかかる場合があります。

**デフォルトバッチサイズ**: 3ユーザー/リクエスト（1-5の範囲で調整可能）

バッチサイズを調整して実行:

```bash
# デフォルト（batchSize=3）で実行
curl -X POST "http://localhost:8787/admin/seed-auth-users-by-app-users"

# バッチサイズを指定（1-5の範囲）
curl -X POST "http://localhost:8787/admin/seed-auth-users-by-app-users?batchSize=2"
```

レスポンスに含まれる `performance` メトリクスで処理時間を確認できます:
- `totalTimeMs`: リクエスト全体の処理時間
- `avgUserProcessingMs`: ユーザーあたりの平均処理時間
- `maxUserProcessingMs`: 最大処理時間

`remaining` が 0 になるまで繰り返し実行してください。

### データベースをリセットしたい場合

```bash
npm run d1:reset:local
```

### マイグレーションエラーが発生した場合

1. データベースファイルを削除:
```bash
rm -rf .wrangler/state/v3/d1
```

2. マイグレーションを再実行:
```bash
npm run d1:migrate:local
```

## API認証について

ローカルAPIでは、以下のエンドポイントで認証できます:

```bash
# ログイン（クッキーが保存されます）
curl -c cookies.txt -X POST http://localhost:8788/api/auth/sign-in/username \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"Password"}'

# 認証が必要なエンドポイントへのアクセス
curl -b cookies.txt http://localhost:8788/conversations
```

**重要**: ローカル開発環境（HTTP）では、Cookie の `Secure` 属性が自動的に無効化されます。
これにより、iOS アプリなどの HTTP クライアントからも Cookie ベースの認証が使用できます。

### Cookie のセキュリティ設定

- **ローカル環境 (http://localhost:8788)**: `Secure` 属性なし（HTTP でも Cookie が送信される）
- **本番環境 (https://)**: `Secure` 属性あり（HTTPS のみで Cookie が送信される）

この動作は `apps/backend/src/infrastructure/auth/config.ts` の `advanced.useSecureCookies` 設定で制御されています。

詳細なAPI使用例は `/tmp/chat-api-test.sh` を参照してください。
