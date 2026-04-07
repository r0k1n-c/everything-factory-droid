# The Shorthand Guide to Everything Factory Droid

![Header: Tips & Tricks for Factory Droid](./assets/images/shortform/00-header.png)

---

**This guide captures a practical Factory Droid setup after extended daily use: skills, hooks, subagents, MCPs, plugins, and the patterns that actually hold up in real work.**

---

## Skills and Commands

Skills are the primary workflow surface. They act like scoped workflow bundles: reusable prompts, structure, supporting files, and codemaps when you need a particular execution pattern.

After a long session of coding with Opus 4.5, you want to clean out dead code and loose .md files? Run `/refactor-clean`. Need testing? `/tdd`, `/e2e`, `/test-coverage`. Those slash entries are convenient, but the real durable unit is the underlying skill. Skills can also include codemaps - a way for Droid to quickly navigate your codebase without burning context on exploration.

![Terminal showing chained commands](./assets/images/shortform/02-chaining-commands.jpeg)
*Chaining commands together*

EFD still ships a `commands/` layer, but it is best thought of as legacy slash-entry compatibility during migration. The durable logic should live in skills.

- **Skills**: `~/.factory/skills/` - canonical workflow definitions
- **Commands**: `~/.factory/commands/` - legacy slash-entry shims when you still need them

```bash
# Example skill structure
~/.factory/skills/
  pmx-guidelines.md      # Project-specific patterns
  coding-standards.md    # Language best practices
  tdd-workflow/          # Multi-file skill with SKILL.md
  security-review/       # Checklist-based skill
```

---

## Hooks

Hooks are trigger-based automations that fire on specific events. Unlike skills, they're constricted to tool calls and lifecycle events.

**Hook Types:**

1. **PreToolUse** - Before a tool executes (validation, reminders)
2. **PostToolUse** - After a tool finishes (formatting, feedback loops)
3. **UserPromptSubmit** - When you send a message
4. **Stop** - When Droid finishes responding
5. **PreCompact** - Before context compaction
6. **Notification** - Permission requests

**Example: tmux reminder before long-running commands**

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

![PostToolUse hook feedback](./assets/images/shortform/03-posttooluse-hook.png)
*Example of what feedback you get in Factory Droid, while running a PostToolUse hook*

**Pro tip:** Use the `hookify` plugin to create hooks conversationally instead of writing JSON manually. Run `/hookify` and describe what you want.

---

## Subagents

Subagents are processes your orchestrator (main Droid) can delegate tasks to with limited scopes. They can run in background or foreground, freeing up context for the main agent.

Subagents work nicely with skills - a subagent capable of executing a subset of your skills can be delegated tasks and use those skills autonomously. They can also be sandboxed with specific tool permissions.

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

Configure allowed tools, MCPs, and permissions per subagent for proper scoping.

---

## Rules and Memory

Your `.rules` folder holds `.md` files with best practices Droid should ALWAYS follow. Two approaches:

1. **Single AGENTS.md** - Everything in one file (user or project level)
2. **Rules folder** - Modular `.md` files grouped by concern

```bash
~/.factory/rules/
  security.md      # No hardcoded secrets, validate inputs
  coding-style.md  # Immutability, file organization
  testing.md       # TDD workflow, 80% coverage
  git-workflow.md  # Commit format, PR process
  agents.md        # When to delegate to subagents
  performance.md   # Model selection, context management
```

**Example rules:**

- No emojis in codebase
- Refrain from purple hues in frontend
- Always test code before deployment
- Prioritize modular code over mega-files
- Never commit console.logs

---

## MCPs (Model Context Protocol)

MCPs connect Droid to external services directly. Not a replacement for APIs - it's a prompt-driven wrapper around them, allowing more flexibility in navigating information.

**Example:** Supabase MCP lets Droid pull specific data, run SQL directly project source without copy-paste. Same for databases, deployment platforms, etc.

![Supabase MCP listing tables](./assets/images/shortform/04-supabase-mcp.jpeg)
*Example of the Supabase MCP listing the tables within the public schema*

**Chrome in Droid:** is a built-in plugin MCP that lets Droid autonomously control your browser - clicking around to see how things work.

**CRITICAL: Context Window Management**

Be picky with MCPs. I keep all MCPs in user config but **disable everything unused**. Use `/plugin list` or run `/mcp` to inspect what is currently available.

