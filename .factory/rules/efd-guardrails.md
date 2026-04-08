---
description: Repository guardrails for editing everything-factory-droid
alwaysApply: true
---

- Treat `agents/`, `skills/`, `commands/`, and `rules/` as the reusable source of truth.
- Keep repo-local `.factory/` content limited to project config and guardrails.
- Run `npm run lint` and `npm test` after behavior changes.
- Never add secrets, personal paths, or non-Factory Droid terminology.
