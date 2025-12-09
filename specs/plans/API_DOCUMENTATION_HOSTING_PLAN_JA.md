# API ドキュメントとスナップショットのホスティング実装計画

## 概要

このドキュメントでは、以下の情報をホスティングするための実装方針を定義します：

1. **API スキーマ情報** (OpenAPI 仕様)
2. **スナップショットテストのキャプチャ** (正規化された JSON レスポンス)

## 目的

- API 仕様を開発者が容易に参照できるようにする
- スナップショットテストの結果を可視化し、API レスポンス構造の変更を追跡可能にする
- ドキュメントの自動更新により、常に最新の状態を保つ
- コストを最小限に抑えつつ、保守性の高い仕組みを構築する

---

## 実装方針の比較

### 方針1: 静的サイトジェネレータ + GitHub Pages ⭐⭐⭐⭐⭐ (推奨)

#### 概要
- VitePress または Docusaurus で静的サイトを生成
- OpenAPI 仕様から自動生成されたドキュメント
- スナップショットデータを整形して Markdown で表示
- GitHub Pages で無料ホスティング

#### メリット
- ✅ 追加コストなし（GitHub Pages 無料）
- ✅ CI/CD で自動更新可能
- ✅ バージョン管理が容易
- ✅ 実装難易度が低い
- ✅ SEO に強い
- ✅ 高速な表示速度

#### デメリット
- ❌ リアルタイム更新は不可（ビルドが必要）
- ❌ 動的な機能は制限される

#### 技術スタック
- **VitePress** または **Docusaurus**: ドキュメントサイトフレームワーク
- **Redocly CLI** または **Scalar**: OpenAPI から美しい API ドキュメント生成
- **カスタムスクリプト**: スナップショットを Markdown に変換
- **GitHub Actions**: 自動ビルド・デプロイ
- **GitHub Pages**: ホスティング

#### ディレクトリ構成
```
apps/docs/
├── package.json
├── .vitepress/              # VitePress 設定
│   ├── config.ts
│   └── theme/
│       └── index.ts         # カスタムテーマ
├── public/
│   └── openapi.yaml         # OpenAPI 仕様ファイル
├── api/
│   ├── index.md             # API 概要
│   ├── reference.md         # 自動生成された API リファレンス
│   ├── users.md             # Users API 詳細
│   ├── conversations.md     # Conversations API 詳細
│   └── messages.md          # Messages API 詳細
├── snapshots/
│   ├── index.md             # スナップショット一覧
│   ├── users.md             # Users API のスナップショット
│   ├── conversations.md     # Conversations API のスナップショット
│   └── messages.md          # Messages API のスナップショット
└── scripts/
    ├── generate-api-docs.ts      # OpenAPI から Markdown 生成
    └── generate-snapshot-docs.ts # スナップショットから Markdown 生成
```

---

### 方針2: Hono アプリ内に /docs エンドポイントを追加 ⭐⭐⭐

#### 概要
- 既存の Hono バックエンドに `/docs` ルートを追加
- OpenAPI UI (Swagger UI / Scalar) を統合
- スナップショットビューアを API エンドポイントとして提供

#### メリット
- ✅ 既存インフラを活用できる
- ✅ API と同じ環境で動作
- ✅ リアルタイムデータ表示可能
- ✅ 認証機能との統合が容易

#### デメリット
- ❌ バックエンドサーバーが必要（常時稼働コスト）
- ❌ SEO に弱い
- ❌ パフォーマンスがサーバーに依存

#### 技術スタック
- **Hono**: 既存バックエンドフレームワーク
- **Scalar** または **Swagger UI**: OpenAPI 表示
- **Hono 静的ファイル配信**: HTML/CSS/JS の配信
- カスタム React/Vue コンポーネント（スナップショット表示用）

