# EFD Agent Instructions

本文件为 Factory Droid 在处理此仓库时提供规范化指引。

## 项目概述

这是一个面向 **Factory Droid** 的生产级插件仓库，当前提供 47 个专用智能体、171 项技能、79 条命令，并包含配套的 hooks、rules 与 MCP 配置。仓库定位是可复用的 Factory Droid 工作流集合，而不是多平台或多 harness 兼容层。

## 项目结构与模块组织

核心目录：

- `agents/` — 47 个专用子智能体
- `skills/` — 171 项工作流技能与领域知识
- `commands/` — 79 条斜杠命令

补充目录：

- `scripts/` — 运行时与校验逻辑
- `tests/` — 自动化测试
- `hooks/`、`rules/`、`mcp-configs/` — 配套自动化与集成配置
- `examples/`、`assets/` — 示例与参考素材

优先将新能力放入 `skills/`；只有在需要兼容入口时才修改 `commands/`。

## 构建、测试与开发命令

```bash
# 完整验证
npm test

# 代码与 Markdown lint
npm run lint

# 覆盖率校验（仅在运行时代码变更时需要）
npm run coverage

# 本地快速迭代
node tests/run-all.js
```

项目要求 Node.js 18+。仓库固定使用 Yarn 4，但公开脚本也兼容 `npm`。

## 编码风格与命名规范

- JavaScript 遵循 `.prettierrc`：2 空格缩进、单引号、分号、无尾随逗号、`printWidth` 为 200
- 文件保持单一职责，优先不可变更新，显式处理错误
- 文件名使用小写加连字符，例如 `python-reviewer.md`、`tdd-workflow.md`
- `agents/` 和 `commands/` 使用带 YAML frontmatter 的 Markdown
- frontmatter 中的 `name` 使用小写加连字符，`description` 要具体，并且只声明实际需要的工具

## 测试要求

- 变更行为时必须同步新增或更新测试
- 测试文件应与修改区域对应，例如 `tests/hooks/*.test.js`、`tests/lib/*.test.js`、`tests/scripts/*.test.js`
- 迭代时可先运行定向测试，最终必须执行 `npm test`
- 若修改了运行时代码，还需执行 `npm run coverage`

## 提交与贡献规范

- 提交信息需满足 commitlint：`feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`chore`、`ci`、`build`、`revert`
- subject 使用小写，且长度少于 100 个字符
- 示例：`feat(skills): add rust-patterns skill`
- 提交 PR 时需包含简要摘要、变更类型、测试说明，并确认未引入密钥、令牌或本地路径

## 安全与仓库约束

- 不得提交 API key、token、本机路径或其他敏感信息
- 生成的配置应尽可能进行校验
- 扩展仓库时保持“skills-first”架构，不要引入重复工作流
