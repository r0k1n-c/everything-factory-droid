# EFD Selective Install Design

## Purpose

This document defines the user-facing selective-install design for Everything
Factory Droid as a single-target Factory Droid project.

It complements `docs/SELECTIVE-INSTALL-ARCHITECTURE.md`, which describes the
internal planning and execution layers.

## Product Stance

Selective install is not a multi-harness routing problem anymore. The question
is simply how to let a Factory Droid user install the right amount of EFD:

- a small baseline when they just want the core workflow
- extra language and framework guidance when they need it
- optional capability packs when they want deeper help

## Goals

1. Make EFD feel composable instead of all-or-nothing.
2. Keep install behavior inspectable, repairable, and uninstallable.
3. Preserve the current skills-first repo structure.
4. Support project installs cleanly through `.factory/`.
5. Preserve compatibility with current `efd` and `efd-install` entrypoints while
   simplifying the mental model.

## Non-Goals

- Reintroducing per-harness target selection.
- Splitting EFD into many npm packages in the first phase.
- Building a remote marketplace or control-plane UI in the same step.
- Solving every catalog-classification edge case before shipping a simpler
  install UX.

## User Experience Principles

### 1. Start Small

A user should be able to install a useful baseline quickly:

```bash
efd install --profile core
```

### 2. Build Up by Intent

Users should think in terms of what they want help with:

- developer baseline
- TypeScript or Python guidance
- framework-specific packs
- security, research, orchestration, or media capabilities

They should not need to know raw repo paths.

### 3. Preview Before Mutation

Every install path should support planning before writes:

```bash
efd plan --profile developer --with lang:typescript --with framework:nextjs
```

The plan should show:

- selected components
- skipped components
- destination root
- managed paths
- install-state location

### 4. Project Configuration Should Be First-Class

Teams should be able to commit an install config and get reproducible setup:

```bash
efd install --config efd-install.json
```

## Component Model

The user-facing model should stay simple even if the internal manifests are more
fine-grained.

### Baseline

Default building blocks:

- core rules
- baseline droids
- core command shims
- runtime hooks
- platform config
- workflow-quality primitives

### Language Packs

Examples:

- `lang:typescript`
- `lang:python`
- `lang:go`
- `lang:java`
- `lang:rust`

Language packs group rules, guidance, and workflow helpers for one ecosystem.

### Framework Packs

Examples:

- `framework:react`
- `framework:nextjs`
- `framework:django`
- `framework:springboot`
- `framework:laravel`

Framework packs sit on top of language packs and bring in framework-specific
rules, skills, and setup guidance.

### Capability Packs

Examples:

- `capability:security`
- `capability:research`
- `capability:orchestration`
- `capability:media`
- `capability:content`

These are cross-cutting EFD bundles that can be added to any baseline.

## Profiles

Profiles remain the quickest on-ramp:

- `core` — minimal safe baseline
- `developer` — best default for active engineering work
- `security` — baseline plus security-heavy guidance
- `research` — baseline plus research/investigation surfaces
- `full` — everything currently classified and supported

Profiles should remain composable with `--with` and `--without` flags.

## Proposed CLI Shape

### Primary Commands

```bash
efd install
efd plan
efd list-installed
efd doctor
efd repair
efd uninstall
efd catalog
```

### Install Command

```bash
efd install [--profile <name>] [--with <component>]... [--without <component>]... [--config <path>] [--dry-run] [--json]
```

Examples:

```bash
efd install --profile core
efd install --profile developer --with lang:typescript --with framework:nextjs
efd install --profile developer --without capability:media
efd install --config efd-install.json
```

### Plan Command

```bash
efd plan [same selection flags as install]
```

Purpose:

- preview the result without mutation
- act as the main debugging surface for selective install

## Project Install Shape

The primary managed destination is the project's `.factory/` directory.

Expected outcomes:

- commands, skills, and droids land under `.factory/`
- project settings land in `.factory/settings.json`
- durable install-state is recorded so repair and uninstall can act safely

## Managed State Expectations

Selective install should always be able to answer:

- what the user asked for
- what EFD resolved
- what files were copied or generated
- what EFD owns and may repair or remove later

That makes `doctor`, `repair`, and `uninstall` dependable instead of heuristic.

## Rollout Guidance

The near-term rollout can stay aligned with the current repo:

1. keep manifests as the source of component truth
2. keep the CLI surface thin
3. keep `.factory/` as the only project target
4. keep legacy compatibility as a request adapter, not a second architecture
5. keep source content canonical and packaged mirrors synchronized

## Summary

Selective install should help a Factory Droid user get exactly the EFD surface
that matches their work, without reintroducing old multi-target complexity.