#### 実装例
```typescript
// apps/backend/src/routes/docs.ts
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'fs'
import { join } from 'path'

const docs = new Hono()

// OpenAPI 仕様の提供
docs.get('/api/openapi.yaml', (c) => {
  const yaml = readFileSync(join(__dirname, '../../../packages/openapi/openapi.yaml'), 'utf-8')
  return c.text(yaml, 200, { 'Content-Type': 'application/yaml' })
})

// Scalar UI の表示
docs.get('/api', (c) => {
  return c.html(`
    <!doctype html>
    <html>
      <head>
        <title>API Documentation</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <script id="api-reference" data-url="/docs/api/openapi.yaml"></script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
  `)
})

// スナップショット一覧
docs.get('/snapshots', async (c) => {
  const snapshots = // スナップショットファイルを読み込む
  return c.json(snapshots)
})

// 特定のスナップショット詳細
docs.get('/snapshots/:name', async (c) => {
  const name = c.req.param('name')
  const snapshot = // 個別のスナップショットを読み込む
  return c.json(snapshot)
})

export default docs
```

---

### 方針3: 専用の Docs アプリ（Next.js / Astro） ⭐⭐⭐⭐

#### 概要
- 独立した docs アプリケーションを monorepo 内に作成
- Next.js または Astro で高度なインタラクティブ機能を実装
- API スキーマとスナップショットを統合表示

#### メリット
- ✅ 高度なインタラクティブ機能
- ✅ SEO 最適化が最良
- ✅ 柔軟なカスタマイズ
- ✅ サーバーサイド機能も利用可能

#### デメリット
- ❌ 実装コストが高い
- ❌ ホスティング費用が発生する可能性
- ❌ 保守コストが増加

#### 技術スタック
- **Astro** または **Next.js**: フレームワーク
- **Tailwind CSS**: スタイリング
- **Redocly** または **Scalar**: OpenAPI 表示
- カスタムコンポーネント: スナップショット表示

#### ディレクトリ構成
```
apps/docs/
├── src/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── api/
│   │   │   ├── index.astro
│   │   │   └── [endpoint].astro
│   │   └── snapshots/
│   │       ├── index.astro
│   │       └── [snapshot].astro
│   ├── components/
│   │   ├── ApiReference.tsx
│   │   ├── SnapshotViewer.tsx
│   │   ├── DiffViewer.tsx
│   │   └── SearchBar.tsx
│   ├── layouts/
│   │   └── Layout.astro
│   └── data/
│       ├── openapi.yaml -> ../../../packages/openapi/openapi.yaml
│       └── snapshots/   -> ../../../apps/backend/src/routes/__snapshots__/
├── public/
│   └── assets/
└── astro.config.mjs
```

---

## 比較表

| 項目 | 方針1: 静的サイト | 方針2: Hono 統合 | 方針3: 専用アプリ |
|------|------------------|-----------------|-----------------|
| **コスト** | 無料 | 既存インフラ | ホスティング費用 |
| **実装難易度** | 低 | 中 | 高 |
| **更新の自動化** | 容易 (GitHub Actions) | 中程度 | 容易 |
| **カスタマイズ性** | 中 | 高 | 最高 |
| **SEO** | 良好 | 不可 | 最良 |
| **表示速度** | 高速 (静的) | サーバー依存 | 中〜高速 |
| **リアルタイム更新** | 不可 | 可能 | 可能 |
| **認証統合** | 困難 | 容易 | 中程度 |
| **推奨度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 推奨実装計画（方針1採用）

### Phase 1: VitePress セットアップと基本構成

#### Step 1: VitePress プロジェクト作成

```bash
# apps/docs ディレクトリを作成
npm create vitepress@latest apps/docs

# 必要なパッケージをインストール
cd apps/docs
npm install
```

#### Step 2: VitePress 設定

