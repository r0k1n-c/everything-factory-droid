**言語:** [English](../../README.md) | [简体中文](../zh-CN/README.md) | [繁體中文](../zh-TW/README.md) | [日本語](README.md) | [한국어](../ko-KR/README.md)

# Everything Factory Droid

[![Stars](https://img.shields.io/github/stars/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/stargazers)
[![Forks](https://img.shields.io/github/forks/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/network/members)
[![Contributors](https://img.shields.io/github/contributors/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/graphs/contributors)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
![Shell](https://img.shields.io/badge/-Shell-4EAA25?logo=gnu-bash&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/-Python-3776AB?logo=python&logoColor=white)
![Go](https://img.shields.io/badge/-Go-00ADD8?logo=go&logoColor=white)
![Java](https://img.shields.io/badge/-Java-ED8B00?logo=openjdk&logoColor=white)
![Markdown](https://img.shields.io/badge/-Markdown-000000?logo=markdown&logoColor=white)

> **Factory Droid専用** | **47 agents** | **171 skills** | **79 commands** | **クロスプラットフォーム対応**

---

<div align="center">

**言語 / Language / 語言**

[**English**](../../README.md) | [简体中文](../zh-CN/README.md) | [繁體中文](../zh-TW/README.md) | [日本語](README.md)

</div>

---

**現代のエンジニアリングチーム向けの完全なFactory Droidワークフローシステム。**

Factory Droid向けに厳選したエージェント、スキル、フック、ルール、MCP設定、インストーラー、コマンド互換レイヤーをまとめ、計画、実装、レビュー、安全性、リサーチ、運用ワークフローを支援します。

---

## ガイド

このリポジトリには、原始コードのみが含まれています。ガイドがすべてを説明しています。

<table>
<tr>
<td width="50%">
<a href="https://x.com/affaanmustafa/status/2012378465664745795">
<img src="https://github.com/user-attachments/assets/1a471488-59cc-425b-8345-5245c7efbcef" alt="The Shorthand Guide to Everything Factory Droid" />
</a>
</td>
<td width="50%">
<a href="https://x.com/affaanmustafa/status/2014040193557471352">
<img src="https://github.com/user-attachments/assets/c9ca43bc-b149-427f-b551-af6840c368f0" alt="The Longform Guide to Everything Factory Droid" />
</a>
</td>
</tr>
<tr>
<td align="center"><b>簡潔ガイド</b><br/>セットアップ、基礎、哲学。<b>まずこれを読んでください。</b></td>
<td align="center"><b>長文ガイド</b><br/>トークン最適化、メモリ永続化、評価、並列化。</td>
</tr>
</table>

| トピック | 学べる内容 |
|-------|-------------------|
| トークン最適化 | モデル選択、システムプロンプト削減、バックグラウンドプロセス |
| メモリ永続化 | セッション間でコンテキストを自動保存/読み込みするフック |
| 継続的学習 | セッションからパターンを自動抽出して再利用可能なスキルに変換 |
| 検証ループ | チェックポイントと継続的評価、スコアラータイプ、pass@k メトリクス |
| 並列化 | Git ワークツリー、カスケード方法、スケーリング時期 |
| サブエージェント オーケストレーション | コンテキスト問題、反復検索パターン |

---

## クイックスタート

2分以内に起動できます：

### ステップ 1：プラグインをインストール

```bash
# マーケットプレイスを追加
/plugin marketplace add r0k1n-c/everything-factory-droid

# プラグインをインストール
/plugin install everything-factory-droid@everything-factory-droid
```

### ステップ2：ルールをインストール（必須）

> WARNING: **重要:** Factory Droidプラグインは`rules`を自動配布できません。手動でインストールしてください：

```bash
# まずリポジトリをクローン
git clone https://github.com/r0k1n-c/everything-factory-droid.git

# 共通ルールをインストール（必須）
cp -r everything-factory-droid/rules/common ~/.factory/rules/

# 言語固有ルールをインストール（スタックを選択）
cp -r everything-factory-droid/rules/typescript ~/.factory/rules/
cp -r everything-factory-droid/rules/python ~/.factory/rules/
cp -r everything-factory-droid/rules/golang ~/.factory/rules/
```

### ステップ3：使用開始

```bash
# コマンドを試す（プラグインはネームスペース形式）
/everything-factory-droid:plan "ユーザー認証を追加"

# 手動インストール（オプション2）は短縮形式：
# /plan "ユーザー認証を追加"

# 利用可能なコマンドを確認
/plugin list everything-factory-droid@everything-factory-droid
```

**完了です！** これで47のagents、171のskills、79のcommandsにアクセスできます。

---

## クロスプラットフォーム対応

このプラグインは **Windows、macOS、Linux** を完全にサポートしています。すべてのフックとスクリプトが Node.js で書き直され、最大の互換性を実現しています。

### パッケージマネージャー検出

プラグインは、以下の優先順位で、お好みのパッケージマネージャー（npm、pnpm、yarn、bun）を自動検出します：

1. **環境変数**: `FACTORY_DROID_PACKAGE_MANAGER`
2. **プロジェクト設定**: `.factory/package-manager.json`
3. **package.json**: `packageManager` フィールド
4. **ロックファイル**: package-lock.json、yarn.lock、pnpm-lock.yaml、bun.lockb から検出
5. **グローバル設定**: `~/.factory/package-manager.json`
6. **フォールバック**: 最初に利用可能なパッケージマネージャー

お好みのパッケージマネージャーを設定するには：

```bash
# 環境変数経由
export FACTORY_DROID_PACKAGE_MANAGER=pnpm

# グローバル設定経由
node scripts/setup-package-manager.js --global pnpm

# プロジェクト設定経由
node scripts/setup-package-manager.js --project bun

# 現在の設定を検出
node scripts/setup-package-manager.js --detect
```

または Factory Droid で `/setup-pm` コマンドを使用。

---

## 含まれるもの

このリポジトリは**Factory Droidプラグイン**です - 直接インストールするか、コンポーネントを手動でコピーできます。

```
everything-factory-droid/
|-- .factory/         # Factory Droid 向けのミラーと設定
|   |-- droids/             # 変換済み droid 定義
|   |-- skills/             # Factory Droid skill ミラー
|   |-- commands/           # Factory Droid command ミラー
|   |-- settings.json       # プロジェクトレベルの Factory Droid 設定
|
|-- agents/           # 委任用の専門サブエージェント
|   |-- planner.md           # 機能実装計画
|   |-- architect.md         # システム設計決定
|   |-- tdd-guide.md         # テスト駆動開発
|   |-- code-reviewer.md     # 品質とセキュリティレビュー
|   |-- security-reviewer.md # 脆弱性分析
|   |-- build-error-resolver.md
|   |-- e2e-runner.md        # Playwright E2E テスト
|   |-- refactor-cleaner.md  # デッドコード削除
|   |-- doc-updater.md       # ドキュメント同期
|   |-- go-reviewer.md       # Go コードレビュー
|   |-- go-build-resolver.md # Go ビルドエラー解決
|   |-- python-reviewer.md   # Python コードレビュー（新規）
|   |-- database-reviewer.md # データベース/Supabase レビュー（新規）
|
|-- skills/           # ワークフロー定義と領域知識
|   |-- coding-standards/           # 言語ベストプラクティス
|   |-- backend-patterns/           # API、データベース、キャッシュパターン
|   |-- frontend-patterns/          # React、Next.js パターン
|   |-- continuous-learning/        # セッションからパターンを自動抽出（長文ガイド）
|   |-- continuous-learning-v2/     # 信頼度スコア付き直感ベース学習
|   |-- iterative-retrieval/        # サブエージェント用の段階的コンテキスト精製
|   |-- strategic-compact/          # 手動圧縮提案（長文ガイド）
|   |-- tdd-workflow/               # TDD 方法論
|   |-- security-review/            # セキュリティチェックリスト
|   |-- eval-harness/               # 検証ループ評価（長文ガイド）
|   |-- verification-loop/          # 継続的検証（長文ガイド）
|   |-- golang-patterns/            # Go イディオムとベストプラクティス
|   |-- golang-testing/             # Go テストパターン、TDD、ベンチマーク
|   |-- cpp-testing/                # C++ テスト GoogleTest、CMake/CTest（新規）
|   |-- django-patterns/            # Django パターン、モデル、ビュー（新規）
|   |-- django-security/            # Django セキュリティベストプラクティス（新規）
|   |-- django-tdd/                 # Django TDD ワークフロー（新規）
|   |-- django-verification/        # Django 検証ループ（新規）
|   |-- python-patterns/            # Python イディオムとベストプラクティス（新規）
|   |-- python-testing/             # pytest を使った Python テスト（新規）
|   |-- springboot-patterns/        # Java Spring Boot パターン（新規）
|   |-- springboot-security/        # Spring Boot セキュリティ（新規）
|   |-- springboot-tdd/             # Spring Boot TDD（新規）
|   |-- springboot-verification/    # Spring Boot 検証（新規）
|   |-- configure-efd/              # インタラクティブインストールウィザード（新規）
|   |-- security-scan/              # AgentShield セキュリティ監査統合（新規）
|
|-- commands/         # スラッシュコマンド用クイック実行
|   |-- tdd.md              # /tdd - テスト駆動開発
|   |-- plan.md             # /plan - 実装計画
|   |-- e2e.md              # /e2e - E2E テスト生成
|   |-- code-review.md      # /code-review - 品質レビュー
|   |-- build-fix.md        # /build-fix - ビルドエラー修正
|   |-- refactor-clean.md   # /refactor-clean - デッドコード削除
|   |-- learn.md            # /learn - セッション中のパターン抽出（長文ガイド）
|   |-- checkpoint.md       # /checkpoint - 検証状態を保存（長文ガイド）
|   |-- verify.md           # /verify - 検証ループを実行（長文ガイド）
|   |-- setup-pm.md         # /setup-pm - パッケージマネージャーを設定
|   |-- go-review.md        # /go-review - Go コードレビュー（新規）
|   |-- go-test.md          # /go-test - Go TDD ワークフロー（新規）
|   |-- go-build.md         # /go-build - Go ビルドエラーを修正（新規）
|   |-- skill-create.md     # /skill-create - Git 履歴からスキルを生成（新規）
|   |-- instinct-status.md  # /instinct-status - 学習した直感を表示（新規）
|   |-- instinct-import.md  # /instinct-import - 直感をインポート（新規）
|   |-- instinct-export.md  # /instinct-export - 直感をエクスポート（新規）
|   |-- evolve.md           # /evolve - 直感をスキルにクラスタリング
|   |-- pm2.md              # /pm2 - PM2 サービスライフサイクル管理（新規）
|   |-- multi-plan.md       # /multi-plan - マルチエージェント タスク分解（新規）
|   |-- multi-execute.md    # /multi-execute - オーケストレーション マルチエージェント ワークフロー（新規）
|   |-- multi-backend.md    # /multi-backend - バックエンド マルチサービス オーケストレーション（新規）
|   |-- multi-frontend.md   # /multi-frontend - フロントエンド マルチサービス オーケストレーション（新規）
|   |-- multi-workflow.md   # /multi-workflow - 一般的なマルチサービス ワークフロー（新規）
|
|-- rules/            # 常に従うべきガイドライン（~/.factory/rules/ にコピー）
|   |-- README.md            # 構造概要とインストールガイド
|   |-- common/              # 言語非依存の原則
|   |   |-- coding-style.md    # イミュータビリティ、ファイル組織
|   |   |-- git-workflow.md    # コミットフォーマット、PR プロセス
|   |   |-- testing.md         # TDD、80% カバレッジ要件
|   |   |-- performance.md     # モデル選択、コンテキスト管理
|   |   |-- patterns.md        # デザインパターン、スケルトンプロジェクト
|   |   |-- hooks.md           # フック アーキテクチャ、TodoWrite
|   |   |-- agents.md          # サブエージェントへの委任時機
|   |   |-- security.md        # 必須セキュリティチェック
|   |-- typescript/          # TypeScript/JavaScript 固有
|   |-- python/              # Python 固有
|   |-- golang/              # Go 固有
|
|-- hooks/            # トリガーベースの自動化
|   |-- hooks.json                # すべてのフック設定（PreToolUse、PostToolUse、Stop など）
|   |-- memory-persistence/       # セッションライフサイクルフック（長文ガイド）
|   |-- strategic-compact/        # 圧縮提案（長文ガイド）
|
|-- scripts/          # クロスプラットフォーム Node.js スクリプト（新規）
|   |-- lib/                     # 共有ユーティリティ
|   |   |-- utils.js             # クロスプラットフォーム ファイル/パス/システムユーティリティ
|   |   |-- package-manager.js   # パッケージマネージャー検出と選択
|   |-- hooks/                   # フック実装
|   |   |-- session-start.js     # セッション開始時にコンテキストを読み込む
|   |   |-- session-end.js       # セッション終了時に状態を保存
|   |   |-- pre-compact.js       # 圧縮前の状態保存
|   |   |-- suggest-compact.js   # 戦略的圧縮提案
|   |   |-- evaluate-session.js  # セッションからパターンを抽出
|   |-- setup-package-manager.js # インタラクティブ PM セットアップ
|
|-- tests/            # テストスイート（新規）
|   |-- lib/                     # ライブラリテスト
|   |-- hooks/                   # フックテスト
|   |-- run-all.js               # すべてのテストを実行
|
|-- contexts/         # 動的システムプロンプト注入コンテキスト（長文ガイド）
|   |-- dev.md              # 開発モード コンテキスト
|   |-- review.md           # コードレビューモード コンテキスト
|   |-- research.md         # リサーチ/探索モード コンテキスト
|
|-- examples/         # 設定例とセッション
|   |-- AGENTS.md           # プロジェクトレベル設定例
|   |-- user-AGENTS.md      # ユーザーレベル設定例
|
|-- mcp-configs/      # MCP サーバー設定
|   |-- mcp-servers.json    # GitHub、Supabase、Vercel、Railway など
|
```

---

## エコシステムツール

### スキル作成ツール

リポジトリから Factory Droid スキルを生成する 2 つの方法：

#### オプション A：ローカル分析（ビルトイン）

外部サービスなしで、ローカル分析に `/skill-create` コマンドを使用：

```bash
/skill-create                    # 現在のリポジトリを分析
/skill-create --instincts        # 継続的学習用の直感も生成
```

これはローカルで Git 履歴を分析し、SKILL.md ファイルを生成します。

#### オプション B：GitHub アプリ（高度な機能）

高度な機能用（10k+ コミット、自動 PR、チーム共有）：

[GitHub アプリをインストール](https://github.com/apps/skill-creator) | [efd.tools](https://efd.tools)

```bash
# 任意の Issue にコメント：
/skill-creator analyze

# またはデフォルトブランチへのプッシュで自動トリガー
```

両オプションで生成されるもの：
- **SKILL.mdファイル** - Factory Droidですぐに使えるスキル
- **instinctコレクション** - continuous-learning-v2用
- **パターン抽出** - コミット履歴からの学習

### AgentShield — セキュリティ監査ツール

Factory Droid 設定の脆弱性、誤設定、インジェクションリスクをスキャンします。

```bash
# クイックスキャン（インストール不要）
npx efd-agentshield scan

# 安全な問題を自動修正
npx efd-agentshield scan --fix

# Opus 4.6 による深い分析
npx efd-agentshield scan --opus --stream

# ゼロから安全な設定を生成
npx efd-agentshield init
```

AGENTS.md、settings.json、MCP サーバー、フック、エージェント定義をチェックします。セキュリティグレード（A-F）と実行可能な結果を生成します。

Factory Droidで`/security-scan`を実行、または[GitHub Action](https://github.com/affaan-m/agentshield)でCIに追加できます。

[GitHub](https://github.com/affaan-m/agentshield) | [npm](https://www.npmjs.com/package/efd-agentshield)

### 継続的学習 v2

instinctベースの学習システムがパターンを自動学習：

```bash
/instinct-status        # 信頼度付きで学習したinstinctを表示
/instinct-import <file> # 他者のinstinctをインポート
/instinct-export        # instinctをエクスポートして共有
/evolve                 # 関連するinstinctをスキルにクラスタリング
```

完全なドキュメントは`skills/continuous-learning-v2/`を参照してください。

---

## 要件

### Factory Droid CLI バージョン

**最小バージョン: v2.1.0 以上**

このプラグインは Factory Droid CLI v2.1.0+ が必要です。プラグインシステムがフックを処理する方法が変更されたためです。

バージョンを確認：
```bash
droid --version
```

### 重要: フック自動読み込み動作

> WARNING: **貢献者向け:** `hooks/hooks.json` の外側に重複したフック宣言を追加しないでください。これは回帰テストで強制されます。

Factory Droid v2.1+は、インストール済み EFD コンテンツの `hooks/hooks.json` を規約で自動読み込みします。2つ目の明示的なフック宣言を追加するとエラーが発生します：

```
Duplicate hook file detected: ./hooks/hooks.json is already resolved to a loaded file
```

**背景:** これは本リポジトリで複数の修正/リバート循環を引き起こしました（[#29](https://github.com/r0k1n-c/everything-factory-droid/issues/29), [#52](https://github.com/r0k1n-c/everything-factory-droid/issues/52), [#103](https://github.com/r0k1n-c/everything-factory-droid/issues/103)）。Factory Droidバージョン間で動作が変わったため混乱がありました。今後を防ぐため回帰テストがあります。

---

## インストール

### オプション1：プラグインとしてインストール（推奨）

このリポジトリを使用する最も簡単な方法 - Factory Droidプラグインとしてインストール：

```bash
# このリポジトリをマーケットプレイスとして追加
/plugin marketplace add r0k1n-c/everything-factory-droid

# プラグインをインストール
/plugin install everything-factory-droid@everything-factory-droid
```

または、`~/.factory/settings.json` に直接追加：

```json
{
  "extraKnownMarketplaces": {
    "everything-factory-droid": {
      "source": {
        "source": "github",
        "repo": "r0k1n-c/everything-factory-droid"
      }
    }
  },
  "enabledPlugins": {
    "everything-factory-droid@everything-factory-droid": true
  }
}
```

これで、すべてのコマンド、エージェント、スキル、フックにすぐにアクセスできます。

> **注:** Factory Droidプラグインシステムは`rules`をプラグイン経由で配布できません（[アップストリーム制限](https://docs.factory.ai/cli/configuration/plugins)）。ルールは手動でインストールする必要があります：
>
> ```bash
> # まずリポジトリをクローン
> git clone https://github.com/r0k1n-c/everything-factory-droid.git
>
> # オプション A：ユーザーレベルルール（すべてのプロジェクトに適用）
> mkdir -p ~/.factory/rules
> cp -r everything-factory-droid/rules/common ~/.factory/rules/
> cp -r everything-factory-droid/rules/typescript ~/.factory/rules/   # スタックを選択
> cp -r everything-factory-droid/rules/python ~/.factory/rules/
> cp -r everything-factory-droid/rules/golang ~/.factory/rules/
>
> # オプション B：プロジェクトレベルルール（現在のプロジェクトのみ）
> mkdir -p .factory/rules
> cp -r everything-factory-droid/rules/common .factory/rules/
> cp -r everything-factory-droid/rules/typescript .factory/rules/     # スタックを選択
> ```

---

### オプション2：手動インストール

インストール内容を手動で制御したい場合：

```bash
# リポジトリをクローン
git clone https://github.com/r0k1n-c/everything-factory-droid.git

# エージェントを Factory Droid 設定にコピー
cp everything-factory-droid/agents/*.md ~/.factory/droids/

# ルール（共通 + 言語固有）をコピー
cp -r everything-factory-droid/rules/common ~/.factory/rules/
cp -r everything-factory-droid/rules/typescript ~/.factory/rules/   # スタックを選択
cp -r everything-factory-droid/rules/python ~/.factory/rules/
cp -r everything-factory-droid/rules/golang ~/.factory/rules/

# コマンドをコピー
cp everything-factory-droid/commands/*.md ~/.factory/commands/

# スキルをコピー
cp -r everything-factory-droid/skills/* ~/.factory/skills/
```

#### settings.json にフックを追加

`hooks/hooks.json` のフックを `~/.factory/settings.json` にコピーします。

#### MCP を設定

`mcp-configs/mcp-servers.json` から必要な MCP サーバー定義を公式 Factory Droid 設定 `~/.factory/settings.json` にコピーするか、リポジトリローカルのMCP用にプロジェクトスコープの `.mcp.json` にコピーします。

**重要:** `YOUR_*_HERE`プレースホルダーを実際のAPIキーに置き換えてください。

---

## 主要概念

### エージェント

サブエージェントは限定的な範囲のタスクを処理します。例：

```markdown
---
name: code-reviewer
description: コードの品質、セキュリティ、保守性をレビュー
tools: ["Read", "Grep", "Glob", "Bash"]
model: claude-opus-4-6
---

あなたは経験豊富なコードレビュアーです...

```

### スキル

スキルはコマンドまたはエージェントによって呼び出されるワークフロー定義：

```markdown
# TDD ワークフロー

1. インターフェースを最初に定義
2. テストを失敗させる (RED)
3. 最小限のコードを実装 (GREEN)
4. リファクタリング (IMPROVE)
5. 80%+ のカバレッジを確認
```

### フック

フックはツールイベントでトリガーされます。例 - console.log についての警告：

```json
{
  "matcher": "tool == \"Edit\" && tool_input.file_path matches \"\\\\.(ts|tsx|js|jsx)$\"",
  "hooks": [{
    "type": "command",
    "command": "#!/bin/bash\ngrep -n 'console\\.log' \"$file_path\" && echo '[Hook] Remove console.log' >&2"
  }]
}
```

### ルール

ルールは常に従うべきガイドラインで、`common/`（言語非依存）+ 言語固有ディレクトリに組織化：

```
rules/
  common/          # 普遍的な原則（常にインストール）
  typescript/      # TS/JS 固有パターンとツール
  python/          # Python 固有パターンとツール
  golang/          # Go 固有パターンとツール
```

インストールと構造の詳細は[`rules/README.md`](rules/README.md)を参照してください。

---

## テストを実行

プラグインには包括的なテストスイートが含まれています：

```bash
# すべてのテストを実行
node tests/run-all.js

# 個別のテストファイルを実行
node tests/lib/utils.test.js
node tests/lib/package-manager.test.js
node tests/hooks/hooks.test.js
```

---

## 貢献

**貢献は大歓迎で、奨励されています。**

このリポジトリはコミュニティリソースを目指しています。以下のようなものがあれば：
- 有用なエージェントまたはスキル
- 巧妙なフック
- より良い MCP 設定
- 改善されたルール

ぜひ貢献してください！ガイドについては[CONTRIBUTING.md](../../CONTRIBUTING.md)を参照してください。

### 貢献アイデア

- 言語固有のスキル（Rust、C#、Swift、Kotlin） — Go、Python、Javaは既に含まれています
- フレームワーク固有の設定（Rails、Laravel、FastAPI） — Django、NestJS、Spring Bootは既に含まれています
- DevOpsエージェント（Kubernetes、Terraform、AWS、Docker）
- テスト戦略（異なるフレームワーク、ビジュアルリグレッション）
- 専門領域の知識（ML、データエンジニアリング、モバイル開発）

---

## 他ハーネスについて

このプロジェクトは **Factory Droid 専用** です。

## 背景

この設定群は、長期間のFactory Droid実務利用から整理され、複数の実プロダクトワークフローで検証されています。

---

## WARNING: 重要な注記

### コンテキストウィンドウ管理

**重要:** すべてのMCPを一度に有効にしないでください。多くのツールを有効にすると、200kのコンテキストウィンドウが70kに縮小される可能性があります。

経験則：
- 20-30のMCPを設定
- プロジェクトごとに10未満を有効にしたままにしておく
- アクティブなツール80未満

プロジェクト設定で`disabledMcpServers`を使用して、未使用のツールを無効にします。

### カスタマイズ

これらの設定は私のワークフロー用です。あなたは以下を行うべきです：
1. 共感できる部分から始める
2. 技術スタックに合わせて修正
3. 使用しない部分を削除
4. 独自のパターンを追加

---

## Star 履歴

[![Star History Chart](https://api.star-history.com/svg?repos=r0k1n-c/everything-factory-droid&type=Date)](https://star-history.com/#r0k1n-c/everything-factory-droid&Date)

---

## リンク

- **簡潔ガイド（まずはこれ）:** [Everything Factory Droid 簡潔ガイド](https://x.com/affaanmustafa/status/2012378465664745795)
- **詳細ガイド（高度）:** [Everything Factory Droid 詳細ガイド](https://x.com/affaanmustafa/status/2014040193557471352)
- **フォロー:** [@affaanmustafa](https://x.com/affaanmustafa)

---

## ライセンス

MIT - 自由に使用、必要に応じて修正、可能であれば貢献してください。

---

**このリポジトリが役に立ったら、Star を付けてください。両方のガイドを読んでください。素晴らしいものを構築してください。**