![Plugin management interface](./assets/images/shortform/05-plugins-interface.jpeg)
*Using plugin management to inspect installed MCPs and their status*

Your 200k context window before compacting might only be 70k with too many tools enabled. Performance degrades significantly.

**Rule of thumb:** Have 20-30 MCPs in config, but keep under 10 enabled / under 80 tools active.

```bash
# Check enabled MCPs
/mcp

# Disable unused ones in ~/.factory/settings.json or in the current repo's .mcp.json
```

---

## Plugins

Plugins package tools for easy installation instead of tedious manual setup. A plugin can be a skill + MCP combined, or hooks/tools bundled together.

**Installing plugins:**

```bash
# Add a marketplace
# mgrep plugin by @mixedbread-ai
/plugin marketplace add https://github.com/mixedbread-ai/mgrep

# Open Droid, run /plugin list, find the new marketplace entry, and install from there
```

![Marketplaces tab showing mgrep](./assets/images/shortform/06-marketplaces-mgrep.jpeg)
*Displaying the newly installed Mixedbread-Grep marketplace*

**LSP Plugins** are particularly useful if you run Factory Droid outside editors frequently. Language Server Protocol gives Droid real-time type checking, go-to-definition, and intelligent completions without needing an IDE open.

```bash
# Enabled plugins example
typescript-lsp  # TypeScript intelligence
pyright-lsp     # Python type checking
hookify         # Create hooks conversationally
mgrep@Mixedbread-Grep                   # Better search than ripgrep
```

Same warning as MCPs - watch your context window.

---

## Tips and Tricks

### Keyboard Shortcuts

- `Ctrl+U` - Delete entire line (faster than backspace spam)
- `!` - Quick bash command prefix
- `@` - Search for files
- `/` - Initiate slash commands
- `Shift+Enter` - Multi-line input
- `Tab` - Toggle thinking display
- `Esc Esc` - Interrupt Droid / restore code

### Parallel Workflows

- **Fork** (`/fork`) - Fork conversations to do non-overlapping tasks in parallel instead of spamming queued messages
- **Git Worktrees** - For overlapping parallel Droids without conflicts. Each worktree is an independent checkout

```bash
git worktree add ../feature-branch feature-branch
# Now run separate Droid instances in each worktree
```

### tmux for Long-Running Commands

Stream and watch logs/bash processes Droid runs:

<https://github.com/user-attachments/assets/shortform/07-tmux-video.mp4>

```bash
tmux new -s dev
# Droid runs commands here, you can detach and reattach
tmux attach -t dev
```

### mgrep > grep

`mgrep` is a significant improvement from ripgrep/grep. Install via plugin marketplace, then use the `/mgrep` skill. Works with both local search and web search.

```bash
mgrep "function handleSubmit"  # Local search
mgrep --web "Next.js 15 app router changes"  # Web search
```

### Other Useful Commands

- `/rewind` - Go back to a previous state
- `/statusline` - Customize with branch, context %, todos
- `/checkpoints` - File-level undo points
- `/compact` - Manually trigger context compaction

### GitHub Actions CI/CD

Set up code review on your PRs with GitHub Actions. Droid can review PRs automatically when configured.

![Droid bot approving a PR](./assets/images/shortform/08-github-pr-review.jpeg)
*Droid approving a bug fix PR*

### Sandboxing

Use sandbox mode for risky operations - Droid runs in restricted environment without affecting your actual system.

---

## On Editors

Your editor choice significantly impacts Factory Droid workflow. While Factory Droid works from any terminal, pairing it with a capable editor unlocks real-time file tracking, quick navigation, and integrated command execution.

### Zed (My Preference)

