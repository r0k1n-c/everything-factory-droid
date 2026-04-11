# Changelog

## 2026-04-10 — Advanced Orchestration Pack (AO-Pack)

**Added**

- `dag-task-graph` skill — Explicit task dependency graphs with blocking semantics and persistent execution tracking (S07)
- `background-job-injection` skill — Register, track, and re-inject results from fire-and-forget background tasks (S08)
- `agent-messaging-protocol` skill — Structured inter-agent messaging with inbox/outbox and request-response correlation (S09-S10)
- `autonomous-task-claiming` skill — Controlled task queue protocol with safety limits and conflict resolution (S11)
- `git-worktree-isolation` skill — Per-task git worktree isolation for parallel agent execution (S12)

Current catalog: 47 agents, 178 skills, 75 commands.

## 2026-04-11 — Native Command Conflict Fixes & Todo Completion Hook

**Added**

- `stop:todo-check` Stop hook — detects forgotten `[in_progress]` todos and reminds agent to close them before responding
- `commands/efd-sessions.md` — renamed from `sessions.md` to avoid name clash with native `/sessions` UI

**Fixed**

- `commands/sessions.md` — now a disambiguation shim routing to native `/sessions` or `/efd-sessions`
- `skills/blueprint` — excludes `/plan`, `/orchestrate`, `/missions` triggers to prevent double planning
- `skills/mission-dispatcher` — defers to native `/missions` when available
- `commands/orchestrate.md` — spec mode ExitSpecMode called exactly once; sub-agent prompt prefix prevents re-invocation; mission worker guard added
- `commands/plan.md` + `commands/feature-dev.md` — spec mode awareness
- `scripts/hooks/stop-dispatch.js` — skips `stop:todo-check` and `stop:session-end` inside `/missions` workers (`FACTORY_MISSION_ID`)
- Bilingual (zh-CN/EN) notes added to all affected command files

Current catalog: 47 agents, 178 skills, 76 commands.

## 2026-04-10 — Mission Dispatcher & Agent Capability Registry

**Added**

- `mission-dispatcher` skill — Unified DAG-to-agent dispatch: decomposes missions into task graphs, matches tasks to agents by capability, isolates in worktrees, tracks progress, and merges results back
- Agent capability frontmatter — All 47 agents now declare `capabilities`, `domain`, and `worktree-safe` fields for automatic task matching

Current catalog: 47 agents, 178 skills, 75 commands.

## 2026-04-10

### Breaking Changes
- **Removed 5 `multi-*` commands**: `multi-plan`, `multi-execute`, `multi-backend`, `multi-frontend`, `multi-workflow` and all translations (20 files total). These depended on the external `ccg-workflow` runtime (`codeagent-wrapper` binary) and are fully replaced by native Factory Droid alternatives: `/plan`, `/orchestrate`, `/devfleet`, `/prp-plan`, `/prp-implement`.

### Changed
- **Documentation cleanup**: Removed all references to Cursor, Codex, OpenCode, and Antigravity from documentation and skill files. EFD is a Factory Droid exclusive project.
- **Archived `factory-droid-adapter-pattern` skill** to `docs/migration/` — preserved as historical ECC→EFD migration reference, no longer registered as an active skill.
- **Updated `commands/santa-loop.md`**: Replaced Codex CLI reviewer with Gemini CLI as the external reviewer.
- Cleaned ccg-workflow references from all README files, USAGE-EXAMPLES guides, COMMAND-AGENT-MAP, and EFD manual.
- Updated command count: 79 → 74, skill count: 172 → 171.

## 2026-04-07

### Initial independent release

- Repositioned Everything Factory Droid as a standalone Factory Droid project.
- Current catalog: 47 agents, 177 skills, 75 commands, 89 rule files, and 16 hook matchers.
- Includes selective install profiles, cross-platform installers, session tooling, and project-local hook workflows.
