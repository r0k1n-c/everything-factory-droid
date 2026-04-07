# Contributing to Everything Factory Droid

Thanks for wanting to contribute! This repo is a community resource for Factory Droid users.

## Table of Contents

- [What We're Looking For](#what-were-looking-for)
- [Quick Start](#quick-start)
- [Contributing Skills](#contributing-skills)
- [Contributing Agents](#contributing-agents)
- [Contributing Hooks](#contributing-hooks)
- [Contributing Commands](#contributing-commands)
- [MCP and documentation (e.g. Context7)](#mcp-and-documentation-eg-context7)
- [Mirrors and Translations](#mirrors-and-translations)
- [Pull Request Process](#pull-request-process)

---

## What We're Looking For

### Agents
New agents that handle specific tasks well:
- Language-specific reviewers (Python, Go, Rust)
- Framework experts (Django, Rails, Laravel, Spring)
- DevOps specialists (Kubernetes, Terraform, CI/CD)
- Domain experts (ML pipelines, data engineering, mobile)

### Skills
Workflow definitions and domain knowledge:
- Language best practices
- Framework patterns
- Testing strategies
- Architecture guides

### Hooks
Useful automations:
- Linting/formatting hooks
- Security checks
- Validation hooks
- Notification hooks

### Commands
Slash commands that invoke useful workflows:
- Deployment commands
- Testing commands
- Code generation commands

---

## Quick Start

```bash
# 1. Fork and clone
gh repo fork r0k1n-c/everything-factory-droid --clone
cd everything-factory-droid

# 2. Create a branch
git checkout -b feat/my-contribution

# 3. Add your contribution (see sections below)

# 4. Test locally
cp -r skills/my-skill ~/.factory/skills/  # for skills
# Then test with Factory Droid

# 5. Submit PR
git add . && git commit -m "feat: add my-skill" && git push -u origin feat/my-contribution
```

---

## Contributing Skills

Skills are knowledge modules that Factory Droid loads based on context.

> **Comprehensive Guide:** For detailed guidance on creating effective skills, see [Skill Development Guide](docs/SKILL-DEVELOPMENT-GUIDE.md). It covers:
> - Skill architecture and categories
> - Writing effective content with examples
> - Best practices and common patterns
> - Testing and validation
> - Complete examples gallery

### Directory Structure

```
skills/
└── your-skill-name/
    └── SKILL.md
```

### SKILL.md Template

```markdown
---
name: your-skill-name
description: Brief description shown in skill list and used for auto-activation
origin: EFD
---

# Your Skill Title

Brief overview of what this skill covers.

## When to Activate

Describe scenarios where Droid should use this skill. This is critical for auto-activation.

## Core Concepts

Explain key patterns and guidelines.

## Code Examples

\`\`\`typescript
// Include practical, tested examples
function example() {
  // Well-commented code
}
\`\`\`

## Anti-Patterns

Show what NOT to do with examples.

## Best Practices

- Actionable guidelines
- Do's and don'ts
- Common pitfalls to avoid

## Related Skills

Link to complementary skills (e.g., `related-skill-1`, `related-skill-2`).
```

### Skill Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Language Standards** | Idioms, conventions, best practices | `python-patterns`, `golang-patterns` |
| **Framework Patterns** | Framework-specific guidance | `django-patterns`, `nextjs-patterns` |
| **Workflow** | Step-by-step processes | `tdd-workflow`, `refactoring-workflow` |
| **Domain Knowledge** | Specialized domains | `security-review`, `api-design` |
| **Tool Integration** | Tool/library usage | `docker-patterns`, `supabase-patterns` |
| **Template** | Project-specific skill templates | `project-guidelines-example` |

### Skill Checklist

- [ ] Focused on one domain/technology (not too broad)
- [ ] Includes "When to Activate" section for auto-activation
- [ ] Includes practical, copy-pasteable code examples
- [ ] Shows anti-patterns (what NOT to do)
- [ ] Under 500 lines (800 max)
- [ ] Uses clear section headers
- [ ] Tested with Factory Droid
- [ ] Links to related skills
- [ ] No sensitive data (API keys, tokens, paths)

### Example Skills

| Skill | Category | Purpose |
|-------|----------|---------|
| `coding-standards/` | Language Standards | TypeScript/JavaScript patterns |
| `frontend-patterns/` | Framework Patterns | React and Next.js best practices |
| `backend-patterns/` | Framework Patterns | API and database patterns |
| `security-review/` | Domain Knowledge | Security checklist |
| `tdd-workflow/` | Workflow | Test-driven development process |
| `project-guidelines-example/` | Template | Project-specific skill template |

---

## Contributing Agents

Agents are specialized assistants invoked via the Task tool.

### File Location

```
agents/your-agent-name.md
```

### Agent Template

```markdown
---
name: your-agent-name
description: What this agent does and when Droid should invoke it. Be specific!
tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
model: claude-sonnet-4-6
---

You are a [role] specialist.

## Your Role

- Primary responsibility
- Secondary responsibility
- What you DO NOT do (boundaries)

## Workflow

### Step 1: Understand
How you approach the task.

### Step 2: Execute
How you perform the work.

### Step 3: Verify
How you validate results.

## Output Format

What you return to the user.

## Examples

### Example: [Scenario]
Input: [what user provides]
Action: [what you do]
Output: [what you return]
```

### Agent Fields

| Field | Description | Options |
|-------|-------------|---------|
| `name` | Lowercase, hyphenated | `code-reviewer` |
| `description` | Used to decide when to invoke | Be specific! |
| `tools` | Only what's needed | `Read, Write, Edit, Bash, Grep, Glob, WebFetch, Task`, or MCP tool names (e.g. `mcp__context7__resolve-library-id`, `mcp__context7__query-docs`) when the agent uses MCP |
| `model` | Complexity level | `haiku` (simple), `sonnet` (coding), `opus` (complex) |

### Example Agents

| Agent | Purpose |
|-------|---------|
| `tdd-guide.md` | Test-driven development |
| `code-reviewer.md` | Code review |
| `security-reviewer.md` | Security scanning |
| `build-error-resolver.md` | Fix build errors |

---

## Contributing Hooks

Hooks are automatic behaviors triggered by Factory Droid events.

### File Location

```
hooks/hooks.json
```

### Hook Types

| Type | Trigger | Use Case |
|------|---------|----------|
| `PreToolUse` | Before tool runs | Validate, warn, block |
| `PostToolUse` | After tool runs | Format, check, notify |
| `SessionStart` | Session begins | Load context |
| `Stop` | Session ends | Cleanup, audit |

### Hook Format

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "tool == \"Bash\" && tool_input.command matches \"rm -rf /\"",
        "hooks": [
          {
            "type": "command",
            "command": "echo '[Hook] BLOCKED: Dangerous command' && exit 1"
          }
        ],
        "description": "Block dangerous rm commands"
      }
    ]
  }
}
```

### Matcher Syntax

```javascript
// Match specific tools
tool == "Bash"
tool == "Edit"
tool == "Write"

// Match input patterns
tool_input.command matches "npm install"
tool_input.file_path matches "\\.tsx?$"

// Combine conditions
tool == "Bash" && tool_input.command matches "git push"
```

### Hook Examples

```json
// Block dev servers outside tmux
{
  "matcher": "tool == \"Bash\" && tool_input.command matches \"npm run dev\"",
  "hooks": [{"type": "command", "command": "echo 'Use tmux for dev servers' && exit 1"}],
  "description": "Ensure dev servers run in tmux"
}

// Auto-format after editing TypeScript
{
  "matcher": "tool == \"Edit\" && tool_input.file_path matches \"\\.tsx?$\"",
  "hooks": [{"type": "command", "command": "npx prettier --write \"$file_path\""}],
  "description": "Format TypeScript files after edit"
}

// Warn before git push
{
  "matcher": "tool == \"Bash\" && tool_input.command matches \"git push\"",
  "hooks": [{"type": "command", "command": "echo '[Hook] Review changes before pushing'"}],
  "description": "Reminder to review before push"
}
```

### Hook Checklist

- [ ] Matcher is specific (not overly broad)
- [ ] Includes clear error/info messages
- [ ] Uses correct exit codes (`exit 1` blocks, `exit 0` allows)
- [ ] Tested thoroughly
- [ ] Has description

---

## Contributing Commands

Commands are user-invoked actions with `/command-name`.

### File Location

```
commands/your-command.md
```

### Command Template

```markdown
---
description: Brief description shown in /help
---

# Command Name

## Purpose

What this command does.

## Usage

\`\`\`
/your-command [args]
\`\`\`

## Workflow

1. First step
2. Second step
3. Final step

## Output

What the user receives.
```

### Example Commands

| Command | Purpose |
|---------|---------|
| `commit.md` | Create git commits |
| `code-review.md` | Review code changes |
| `tdd.md` | TDD workflow |
| `e2e.md` | E2E testing |

---

## MCP and documentation (e.g. Context7)

Skills and agents can use **MCP (Model Context Protocol)** tools to pull in up-to-date data instead of relying only on training data. This is especially useful for documentation.

- **Context7** is an MCP server that exposes `resolve-library-id` and `query-docs`. Use it when the user asks about libraries, frameworks, or APIs so answers reflect current docs and code examples.
- When contributing **skills** that depend on live docs (e.g. setup, API usage), describe how to use the relevant MCP tools (e.g. resolve the library ID, then query docs) and point to the `documentation-lookup` skill or Context7 as the pattern.
- When contributing **agents** that answer docs/API questions, include the Context7 MCP tool names (e.g. `mcp__context7__resolve-library-id`, `mcp__context7__query-docs`) in the agent's tools and document the resolve → query workflow.
- **mcp-configs/mcp-servers.json** includes a Context7 entry; users enable it in their harness (e.g. Factory Droid) to use the documentation-lookup skill (in `skills/documentation-lookup/`) and the `/docs` command.

---

## Mirrors and Translations

### Factory Droid mirrors

This repo ships curated source content under `skills/`, `commands/`, and `agents/`, plus Factory Droid-ready mirrors under `.factory/`.

When you add or update a shipped skill or command:

1. Edit the source file first under `skills/` or `commands/`.
2. Keep the corresponding `.factory/skills/` or `.factory/commands/` mirror in sync.
3. Mention mirror updates in your PR if the change affects installation or packaged behavior.

This contributor flow is centered on Factory Droid. Do not add new Codex/Cursor-only paths unless the repo explicitly reintroduces them.

### Translations

Translations live under `docs/` (e.g. `docs/zh-CN`, `docs/zh-TW`, `docs/ja-JP`). If you change agents, commands, or skills that are translated, consider updating the corresponding translation files or opening an issue so maintainers or translators can update them.

---

## Pull Request Process

### 1. PR Title Format

```
feat(skills): add rust-patterns skill
feat(agents): add api-designer agent
feat(hooks): add auto-format hook
fix(skills): update React patterns
docs: improve contributing guide
```

### 2. PR Description

```markdown
## Summary
What you're adding and why.

## Type
- [ ] Skill
- [ ] Agent
- [ ] Hook
- [ ] Command

## Testing
How you tested this.

## Checklist
- [ ] Follows format guidelines
- [ ] Tested with Factory Droid
- [ ] No sensitive info (API keys, paths)
- [ ] Clear descriptions
```

### 3. Review Process

1. Maintainers review within 48 hours
2. Address feedback if requested
3. Once approved, merged to main

---

## Guidelines

### Do
- Keep contributions focused and modular
- Include clear descriptions
- Test before submitting
- Follow existing patterns
- Document dependencies

### Don't
- Include sensitive data (API keys, tokens, paths)
- Add overly complex or niche configs
- Submit untested contributions
- Create duplicates of existing functionality

---

## File Naming

- Use lowercase with hyphens: `python-reviewer.md`
- Be descriptive: `tdd-workflow.md` not `workflow.md`
- Match name to filename

---

## Questions?

- **Issues:** [github.com/r0k1n-c/everything-factory-droid/issues](https://github.com/r0k1n-c/everything-factory-droid/issues)
- **X/Twitter:** [@affaanmustafa](https://x.com/affaanmustafa)

---

Thanks for contributing! Let's build a great resource together.
