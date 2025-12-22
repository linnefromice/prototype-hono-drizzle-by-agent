# パフォーマンス最適化ガイド

## Cloudflare Workers の制限と対策

### CPU 時間制限

Cloudflare Workers には厳しい CPU 時間制限があります:

| プラン | CPU 時間制限 |
|--------|-------------|
| Free   | 10ms/リクエスト |
| Paid   | 50ms/リクエスト |

### 認証処理の CPU 消費

Better Auth はデフォルトで `scrypt` アルゴリズムを使用してパスワードをハッシュ化します。
これは非常に安全ですが、CPU 集約的な処理です:

- **サインアップ**: 1ユーザーあたり約 50-100ms の CPU 時間を消費
- **サインイン**: 1ユーザーあたり約 30-50ms の CPU 時間を消費

### 最適化戦略

#### 1. バッチ処理の最適化

`/admin/seed-auth-users-by-app-users` エンドポイントは、以下の最適化を実装しています:

- **デフォルトバッチサイズ**: 3ユーザー/リクエスト
- **最大バッチサイズ**: 5ユーザー/リクエスト
- **パフォーマンスメトリクス**: 各リクエストで処理時間を計測

```bash
# パフォーマンスメトリクスを確認
curl -X POST "http://localhost:8787/admin/seed-auth-users-by-app-users?batchSize=2"
```

レスポンス例:
```json
{
  "success": true,
  "summary": {
    "total": 2,
    "created": 2,
    "skipped": 0,
    "failed": 0,
    "syncErrors": 0
  },
  "remaining": 8,
  "performance": {
    "totalTimeMs": 150,
    "avgUserProcessingMs": 70,
    "maxUserProcessingMs": 85,
    "batchSize": 2
  },
  "results": [...]
}
```

#### 2. 推奨事項

**ローカル開発環境**:
- バッチサイズ: 5（制限が緩いため）
- 並列実行: 可能

**Cloudflare Workers (本番環境)**:
- バッチサイズ: 2-3 を推奨
- 逐次実行: `remaining` が 0 になるまで繰り返し実行
- 監視: `performance.maxUserProcessingMs` が 40ms を超える場合はバッチサイズを減らす

#### 3. 将来的な最適化の選択肢

CPU 時間の問題が深刻な場合、以下の選択肢を検討してください:

1. **Cloudflare Workers Paid プランへのアップグレード**
   - CPU 時間が 50ms に増加
   - より多くのユーザーをバッチ処理可能

2. **カスタムパスワードハッシュアルゴリズムの実装**
   - Better Auth は bcrypt や argon2 などのカスタムアルゴリズムをサポート
   - ただし、セキュリティとパフォーマンスのトレードオフを慎重に検討する必要がある

3. **非同期バックグラウンド処理**
   - Cloudflare Queues や Durable Objects を使用してバッチ処理をオフロード
   - より大規模なユーザーベースに対応可能

## モニタリング

### パフォーマンスメトリクスの解釈

- `totalTimeMs`: リクエスト全体の所要時間（ネットワーク遅延を含む）
- `avgUserProcessingMs`: ユーザーあたりの平均処理時間（パスワードハッシュ化とDB操作）
- `maxUserProcessingMs`: 最も時間がかかったユーザーの処理時間

### 警告しきい値

| メトリクス | Free プラン | Paid プラン |
|-----------|------------|------------|
| `avgUserProcessingMs` | > 30ms で警告 | > 100ms で警告 |
| `maxUserProcessingMs` | > 40ms で警告 | > 120ms で警告 |
| `totalTimeMs` | > 200ms で警告 | > 500ms で警告 |

### トラブルシューティング

#### Error 1102: Worker exceeded resource limits

このエラーは CPU 時間またはメモリ制限を超過したことを示します。

**対処法**:
1. バッチサイズを減らす（例: `batchSize=1`）
2. Cloudflare Workers のログを確認（`wrangler tail`）
3. パフォーマンスメトリクスを分析して最適なバッチサイズを見つける

```bash
# ログをリアルタイムで確認
npx wrangler tail

# 別のターミナルでリクエストを送信
curl -X POST "https://your-worker.workers.dev/admin/seed-auth-users-by-app-users?batchSize=1"
```

## 参考資料

- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Better Auth Security](https://www.better-auth.com/docs/reference/security)
- [Scrypt Algorithm](https://en.wikipedia.org/wiki/Scrypt)