```typescript
// apps/docs/.vitepress/config.ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Prototype Hono Drizzle API',
  description: 'API Documentation and Snapshot Testing Results',
  base: '/prototype-hono-drizzle-codex/', // GitHub Pages の repository 名

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Snapshots', link: '/snapshots/' },
    ],

    sidebar: {
      '/api/': [
        {
          text: 'API Documentation',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Users API', link: '/api/users' },
            { text: 'Conversations API', link: '/api/conversations' },
            { text: 'Messages API', link: '/api/messages' },
          ],
        },
      ],
      '/snapshots/': [
        {
          text: 'Snapshot Testing',
          items: [
            { text: 'Overview', link: '/snapshots/' },
            { text: 'Users Snapshots', link: '/snapshots/users' },
            { text: 'Conversations Snapshots', link: '/snapshots/conversations' },
            { text: 'Messages Snapshots', link: '/snapshots/messages' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/linnefromice/prototype-hono-drizzle-codex' },
    ],
  },
})
```

---

### Phase 2: OpenAPI ドキュメント統合

#### Step 1: Redocly または Scalar の統合

**Scalar を使用する場合:**

```bash
npm install --save-dev @scalar/api-reference
```

```markdown
<!-- apps/docs/api/index.md -->
# API Reference

<ClientOnly>
  <ScalarApiReference
    :configuration="{
      spec: {
        url: '/openapi.yaml'
      }
    }"
  />
</ClientOnly>
```

**または、静的に生成する場合:**

```bash
# Redocly CLI で静的 HTML を生成
npx @redocly/cli build-docs packages/openapi/openapi.yaml \
  -o apps/docs/public/api-reference.html
```

#### Step 2: OpenAPI 仕様ファイルのコピー

```json
// apps/docs/package.json に追加
{
  "scripts": {
    "docs:dev": "vitepress dev",
    "docs:build": "npm run copy:openapi && vitepress build",
    "docs:preview": "vitepress preview",
    "copy:openapi": "cp ../../packages/openapi/openapi.yaml ./public/openapi.yaml"
  }
}
```

---

### Phase 3: スナップショット変換スクリプト

#### Step 1: スナップショット変換スクリプト作成

```typescript
// apps/docs/scripts/generate-snapshot-docs.ts
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface SnapshotData {
  [key: string]: string
}

function parseSnapshotFile(filepath: string): SnapshotData {
  const content = readFileSync(filepath, 'utf-8')
  const snapshots: SnapshotData = {}

  // Vitest snapshot 形式をパース
  const regex = /exports\[`(.+?)`\] = `\n([\s\S]+?)\n`/g
  let match

  while ((match = regex.exec(content)) !== null) {
    const [, name, data] = match
    snapshots[name] = data
  }

  return snapshots
}

function generateMarkdown(name: string, snapshots: SnapshotData): string {
  let markdown = `# ${name} API Snapshots\n\n`
  markdown += `## Overview\n\n`
  markdown += `This page shows the snapshot test results for the ${name} API endpoints.\n\n`
  markdown += `All dynamic values (UUIDs and timestamps) are normalized for stable comparison.\n\n`

  for (const [testName, data] of Object.entries(snapshots)) {
    markdown += `## ${testName}\n\n`
    markdown += '```json\n'
    markdown += data
    markdown += '\n```\n\n'
  }

  return markdown
}

function main() {
  const snapshotDir = join(__dirname, '../../../apps/backend/src/routes/__snapshots__')
  const outputDir = join(__dirname, '../snapshots')

  const files = readdirSync(snapshotDir).filter(f => f.endsWith('.snap'))

  for (const file of files) {
    const name = file.replace('.test.ts.snap', '')
    const filepath = join(snapshotDir, file)
    const snapshots = parseSnapshotFile(filepath)
    const markdown = generateMarkdown(name, snapshots)

    writeFileSync(join(outputDir, `${name}.md`), markdown)
    console.log(`Generated ${name}.md`)
  }
}

