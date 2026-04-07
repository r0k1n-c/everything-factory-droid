# Repo Evaluation vs Minimal Factory Droid Setup

**Date:** 2026-04-07  
**Workspace Git State:** no `.git` directory detected in this snapshot

---

## Reference Baseline (`~/.factory/`)

This evaluation assumes a near-minimal Factory Droid install:

| Component | Baseline |
|-----------|----------|
| Agents | 0 |
| Skills | 0 installed |
| Commands | 0 |
| Hooks | 1 Stop hook |
| Rules | 0 |
| MCP configs | 0 |

That baseline is intentionally lightweight, but it leaves almost all workflow automation, review guidance, and install-time structure to manual setup.

---

## Project Snapshot (`everything-factory-droid`)

Current repo inventory:

| Component | Repo |
|-----------|------|
| Agents | 47 |
| Skills | 171 |
| Commands | 79 |
| Rule files | 89 |
| Hook events | 6 (`UserPromptSubmit`, `PreToolUse`, `SessionStart`, `PostToolUse`, `Stop`, `SessionEnd`) |
| Hook matchers | 16 |
| MCP configs | 1 catalog |
| Schemas | 10 JSON schemas |
| JS runtime / tooling files | 112 under `scripts/` |
| Tests | 102 test files |
| Install profiles | `core`, `developer`, `security`, `research`, `full` |
| Supported target | Factory Droid only |
| Install entrypoints | `install.sh`, `install.ps1`, `npx efd`, `npx efd-install` |

---

## What Changed Since the Previous Evaluation

Compared with the earlier snapshot of this repo:

- Agents increased from **28 -> 47**
- Skills increased from **116 -> 171**
- Commands increased from **59 -> 79**
- The project is now explicitly **Factory Droid-only**
- Hookify is now wired into the real hook runtime instead of being documentation-only
- The Windows installer (`install.ps1`) is included in the published package
- `product-capability` now ships with its template asset through manifests and package files

---

## Gap Analysis

### Hooks
- **Baseline:** 1 Stop hook
- **Repo:** 16 hook matchers across 6 lifecycle events, including:
  - user-defined Hookify rules from project-local `.factory/hookify.*.local.md`
  - dangerous command checks and pre-commit quality reminders
  - MCP health checks
  - config-file protection
  - post-edit quality gates and design checks
  - console-log detection
  - session persistence and lifecycle markers

### Agents (47 missing)
The repo now includes specialized agents for:
- language review and build-fix workflows
- planning, architecture, TDD, code review, and security review
- exploration, simplification, type design, SEO, and silent-failure analysis

### Skills (171 missing)
The skill surface now spans:
- language/framework patterns
- TDD, verification, evaluation, and regression testing
- agentic engineering and orchestration
- security and compliance
- business/research/content workflows
- new upstream-migrated skills such as `agent-sort`, `code-tour`, `council`, `dashboard-builder`, `github-ops`, `research-ops`, `seo`, and `terminal-ops`

### Commands (79 missing)
The command layer covers:
- core dev workflows (`/tdd`, `/plan`, `/code-review`, `/verify`)
- orchestration (`/orchestrate`, `/multi-plan`, `/multi-execute`)
- session management (`/sessions`, `/save-session`, `/resume-session`)
- continuous improvement and analysis
- newly migrated compatibility commands such as `/feature-dev`, `/hookify`, and `/review-pr`

### Rules (89 missing)
The repo ships broad language and cross-cutting rule coverage for:
- TypeScript / JavaScript
- Python / Django
- Go
- Java / Spring
- Kotlin
- Rust
- C++ / C#
- Swift
- Perl / PHP
- shared/common guidance

---

## Installation Recommendations

### Lowest-friction upgrade
Run:

```bash
efd install --profile core
```

This gives a practical baseline: agents, commands, hook runtime, platform config, and workflow-quality skills.

### Full project surface
Run:

```bash
efd install --profile full
```

This resolves the repo's full classified install surface, including all **47 agents**, **171 skills**, and **79 command shims**, plus the shipped template/support assets referenced by those skills.

### Hook adoption
If you want the biggest day-to-day improvement, adopt the repo hook system first:
- pre-tool safety and health checks
- post-edit quality feedback
- stop-time formatting / typecheck / session persistence
- Hookify project-local enforcement rules

### Rules adoption
If you want minimal runtime overhead but better output quality, add the relevant language rule packs next.

---

## Strategic Read

The baseline setup is clean and low-noise, but it is mostly manual. This repo is now a standalone Factory Droid plugin with a much deeper install surface, stronger hook coverage, and a significantly larger curated agent/skill catalog than the earlier evaluation reflected.

If the goal is a lean but capable setup, start with `core`. If the goal is maximum project assistance with selective module control, use `full` and trim from there.
