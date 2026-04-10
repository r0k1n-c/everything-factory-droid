# Repository Guidelines

This repository is a production-ready Factory Droid plugin providing 47 specialized agents, 177 skills, 75 commands, and supporting hooks, rules, and MCP configurations.

## Project Structure & Module Organization

This repo packages reusable Factory Droid workflows. Core directories:

agents/ — 47 specialized subagents
skills/ — 177 workflow skills and domain knowledge
commands/ — 75 slash commands

Runtime and validation logic lives in `scripts/`; automated tests live in `tests/`; examples and reference assets live in `examples/` and `assets/`. Prefer adding new workflows to `skills/` first and only touch `commands/` when a compatibility shim is still needed.

## Build, Test, and Development Commands

- `npm test` — runs repo validators, catalog checks, and the full Node test suite.
- `npm run lint` — runs `eslint .` and `markdownlint '**/*.md'`.
- `npm run coverage` — enforces 80% line/function/branch/statement coverage for `scripts/**/*.js`.
- `node tests/run-all.js` — useful for quick local iteration on JS changes.

Use Node.js 18+; the repo is pinned to Yarn 4, but the published scripts are npm-compatible.

## Coding Style & Naming Conventions

JavaScript formatting follows `.prettierrc`: 2-space indentation, single quotes, semicolons, no trailing commas, and `printWidth` 200. Keep files focused, favor immutable updates, and handle errors explicitly. Use lowercase, hyphenated filenames such as `python-reviewer.md` or `tdd-workflow.md`.

Agents and commands are Markdown files with YAML frontmatter. Keep `name` lowercase and hyphenated, make `description` specific, and list only the tools actually required.

## Testing Guidelines

Add or update tests whenever behavior changes. Mirror the area you touched, for example `tests/hooks/*.test.js`, `tests/lib/*.test.js`, or `tests/scripts/*.test.js`. Run targeted tests while iterating, then finish with `npm test`; if runtime code changes, also run `npm run coverage`.

## Commit & Pull Request Guidelines

Commit messages must satisfy commitlint: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, or `revert`, with lowercase subjects under 100 characters. Example: `feat(skills): add rust-patterns skill`.

PRs should include a short summary, change type, testing notes, and confirmation that no secrets or personal paths were introduced. Keep contributions modular, tested, and free of duplicate workflows.

## Security & Contribution Notes

Never commit API keys, tokens, local machine paths, or other sensitive data. Validate generated config where possible, and preserve the repo’s skills-first architecture when adding new capabilities.
