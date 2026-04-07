# プラグインとマーケットプレイス

プラグインは新しいツールと機能でFactory Droidを拡張します。このガイドではインストールのみをカバーしています - いつ、なぜ使用するかについては[完全な記事](https://x.com/affaanmustafa/status/2012378465664745795)を参照してください。

---

## マーケットプレイス

マーケットプレイスはインストール可能なプラグインのリポジトリです。

### マーケットプレイスの追加

```bash
# 公式 Factory マーケットプレイスを追加
droid plugin marketplace add https://github.com/Factory-AI/factory-plugins

# コミュニティマーケットプレイスを追加
# mgrep plugin by @mixedbread-ai
droid plugin marketplace add https://github.com/mixedbread-ai/mgrep
```

### 推奨マーケットプレイス

| マーケットプレイス | ソース |
|-------------|--------|
| claude-plugins-official | `anthropics/claude-plugins-official` |
| factory-plugins | `Factory-AI/factory-plugins` |
| Mixedbread-Grep | `mixedbread-ai/mgrep` |

---

## プラグインのインストール

```bash
# プラグインブラウザを開く
/plugins

# または直接インストール
droid plugin install droid-evolved@factory-plugins
```

### 推奨プラグイン

**開発:**
- `typescript-lsp` - TypeScript インテリジェンス
- `pyright-lsp` - Python 型チェック
- `hookify` - 会話形式でフックを作成
- `code-simplifier` - コードのリファクタリング

**コード品質:**
- `code-review` - コードレビュー
- `pr-review-toolkit` - PR自動化
- `security-guidance` - セキュリティチェック

**検索:**
- `mgrep` - 拡張検索（ripgrepより優れています）
- `context7` - ライブドキュメント検索

**ワークフロー:**
- `commit-commands` - Gitワークフロー
- `frontend-design` - UIパターン
- `feature-dev` - 機能開発

---

## クイックセットアップ

```bash
# マーケットプレイスを追加
droid plugin marketplace add https://github.com/Factory-AI/factory-plugins
# mgrep plugin by @mixedbread-ai
droid plugin marketplace add https://github.com/mixedbread-ai/mgrep

# /pluginsを開き、必要なものをインストール
```

---

## プラグインファイルの場所

```
~/.factory/plugins/
|-- cache/                    # ダウンロードされたプラグイン
|-- installed_plugins.json    # インストール済みリスト
|-- known_marketplaces.json   # 追加されたマーケットプレイス
|-- marketplaces/             # マーケットプレイスデータ
```
