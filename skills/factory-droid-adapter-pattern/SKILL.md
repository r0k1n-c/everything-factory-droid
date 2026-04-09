---
name: factory-droid-adapter-pattern
description: Guide for porting ECC (everything-claude-code) components to Factory Droid. Covers env var fallback patterns, MCP config, skill frontmatter, plugin manifest, and branding migration.
origin: EFD
disable-model-invocation: true
---

# Factory Droid Adapter Pattern

A systematic guide for converting everything-claude-code (ECC) components into Factory Droid (EFD) native implementations. Derived from the actual ECC→EFD migration performed on this repository.

## When to Use

- Porting a skill, agent, hook, or command originally written for Claude Code / ECC
- Adding a new component and unsure which conventions apply
- Auditing the codebase for ECC remnants after a fork/port
- Reviewing a PR that touches shell scripts, Python scripts, or MCP config

## Porting Checklist

Run these checks in sequence whenever porting or auditing ECC components.

### 1. Environment Variables

ECC used `CLAUDE_*` env vars. EFD uses `FACTORY_*` as primary with `CLAUDE_*` as legacy fallback.

**Shell scripts** — use parameter expansion fallback:

```bash
# BEFORE (ECC)
project_dir="${CLAUDE_PROJECT_DIR}"

# AFTER (EFD)
project_dir="${FACTORY_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-}}"
```

**Bash case statements** — chain entrypoint fallback:

```bash
# BEFORE (ECC)
case "${CLAUDE_CODE_ENTRYPOINT:-cli}" in

# AFTER (EFD)
case "${FACTORY_ENTRYPOINT:-${CLAUDE_CODE_ENTRYPOINT:-cli}}" in
```

**Shell export** — export both names so downstream scripts work regardless:

```bash
export FACTORY_PROJECT_DIR="${_GIT_ROOT:-$STDIN_CWD}"
export CLAUDE_PROJECT_DIR="${_GIT_ROOT:-$STDIN_CWD}"   # legacy compat
```

**Python scripts** — use `or` chaining:

```python
# BEFORE (ECC)
env_dir = os.environ.get("CLAUDE_PROJECT_DIR")

# AFTER (EFD)
env_dir = os.environ.get("FACTORY_PROJECT_DIR") or os.environ.get("CLAUDE_PROJECT_DIR")
```

**Complete env var mapping**:

| ECC variable | EFD primary | Notes |
|---|---|---|
| `CLAUDE_PROJECT_DIR` | `FACTORY_PROJECT_DIR` | Project root path |
| `CLAUDE_CODE_ENTRYPOINT` | `FACTORY_ENTRYPOINT` | cli / sdk-ts |
| `CLAUDE_FILE_PATHS` | `FACTORY_FILE_PATHS` | Hook file path list |
| `CLAUDE_CODE_PACKAGE_MANAGER` | `FACTORY_PACKAGE_MANAGER` | npm / yarn / pnpm |
| `CLAUDE_TRANSCRIPT_PATH` | `FACTORY_TRANSCRIPT_PATH` | Session transcript |

### 2. MCP Configuration (`.mcp.json`)

**Playwright MCP** — ECC used the `--extension` flag for Claude Code's browser extension. Remove it for EFD:

```json
// BEFORE (ECC)
"playwright": {
  "command": "npx",
  "args": ["-y", "@playwright/mcp@0.0.69", "--extension"]
}

// AFTER (EFD)
"playwright": {
  "command": "npx",
  "args": ["-y", "@playwright/mcp@0.0.69"]
}
```

**`disabledMcpServers`** in `.factory/settings.json` — ECC may have leftover disabled servers that don't exist in `.mcp.json`. Clean them:

```json
// BEFORE (ECC — stale entries)
"disabledMcpServers": ["supabase", "railway", "vercel"]

// AFTER (EFD)
"disabledMcpServers": []
```

### 3. Skill Frontmatter

Every `SKILL.md` must have at minimum `name` and `description`. EFD adds two optional fields:

```yaml
---
name: my-skill                          # lowercase, hyphenated
description: One sentence under 200 chars.  # avoid Claude/ECC references
origin: EFD                             # add for new/ported skills
disable-model-invocation: true          # add for user-only / domain skills
---
```

**`disable-model-invocation: true`** should be added to skills that are:
- Domain-specific knowledge (industry, compliance, finance)
- Agent meta-tools (eval harnesses, loop patterns)
- Content and marketing workflows
- Media/video generation
- External research ops
- Build verification workflows
- Planning/product management

