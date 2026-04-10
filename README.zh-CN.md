# Everything Factory Droid

[![Stars](https://img.shields.io/github/stars/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Shell](https://img.shields.io/badge/-Shell-4EAA25?logo=gnu-bash&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)
![Go](https://img.shields.io/badge/-Go-00ADD8?logo=go&logoColor=white)
![Perl](https://img.shields.io/badge/-Perl-39457E?logo=perl&logoColor=white)
![Markdown](https://img.shields.io/badge/-Markdown-000000?logo=markdown&logoColor=white)

---

<div align="center">

**Language / 语言 / 語言**

[**English**](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](docs/zh-TW/README.md) | [日本語](docs/ja-JP/README.md) | [한국어](docs/ko-KR/README.md)

</div>

---

**面向现代工程团队的完整 Factory Droid 工作流系统。**

一个为 Factory Droid 准备的精选集合，涵盖 agents、skills、hooks、rules、MCP 配置、安装器与命令兼容层，用于支持规划、实现、评审、安全、研究与运维工作流。

\> Fork Notice: This project is forked and adapted from [everything-claude-code](https://github.com/affaan-m/everything-claude-code) for Factory Droid usage.

此项目现已收敛为仅支持 **Factory Droid** 的版本。

---

## 指南

这个仓库只包含原始代码。指南解释了一切。

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
<td align="center"><b>精简指南</b><br/>设置、基础、理念。<b>先读这个。</b></td>
<td align="center"><b>详细指南</b><br/>Token 优化、内存持久化、评估、并行化。</td>
</tr>
</table>

| 主题 | 你将学到什么 |
|-------|-------------------|
| Token 优化 | 模型选择、系统提示精简、后台进程 |
| 内存持久化 | 自动跨会话保存/加载上下文的钩子 |
| 持续学习 | 从会话中自动提取模式到可重用的技能 |
| 验证循环 | 检查点 vs 持续评估、评分器类型、pass@k 指标 |
| 并行化 | Git worktrees、级联方法、何时扩展实例 |
| 子代理编排 | 上下文问题、迭代检索模式 |

---

## 快速开始

在 2 分钟内快速上手：

### 第一步：安装插件

```bash
# 添加市场
droid plugin marketplace add https://github.com/r0k1n-c/everything-factory-droid

# 安装插件
droid plugin install everything-factory-droid@everything-factory-droid
```

### 第二步：安装规则（必需）

> WARNING: **重要提示：** Factory Droid 插件无法自动分发 `rules`，需要手动安装：

```bash
# 首先克隆仓库
git clone https://github.com/r0k1n-c/everything-factory-droid.git

# 复制规则目录（通用 + 语言特定）
mkdir -p ~/.factory/rules
cp -r everything-factory-droid/rules/common ~/.factory/rules/
cp -r everything-factory-droid/rules/typescript ~/.factory/rules/   # 选择你的技术栈
cp -r everything-factory-droid/rules/python ~/.factory/rules/
cp -r everything-factory-droid/rules/golang ~/.factory/rules/
cp -r everything-factory-droid/rules/perl ~/.factory/rules/
```

复制规则时，请复制整个目录（例如 `rules/common`、`rules/golang`），而不是复制目录内的文件；这样可以保留相对引用，并避免不同规则集中的同名文件互相覆盖。

### 第三步：开始使用

```bash
# 尝试一个命令（插件安装使用命名空间形式）
/plan "添加用户认证"

# 手动安装（选项2）使用简短形式：
# /plan "添加用户认证"

# 验证插件是否已安装
droid plugin list
```

**完成！** 你现在可以使用 47 个代理、177 个技能和 75 个命令。

---

## 跨平台支持

此插件现在完全支持 **Windows、macOS 和 Linux**。所有钩子和脚本都已用 Node.js 重写，以实现最大的兼容性。

### 包管理器检测

插件自动检测你首选的包管理器（npm、pnpm、yarn 或 bun），优先级如下：

1. **环境变量**: `FACTORY_DROID_PACKAGE_MANAGER`
2. **项目配置**: `.factory/package-manager.json`
3. **package.json**: `packageManager` 字段
4. **锁文件**: 从 package-lock.json、yarn.lock、pnpm-lock.yaml 或 bun.lockb 检测
5. **全局配置**: `~/.factory/package-manager.json`
6. **回退**: 第一个可用的包管理器

要设置你首选的包管理器：

```bash
# 通过环境变量
export FACTORY_DROID_PACKAGE_MANAGER=pnpm

# 通过全局配置
node scripts/setup-package-manager.js --global pnpm

# 通过项目配置
node scripts/setup-package-manager.js --project bun

# 检测当前设置
node scripts/setup-package-manager.js --detect
```

或在 Factory Droid 中使用 `/setup-pm` 命令。

---

## 里面有什么

这个仓库是一个 **Factory Droid 插件** - 直接安装或手动复制组件。

```
everything-factory-droid/
|-- .factory/         # 仓库本地的 Factory Droid 项目配置
|   |-- settings.json       # 此仓库的项目设置
|   |-- package-manager.json # 仓库工作的首选包管理器
|   |-- identity.json       # 项目身份元数据
|   |-- rules/              # 仓库本地的 Droid 守护规则
|
|-- agents/           # 用于委托的专业子代理
|   |-- planner.md           # 功能实现规划
|   |-- architect.md         # 系统设计决策
|   |-- tdd-guide.md         # 测试驱动开发
|   |-- code-reviewer.md     # 质量和安全审查
|   |-- security-reviewer.md # 漏洞分析
|   |-- build-error-resolver.md
|   |-- e2e-runner.md        # Playwright E2E 测试
|   |-- refactor-cleaner.md  # 死代码清理
|   |-- doc-updater.md       # 文档同步
|   |-- go-reviewer.md       # Go 代码审查（新增）
|   |-- go-build-resolver.md # Go 构建错误解决（新增）
|
|-- skills/           # 工作流定义和领域知识
|   |-- coding-standards/           # 语言最佳实践
|   |-- backend-patterns/           # API、数据库、缓存模式
|   |-- frontend-patterns/          # React、Next.js 模式
|   |-- continuous-learning/        # 从会话中自动提取模式（详细指南）
|   |-- continuous-learning-v2/     # 基于直觉的学习与置信度评分
|   |-- iterative-retrieval/        # 子代理的渐进式上下文细化
|   |-- strategic-compact/          # 手动压缩建议（详细指南）
|   |-- tdd-workflow/               # TDD 方法论
|   |-- security-review/            # 安全检查清单
|   |-- eval-harness/               # 验证循环评估（详细指南）
|   |-- verification-loop/          # 持续验证（详细指南）
|   |-- golang-patterns/            # Go 惯用语和最佳实践（新增）
|   |-- golang-testing/             # Go 测试模式、TDD、基准测试（新增）
|   |-- cpp-testing/                # C++ 测试模式、GoogleTest、CMake/CTest（新增）
|   |-- perl-patterns/             # 现代 Perl 5.36+ 惯用语和最佳实践（新增）
|   |-- perl-security/             # Perl 安全模式、污染模式、安全 I/O（新增）
|   |-- perl-testing/              # 使用 Test2::V0、prove、Devel::Cover 的 Perl TDD（新增）
|
|-- commands/         # 用于快速执行的斜杠命令
|   |-- tdd.md              # /tdd - 测试驱动开发
|   |-- plan.md             # /plan - 实现规划
|   |-- e2e.md              # /e2e - E2E 测试生成
|   |-- code-review.md      # /code-review - 质量审查
|   |-- build-fix.md        # /build-fix - 修复构建错误
|   |-- refactor-clean.md   # /refactor-clean - 死代码移除
|   |-- learn.md            # /learn - 会话中提取模式（详细指南）
|   |-- checkpoint.md       # /checkpoint - 保存验证状态（详细指南）
|   |-- verify.md           # /verify - 运行验证循环（详细指南）
|   |-- setup-pm.md         # /setup-pm - 配置包管理器
|   |-- go-review.md        # /go-review - Go 代码审查（新增）
|   |-- go-test.md          # /go-test - Go TDD 工作流（新增）
|   |-- go-build.md         # /go-build - 修复 Go 构建错误（新增）
|   |-- skill-create.md     # /skill-create - 从 git 历史生成技能（新增）
|   |-- instinct-status.md  # /instinct-status - 查看学习的直觉（新增）
|   |-- instinct-import.md  # /instinct-import - 导入直觉（新增）
|   |-- instinct-export.md  # /instinct-export - 导出直觉（新增）
|   |-- evolve.md           # /evolve - 将直觉聚类到技能中（新增）
|
|-- rules/            # 始终遵循的指南（复制到 ~/.factory/rules/）
|   |-- README.md            # 结构概述和安装指南
|   |-- common/              # 与语言无关的原则
|   |   |-- coding-style.md    # 不可变性、文件组织
|   |   |-- git-workflow.md    # 提交格式、PR 流程
|   |   |-- testing.md         # TDD、80% 覆盖率要求
|   |   |-- performance.md     # 模型选择、上下文管理
|   |   |-- patterns.md        # 设计模式、骨架项目
|   |   |-- hooks.md           # 钩子架构、TodoWrite
|   |   |-- agents.md          # 何时委托给子代理
|   |   |-- security.md        # 强制性安全检查
|   |-- typescript/          # TypeScript/JavaScript 特定
|   |-- python/              # Python 特定
|   |-- golang/              # Go 特定
|   |-- perl/                # Perl 特定（新增）
|
|-- hooks/            # 基于触发器的自动化
|   |-- hooks.json                # 所有钩子配置（PreToolUse、PostToolUse、Stop 等）
|   |-- memory-persistence/       # 会话生命周期钩子（详细指南）
|   |-- strategic-compact/        # 压缩建议（详细指南）
|
|-- scripts/          # 跨平台 Node.js 脚本（新增）
|   |-- lib/                     # 共享工具
|   |   |-- utils.js             # 跨平台文件/路径/系统工具
|   |   |-- package-manager.js   # 包管理器检测和选择
|   |-- hooks/                   # 钩子实现
|   |   |-- session-start.js     # 会话开始时加载上下文
|   |   |-- session-end.js       # 会话结束时保存状态
|   |   |-- pre-compact.js       # 压缩前状态保存
|   |   |-- suggest-compact.js   # 战略性压缩建议
|   |   |-- evaluate-session.js  # 从会话中提取模式
|   |-- setup-package-manager.js # 交互式 PM 设置
|
|-- tests/            # 测试套件（新增）
|   |-- lib/                     # 库测试
|   |-- hooks/                   # 钩子测试
|   |-- run-all.js               # 运行所有测试
|
|-- contexts/         # 动态系统提示注入上下文（详细指南）
|   |-- dev.md              # 开发模式上下文
|   |-- review.md           # 代码审查模式上下文
|   |-- research.md         # 研究/探索模式上下文
|
|-- examples/         # 示例配置和会话
|   |-- AGENTS.md           # 示例项目级配置
|   |-- user-AGENTS.md      # 示例用户级配置
|
|-- mcp-configs/      # MCP 服务器配置
|   |-- mcp-servers.json    # GitHub、Supabase、Vercel、Railway 等
|
```

---

## 生态系统工具

### 技能创建器

两种从你的仓库生成 Factory Droid 技能的方法：

#### 选项 A：本地分析（内置）

使用 `/skill-create` 命令进行本地分析，无需外部服务：

```bash
/skill-create                    # 分析当前仓库
/skill-create --instincts        # 还为 continuous-learning 生成直觉
```

这在本地分析你的 git 历史并生成 SKILL.md 文件。

#### 选项 B：GitHub 应用（高级）

用于高级功能（10k+ 提交、自动 PR、团队共享）：

[安装 GitHub 应用](https://github.com/apps/skill-creator) | [efd.tools](https://efd.tools)

```bash
# 在任何问题上评论：
/skill-creator analyze

# 或在推送到默认分支时自动触发
```

两个选项都创建：
- **SKILL.md 文件** - 可直接用于 Factory Droid 的技能
- **直觉集合** - 用于 continuous-learning-v2
- **模式提取** - 从你的提交历史中学习

### 持续学习 v2

基于直觉的学习系统自动学习你的模式：

```bash
/instinct-status        # 显示带有置信度的学习直觉
/instinct-import <file> # 从他人导入直觉
/instinct-export        # 导出你的直觉以供分享
/evolve                 # 将相关直觉聚类到技能中
/promote                # 将项目级直觉提升为全局直觉
/projects               # 查看已识别项目与直觉统计
```

完整文档见 `skills/continuous-learning-v2/`。

---

## 安装

### 选项 1：作为插件安装（推荐）

使用此仓库的最简单方法 - 作为 Factory Droid 插件安装：

```bash
# 将此仓库添加为市场
droid plugin marketplace add https://github.com/r0k1n-c/everything-factory-droid

# 安装插件
droid plugin install everything-factory-droid@everything-factory-droid
```

或直接添加到你的 `~/.factory/settings.json`：

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

这让你可以立即访问所有命令、代理、技能和钩子。

> **注意：** Factory Droid 插件系统不支持通过插件分发 `rules`（[插件系统限制](https://docs.factory.ai/cli/configuration/plugins.md)）。你需要手动安装规则：
>
> ```bash
> # 首先克隆仓库
> git clone https://github.com/r0k1n-c/everything-factory-droid.git
>
> # 选项 A：用户级规则（应用于所有项目）
> mkdir -p ~/.factory/rules
> cp -r everything-factory-droid/rules/common ~/.factory/rules/
> cp -r everything-factory-droid/rules/typescript ~/.factory/rules/
> cp -r everything-factory-droid/rules/python ~/.factory/rules/
> cp -r everything-factory-droid/rules/golang ~/.factory/rules/
> cp -r everything-factory-droid/rules/perl ~/.factory/rules/
>
> # 选项 B：项目级规则（仅应用于当前项目）
> mkdir -p .factory/rules
> cp -r everything-factory-droid/rules/common .factory/rules/
> cp -r everything-factory-droid/rules/typescript .factory/rules/
> cp -r everything-factory-droid/rules/python .factory/rules/
> cp -r everything-factory-droid/rules/golang .factory/rules/
> cp -r everything-factory-droid/rules/perl .factory/rules/
> ```

---

### 选项 2：手动安装

如果你希望对安装的内容进行手动控制：

```bash
# 克隆仓库
git clone https://github.com/r0k1n-c/everything-factory-droid.git

# 将代理复制到你的 Factory Droid 配置
cp everything-factory-droid/agents/*.md ~/.factory/droids/

# 复制规则目录（通用 + 语言特定）
mkdir -p ~/.factory/rules
cp -r everything-factory-droid/rules/common ~/.factory/rules/
cp -r everything-factory-droid/rules/typescript ~/.factory/rules/   # 选择你的技术栈
cp -r everything-factory-droid/rules/python ~/.factory/rules/
cp -r everything-factory-droid/rules/golang ~/.factory/rules/
cp -r everything-factory-droid/rules/perl ~/.factory/rules/

# 复制命令
cp everything-factory-droid/commands/*.md ~/.factory/commands/

# 复制技能
cp -r everything-factory-droid/skills/* ~/.factory/skills/
```

#### 将钩子添加到 settings.json

将 `hooks/hooks.json` 中的钩子复制到你的 `~/.factory/settings.json`。

#### 配置 MCP

将 `mcp-configs/mcp-servers.json` 中需要的 MCP 服务器定义复制到官方 Factory Droid 配置 `~/.factory/settings.json`，或者复制到项目级 `.mcp.json` 以启用仓库本地 MCP。

**重要：** 将 `YOUR_*_HERE` 占位符替换为你的实际 API 密钥。

---

## 关键概念

### 代理

子代理以有限范围处理委托的任务。示例：

```markdown
---
name: code-reviewer
description: 审查代码的质量、安全性和可维护性
tools: ["Read", "Grep", "Glob", "Bash"]
model: claude-opus-4-6
---

你是一名高级代码审查员...
```

### 技能

技能是由命令或代理调用的工作流定义：

```markdown
# TDD 工作流

1. 首先定义接口
2. 编写失败的测试（RED）
3. 实现最少的代码（GREEN）
4. 重构（IMPROVE）
5. 验证 80%+ 的覆盖率
```

### 钩子

钩子在工具事件时触发。示例 - 警告 console.log：

```json
{
  "matcher": "tool == \"Edit\" && tool_input.file_path matches \"\\\\.(ts|tsx|js|jsx)$\"",
  "hooks": [{
    "type": "command",
    "command": "#!/bin/bash\ngrep -n 'console\\.log' \"$file_path\" && echo '[Hook] 移除 console.log' >&2"
  }]
}
```

### 规则

规则是始终遵循的指南，分为 `common/`（通用）+ 语言特定目录：

```
~/.factory/rules/
  common/          # 通用原则（必装）
  typescript/      # TS/JS 特定模式和工具
  python/          # Python 特定模式和工具
  golang/          # Go 特定模式和工具
  perl/            # Perl 特定模式和工具
```

---

## 运行测试

插件包含一个全面的测试套件：

```bash
# 运行所有测试
node tests/run-all.js

# 运行单个测试文件
node tests/lib/utils.test.js
node tests/lib/package-manager.test.js
node tests/hooks/hooks.test.js
```

---

## 贡献

**欢迎并鼓励贡献。**

这个仓库旨在成为社区资源。如果你有：
- 有用的代理或技能
- 聪明的钩子
- 更好的 MCP 配置
- 改进的规则

请贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

### 贡献想法

- 更多垂直领域工作流与专用智能体
- 团队级 hooks、rules 与质量门禁
- 安装配置、示例与上手资产
- 面向新技术栈的验证与测试工作流
- 研究、运维与内部工具模式

---

## 背景

这套配置来自长期的 Factory Droid 日常使用，并已在多个真实产品工作流中验证。

---

## WARNING: 重要说明

### 上下文窗口管理

**关键：** 不要一次启用所有 MCP。如果启用了太多工具，你的 200k 上下文窗口可能会缩小到 70k。

经验法则：
- 配置 20-30 个 MCP
- 每个项目保持启用少于 10 个
- 活动工具少于 80 个

在项目配置中使用 `disabledMcpServers` 来禁用未使用的。

### 定制化

这些配置适用于我的工作流。你应该：
1. 从适合你的开始
2. 为你的技术栈进行修改
3. 删除你不使用的
4. 添加你自己的模式

---

## Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=r0k1n-c/everything-factory-droid&type=Date)](https://star-history.com/#r0k1n-c/everything-factory-droid&Date)

---

## 链接

- **精简指南（从这里开始）：** [The Shorthand Guide to Everything Factory Droid](https://x.com/affaanmustafa/status/2012378465664745795)
- **详细指南（高级）：** [The Longform Guide to Everything Factory Droid](https://x.com/affaanmustafa/status/2014040193557471352)
- **关注：** [@affaanmustafa](https://x.com/affaanmustafa)

---

## 许可证

MIT - 自由使用，根据需要修改，如果可以请回馈。

---

**如果这个仓库有帮助，请给它一个 Star。阅读两个指南。构建一些很棒的东西。**
