# 更新日志

## 2026-04-10

### 破坏性变更
- **移除 5 个 `multi-*` 命令**：`multi-plan`、`multi-execute`、`multi-backend`、`multi-frontend`、`multi-workflow` 及所有翻译（共 20 个文件）。这些命令依赖外部 `ccg-workflow` 运行时（`codeagent-wrapper` 二进制），已被原生 Factory Droid 替代方案完全取代：`/plan`、`/orchestrate`、`/devfleet`、`/prp-plan`、`/prp-implement`。

### 变更
- **文档清理**：从文档和技能文件中移除所有 Cursor、Codex、OpenCode 和 Antigravity 的引用。EFD 是 Factory Droid 独占项目。
- **归档 `factory-droid-adapter-pattern` 技能**至 `docs/migration/` — 作为历史 ECC→EFD 迁移参考保留，不再作为活跃技能注册。
- **更新 `commands/santa-loop.md`**：用 Gemini CLI 替换 Codex CLI 审查器。
- 从所有 README 文件、USAGE-EXAMPLES 指南、COMMAND-AGENT-MAP 和 EFD 手册中清理 ccg-workflow 引用。
- 更新命令数量：79 → 74，技能数量：172 → 171。

## 2026-04-07

### 独立项目初始版本

- 将 Everything Factory Droid 重新定位为独立的 Factory Droid 项目。
- 当前目录规模：47 个 agents、171 个 skills、74 个 commands、89 个规则文件、16 个 hook matchers。
- 包含选择性安装配置、跨平台安装器、会话工具以及项目本地 Hook 工作流。
