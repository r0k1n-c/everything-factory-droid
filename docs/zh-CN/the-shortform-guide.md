# Factory Droid 简明指南

![标题：Factory Droid 技巧与窍门](../../assets/images/shortform/00-header.png)

***

**这份指南总结了一套经过长期日常使用沉淀下来的实用 Factory Droid 配置：skills、hooks、subagents、MCP、plugins，以及在真实工作里真正有效的模式。**

***

## 技能和命令

技能就像规则，受限于特定的范围和流程。当你需要执行特定工作流时，它们是提示词的简写。

在使用 Opus 4.5 长时间编码后，你想清理死代码和松散的 .md 文件吗？运行 `/refactor-clean`。需要测试吗？`/tdd`、`/e2e`、`/test-coverage`。技能也可以包含代码地图——一种让 Droid 快速浏览你的代码库而无需消耗上下文进行探索的方式。

![显示链式命令的终端](../../assets/images/shortform/02-chaining-commands.jpeg)
*将命令链接在一起*

命令是通过斜杠命令执行的技能。它们有重叠但存储方式不同：

* **技能**: `~/.factory/skills/` - 更广泛的工作流定义
* **命令**: `~/.factory/commands/` - 快速可执行的提示词

```bash
# Example skill structure
~/.factory/skills/
  pmx-guidelines.md      # Project-specific patterns
  coding-standards.md    # Language best practices
  tdd-workflow/          # 使用 SKILL.md 的多文件 skill
  security-review/       # Checklist-based skill
```

***

## 钩子

钩子是基于触发的自动化，在特定事件发生时触发。与技能不同，它们受限于工具调用和生命周期事件。

**钩子类型：**

1. **PreToolUse** - 工具执行前（验证、提醒）
2. **PostToolUse** - 工具完成后（格式化、反馈循环）
3. **UserPromptSubmit** - 当你发送消息时
4. **Stop** - 当 Droid 完成响应时
5. **PreCompact** - 上下文压缩前
6. **Notification** - 权限请求

**示例：长时间运行命令前的 tmux 提醒**

```json
{
  "PreToolUse": [
    {
      "matcher": "tool == \"Bash\" && tool_input.command matches \"(npm|pnpm|yarn|cargo|pytest)\"",
      "hooks": [
        {
          "type": "command",
          "command": "if [ -z \"$TMUX\" ]; then echo '[Hook] Consider tmux for session persistence' >&2; fi"
        }
      ]
    }
  ]
}
```

![PostToolUse 钩子反馈](../../assets/images/shortform/03-posttooluse-hook.png)
*在 Factory Droid 中运行 PostToolUse 钩子时获得的反馈示例*

**专业提示：** 使用 `hookify` 插件以对话方式创建钩子，而不是手动编写 JSON。运行 `/hookify` 并描述你想要什么。

***

## 子代理

子代理是你的编排器（主 Droid）可以委托任务给它的、具有有限范围的进程。它们可以在后台或前台运行，为主代理释放上下文。

子代理与技能配合得很好——一个能够执行你技能子集的子代理可以被委托任务并自主使用这些技能。它们也可以用特定的工具权限进行沙盒化。

```bash
# Example subagent structure
~/.factory/droids/
  planner.md           # Feature implementation planning
  architect.md         # System design decisions
  tdd-guide.md         # Test-driven development
  code-reviewer.md     # Quality/security review
  security-reviewer.md # Vulnerability analysis
  build-error-resolver.md
  e2e-runner.md
  refactor-cleaner.md
```

为每个子代理配置允许的工具、MCP 和权限，以实现适当的范围界定。

***

## 规则和记忆

你的 `.rules` 文件夹包含 `.md` 文件，其中是 Droid 应始终遵循的最佳实践。有两种方法：

1. **单一 AGENTS.md** - 所有内容在一个文件中（用户或项目级别）
2. **规则文件夹** - 按关注点分组的模块化 `.md` 文件

```bash
~/.factory/rules/
  security.md      # No hardcoded secrets, validate inputs
  coding-style.md  # Immutability, file organization
  testing.md       # TDD workflow, 80% coverage
  git-workflow.md  # Commit format, PR process
  agents.md        # When to delegate to subagents
  performance.md   # Model selection, context management
```

