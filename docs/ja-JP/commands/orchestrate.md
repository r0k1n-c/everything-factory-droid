---
description: マルチエージェントオーケストレーション — シーケンシャルハンドオフ、並列エージェント、Worktree分離、コントロールプレーンスナップショット
---

# Orchestrateコマンド

複雑なタスクのためのマルチエージェントワークフローを統括します。シーケンシャルなエージェントハンドオフ、並列実行、Worktree分離、およびオペレーターレベルのセッション管理をサポートします。

## ワークフロータイプ

$ARGUMENTS:
- `feature <description>` — 完全な機能ワークフロー
- `bugfix <description>` — バグ修正ワークフロー
- `refactor <description>` — リファクタリングワークフロー
- `security <description>` — セキュリティレビューワークフロー
- `custom <agents> <description>` — カスタムエージェントシーケンス

### カスタムワークフローの例

```
/orchestrate custom "architect,tdd-guide,code-reviewer" "Redesign caching layer"
```

## エージェントハンドオフパイプライン

エージェントをシーケンシャルにチェーンし、各ステップ間で構造化されたコンテキストを受け渡します。各エージェントは前のエージェントの出力を受け取り、自身の内容を追加してからハンドオフします。

Security Reviewerテンプレート：

```markdown
Security Reviewer: [要約]

### FILES CHANGED

[変更されたすべてのファイルをリスト]

### TEST RESULTS

[テスト合格/不合格の要約]

### SECURITY STATUS

[セキュリティの発見事項]

### RECOMMENDATION

[SHIP / NEEDS WORK / BLOCKED]
```

## 並列実行

tmuxペインと分離されたgit worktreeを使ったエージェントの並列実行には、このコマンドは `dmux-workflows` スキルを活用します。以下の詳細についてはそのスキルのドキュメントを参照してください：

- Tmuxペインオーケストレーションパターン
- `node scripts/orchestrate-worktrees.js` ヘルパー（Worktreeベースの並列作業用）
- `seedPaths` 設定（Worktree間でローカルファイルを共有するため）

永続的な自律ループ、スケジューリング、ガバナンスについては、`autonomous-agent-harness` スキルを参照してください。

## コントロールプレーンスナップショット

ライブのtmux/worktreeセッションのコントロールプレーンスナップショットをエクスポートするには、以下を実行します：

```bash
node scripts/orchestration-status.js .factory/plan/workflow-visual-proof.json
```

スナップショットには、セッションアクティビティ、tmuxペインメタデータ、ワーカー状態、目標、シードオーバーレイ、および最近のハンドオフ要約がJSON形式で含まれます。

## オペレーターコマンドセンターハンドオフ

ワークフローが複数のセッション、Worktree、またはtmuxペインにまたがる場合、最終ハンドオフにコントロールプレーンブロックを追加してください：

```markdown
CONTROL PLANE
-------------
Sessions:
- active session ID or alias
- branch + worktree path for each active worker
- tmux pane or detached session name when applicable

Diffs:
- git status summary
- git diff --stat for touched files
- merge/conflict risk notes

Approvals:
- pending user approvals
- blocked steps awaiting confirmation

Telemetry:
- last activity timestamp or idle signal
- estimated token or cost drift
- policy events raised by hooks or reviewers
```

これにより、planner、implementer、reviewer、loopワーカーがオペレーターサーフェスから明確に把握できるようになります。

## ヒント

1. 複雑な機能には**plannerから始める**
2. マージ前に**常にcode-reviewerを含める**
3. 認証/決済/個人情報には**security-reviewerを使用**
4. **ハンドオフを簡潔に保つ** — 次のエージェントが必要とするものに焦点を当てる
5. 必要に応じて**エージェント間で検証を実行**
