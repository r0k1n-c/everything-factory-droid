---
name: evolve
description: 関連するinstinctsをスキル、コマンド、またはドロイドにクラスター化
command: true
---

# Evolveコマンド

## 実装

プラグインルートパスを使用してinstinct CLIを実行:

```bash
python3 "${FACTORY_PROJECT_DIR}/skills/continuous-learning-v2/scripts/instinct-cli.py" evolve [--generate]
```

または`FACTORY_PROJECT_DIR`が設定されていない場合(手動インストール):

```bash
python3 ~/.factory/skills/continuous-learning-v2/scripts/instinct-cli.py evolve [--generate]
```

instinctsを分析し、関連するものを上位レベルの構造にクラスター化します:
- **Commands**: instinctsがユーザーが呼び出すアクションを記述する場合
- **Skills**: instinctsが自動トリガーされる動作を記述する場合
- **Droids**: instinctsが複雑な複数ステップのプロセスを記述する場合

## 使用方法

```
/evolve                    # すべてのinstinctsを分析して進化を提案
/evolve --domain testing   # testingドメインのinstinctsのみを進化
/evolve --dry-run          # 作成せずに作成される内容を表示
/evolve --threshold 5      # クラスター化に5以上の関連instinctsが必要
```

## 進化ルール

### → Command(ユーザー呼び出し)
instinctsがユーザーが明示的に要求するアクションを記述する場合:
- 「ユーザーが...を求めるとき」に関する複数のinstincts
- 「新しいXを作成するとき」のようなトリガーを持つinstincts
- 繰り返し可能なシーケンスに従うinstincts

例:
- `new-table-step1`: "データベーステーブルを追加するとき、マイグレーションを作成"
- `new-table-step2`: "データベーステーブルを追加するとき、スキーマを更新"
- `new-table-step3`: "データベーステーブルを追加するとき、型を再生成"

→ 作成: `/new-table`コマンド

### → Skill(自動トリガー)
instinctsが自動的に発生すべき動作を記述する場合:
- パターンマッチングトリガー
- エラーハンドリング応答
- コードスタイルの強制

例:
- `prefer-functional`: "関数を書くとき、関数型スタイルを優先"
- `use-immutable`: "状態を変更するとき、イミュータブルパターンを使用"
- `avoid-classes`: "モジュールを設計するとき、クラスベースの設計を避ける"

→ 作成: `functional-patterns`スキル

### → Droid(深さ/分離が必要)
instinctsが分離の恩恵を受ける複雑な複数ステップのプロセスを記述する場合:
- デバッグワークフロー
- リファクタリングシーケンス
- リサーチタスク

例:
- `debug-step1`: "デバッグするとき、まずログを確認"
- `debug-step2`: "デバッグするとき、失敗しているコンポーネントを分離"
- `debug-step3`: "デバッグするとき、最小限の再現を作成"
- `debug-step4`: "デバッグするとき、テストで修正を検証"

→ 作成: `debugger`ドロイド

## 実行内容

1. `~/.factory/homunculus/instincts/`からすべてのinstinctsを読み取る
2. instinctsを以下でグループ化:
   - ドメインの類似性
   - トリガーパターンの重複
   - アクションシーケンスの関係
3. 3以上の関連instinctsの各クラスターに対して:
   - 進化タイプを決定(command/skill/droid)
   - 適切なファイルを生成
   - `~/.factory/homunculus/evolved/{commands,skills,droids}/`に保存
4. 進化した構造をソースinstinctsにリンク

## 出力フォーマット

```
 進化分析
==================

進化の準備ができた3つのクラスターを発見:

## クラスター1: データベースマイグレーションワークフロー
Instincts: new-table-migration, update-schema, regenerate-types
タイプ: Command
信頼度: 85%(12件の観測に基づく)

作成: /new-tableコマンド
ファイル:
  - ~/.factory/homunculus/evolved/commands/new-table.md

## クラスター2: 関数型コードスタイル
Instincts: prefer-functional, use-immutable, avoid-classes, pure-functions
タイプ: Skill
信頼度: 78%(8件の観測に基づく)

作成: functional-patternsスキル
ファイル:
  - ~/.factory/homunculus/evolved/skills/functional-patterns.md

## クラスター3: デバッグプロセス
Instincts: debug-check-logs, debug-isolate, debug-reproduce, debug-verify
タイプ: Droid
信頼度: 72%(6件の観測に基づく)

作成: debuggerドロイド
ファイル:
  - ~/.factory/homunculus/evolved/droids/debugger.md

---
これらのファイルを作成するには`/evolve --execute`を実行してください。
```

## フラグ

- `--execute`: 実際に進化した構造を作成(デフォルトはプレビュー)
- `--dry-run`: 作成せずにプレビュー
- `--domain <name>`: 指定したドメインのinstinctsのみを進化
- `--threshold <n>`: クラスターを形成するために必要な最小instincts数(デフォルト: 3)
- `--type <command|skill|droid>`: 指定したタイプのみを作成

## 生成されるファイルフォーマット

### Command
```markdown
---
name: new-table
description: マイグレーション、スキーマ更新、型生成で新しいデータベーステーブルを作成
command: /new-table
evolved_from:
  - new-table-migration
  - update-schema
  - regenerate-types
---

# New Tableコマンド

[クラスター化されたinstinctsに基づいて生成されたコンテンツ]

## ステップ
1. ...
2. ...
```

### Skill
```markdown
---
name: functional-patterns
description: 関数型プログラミングパターンを強制
evolved_from:
  - prefer-functional
  - use-immutable
  - avoid-classes
---

# Functional Patternsスキル

[クラスター化されたinstinctsに基づいて生成されたコンテンツ]
```

### Droid
```markdown
---
name: debugger
description: 体系的なデバッグドロイド
model: claude-sonnet-4-6
evolved_from:
  - debug-check-logs
  - debug-isolate
  - debug-reproduce
---

# Debuggerドロイド

[クラスター化されたinstinctsに基づいて生成されたコンテンツ]
```
