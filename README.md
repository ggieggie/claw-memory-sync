# claw-memory-sync

OpenClawエージェント間の記憶同期ツール。

## 概要

OpenClawの複数エージェント（テキストbot、Voice Bot等）が持つ記憶を定期的に同期・整理する。  
MarkdownファイルとベクトルDBの双方向同期、エージェント間の記憶共有、重複排除を自動で行う。

1時間ごとに以下の同期タスクを実行:

1. **md-ingest**: `memory/*.md` + `TOOLS.md` → LanceDB（新規チャンクのみ）
2. **voice-export**: Voice Bot の LanceDB 記憶 → `memory/YYYY-MM-DD.md` に追記
3. **dedup**: 重複記憶の検出・マージ

## 前提条件

### 必須: [memory-lancedb-pro](https://github.com/CortexReach/memory-lancedb-pro)

本ツールは **memory-lancedb-pro** プラグインに依存しています。  
全ての記憶操作（検索・保存・インポート）は `openclaw memory-pro` CLI 経由で行うため、このプラグインがインストール・有効化されていないと動作しません。

**依存するCLIコマンド:**
- `openclaw memory-pro search` — ハイブリッド検索（ベクトル+BM25+リランク）
- `openclaw memory-pro import` — JSON形式での記憶一括インポート
- `openclaw memory-pro export` — 記憶のJSON形式エクスポート
- `openclaw memory-pro delete` — 個別記憶の削除
- `openclaw memory-pro list` — 記憶の一覧表示

**セットアップ手順:**

1. memory-lancedb-proをクローン & インストール:
```bash
cd ~/.openclaw/workspace/plugins
git clone https://github.com/CortexReach/memory-lancedb-pro.git
cd memory-lancedb-pro
npm install
```

2. OpenClawのプラグイン設定に追加（`openclaw config set` で設定）:
```json
{
  "plugins": {
    "load": {
      "paths": ["~/.openclaw/workspace/plugins/memory-lancedb-pro"]
    },
    "entries": {
      "memory-lancedb-pro": {
        "jinaApiKey": "<your-jina-api-key>"
      }
    },
    "slots": {
      "memory": "memory-lancedb-pro"
    }
  }
}
```

3. Jina APIキーの取得（無料枠: 1M tokens/月）:  
   https://jina.ai/ でアカウント作成 → APIキーを取得

4. 動作確認:
```bash
openclaw memory-pro stats
```

詳細は [claw-server-kitting/docs/memory-lancedb-pro.md](https://github.com/sarabi-dev/claw-server-kitting/blob/master/docs/memory-lancedb-pro.md) を参照。

### その他の前提条件

- **OpenClaw** がインストール済み（`openclaw` CLI が PATH にある）
- **Node.js** v20 以上

## 使い方

```bash
# 全タスク実行
node src/index.js

# ドライラン（変更なし、プレビューのみ）
node src/index.js --dry-run

# 特定タスクのみ
node src/index.js --task md
node src/index.js --task voice
node src/index.js --task dedup
```

## Cron 設定

```bash
openclaw cron add \
  --name "memory-sync" \
  --cron "0 * * * *" \
  --tz "Asia/Tokyo" \
  --session isolated \
  --timeout-seconds 120 \
  --no-deliver \
  --message "cd /path/to/claw-memory-sync && node src/index.js を実行して結果を報告"
```

## ログ

- stdout + `~/.openclaw/workspace/memory/memory-sync.log`
- 状態ファイル: `~/.openclaw/workspace/memory/memory-sync-state.json`

## 設計ドキュメント

- [ティア対応スコープルーティング設計書](docs/tier-routing-design.md) — マルチエージェント体制での記憶の隔離・同期ルール
