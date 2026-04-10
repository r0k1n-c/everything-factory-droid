**语言：** English | [简体中文](README.md) | [繁體中文](../zh-TW/README.md) | [日本語](../ja-JP/README.md) | [한국어](../ko-KR/README.md) | [Português (Brasil)](../pt-BR/README.md) | [Türkçe](../tr/README.md)

# Everything Factory Droid

[![Stars](https://img.shields.io/github/stars/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/stargazers)
[![Forks](https://img.shields.io/github/forks/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/network/members)
[![Contributors](https://img.shields.io/github/contributors/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/graphs/contributors)
[![npm efd-install](https://img.shields.io/npm/dw/%40r0k1n-c%2Fefd-install?label=efd-install%20weekly%20downloads\&logo=npm)](https://www.npmjs.com/package/@r0k1n-c/efd-install)
[![npm efd-agentshield](https://img.shields.io/npm/dw/efd-agentshield?label=efd-agentshield%20weekly%20downloads\&logo=npm)](https://www.npmjs.com/package/efd-agentshield)
[![GitHub App Install](https://img.shields.io/badge/GitHub%20App-150%20installs-2ea44f?logo=github)](https://github.com/marketplace/efd-tools)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
![Shell](https://img.shields.io/badge/-Shell-4EAA25?logo=gnu-bash\&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript\&logoColor=white)
![Python](https://img.shields.io/badge/-Python-3776AB?logo=python\&logoColor=white)
![Go](https://img.shields.io/badge/-Go-00ADD8?logo=go\&logoColor=white)
![Java](https://img.shields.io/badge/-Java-ED8B00?logo=openjdk\&logoColor=white)
![Perl](https://img.shields.io/badge/-Perl-39457E?logo=perl\&logoColor=white)
![Markdown](https://img.shields.io/badge/-Markdown-000000?logo=markdown\&logoColor=white)

> **Factory Droid 专注** | **47 个 agents** | **172 项 skills** | **75 个 commands** | **跨平台安装器**

***

<div align="center">

**语言 / 语言 / 語言**

[**English**](../../README.md) | [简体中文](README.md) | [繁體中文](../zh-TW/README.md) | [日本語](../ja-JP/README.md) | [한국어](../ko-KR/README.md) | [Português (Brasil)](../pt-BR/README.md) | [Türkçe](../tr/README.md)

</div>

***

**面向现代工程团队的完整 Factory Droid 工作流系统。**

一个为 Factory Droid 准备的精选集合，涵盖 agents、skills、hooks、rules、MCP 配置、安装器与命令兼容层，用于支持规划、实现、评审、安全、研究与运维工作流。

这个项目现已只面向 **Factory Droid**。

***

## 指南

此仓库仅包含原始代码。指南解释了一切。

<table>
<tr>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2012378465664745795">
<img src="../../assets/images/guides/shorthand-guide.png" alt="Everything Factory Droid 简明指南" />
</a>
</td>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2014040193557471352">
<img src="../../assets/images/guides/longform-guide.png" alt="Everything Factory Droid 详细指南" />
</a>
</td>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2033263813387223421">
<img src="../../assets/images/security/security-guide-header.png" alt="Agentic安全简明指南" />
</a>
</td>
</tr>
<tr>
<td align="center"><b>Shorthand Guide</b><br/>设置、基础、理念。 <b>首先阅读此内容。</b></td>
<td align="center"><b>详细指南</b><br/>令牌优化、内存持久化、评估、并行化。</td>
<td align="center"><b>安全指南</b><br/>攻击向量、沙盒化、净化、CVE、AgentShield。</td>
</tr>
</table>

| 主题 | 你将学到什么 |
|-------|-------------------|
| 令牌优化 | 模型选择，系统提示精简，后台进程 |
| 内存持久化 | 自动跨会话保存/加载上下文的钩子 |
| 持续学习 | 从会话中自动提取模式为可重用技能 |
| 验证循环 | 检查点与持续评估，评分器类型，pass@k 指标 |
| 并行化 | Git 工作树，级联方法，何时扩展实例 |
| 子智能体编排 | 上下文问题，迭代检索模式 |

**EFD 新手？** 从[使用示例文档](USAGE-EXAMPLES.md)开始——从第一次 `/plan` 到多智能体编排的端到端演练。

***

## 快速开始

在 2 分钟内启动并运行：

### 最短安装步骤

```bash
droid plugin marketplace add https://github.com/r0k1n-c/everything-factory-droid
droid plugin install everything-factory-droid@everything-factory-droid
cd /path/to/your-project
npx @r0k1n-c/efd-install --profile full
# 或：npx @r0k1n-c/efd-install typescript
```

不要在 `~/.factory/plugins/...`、`~/.factory/plugins/cache/...`，或克隆出来的 `everything-factory-droid/` 仓库目录里运行安装器，除非那个目录本身就是你要配置的项目。

### 步骤 1：安装插件

```bash
# Add marketplace
droid plugin marketplace add https://github.com/r0k1n-c/everything-factory-droid

# Install plugin
droid plugin install everything-factory-droid@everything-factory-droid
```

### 步骤 2：安装规则（必需）

> WARNING: **重要提示：** Factory Droid 插件无法自动分发 `rules`。请手动安装它们：

```bash
# 在你的“目标项目根目录”执行安装
cd /path/to/your-project

# 推荐：无需克隆仓库
npx @r0k1n-c/efd-install --profile full

# 或只安装你需要的语言/能力
npx @r0k1n-c/efd-install typescript    # 或 python / golang / swift / php
# npx @r0k1n-c/efd-install typescript python golang swift php
# npx @r0k1n-c/efd-install --profile developer
# npx @r0k1n-c/efd-install --with lang:typescript --with capability:security
```

```powershell
# Windows PowerShell —— 同样要在“目标项目根目录”执行
Set-Location C:\path\to\your-project
npx @r0k1n-c/efd-install --profile full
# npx @r0k1n-c/efd-install typescript
# npx @r0k1n-c/efd-install --profile developer
# npx @r0k1n-c/efd-install --with lang:typescript --with capability:security
```

```bash
# 备选方案：把仓库克隆到任意位置，但仍然要在“目标项目根目录”执行安装器
git clone https://github.com/r0k1n-c/everything-factory-droid.git ~/everything-factory-droid
cd /path/to/your-project
bash ~/everything-factory-droid/install.sh typescript
# bash ~/everything-factory-droid/install.sh --profile full
```

不要在 `~/.factory/plugins/...` 缓存目录里，或直接在克隆出来的仓库目录里运行 `install.sh`，除非那个目录本身就是你要配置的项目。

手动复制安装说明请参阅 `rules/` 文件夹中的 README。

### 步骤 3：开始使用

```bash
# Try a command (plugin install uses namespaced form)
/plan "Add user authentication"

# Manual install (Option 2) uses the shorter form:
# /plan "Add user authentication"

# Verify the plugin installation
droid plugin list
```

**搞定！** 你现在可以使用 47 个智能体、172 项技能和 75 个命令了。

***

## Factory Droid 聚焦

这个项目只保留 **Factory Droid** 兼容面：

* `./install.sh`、`npx efd` 和 `npx @r0k1n-c/efd-install` 都面向 Factory Droid 目标。
* 项目本地安装写入 `.factory/`。
* 打包产物只包含 Factory Droid 的 droids、skills、commands 和 `settings.json`。


| 组件 | 目录 | 范围 |
|-----------|---------|-------|
| 智能体 | 47 个 | Factory Droid |
| 命令 | 75 个 | Factory Droid |
| 技能 | 172 项 | Factory Droid |

## 包含内容

此仓库是一个 **Factory Droid 插件** - 可以直接安装或手动复制组件。

```
everything-factory-droid/
|-- .factory/         # 仓库本地的 Factory Droid 项目配置
|   |-- settings.json       # 此仓库的项目设置
|   |-- package-manager.json # 仓库工作的首选包管理器
|   |-- identity.json       # 项目身份元数据
|   |-- rules/              # 仓库本地的 Droid 守护规则
|
|-- agents/           # 47 个用于委托任务的专用子代理
|   |-- planner.md           # 功能实现规划
|   |-- architect.md         # 系统设计决策
|   |-- tdd-guide.md         # 测试驱动开发
|   |-- code-reviewer.md     # 质量与安全审查
|   |-- security-reviewer.md # 漏洞分析
|   |-- build-error-resolver.md
|   |-- e2e-runner.md        # Playwright 端到端测试
|   |-- refactor-cleaner.md  # 无用代码清理
|   |-- doc-updater.md       # 文档同步
|   |-- docs-lookup.md       # 文档/API 查询
|   |-- chief-of-staff.md    # 沟通分流与草稿生成
|   |-- loop-operator.md     # 自动化循环执行
|   |-- harness-optimizer.md # Harness 配置优化
|   |-- cpp-reviewer.md      # C++ 代码审查
|   |-- cpp-build-resolver.md # C++ 构建错误修复
|   |-- go-reviewer.md       # Go 代码审查
|   |-- go-build-resolver.md # Go 构建错误修复
|   |-- python-reviewer.md   # Python 代码审查
|   |-- database-reviewer.md # 数据库/Supabase 审查
|   |-- typescript-reviewer.md # TypeScript/JavaScript 代码审查
|   |-- java-reviewer.md     # Java/Spring Boot 代码审查
|   |-- java-build-resolver.md # Java/Maven/Gradle 构建错误修复
|   |-- kotlin-reviewer.md   # Kotlin/Android/KMP 代码审查
|   |-- kotlin-build-resolver.md # Kotlin/Gradle 构建错误修复
|   |-- rust-reviewer.md     # Rust 代码审查
|   |-- rust-build-resolver.md # Rust 构建错误修复
|   |-- pytorch-build-resolver.md # PyTorch/CUDA 训练错误修复
|
|-- skills/           # 工作流定义与领域知识
|   |-- coding-standards/           # 语言最佳实践
|   |-- clickhouse-io/              # ClickHouse 分析、查询与数据工程
|   |-- backend-patterns/           # API、数据库与缓存模式
|   |-- frontend-patterns/          # React、Next.js 模式
|   |-- frontend-slides/            # HTML 幻灯片与 PPTX 转 Web 演示工作流（新增）
|   |-- article-writing/            # 按指定风格撰写长文，避免通用 AI 语气（新增）
|   |-- content-engine/             # 多平台内容生成与复用工作流（新增）
|   |-- market-research/            # 带来源引用的市场、竞品与投资人研究（新增）
|   |-- investor-materials/         # 融资演示文稿、单页材料、备忘录与财务模型（新增）
|   |-- investor-outreach/          # 个性化融资沟通与跟进（新增）
|   |-- continuous-learning/        # 从会话中自动提取模式（长文指南）
|   |-- continuous-learning-v2/     # 基于直觉的学习与置信度评分
|   |-- iterative-retrieval/        # 子代理渐进式上下文优化
|   |-- strategic-compact/          # 手动压缩建议（长文指南）
|   |-- tdd-workflow/               # TDD 方法论
|   |-- security-review/            # 安全检查清单
|   |-- eval-harness/               # 验证循环评估（长文指南）
|   |-- verification-loop/          # 持续验证（长文指南）
|   |-- videodb/                   # 视频与音频：导入、搜索、编辑、生成与流式处理（新增）
|   |-- golang-patterns/            # Go 习惯用法与最佳实践
|   |-- golang-testing/             # Go 测试模式、TDD 与基准测试
|   |-- cpp-coding-standards/         # 基于 C++ Core Guidelines 的 C++ 编码规范（新增）
|   |-- cpp-testing/                # 使用 GoogleTest 与 CMake/CTest 的 C++ 测试（新增）
|   |-- django-patterns/            # Django 模式、模型与视图（新增）
|   |-- django-security/            # Django 安全最佳实践（新增）
|   |-- django-tdd/                 # Django TDD 工作流（新增）
|   |-- django-verification/        # Django 验证循环（新增）
|   |-- laravel-patterns/           # Laravel 架构模式（新增）
|   |-- laravel-security/           # Laravel 安全最佳实践（新增）
|   |-- laravel-tdd/                # Laravel TDD 工作流（新增）
|   |-- laravel-verification/       # Laravel 验证循环（新增）
|   |-- python-patterns/            # Python 习惯用法与最佳实践（新增）
|   |-- python-testing/             # 使用 pytest 的 Python 测试（新增）
|   |-- springboot-patterns/        # Java Spring Boot 模式（新增）
|   |-- springboot-security/        # Spring Boot 安全（新增）
|   |-- springboot-tdd/             # Spring Boot TDD（新增）
|   |-- springboot-verification/    # Spring Boot 验证（新增）
|   |-- configure-efd/              # 交互式安装向导（新增）
|   |-- security-scan/              # AgentShield 安全审计集成（新增）
|   |-- java-coding-standards/     # Java 编码规范（新增）
|   |-- jpa-patterns/              # JPA/Hibernate 模式（新增）
|   |-- postgres-patterns/         # PostgreSQL 优化模式（新增）
|   |-- nutrient-document-processing/ # 使用 Nutrient API 的文档处理（新增）
|   |-- project-guidelines-example/   # 项目专用技能模板
|   |-- database-migrations/         # 迁移模式（Prisma、Drizzle、Django、Go）（新增）
|   |-- api-design/                  # REST API 设计、分页与错误响应（新增）
|   |-- deployment-patterns/         # CI/CD、Docker、健康检查与回滚（新增）
|   |-- docker-patterns/            # Docker Compose、网络、卷与容器安全（新增）
|   |-- e2e-testing/                 # Playwright 端到端模式与页面对象模型（新增）
|   |-- content-hash-cache-pattern/  # 文件处理中的 SHA-256 内容哈希缓存模式（新增）
|   |-- cost-aware-llm-pipeline/     # LLM 成本优化、模型路由与预算跟踪（新增）
|   |-- regex-vs-llm-structured-text/ # 文本解析决策框架：正则 vs LLM（新增）
|   |-- swift-actor-persistence/     # 使用 Actor 的线程安全 Swift 数据持久化（新增）
|   |-- swift-protocol-di-testing/   # 基于 Protocol 的依赖注入用于可测试 Swift 代码（新增）
|   |-- search-first/               # 先调研后编码的工作流（新增）
|   |-- skill-stocktake/            # 审计技能与命令质量（新增）
|   |-- liquid-glass-design/         # iOS 26 Liquid Glass 设计系统（新增）
|   |-- foundation-models-on-device/ # Apple 设备端 LLM（FoundationModels）（新增）
|   |-- swift-concurrency-6-2/       # Swift 6.2 易用并发（新增）
|   |-- perl-patterns/             # 现代 Perl 5.36+ 习惯用法与最佳实践（新增）
|   |-- perl-security/             # Perl 安全模式、taint 模式与安全 I/O（新增）
|   |-- perl-testing/              # 使用 Test2::V0、prove、Devel::Cover 的 Perl TDD（新增）
|   |-- autonomous-loops/           # 自主循环模式：顺序流水线、PR 循环与 DAG 编排（新增）
|   |-- plankton-code-quality/      # 使用 Plankton hooks 的编写期代码质量控制（新增）
|
|-- commands/         # 快速执行的斜杠命令
|   |-- tdd.md              # /tdd - 测试驱动开发
|   |-- plan.md             # /plan - 实现规划
|   |-- e2e.md              # /e2e - 端到端测试生成
|   |-- code-review.md      # /code-review - 质量审查
|   |-- build-fix.md        # /build-fix - 修复构建错误
|   |-- refactor-clean.md   # /refactor-clean - 无用代码清理
|   |-- learn.md            # /learn - 会话中提取模式（长文指南）
|   |-- learn-eval.md       # /learn-eval - 提取、评估并保存模式（新增）
|   |-- checkpoint.md       # /checkpoint - 保存验证状态（长文指南）
|   |-- verify.md           # /verify - 运行验证循环（长文指南）
|   |-- setup-pm.md         # /setup-pm - 配置包管理器
|   |-- go-review.md        # /go-review - Go 代码审查（新增）
|   |-- go-test.md          # /go-test - Go TDD 工作流（新增）
|   |-- go-build.md         # /go-build - 修复 Go 构建错误（新增）
|   |-- skill-create.md     # /skill-create - 从 git 历史生成技能（新增）
|   |-- instinct-status.md  # /instinct-status - 查看学习到的直觉（新增）
|   |-- instinct-import.md  # /instinct-import - 导入直觉（新增）
|   |-- instinct-export.md  # /instinct-export - 导出直觉（新增）
|   |-- evolve.md           # /evolve - 将直觉聚类为技能
|   |-- pm2.md              # /pm2 - PM2 服务生命周期管理（新增）
|   |-- orchestrate.md      # /orchestrate - 多代理协调
|   |-- sessions.md         # /sessions - 会话历史管理
|   |-- eval.md             # /eval - 按标准评估
|   |-- test-coverage.md    # /test-coverage - 测试覆盖率分析
|   |-- update-docs.md      # /update-docs - 更新文档
|   |-- update-codemaps.md  # /update-codemaps - 更新代码映射
|   |-- python-review.md    # /python-review - Python 代码审查（新增）
|
|-- rules/            # 必须遵循的规则（复制到 ~/.factory/rules/）
|   |-- README.md            # 结构说明与安装指南
|   |-- common/              # 与语言无关的原则
|   |   |-- coding-style.md    # 不可变性与文件组织
|   |   |-- git-workflow.md    # 提交格式与 PR 流程
|   |   |-- testing.md         # TDD 与 80% 覆盖率要求
|   |   |-- performance.md     # 模型选择与上下文管理
|   |   |-- patterns.md        # 设计模式与骨架项目
|   |   |-- hooks.md           # Hook 架构与 TodoWrite
|   |   |-- agents.md          # 何时委托给子代理
|   |   |-- security.md        # 强制安全检查
|   |-- typescript/          # TypeScript/JavaScript 专用
|   |-- python/              # Python 专用
|   |-- golang/              # Go 专用
|   |-- swift/               # Swift 专用
|   |-- php/                 # PHP 专用（新增）
|
|-- hooks/            # 基于触发器的自动化
|   |-- README.md                 # Hook 文档、示例与自定义指南
|   |-- hooks.json                # 所有 Hook 配置（PreToolUse、PostToolUse、Stop 等）
|   |-- memory-persistence/       # 会话生命周期 Hook（长文指南）
|   |-- strategic-compact/        # 压缩建议（长文指南）
|
|-- scripts/          # 跨平台 Node.js 脚本（新增）
|   |-- lib/                     # 公共工具
|   |   |-- utils.js             # 跨平台文件/路径/系统工具
|   |   |-- package-manager.js   # 包管理器检测与选择
|   |-- hooks/                   # Hook 实现
|   |   |-- session-start.js     # 会话开始时加载上下文
|   |   |-- session-end.js       # 会话结束时保存状态
|   |   |-- pre-compact.js       # 压缩前状态保存
|   |   |-- suggest-compact.js   # 战略压缩建议
|   |   |-- evaluate-session.js  # 从会话中提取模式
|   |-- setup-package-manager.js # 交互式包管理器设置
|
|-- tests/            # 测试套件（新增）
|   |-- lib/                     # 库测试
|   |-- hooks/                   # Hook 测试
|   |-- run-all.js               # 运行所有测试
|
|-- contexts/         # 动态系统提示上下文（长文指南）
|   |-- dev.md              # 开发模式上下文
|   |-- review.md           # 代码审查模式上下文
|   |-- research.md         # 研究/探索模式上下文
|
|-- examples/         # 示例配置与会话
|   |-- AGENTS.md             # 项目级配置示例
|   |-- user-AGENTS.md        # 用户级配置示例
|   |-- saas-nextjs-AGENTS.md   # 实际 SaaS 示例（Next.js + Supabase + Stripe）
|   |-- go-microservice-AGENTS.md # 实际 Go 微服务示例（gRPC + PostgreSQL）
|   |-- django-api-AGENTS.md      # 实际 Django REST API 示例（DRF + Celery）
|   |-- laravel-api-AGENTS.md     # 实际 Laravel API 示例（PostgreSQL + Redis）（新增）
|   |-- rust-api-AGENTS.md        # 实际 Rust API 示例（Axum + SQLx + PostgreSQL）（新增）
|
|-- mcp-configs/      # MCP 服务器配置
|   |-- mcp-servers.json    # GitHub、Supabase、Vercel、Railway 等
|
```

***

## 生态系统工具

### 技能创建器

从您的仓库生成 Factory Droid 技能的两种方式：

#### 选项 A：本地分析（内置）

使用 `/skill-create` 命令进行本地分析，无需外部服务：

```bash
/skill-create                    # Analyze current repo
/skill-create --instincts        # Also generate instincts for continuous-learning
```

这会在本地分析您的 git 历史记录并生成 SKILL.md 文件。

#### 选项 B：GitHub 应用（高级）

适用于高级功能（10k+ 提交、自动 PR、团队共享）：

[安装 GitHub 应用](https://github.com/apps/skill-creator) | [efd.tools](https://efd.tools)

```bash
# Comment on any issue:
/skill-creator analyze

# Or auto-triggers on push to default branch
```

两种选项都会创建：

* **SKILL.md 文件** - 可供 Factory Droid 使用的即用型技能
* **Instinct 集合** - 用于 continuous-learning-v2
* **模式提取** - 从您的提交历史中学习

### AgentShield — 安全审计器

> 面向 Factory Droid 配置、误配置风险和提示注入防护的独立安全审计工具。

扫描您的 Factory Droid 配置，查找漏洞、错误配置和注入风险。

```bash
# Quick scan (no install needed)
npx efd-agentshield scan

# Auto-fix safe issues
npx efd-agentshield scan --fix

# Deep analysis with three Opus 4.6 agents
npx efd-agentshield scan --opus --stream

# Generate secure config from scratch
npx efd-agentshield init
```

**它扫描什么：** AGENTS.md、settings.json、MCP 配置、钩子、代理定义以及 5 个类别的技能 —— 密钥检测（14 种模式）、权限审计、钩子注入分析、MCP 服务器风险剖析和代理配置审查。

**`--opus` 标志** 在红队/蓝队/审计员管道中运行三个 Opus 4.6 代理。攻击者寻找利用链，防御者评估保护措施，审计员将两者综合成优先风险评估。对抗性推理，而不仅仅是模式匹配。

**输出格式：** 终端（按颜色分级的 A-F）、JSON（CI 管道）、Markdown、HTML。在关键发现时退出代码 2，用于构建门控。

在 Factory Droid 中使用 `/security-scan` 来运行它，或者通过 [GitHub Action](https://github.com/affaan-m/agentshield) 添加到 CI。

[GitHub](https://github.com/affaan-m/agentshield) | [npm](https://www.npmjs.com/package/efd-agentshield)

### Plankton — 编写时代码质量强制执行

Plankton（致谢：@alxfazio）是用于编写时代码质量强制执行的推荐伴侣。它通过 PostToolUse 钩子在每次文件编辑时运行格式化程序和 20 多个代码检查器，然后生成智能体子进程（根据违规复杂度路由到 Haiku/Sonnet/Opus）来修复主智能体遗漏的问题。采用三阶段架构：静默自动格式化（解决 40-50% 的问题），将剩余的违规收集为结构化 JSON，委托给子进程修复。包含配置保护钩子，防止智能体修改检查器配置以通过检查而非修复代码。支持 Python、TypeScript、Shell、YAML、JSON、TOML、Markdown 和 Dockerfile。与 AgentShield 结合使用，实现安全 + 质量覆盖。完整集成指南请参阅 `skills/plankton-code-quality/`。

### 持续学习 v2

基于本能的学习系统会自动学习您的模式：

```bash
/instinct-status        # Show learned instincts with confidence
/instinct-import <file> # Import instincts from others
/instinct-export        # Export your instincts for sharing
/evolve                 # Cluster related instincts into skills
```

完整文档请参阅 `skills/continuous-learning-v2/`。

***

## 要求

### Factory Droid CLI 版本

**最低版本：v2.1.0 或更高版本**

此插件需要 Factory Droid CLI v2.1.0+，因为插件系统处理钩子的方式发生了变化。

检查您的版本：

```bash
droid --version
```

### 重要提示：钩子自动加载行为

> WARNING: **对于贡献者：** 请勿在 `hooks/hooks.json` 之外重复声明 hooks。这由回归测试强制执行。

Factory Droid v2.1+ **会自动加载** 已安装 EFD 内容中的 `hooks/hooks.json`（按约定）。添加第二处显式 hooks 声明会导致重复检测错误：

```
重复的钩子文件检测到：./hooks/hooks.json 解析到已加载的文件
```

**历史背景：** 这已导致此仓库中多次修复/还原循环（[#29](https://github.com/r0k1n-c/everything-factory-droid/issues/29), [#52](https://github.com/r0k1n-c/everything-factory-droid/issues/52), [#103](https://github.com/r0k1n-c/everything-factory-droid/issues/103)）。Factory Droid 版本之间的行为发生了变化，导致了混淆。我们现在有一个回归测试来防止这种情况再次发生。

***

## 安装

### 选项 1：作为插件安装（推荐）

使用此仓库的最简单方式 - 作为 Factory Droid 插件安装：

```bash
# Add this repo as a marketplace
droid plugin marketplace add https://github.com/r0k1n-c/everything-factory-droid

# Install the plugin
droid plugin install everything-factory-droid@everything-factory-droid
```

或者直接添加到您的 `~/.factory/settings.json`：

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

这将使您能够立即访问所有命令、代理、技能和钩子。

> **注意：** Factory Droid 插件系统不支持通过插件分发 `rules` ([当前插件限制](https://docs.factory.ai/cli/configuration/plugins.md))。请在目标项目根目录执行项目级安装，例如：
>
> ```bash
> cd /path/to/your-project
> npx @r0k1n-c/efd-install typescript
> # npx @r0k1n-c/efd-install --profile full
> #
> # 或者，如果你已经把仓库克隆到别处：
> # bash /path/to/everything-factory-droid/install.sh typescript
> ```
>
> 如果你更想手动复制文件：
>
> ```bash
> # 首先克隆仓库
> git clone https://github.com/r0k1n-c/everything-factory-droid.git
>
> # 选项 A：用户级规则（适用于所有项目）
> mkdir -p ~/.factory/rules
> cp -r everything-factory-droid/rules/common ~/.factory/rules/
> cp -r everything-factory-droid/rules/typescript ~/.factory/rules/   # 选择您的技术栈
> cp -r everything-factory-droid/rules/python ~/.factory/rules/
> cp -r everything-factory-droid/rules/golang ~/.factory/rules/
> cp -r everything-factory-droid/rules/php ~/.factory/rules/
>
> # 选项 B：项目级规则（仅适用于当前项目）
> mkdir -p .factory/rules
> cp -r everything-factory-droid/rules/common .factory/rules/
> cp -r everything-factory-droid/rules/typescript .factory/rules/     # 选择您的技术栈
> ```

***

### 选项 2：手动安装

如果您希望对安装的内容进行手动控制：

```bash
# Clone the repo
git clone https://github.com/r0k1n-c/everything-factory-droid.git

# Copy agents into your Factory Droid config
cp everything-factory-droid/agents/*.md ~/.factory/droids/

# Copy rules (common + language-specific)
cp -r everything-factory-droid/rules/common ~/.factory/rules/
cp -r everything-factory-droid/rules/typescript ~/.factory/rules/   # pick your stack
cp -r everything-factory-droid/rules/python ~/.factory/rules/
cp -r everything-factory-droid/rules/golang ~/.factory/rules/
cp -r everything-factory-droid/rules/php ~/.factory/rules/

# Copy commands
cp everything-factory-droid/commands/*.md ~/.factory/commands/

# Copy skills (core vs niche)
# Recommended (new users): core/general skills only
for s in article-writing content-engine e2e-testing eval-harness frontend-patterns frontend-slides market-research search-first security-review strategic-compact tdd-workflow verification-loop; do
  cp -r everything-factory-droid/skills/$s ~/.factory/skills/
done

# Optional: add niche/framework-specific skills only when needed
# for s in django-patterns django-tdd laravel-patterns springboot-patterns; do
# cp -r everything-factory-droid/skills/$s ~/.factory/skills/
# done
```

#### 将钩子添加到 settings.json

将 `hooks/hooks.json` 中的钩子复制到你的 `~/.factory/settings.json`。

#### 配置 MCPs

将 `mcp-configs/mcp-servers.json` 中需要的 MCP 服务器定义复制到官方 Factory Droid 配置 `~/.factory/settings.json`，或者复制到项目级 `.mcp.json` 以启用仓库本地 MCP。

**重要：** 将 `YOUR_*_HERE` 占位符替换为你实际的 API 密钥。

***

## 关键概念

### 智能体

子智能体处理具有有限范围的委托任务。示例：

```markdown
---
name: code-reviewer
description: 审查代码的质量、安全性和可维护性
tools: ["Read", "Grep", "Glob", "Bash"]
model: claude-opus-4-6
---

您是一位资深代码审查员...

```

### 技能

技能是由命令或智能体调用的工作流定义：

```markdown
# TDD Workflow

1. Define interfaces first
2. Write failing tests (RED)
3. Implement minimal code (GREEN)
4. Refactor (IMPROVE)
5. Verify 80%+ coverage
```

### 钩子

钩子在工具事件上触发。示例 - 警告关于 console.log：

```json
{
  "matcher": "tool == \"Edit\" && tool_input.file_path matches \"\\\\.(ts|tsx|js|jsx)$\"",
  "hooks": [{
    "type": "command",
    "command": "#!/bin/bash\ngrep -n 'console\\.log' \"$file_path\" && echo '[Hook] Remove console.log' >&2"
  }]
}
```

### 规则

规则是始终遵循的指导原则，组织成 `common/`（与语言无关）+ 语言特定目录：

```
rules/
  common/          # 通用原则（始终安装）
  typescript/      # TS/JS 特定模式与工具
  python/          # Python 特定模式与工具
  golang/          # Go 特定模式与工具
  swift/           # Swift 特定模式与工具
  php/             # PHP 特定模式与工具
```

有关安装和结构详情，请参阅 [`rules/README.md`](rules/README.md)。

***

## 我应该使用哪个代理？

不确定从哪里开始？使用这个快速参考：

| 我想要... | 使用此命令 | 使用的智能体 |
|--------------|-----------------|------------|
| 规划新功能 | `/plan "Add auth"` | planner |
| 设计系统架构 | `/plan` + architect agent | architect |
| 先写测试再写代码 | `/tdd` | tdd-guide |
| 评审我刚写的代码 | `/code-review` | code-reviewer |
| 修复失败的构建 | `/build-fix` | build-error-resolver |
| 运行端到端测试 | `/e2e` | e2e-runner |
| 查找安全漏洞 | `/security-scan` | security-reviewer |
| 移除死代码 | `/refactor-clean` | refactor-cleaner |
| 更新文档 | `/update-docs` | doc-updater |
| 评审 Go 代码 | `/go-review` | go-reviewer |
| 评审 Python 代码 | `/python-review` | python-reviewer |
| 评审 TypeScript/JavaScript 代码 | *(直接调用 `typescript-reviewer`)* | typescript-reviewer |
| 审计数据库查询 | *(自动委派)* | database-reviewer |

### 常见工作流

**开始新功能：**

```
/plan "使用 OAuth 添加用户身份验证"
                                              → 规划器创建实现蓝图
/tdd                                          → tdd-guide 强制执行先写测试
/code-review                                  → 代码审查员检查你的工作
```

**修复错误：**

```
/tdd                                          → tdd-guide：编写一个能复现问题的失败测试
                                              → 实现修复，验证测试通过
/code-review                                  → code-reviewer：捕捉回归问题
```

**准备生产环境：**

```
/security-scan                                → security-reviewer: OWASP Top 10 审计
/e2e                                          → e2e-runner: 关键用户流程测试
/test-coverage                                → verify 80%+ 覆盖率
```

***

## 常见问题

<details>
<summary><b>如何检查已安装的代理/命令？</b></summary>

```bash
droid plugin list
```

这会显示插件中所有可用的代理、命令和技能。

</details>

<details>
<summary><b>我的钩子不工作 / 我看到“重复钩子文件”错误</b></summary>

这是最常见的问题。**不要在 `hooks/hooks.json` 之外重复声明 hooks。** Factory Droid v2.1+ 会自动加载 `hooks/hooks.json`；再次声明会导致重复检测错误。参见 [#29](https://github.com/r0k1n-c/everything-factory-droid/issues/29), [#52](https://github.com/r0k1n-c/everything-factory-droid/issues/52), [#103](https://github.com/r0k1n-c/everything-factory-droid/issues/103)。

</details>

<details>
<summary><b>我能否在自定义 API 端点或模型网关上将 EFD 与 Factory Droid 一起使用？</b></summary>

是的。EFD 不会硬编码 Anthropic 托管的传输设置。它通过 Factory Droid 正常的 CLI/插件接口在本地运行，因此可以与以下系统配合工作：

* Anthropic 托管的 Factory Droid
* 使用 `ANTHROPIC_BASE_URL` 和 `ANTHROPIC_AUTH_TOKEN` 的官方 Factory Droid 网关设置
* 兼容的自定义端点，这些端点能理解 Anthropic API 并符合 Factory Droid 的预期

最小示例：

```bash
export ANTHROPIC_BASE_URL=https://your-gateway.example.com
export ANTHROPIC_AUTH_TOKEN=your-token
droid
```

如果您的网关重新映射模型名称，请在 Factory Droid 中配置，而不是在 EFD 中。一旦 `droid` CLI 已经正常工作，EFD 的钩子、技能、命令和规则就与模型提供商无关。

官方参考资料：

* [Factory Droid LLM 网关文档](https://docs.factory.ai/enterprise/models-llm-gateways-and-integrations)
* [Factory Droid 模型配置文档](https://docs.factory.ai/cli/user-guides/choosing-your-model)

</details>

<details>
<summary><b>我的上下文窗口正在缩小 / Droid 即将耗尽上下文</b></summary>

太多的 MCP 服务器会消耗你的上下文。每个 MCP 工具描述都会消耗你 200k 窗口的令牌，可能将其减少到约 70k。

**修复：** 按项目禁用未使用的 MCP：

```json
// In your project's .factory/settings.json
{
  "disabledMcpServers": ["supabase", "railway", "vercel"]
}
```

保持启用的 MCP 少于 10 个，活动工具少于 80 个。

</details>

<details>
<summary><b>我可以只使用某些组件（例如，仅代理）吗？</b></summary>

是的。使用选项 2（手动安装）并仅复制你需要的部分：

```bash
# Just agents
cp everything-factory-droid/agents/*.md ~/.factory/droids/

# Just rules
cp -r everything-factory-droid/rules/common ~/.factory/rules/
```

每个组件都是完全独立的。

</details>

<details>
<summary><b>这个项目支持其他 harness 吗？</b></summary>

不支持。这个项目有意只保留 **Factory Droid** 兼容面。

</details>

<details>
<summary><b>我如何贡献新技能或代理？</b></summary>

参见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。简短版本：

1. Fork 仓库
2. 在 `skills/your-skill-name/SKILL.md` 中创建你的技能（带有 YAML 前言）
3. 或在 `agents/your-agent.md` 中创建代理
4. 提交 PR，清晰描述其功能和使用时机

</details>

***

## 运行测试

该插件包含一个全面的测试套件：

```bash
# Run all tests
node tests/run-all.js

# Run individual test files
node tests/lib/utils.test.js
node tests/lib/package-manager.test.js
node tests/hooks/hooks.test.js
```

***

## 贡献

**欢迎并鼓励贡献。**

此仓库旨在成为社区资源。如果你有：

* 有用的智能体或技能
* 巧妙的钩子
* 更好的 MCP 配置
* 改进的规则

请贡献！请参阅 [CONTRIBUTING.md](../../CONTRIBUTING.md) 了解指南。

### 贡献想法

* 更多垂直领域工作流与专用智能体
* 团队级 hooks、rules 与质量门禁
* 安装配置、示例与上手资产
* 面向新技术栈的验证与测试工作流
* 研究、运维与内部工具模式

***

## 背景

这套配置来自长期的 Factory Droid 日常使用，并已在多个真实产品工作流中验证。

## 灵感致谢

* 灵感来自 [zarazhangrui](https://github.com/zarazhangrui)
* homunculus 灵感来自 [humanplane](https://github.com/humanplane)

***

## 令牌优化

如果不管理令牌消耗，使用 Factory Droid 可能会很昂贵。这些设置能在不牺牲质量的情况下显著降低成本。

### 推荐设置

添加到 `~/.factory/settings.json`：

```json
{
  "model": "sonnet",
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50"
  }
}
```

| 设置 | 默认值 | 推荐值 | 影响 |
|---------|---------|-------------|--------|
| `model` | opus | **sonnet** | 约 60% 的成本降低；处理 80%+ 的编码任务 |
| `MAX_THINKING_TOKENS` | 31,999 | **10,000** | 每个请求的隐藏思考成本降低约 70% |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 95 | **50** | 更早压缩 —— 在长会话中质量更好 |

仅在需要深度架构推理时切换到 Opus：

```
/model opus
```

### 日常工作流命令

| 命令 | 何时使用 |
|---------|-------------|
| `/model sonnet` | 大多数任务的默认选择 |
| `/model opus` | 复杂架构、调试、深度推理 |
| `/clear` | 在不相关的任务之间（免费，即时重置） |
| `/compact` | 在逻辑任务断点处（研究完成，里程碑达成） |
| `/cost` | 在会话期间监控令牌花费 |

### 策略性压缩

`strategic-compact` 技能（包含在此插件中）建议在逻辑断点处进行 `/compact`，而不是依赖在 95% 上下文时的自动压缩。完整决策指南请参见 `skills/strategic-compact/SKILL.md`。

**何时压缩：**

* 研究/探索之后，实施之前
* 完成一个里程碑之后，开始下一个之前
* 调试之后，继续功能工作之前
* 失败的方法之后，尝试新方法之前

**何时不压缩：**

* 实施过程中（你会丢失变量名、文件路径、部分状态）

### 上下文窗口管理

**关键：** 不要一次性启用所有 MCP。每个 MCP 工具描述都会消耗你 200k 窗口的令牌，可能将其减少到约 70k。

* 每个项目保持启用的 MCP 少于 10 个
* 保持活动工具少于 80 个
* 在项目配置中使用 `disabledMcpServers` 来禁用未使用的 MCP

### 代理团队成本警告

代理团队会生成多个上下文窗口。每个团队成员独立消耗令牌。仅用于并行性能提供明显价值的任务（多模块工作、并行审查）。对于简单的顺序任务，子代理更节省令牌。

***

## WARNING: 重要说明

### 令牌优化

达到每日限制？参见 **[令牌优化指南](../token-optimization.md)** 获取推荐设置和工作流提示。

快速见效的方法：

```json
// ~/.factory/settings.json
{
  "model": "sonnet",
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50",
    "CLAUDE_CODE_SUBAGENT_MODEL": "haiku"
  }
}
```

在不相关的任务之间使用 `/clear`，在逻辑断点处使用 `/compact`，并使用 `/cost` 来监控花费。

### 定制化

这些配置适用于我的工作流。你应该：

1. 从引起共鸣的部分开始
2. 根据你的技术栈进行修改
3. 移除你不使用的部分
4. 添加你自己的模式

***

## 赞助商

这个项目是免费和开源的。赞助商帮助保持其维护和发展。

[**成为赞助商**](https://github.com/sponsors/affaan-m) | [赞助层级](../../SPONSORS.md) | [赞助计划](../../SPONSORING.md)

***

## Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=r0k1n-c/everything-factory-droid\&type=Date)](https://star-history.com/#r0k1n-c/everything-factory-droid\&Date)

***

## 链接

* **速查指南（从这里开始）：** [Factory Droid 速查指南](https://x.com/affaanmustafa/status/2012378465664745795)
* **详细指南（进阶）：** [Factory Droid 详细指南](https://x.com/affaanmustafa/status/2014040193557471352)
* **关注：** [@affaanmustafa](https://x.com/affaanmustafa)

***

## 许可证

MIT - 自由使用，根据需要修改，如果可以请回馈贡献。

***

**如果此仓库对你有帮助，请点星。阅读两份指南。构建伟大的东西。**
