# Working Context

Last updated: 2026-04-07

## Purpose
This file tracks only the active execution context for the public Everything
Factory Droid repository. Keep it focused on what is currently true and what the
next maintainer needs to know now.

## Current Truth
- EFD is maintained as a standalone Factory Droid project.
- Canonical source content lives in `agents/`, `skills/`, `commands/`, `hooks/`,
  and `rules/`.
- Packaged mirrors live under `.factory/` and should stay aligned with source.
- Current catalog baseline: 47 droids, 171 skills, 79 commands.
- Current validation baseline: `npm run lint` passes and `npm test` passes
  (`1867/1867`).

## Current Priorities
- Keep source files and `.factory/` mirrors synchronized.
- Keep docs and install surfaces written from a Factory Droid-first viewpoint.
- Preserve a green validation baseline while simplifying stale or historical docs.
- Continue improving selective-install docs around the real Factory Droid target.

## Current Constraints
- Do not reintroduce cross-harness positioning as project identity.
- Do not add duplicate workflow abstractions when an existing EFD surface is
  already canonical.
- Prefer editing source files first, then sync mirrored `.factory/` copies.
- Treat external model or tool references as optional ecosystem context, not as
  first-class project targets.

## Active Focus Areas
- Documentation consistency and translation drift cleanup.
- Installer and selective-install simplification.
- Skills-first maintenance of repo guidance.
- Validation, security posture, and low-noise packaged output.

## Latest Execution Notes
- 2026-04-07: Markdown cleanup continued to remove remaining stale runtime-role
  wording and restore a consistent Factory Droid point of view.
- 2026-04-07: `SOUL.md`, `WORKING-CONTEXT.md`, and selective-install design docs
  were narrowed to a standalone EFD identity.
- 2026-04-07: Source and `.factory/` mirrors remain the canonical packaging rule:
  change source first, then sync packaged mirrors.
- 2026-04-07: Validation is green after the latest documentation cleanup:
  `npm run lint`, `npm test`.

## Update Rule
Keep this file short. Remove stale historical notes once they stop changing what
maintainers should do next.
