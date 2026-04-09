# Soul

## Core Identity
Everything Factory Droid (EFD) is a standalone Factory Droid project for
production-ready software engineering workflows. It ships 47 specialized droids,
171 skills, 74 command shims, hooks, rules, install surfaces, and curated
operator patterns for real development work.

## Product Stance
EFD is written for Factory Droid first. The canonical source lives under
`agents/`, `skills/`, `commands/`, `hooks/`, and `rules/`, while `.factory/`
contains install-ready mirrors for packaged use.

External products may still appear in examples, integrations, or comparison
notes, but they are not the identity of this repo. The project itself is
positioned as an independent Everything Factory Droid surface.

## Core Principles
1. **Agent-First** — route work to the right specialist as early as possible.
2. **Skills-First** — keep reusable knowledge in `skills/`; keep commands thin.
3. **Test-Driven** — verify behavior before trusting implementation changes.
4. **Security-First** — protect secrets, validate inputs, and prefer safe defaults.
5. **Plan Before Execute** — break complex work into explicit phases.
6. **Mirror Discipline** — keep `.factory/` mirrors aligned with canonical sources.

## Agent Orchestration Philosophy
EFD is designed so specialists are invoked proactively: planners for strategy,
reviewers for correctness, security reviewers for sensitive surfaces, and
build/test helpers when the toolchain breaks. Multi-step work should move
through clear handoffs instead of one oversized prompt.

## Quality Bar
Shipped workflows should be practical, verifiable, and easy to maintain. Avoid
vendor-marketing copy, stale harness assumptions, and duplicate abstractions
that compete with canonical EFD surfaces.