Do NOT add it to skills that are actively pattern-matched during coding sessions (e.g., `tdd-workflow`, `python-patterns`, `security-review`).

**Description limits**: Keep under 200 characters. Verbose descriptions bloat the context window on every session start.

### 4. Plugin Manifest (`.factory-plugin/plugin.json`)

ECC plugins use `ecc` as the plugin name for `ecc:command` namespacing. Factory Droid does NOT support `pluginName:commandName` namespace syntax — all commands are flat (`/plan`, not `/efd:plan`).

```json
// BEFORE (ECC)
{
  "name": "ecc",
  ...
}

// AFTER (EFD — name is for plugin identity only, not command prefix)
{
  "name": "everything-factory-droid",
  "description": "...",
  "version": "1.0.0",
  "author": { "name": "..." },
  "repository": "...",
  "license": "MIT"
}
```

### 5. Package Manager

ECC projects are often configured for yarn. This repo uses npm.

`.factory/package-manager.json`:

```json
// AFTER (EFD)
{
  "packageManager": "npm",
  "version": "10.x"
}
```

If switching from yarn to npm, also:
- Remove `yarn.lock` or keep it only for historical reference
- Ensure `package-lock.json` is the authoritative lockfile
- Update any test assertions that check the package manager value

### 6. Branding and Identity

**`agent.yaml`** — preserve fork attribution with both fields:

```yaml
# BEFORE (ECC)
author: affaan-m

# AFTER (EFD — fork)
original-author: affaan-m
maintained-by: <your-github-username>
```

**Skill examples** — update command and tooling references:

```markdown
<!-- BEFORE -->
Use `claude-code` to run this workflow...

<!-- AFTER -->
Use `factory-droid` to run this workflow...
```

**`.env.example`** — rename env vars:

```bash
# BEFORE
CLAUDE_CODE_PACKAGE_MANAGER=npm

# AFTER
FACTORY_PACKAGE_MANAGER=npm  # Legacy alias: CLAUDE_CODE_PACKAGE_MANAGER
```

**`.gitignore`** — remove ECC-specific build artifact paths:

```
# Remove lines like:
ecc2/target/
```

### 7. Tests

After any porting change, update test assertions that reference ECC-specific values:

- `tests/plugin-manifest.test.js` — checks `packageManager` value; update from `'yarn'` → `'npm'` if you switched
- Any test that references `claude-code-settings.json` — add a comment that this is intentional external schema compatibility, not an ECC remnant

Always run `npm test` after porting changes. All 1880 tests should pass.

## Audit Command

To find remaining ECC remnants in a ported codebase, run these greps in parallel:

```bash
# Unguarded CLAUDE_* env vars (no FACTORY_* fallback)
grep -r '\$CLAUDE_' --include="*.sh" .
grep -r 'CLAUDE_CODE_ENTRYPOINT' --include="*.sh" .
grep -r 'os\.environ\.get.*CLAUDE_' --include="*.py" .

# MCP remnants
grep -r '"--extension"' .mcp.json

# Branding remnants
grep -r '"ecc"' .factory-plugin/plugin.json
grep -r 'claude-code' skills/ --include="SKILL.md"
grep 'ecc2/' .gitignore
```

Expected clean state: shell scripts use `${FACTORY_VAR:-${CLAUDE_VAR:-}}`, Python uses `get("FACTORY_VAR") or get("CLAUDE_VAR")`, no `--extension` in Playwright MCP, no bare `CLAUDE_*` vars in `.env.example`.

## Severity Classification

Use this when triaging a new port or audit finding:

| Severity | Criteria | Example |
|---|---|---|
| **MUST FIX** | Functional breakage or wrong runtime behavior | Bare `$CLAUDE_PROJECT_DIR` in a hook that runs on session start |
| **SHOULD FIX** | Branding/cosmetic inconsistency, test confusion | Skill description says "claude-code" |
| **KEEP AS-IS** | Intentional backward compat or attribution | `FACTORY_VAR:-${CLAUDE_VAR:-}` fallback patterns themselves |

## Related Skills

- `codebase-onboarding` — for understanding an unfamiliar repo before porting
- `api-connector-builder` — for matching existing integration patterns exactly
- `configure-efd` — for setting up Factory Droid in a freshly ported repo
- `workspace-surface-audit` — for auditing hooks, rules, and MCP configs post-port