I use [Zed](https://zed.dev) - written in Rust, so it's genuinely fast. Opens instantly, handles massive codebases without breaking a sweat, and barely touches system resources.

**Why Zed + Factory Droid is a great combo:**

- **Speed** - Rust-based performance means no lag when Droid is rapidly editing files. Your editor keeps up
- **Agent Panel Integration** - Zed's Droid integration lets you track file changes in real-time as Droid edits. Jump between files Droid references without leaving the editor
- **CMD+Shift+R Command Palette** - Quick access to all your custom slash commands, debuggers, build scripts in a searchable UI
- **Minimal Resource Usage** - Won't compete with Droid for RAM/CPU during heavy operations. Important when running Opus
- **Vim Mode** - Full vim keybindings if that's your thing

![Zed Editor with custom commands](./assets/images/shortform/09-zed-editor.jpeg)
*Zed Editor with custom commands dropdown using CMD+Shift+R. Following mode shown as the bullseye in the bottom right.*

**Editor-Agnostic Tips:**

1. **Split your screen** - Terminal with Factory Droid on one side, editor on the other
2. **Ctrl + G** - quickly open the file Droid is currently working on in Zed
3. **Auto-save** - Enable autosave so Droid's file reads are always current
4. **Git integration** - Use editor's git features to review Droid's changes before committing
5. **File watchers** - Most editors auto-reload changed files, verify this is enabled

### VSCode / Cursor

This is also a viable choice and works well with Factory Droid. You can use it in either terminal format, with automatic sync with your editor using `\ide` enabling LSP functionality (somewhat redundant with plugins now). Or you can opt for the extension which is more integrated with the Editor and has a matching UI.

![VS Code Factory Droid Extension](./assets/images/shortform/10-vscode-extension.jpeg)
*The VS Code extension provides a native graphical interface for Factory Droid, integrated directly into your IDE.*

---

## My Setup

### Plugins

**Installed:** (I usually only have 4-5 of these enabled at a time)

```markdown
ralph-wiggum       # Loop automation
frontend-design    # UI/UX patterns
commit-commands    # Git workflow
security-guidance  # Security checks
pr-review-toolkit  # PR automation
typescript-lsp # TS intelligence
hookify        # Hook creation
code-simplifier
feature-dev
explanatory-output-style
code-review
context7       # Live documentation
pyright-lsp    # Python types
mgrep@Mixedbread-Grep                  # Better search
```

### MCP Servers

**Configured (User Level):**

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

This is the key - I have 14 MCPs configured but only ~5-6 enabled per project. Keeps context window healthy.

### Key Hooks

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

### Custom Status Line

Shows user, directory, git branch with dirty indicator, context remaining %, model, time, and todo count:

![Custom status line](./assets/images/shortform/11-statusline.jpeg)
*Example statusline in my Mac root directory*

```
affoon:~ ctx:65% Opus 4.5 19:52
▌▌ plan mode on (shift+tab to cycle)
```

### Rules Structure

```
~/.factory/rules/
  security.md      # Mandatory security checks
  coding-style.md  # Immutability, file size limits
  testing.md       # TDD, 80% coverage
  git-workflow.md  # Conventional commits
  agents.md        # Subagent delegation rules
  patterns.md      # API response formats
  performance.md   # Model selection (Haiku vs Sonnet vs Opus)
  hooks.md         # Hook documentation
```

### Subagents

```
~/.factory/droids/
  planner.md           # Break down features
  architect.md         # System design
  tdd-guide.md         # Write tests first
  code-reviewer.md     # Quality review
  security-reviewer.md # Vulnerability scan
  build-error-resolver.md
  e2e-runner.md        # Playwright tests
  refactor-cleaner.md  # Dead code removal
  doc-updater.md       # Keep docs synced
```

---

## Key Takeaways

1. **Don't overcomplicate** - treat configuration like fine-tuning, not architecture
2. **Context window is precious** - disable unused MCPs and plugins
3. **Parallel execution** - fork conversations, use git worktrees
4. **Automate the repetitive** - hooks for formatting, linting, reminders
5. **Scope your subagents** - limited tools = focused execution

---

## References

- [Plugins](https://docs.factory.ai/cli/configuration/plugins.md)
- [Hooks](https://docs.factory.ai/cli/configuration/hooks-guide.md)
- [Settings](https://docs.factory.ai/cli/configuration/settings.md)
- [AGENTS.md](https://docs.factory.ai/cli/configuration/agents-md.md)
- [Custom Droids](https://docs.factory.ai/cli/configuration/custom-droids.md)
- [Model Context Protocol](https://docs.factory.ai/cli/configuration/mcp.md)
- [Quickstart](https://docs.factory.ai/cli/getting-started/quickstart.md)

---

**Note:** This is a subset of detail. See the [Longform Guide](./the-longform-guide.md) for advanced patterns.

---

*Built from practical Factory Droid usage patterns refined across real product work*