**规则示例：**

* 代码库中不使用表情符号
* 前端避免使用紫色色调
* 部署前始终测试代码
* 优先考虑模块化代码而非巨型文件
* 绝不提交 console.log

***

## MCP（模型上下文协议）

MCP 将 Droid 直接连接到外部服务。它不是 API 的替代品——而是围绕 API 的提示驱动包装器，允许在导航信息时具有更大的灵活性。

**示例：** Supabase MCP 允许 Droid 提取特定数据，直接在上游运行 SQL 而无需复制粘贴。数据库、部署平台等也是如此。

![Supabase MCP 列出表](../../assets/images/shortform/04-supabase-mcp.jpeg)
*Supabase MCP 列出公共模式内表的示例*

**Droid 中的 Chrome：** 是一个内置的插件 MCP，允许 Droid 自主控制你的浏览器——点击查看事物如何工作。

**关键：上下文窗口管理**

对 MCP 要挑剔。我将所有 MCP 保存在用户配置中，但**禁用所有未使用的**。插件用 `/plugins` 查看，MCP 用 `/mcp` 查看当前可用项目。

![插件管理界面](../../assets/images/shortform/05-plugins-interface.jpeg)
*使用插件管理界面查看已安装的 MCP 及其状态*

在压缩之前，你的 200k 上下文窗口如果启用了太多工具，可能只有 70k。性能会显著下降。

**经验法则：** 在配置中保留 20-30 个 MCP，但保持启用状态少于 10 个 / 活动工具少于 80 个。

```bash
# Check enabled MCPs
/mcp

# 在 ~/.factory/settings.json 的 disabledMcpServers 中禁用未使用的项
```

***

## 插件

插件将工具打包以便于安装，而不是繁琐的手动设置。一个插件可以是技能和 MCP 的组合，或者是捆绑在一起的钩子/工具。

**安装插件：**

```bash
# Add a marketplace
# mgrep plugin by @mixedbread-ai
droid plugin marketplace add https://github.com/mixedbread-ai/mgrep

# 打开 Droid，运行 /plugins，找到新的 marketplace 条目并从那里安装
```

![显示 mgrep 的市场选项卡](../../assets/images/shortform/06-marketplaces-mgrep.jpeg)
*显示新安装的 Mixedbread-Grep 市场*

**LSP 插件** 如果你经常在编辑器之外运行 Factory Droid，则特别有用。语言服务器协议为 Droid 提供实时类型检查、跳转到定义和智能补全，而无需打开 IDE。

```bash
# Enabled plugins example
typescript-lsp  # TypeScript intelligence
pyright-lsp     # Python type checking
hookify         # Create hooks conversationally
mgrep@Mixedbread-Grep                   # Better search than ripgrep
```

与 MCP 相同的警告——注意你的上下文窗口。

***

## 技巧和窍门

### 键盘快捷键

* `Ctrl+U` - 删除整行（比反复按退格键快）
* `!` - 快速 bash 命令前缀
* `@` - 搜索文件
* `/` - 发起斜杠命令
* `Shift+Enter` - 多行输入
* `Tab` - 切换思考显示
* `Esc Esc` - 中断 Droid / 恢复代码

### 并行工作流

* **分叉** (`/fork`) - 分叉对话以并行执行不重叠的任务，而不是在队列中堆积消息
* **Git Worktrees** - 用于重叠的并行 Droid 而不产生冲突。每个工作树都是一个独立的检出

```bash
git worktree add ../feature-branch feature-branch
# Now run separate Droid instances in each worktree
```

### 用于长时间运行命令的 tmux

流式传输和监视 Droid 运行的日志/bash 进程：

<https://github.com/user-attachments/assets/shortform/07-tmux-video.mp4>

```bash
tmux new -s dev
# Droid runs commands here, you can detach and reattach
tmux attach -t dev
```

### mgrep > grep

`mgrep` 是对 ripgrep/grep 的显著改进。通过插件市场安装，然后使用 `/mgrep` 技能。适用于本地搜索和网络搜索。

