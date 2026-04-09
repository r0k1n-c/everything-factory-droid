# Project Assessment & Setup Recommendations

**Date:** 2026-04-07

---

## Snapshot

| Attribute | Value |
|-----------|-------|
| Project focus | Factory Droid only |
| Agents | 47 |
| Skills | 171 |
| Commands | 74 |
| Rule files | 89 |
| Hook events | 6 |
| Hook matchers | 16 |
| Schemas | 10 |
| Tests | 102 test files |
| Install profiles | core, developer, security, research, full |

This repository is a full Factory Droid workflow surface rather than a thin config pack. It includes curated agents, skills, commands, hooks, rules, installers, and validation tooling for day-to-day engineering work.

---

## Strengths

- Strong workflow coverage across planning, TDD, review, security, orchestration, and research.
- Selective install pipeline for smaller or role-specific setups.
- Cross-platform runtime support with `install.sh`, `install.ps1`, and npm entrypoints.
- Project-local hooks for safety, quality gates, MCP health, and Hookify enforcement.
- Large validation surface with linting, catalog checks, manifest validation, and automated tests.

---

## Recommended Adoption Paths

### Core

Use `efd install --profile core` when you want the lowest-friction baseline: core agents, commands, hook runtime, platform configs, and workflow-quality support.

### Developer

Use `efd install --profile developer` for most application work. It adds framework/language skills, database patterns, and orchestration support on top of core.

### Full

Use `efd install --profile full` when you want the complete catalog and are comfortable trimming from a broad starting point.

---

## Priority Components

### Agents

- `planner`
- `code-reviewer`
- `tdd-guide`
- `security-reviewer`
- `architect`

### Commands

- `/plan`
- `/tdd`
- `/code-review`
- `/verify`
- `/build-fix`

### Hooks

- Hookify project-local rule enforcement
- MCP health checks
- Config protection
- Post-edit quality gates
- Stop-time validation and session persistence

---

## Recommendation

If you want a lean setup, start with `core`. If you want the full operating surface and will actively use curated workflows, start with `developer` or `full` and remove what you do not need.
