# Changelog

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
- Current catalog: 47 agents, 172 skills, 75 commands, 89 rule files, and 16 hook matchers.
- Includes selective install profiles, cross-platform installers, session tooling, and project-local hook workflows.