main()
```

#### Step 2: ビルドプロセスに統合

```json
// apps/docs/package.json
{
  "scripts": {
    "docs:dev": "vitepress dev",
    "docs:build": "npm run generate:snapshots && npm run copy:openapi && vitepress build",
    "docs:preview": "vitepress preview",
    "copy:openapi": "cp ../../packages/openapi/openapi.yaml ./public/openapi.yaml",
    "generate:snapshots": "tsx scripts/generate-snapshot-docs.ts"
  },
  "devDependencies": {
    "tsx": "^4.0.0"
  }
}
```

---

### Phase 4: GitHub Actions で自動デプロイ

```yaml
# .github/workflows/deploy-docs.yml
name: Deploy Documentation

on:
  push:
    branches:
      - main
    paths:
      - 'packages/openapi/**'
      - 'apps/backend/src/routes/__snapshots__/**'
      - 'apps/docs/**'
      - '.github/workflows/deploy-docs.yml'

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build documentation
        run: npm run docs:build --workspace docs

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/docs/.vitepress/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

### Phase 5: スナップショット表示の強化

#### カスタムコンポーネント例

```vue
<!-- apps/docs/.vitepress/theme/components/SnapshotDiff.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  before: string
  after: string
}

const props = defineProps<Props>()

const showDiff = ref(true)

const diff = computed(() => {
  // 簡易的な diff 計算
  const beforeLines = props.before.split('\n')
  const afterLines = props.after.split('\n')

  return afterLines.map((line, i) => ({
    line,
    type: beforeLines[i] !== line ? 'changed' : 'same'
  }))
})
</script>

<template>
  <div class="snapshot-diff">
    <div class="controls">
      <button @click="showDiff = !showDiff">
        {{ showDiff ? 'Hide Diff' : 'Show Diff' }}
      </button>
    </div>

    <div v-if="showDiff" class="diff-view">
      <div class="before">
        <h4>Before</h4>
        <pre>{{ before }}</pre>
      </div>
      <div class="after">
        <h4>After</h4>
        <pre v-for="(item, i) in diff" :key="i" :class="item.type">
          {{ item.line }}
        </pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.snapshot-diff {
  margin: 1rem 0;
}

.diff-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.changed {
  background-color: #ffe6e6;
}

.same {
  background-color: transparent;
}
</style>
```

---

## 実装スケジュール

### Week 1: 基盤構築
- [ ] VitePress プロジェクト作成
- [ ] 基本設定とナビゲーション構築
- [ ] OpenAPI ドキュメント統合

### Week 2: スナップショット統合
- [ ] スナップショット変換スクリプト実装
- [ ] Markdown ページ自動生成
- [ ] ビルドプロセス統合

### Week 3: デプロイ自動化
- [ ] GitHub Actions ワークフロー作成
- [ ] GitHub Pages 設定
- [ ] 自動デプロイ動作確認

### Week 4: 機能拡張
- [ ] スナップショット diff 表示
- [ ] 検索機能追加
- [ ] カスタムテーマ適用

---

## 今後の拡張案

### 短期的な改善
1. **Try-it 機能**: 開発環境に対して直接 API リクエストを送信
2. **バージョン管理**: 過去のスナップショット履歴を表示
3. **検索・フィルタリング**: エンドポイント名やレスポンスフィールドで検索

### 長期的な改善
1. **インタラクティブな API Explorer**: GraphQL Playground のような UI
2. **パフォーマンス指標**: レスポンスタイムやペイロードサイズの可視化
3. **多言語対応**: 日本語・英語の切り替え
4. **ダークモード**: VitePress のデフォルト機能を活用

---

## まとめ

**推奨実装:** 方針1（VitePress + GitHub Pages）

**理由:**
- 実装難易度が低く、短期間で構築可能
- GitHub Pages による無料ホスティング
- CI/CD による自動更新が容易
- 将来的な拡張性も十分

**次のアクション:**
1. VitePress プロジェクトの作成
2. OpenAPI ドキュメント統合
3. スナップショット変換スクリプトの実装
4. GitHub Actions による自動デプロイ設定

この計画に基づいて実装を開始することで、API ドキュメントとスナップショットテストの可視化が実現できます。