```bash
mgrep "function handleSubmit"  # Local search
mgrep --web "Next.js 15 app router changes"  # Web search
```

### 其他有用的命令

* `/rewind` - 回到之前的状态
* `/statusline` - 用分支、上下文百分比、待办事项进行自定义
* `/checkpoints` - 文件级别的撤销点
* `/compact` - 手动触发上下文压缩

### GitHub Actions CI/CD

使用 GitHub Actions 在你的 PR 上设置代码审查。配置后，Droid 可以自动审查 PR。

![Droid 机器人批准 PR](../../assets/images/shortform/08-github-pr-review.jpeg)
*Droid 批准一个错误修复 PR*

### 沙盒化

对风险操作使用沙盒模式——Droid 在受限环境中运行，不影响你的实际系统。

***

## 关于编辑器

你的编辑器选择显著影响 Factory Droid 的工作流。虽然 Factory Droid 可以在任何终端中工作，但将其与功能强大的编辑器配对可以解锁实时文件跟踪、快速导航和集成命令执行。

### Zed（我的偏好）

我使用 [Zed](https://zed.dev) —— 用 Rust 编写，所以它真的很快。立即打开，轻松处理大型代码库，几乎不占用系统资源。

**为什么 Zed + Factory Droid 是绝佳组合：**

* **速度** - 基于 Rust 的性能意味着当 Droid 快速编辑文件时没有延迟。你的编辑器能跟上
* **代理面板集成** - Zed 的 Droid 集成允许你在 Droid 编辑时实时跟踪文件变化。无需离开编辑器即可跳转到 Droid 引用的文件
* **CMD+Shift+R 命令面板** - 快速访问所有自定义斜杠命令、调试器、构建脚本，在可搜索的 UI 中
* **最小的资源使用** - 在繁重操作期间不会与 Droid 竞争 RAM/CPU。运行 Opus 时很重要
* **Vim 模式** - 完整的 vim 键绑定，如果你喜欢的话

![带有自定义命令的 Zed 编辑器](../../assets/images/shortform/09-zed-editor.jpeg)
*使用 CMD+Shift+R 调出带有自定义命令下拉菜单的 Zed 编辑器。右下角的靶心图标表示跟随模式已启用。*

**编辑器无关提示：**

1. **分割你的屏幕** - 一侧是带 Factory Droid 的终端，另一侧是编辑器
2. **Ctrl + G** - 在 Zed 中快速打开 Droid 当前正在处理的文件
3. **自动保存** - 启用自动保存，以便 Droid 的文件读取始终是最新的
4. **Git 集成** - 使用编辑器的 git 功能在提交前审查 Droid 的更改
5. **文件监视器** - 大多数编辑器自动重新加载更改的文件，请验证是否已启用

### VSCode / Cursor

这也是一个可行的选择，并且与 Factory Droid 配合良好。你可以使用终端格式，通过 `\ide` 与你的编辑器自动同步以启用 LSP 功能（现在与插件有些冗余）。或者你可以选择扩展，它更集成于编辑器并具有匹配的 UI。

![VS Code Factory Droid 扩展](../../assets/images/shortform/10-vscode-extension.jpeg)
*VS Code 扩展为 Factory Droid 提供了原生图形界面，直接集成到你的 IDE 中。*

***

## 我的设置

### 插件

**已安装：**（我通常一次只启用其中的 4-5 个）

```markdown
ralph-wiggum       # 循环自动化
frontend-design    # UI/UX 模式
commit-commands    # Git 工作流
security-guidance  # 安全检查
pr-review-toolkit  # PR 自动化
typescript-lsp # TS 智能
hookify        # Hook 创建
code-simplifier
feature-dev
explanatory-output-style
code-review
context7       # 实时文档
pyright-lsp    # Python 类型
mgrep@Mixedbread-Grep                  # 更好的搜索

```

### MCP 服务器

**已配置（用户级别）：**

```json
{
  "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] },
  "firecrawl": { "command": "npx", "args": ["-y", "firecrawl-mcp"] },
  "supabase": {
    "command": "npx",
    "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=YOUR_REF"]
  },
  "memory": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-memory"] },
  "sequential-thinking": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
  },
  "vercel": { "type": "http", "url": "https://mcp.vercel.com" },
  "railway": { "command": "npx", "args": ["-y", "@railway/mcp-server"] },
  "cloudflare-docs": { "type": "http", "url": "https://docs.mcp.cloudflare.com/mcp" },
  "cloudflare-workers-bindings": {
    "type": "http",
    "url": "https://bindings.mcp.cloudflare.com/mcp"
  },
  "clickhouse": { "type": "http", "url": "https://mcp.clickhouse.cloud/mcp" },
  "AbletonMCP": { "command": "uvx", "args": ["ableton-mcp"] },
  "magic": { "command": "npx", "args": ["-y", "@magicuidesign/mcp@latest"] }
}
```

这是关键——我配置了 14 个 MCP，但每个项目只启用约 5-6 个。保持上下文窗口健康。

### 关键钩子

```json
{
  "PreToolUse": [
    { "matcher": "npm|pnpm|yarn|cargo|pytest", "hooks": ["tmux reminder"] },
    { "matcher": "Write && .md file", "hooks": ["block unless README/AGENTS"] },
    { "matcher": "git push", "hooks": ["open editor for review"] }
  ],
  "PostToolUse": [
    { "matcher": "Edit && .ts/.tsx/.js/.jsx", "hooks": ["prettier --write"] },
    { "matcher": "Edit && .ts/.tsx", "hooks": ["tsc --noEmit"] },
    { "matcher": "Edit", "hooks": ["grep console.log warning"] }
  ],
  "Stop": [
    { "matcher": "*", "hooks": ["check modified files for console.log"] }
  ]
}
```

### 自定义状态行

显示用户、目录、带脏标记的 git 分支、剩余上下文百分比、模型、时间和待办事项计数：

![自定义状态行](../../assets/images/shortform/11-statusline.jpeg)
*我的 Mac 根目录下的状态行示例*

```
affoon:~ ctx:65% Opus 4.5 19:52
▌▌ 计划模式开启（按 shift+tab 循环切换）
```

### 规则结构

```
~/.factory/rules/
  security.md      # 强制安全检查
  coding-style.md  # 不可变性，文件大小限制
  testing.md       # TDD，80%覆盖率
  git-workflow.md  # 约定式提交
  agents.md        # 子代理委托规则
  patterns.md      # API响应格式
  performance.md   # 模型选择（Haiku vs Sonnet vs Opus）
  hooks.md         # 钩子文档
```

### 子代理

```
~/.factory/droids/
  planner.md           # 功能拆分
  architect.md         # 系统设计
  tdd-guide.md         # 测试先行指南
  code-reviewer.md     # 代码审查
  security-reviewer.md # 漏洞扫描
  build-error-resolver.md
  e2e-runner.md        # Playwright 测试
  refactor-cleaner.md  # 死代码清理
  doc-updater.md       # 文档同步
```

***

## 关键要点

1. **不要过度复杂化** - 将配置视为微调，而非架构
2. **上下文窗口很宝贵** - 禁用未使用的 MCP 和插件
3. **并行执行** - 分叉对话，使用 git worktrees
4. **自动化重复性工作** - 用于格式化、代码检查、提醒的钩子
5. **界定子代理范围** - 有限的工具 = 专注的执行

***

## 参考资料

* [插件参考](https://docs.factory.ai/cli/configuration/plugins)
* [钩子文档](https://docs.factory.ai/cli/configuration/hooks-guide)
* [检查点](https://docs.factory.ai/guides/power-user/memory-management)
* [交互模式](https://docs.factory.ai/cli/getting-started/quickstart)
* [记忆系统](https://docs.factory.ai/guides/power-user/memory-management)
* [子代理](https://docs.factory.ai/cli/configuration/custom-droids)
* [MCP 概述](https://docs.factory.ai/cli/configuration/mcp)

***

**注意：** 这是细节的一个子集。关于高级模式，请参阅 [长篇指南](the-longform-guide.md)。

***

*基于在真实产品工作中不断打磨的 Factory Droid 使用模式整理而成*
