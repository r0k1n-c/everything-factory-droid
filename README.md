**Language:** English | [Português (Brasil)](docs/pt-BR/README.md) | [简体中文](docs/zh-CN/README.md) | [繁體中文](docs/zh-TW/README.md) | [日本語](docs/ja-JP/README.md) | [한국어](docs/ko-KR/README.md) | [Türkçe](docs/tr/README.md)
> Fork Notice: This project is forked and adapted from [everything-claude-code](https://github.com/affaan-m/everything-claude-code) for Factory Droid usage.
# Everything Factory Droid

[![Stars](https://img.shields.io/github/stars/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/stargazers)
[![Forks](https://img.shields.io/github/forks/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/network/members)
[![Contributors](https://img.shields.io/github/contributors/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/graphs/contributors)
[![npm efd-universal](https://img.shields.io/npm/dw/efd-universal?label=efd-universal%20weekly%20downloads&logo=npm)](https://www.npmjs.com/package/efd-universal)
[![npm efd-agentshield](https://img.shields.io/npm/dw/efd-agentshield?label=efd-agentshield%20weekly%20downloads&logo=npm)](https://www.npmjs.com/package/efd-agentshield)
[![GitHub App Install](https://img.shields.io/badge/GitHub%20App-150%20installs-2ea44f?logo=github)](https://github.com/marketplace/efd-tools)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Shell](https://img.shields.io/badge/-Shell-4EAA25?logo=gnu-bash&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/-Python-3776AB?logo=python&logoColor=white)
![Go](https://img.shields.io/badge/-Go-00ADD8?logo=go&logoColor=white)
![Java](https://img.shields.io/badge/-Java-ED8B00?logo=openjdk&logoColor=white)
![Perl](https://img.shields.io/badge/-Perl-39457E?logo=perl&logoColor=white)
![Markdown](https://img.shields.io/badge/-Markdown-000000?logo=markdown&logoColor=white)

> **Factory Droid-only** | **47 agents** | **171 skills** | **79 commands** | **Cross-platform installers**

---

<div align="center">

**Language / 语言 / 語言 / Dil**

[**English**](README.md) | [Português (Brasil)](docs/pt-BR/README.md) | [简体中文](docs/zh-CN/README.md) | [繁體中文](docs/zh-TW/README.md) | [日本語](docs/ja-JP/README.md) | [한국어](docs/ko-KR/README.md)
 | [Türkçe](docs/tr/README.md)

</div>

---

**A complete Factory Droid workflow system for modern engineering teams.**

A curated set of agents, skills, hooks, rules, MCP configurations, installers, and command shims for Factory Droid. Built to support planning, implementation, review, safety, research, and operational workflows in one project.

This project is focused on **Factory Droid** as its only supported target.

---

## The Guides

This repo is the raw code only. The guides explain everything.

<table>
<tr>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2012378465664745795">
<img src="./assets/images/guides/shorthand-guide.png" alt="The Shorthand Guide to Everything Factory Droid" />
</a>
</td>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2014040193557471352">
<img src="./assets/images/guides/longform-guide.png" alt="The Longform Guide to Everything Factory Droid" />
</a>
</td>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2033263813387223421">
<img src="./assets/images/security/security-guide-header.png" alt="The Shorthand Guide to Everything Agentic Security" />
</a>
</td>
</tr>
<tr>
<td align="center"><b>Shorthand Guide</b><br/>Setup, foundations, philosophy. <b>Read this first.</b></td>
<td align="center"><b>Longform Guide</b><br/>Token optimization, memory persistence, evals, parallelization.</td>
<td align="center"><b>Security Guide</b><br/>Attack vectors, sandboxing, sanitization, CVEs, AgentShield.</td>
</tr>
</table>

| Topic | What You'll Learn |
|-------|-------------------|
| Token Optimization | Model selection, system prompt slimming, background processes |
| Memory Persistence | Hooks that save/load context across sessions automatically |
| Continuous Learning | Auto-extract patterns from sessions into reusable skills |
| Verification Loops | Checkpoint vs continuous evals, grader types, pass@k metrics |
| Parallelization | Git worktrees, cascade method, when to scale instances |
| Subagent Orchestration | The context problem, iterative retrieval pattern |

---

## Quick Start

Get up and running in under 2 minutes:

### Step 1: Install the Plugin

```bash
# Add marketplace
/plugin marketplace add r0k1n-c/everything-factory-droid

# Install plugin
/plugin install everything-factory-droid@everything-factory-droid
```

### Step 2: Install Rules (Required)

> WARNING: **Important:** Factory Droid plugins cannot distribute `rules` automatically. Install them manually:

```bash
# Clone the repo first
git clone https://github.com/r0k1n-c/everything-factory-droid.git
cd everything-factory-droid

# Install dependencies (pick your package manager)
npm install        # or: pnpm install | yarn install | bun install

# macOS/Linux

# Recommended: install everything (full profile)
./install.sh --profile full

# Or install for specific languages only
./install.sh typescript    # or python or golang or swift or php
# ./install.sh typescript python golang swift php
# ./install.sh --profile developer
# ./install.sh --with lang:typescript --with capability:security
```

```powershell
# Windows PowerShell

# Recommended: install everything (full profile)
npx efd-install --profile full

# Or install for specific languages only
npx efd-install typescript   # or python or golang or swift or php
# npx efd-install typescript python golang swift php
# npx efd-install --profile developer
# npx efd-install --with lang:typescript --with capability:security

# npm-installed compatibility entrypoint also works cross-platform
npx efd-install typescript
```

For manual install instructions see the README in the `rules/` folder. When copying rules manually, copy the whole language directory (for example `rules/common` or `rules/golang`), not the files inside it, so relative references keep working and filenames do not collide.

### Step 3: Start Using

```bash
# Skills are the primary workflow surface.
# Existing slash-style command names still work while EFD migrates off commands/.

# Plugin install uses the namespaced form
/everything-factory-droid:plan "Add user authentication"

# Manual install keeps the shorter slash form:
# /plan "Add user authentication"

# Check available commands
/plugin list everything-factory-droid@everything-factory-droid
```

**That's it!** You now have access to 47 agents, 171 skills, and 79 legacy command shims.

### Multi-model commands require additional setup

> WARNING: `multi-*` commands are **not** covered by the base plugin/rules install above.
>
> To use `/multi-plan`, `/multi-execute`, `/multi-backend`, `/multi-frontend`, and `/multi-workflow`, you must also install the `ccg-workflow` runtime.
>
> Initialize it with `npx ccg-workflow`.
>
> That runtime provides the external dependencies these commands expect, including:
> - `~/.factory/bin/codeagent-wrapper`
> - `~/.factory/.ccg/prompts/*`
>
> Without `ccg-workflow`, these `multi-*` commands will not run correctly.

---

## Cross-Platform Support

This plugin supports **Windows, macOS, and Linux** for Factory Droid installs. All hooks and scripts have been rewritten in Node.js for maximum compatibility.

### Package Manager Detection

The plugin automatically detects your preferred package manager (npm, pnpm, yarn, or bun) with the following priority:

1. **Environment variable**: `FACTORY_DROID_PACKAGE_MANAGER`
2. **Project config**: `.factory/package-manager.json`
3. **package.json**: `packageManager` field
4. **Lock file**: Detection from package-lock.json, yarn.lock, pnpm-lock.yaml, or bun.lockb
5. **Global config**: `~/.factory/package-manager.json`
6. **Fallback**: First available package manager

To set your preferred package manager:

```bash
# Via environment variable
export FACTORY_DROID_PACKAGE_MANAGER=pnpm

# Via global config
node scripts/setup-package-manager.js --global pnpm

# Via project config
node scripts/setup-package-manager.js --project bun

# Detect current setting
node scripts/setup-package-manager.js --detect
```

Or use the `/setup-pm` command in Factory Droid.

### Hook Runtime Controls

Use runtime flags to tune strictness or disable specific hooks temporarily:

```bash
# Hook strictness profile (default: standard)
export EFD_HOOK_PROFILE=standard

# Comma-separated hook IDs to disable
export EFD_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:typecheck"
```

---

## What's Inside

This repo is a **Factory Droid plugin** - install it directly or copy components manually.

```
everything-factory-droid/
|-- .factory/         # Factory Droid-ready mirrors and settings
|   |-- droids/             # Converted droid definitions
|   |-- skills/             # Factory Droid skill mirrors
|   |-- commands/           # Factory Droid command mirrors
|   |-- settings.json       # Project-level Factory Droid settings
|
|-- agents/           # 47 specialized subagents for delegation
|   |-- planner.md           # Feature implementation planning
|   |-- architect.md         # System design decisions
|   |-- tdd-guide.md         # Test-driven development
|   |-- code-reviewer.md     # Quality and security review
|   |-- security-reviewer.md # Vulnerability analysis
|   |-- build-error-resolver.md
|   |-- e2e-runner.md        # Playwright E2E testing
|   |-- refactor-cleaner.md  # Dead code cleanup
|   |-- doc-updater.md       # Documentation sync
|   |-- docs-lookup.md       # Documentation/API lookup
|   |-- chief-of-staff.md    # Communication triage and drafts
|   |-- loop-operator.md     # Autonomous loop execution
|   |-- harness-optimizer.md # Harness config tuning
|   |-- cpp-reviewer.md      # C++ code review
|   |-- cpp-build-resolver.md # C++ build error resolution
|   |-- go-reviewer.md       # Go code review
|   |-- go-build-resolver.md # Go build error resolution
|   |-- python-reviewer.md   # Python code review
|   |-- database-reviewer.md # Database/Supabase review
|   |-- typescript-reviewer.md # TypeScript/JavaScript code review
|   |-- java-reviewer.md     # Java/Spring Boot code review
|   |-- java-build-resolver.md # Java/Maven/Gradle build errors
|   |-- kotlin-reviewer.md   # Kotlin/Android/KMP code review
|   |-- kotlin-build-resolver.md # Kotlin/Gradle build errors
|   |-- rust-reviewer.md     # Rust code review
|   |-- rust-build-resolver.md # Rust build error resolution
|   |-- pytorch-build-resolver.md # PyTorch/CUDA training errors
|
|-- skills/           # Workflow definitions and domain knowledge
|   |-- coding-standards/           # Language best practices
|   |-- clickhouse-io/              # ClickHouse analytics, queries, data engineering
|   |-- backend-patterns/           # API, database, caching patterns
|   |-- frontend-patterns/          # React, Next.js patterns
|   |-- frontend-slides/            # HTML slide decks and PPTX-to-web presentation workflows (NEW)
|   |-- article-writing/            # Long-form writing in a supplied voice without generic AI tone (NEW)
|   |-- content-engine/             # Multi-platform social content and repurposing workflows (NEW)
|   |-- market-research/            # Source-attributed market, competitor, and investor research (NEW)
|   |-- investor-materials/         # Pitch decks, one-pagers, memos, and financial models (NEW)
|   |-- investor-outreach/          # Personalized fundraising outreach and follow-up (NEW)
|   |-- continuous-learning/        # Auto-extract patterns from sessions (Longform Guide)
|   |-- continuous-learning-v2/     # Instinct-based learning with confidence scoring
|   |-- iterative-retrieval/        # Progressive context refinement for subagents
|   |-- strategic-compact/          # Manual compaction suggestions (Longform Guide)
|   |-- tdd-workflow/               # TDD methodology
|   |-- security-review/            # Security checklist
|   |-- eval-harness/               # Verification loop evaluation (Longform Guide)
|   |-- verification-loop/          # Continuous verification (Longform Guide)
|   |-- videodb/                   # Video and audio: ingest, search, edit, generate, stream (NEW)
|   |-- golang-patterns/            # Go idioms and best practices
|   |-- golang-testing/             # Go testing patterns, TDD, benchmarks
|   |-- cpp-coding-standards/         # C++ coding standards from C++ Core Guidelines (NEW)
|   |-- cpp-testing/                # C++ testing with GoogleTest, CMake/CTest (NEW)
|   |-- django-patterns/            # Django patterns, models, views (NEW)
|   |-- django-security/            # Django security best practices (NEW)
|   |-- django-tdd/                 # Django TDD workflow (NEW)
|   |-- django-verification/        # Django verification loops (NEW)
|   |-- laravel-patterns/           # Laravel architecture patterns (NEW)
|   |-- laravel-security/           # Laravel security best practices (NEW)
|   |-- laravel-tdd/                # Laravel TDD workflow (NEW)
|   |-- laravel-verification/       # Laravel verification loops (NEW)
|   |-- python-patterns/            # Python idioms and best practices (NEW)
|   |-- python-testing/             # Python testing with pytest (NEW)
|   |-- springboot-patterns/        # Java Spring Boot patterns (NEW)
|   |-- springboot-security/        # Spring Boot security (NEW)
|   |-- springboot-tdd/             # Spring Boot TDD (NEW)
|   |-- springboot-verification/    # Spring Boot verification (NEW)
|   |-- configure-efd/              # Interactive installation wizard (NEW)
|   |-- security-scan/              # AgentShield security auditor integration (NEW)
|   |-- java-coding-standards/     # Java coding standards (NEW)
|   |-- jpa-patterns/              # JPA/Hibernate patterns (NEW)
|   |-- postgres-patterns/         # PostgreSQL optimization patterns (NEW)
|   |-- nutrient-document-processing/ # Document processing with Nutrient API (NEW)
|   |-- project-guidelines-example/   # Template for project-specific skills
|   |-- database-migrations/         # Migration patterns (Prisma, Drizzle, Django, Go) (NEW)
|   |-- api-design/                  # REST API design, pagination, error responses (NEW)
|   |-- deployment-patterns/         # CI/CD, Docker, health checks, rollbacks (NEW)
|   |-- docker-patterns/            # Docker Compose, networking, volumes, container security (NEW)
|   |-- e2e-testing/                 # Playwright E2E patterns and Page Object Model (NEW)
|   |-- content-hash-cache-pattern/  # SHA-256 content hash caching for file processing (NEW)
|   |-- cost-aware-llm-pipeline/     # LLM cost optimization, model routing, budget tracking (NEW)
|   |-- regex-vs-llm-structured-text/ # Decision framework: regex vs LLM for text parsing (NEW)
|   |-- swift-actor-persistence/     # Thread-safe Swift data persistence with actors (NEW)
|   |-- swift-protocol-di-testing/   # Protocol-based DI for testable Swift code (NEW)
|   |-- search-first/               # Research-before-coding workflow (NEW)
|   |-- skill-stocktake/            # Audit skills and commands for quality (NEW)
|   |-- liquid-glass-design/         # iOS 26 Liquid Glass design system (NEW)
|   |-- foundation-models-on-device/ # Apple on-device LLM with FoundationModels (NEW)
|   |-- swift-concurrency-6-2/       # Swift 6.2 Approachable Concurrency (NEW)
|   |-- perl-patterns/             # Modern Perl 5.36+ idioms and best practices (NEW)
|   |-- perl-security/             # Perl security patterns, taint mode, safe I/O (NEW)
|   |-- perl-testing/              # Perl TDD with Test2::V0, prove, Devel::Cover (NEW)
|   |-- autonomous-loops/           # Autonomous loop patterns: sequential pipelines, PR loops, DAG orchestration (NEW)
|   |-- plankton-code-quality/      # Write-time code quality enforcement with Plankton hooks (NEW)
|
|-- commands/         # Legacy slash-entry shims; prefer skills/
|   |-- tdd.md              # /tdd - Test-driven development
|   |-- plan.md             # /plan - Implementation planning
|   |-- e2e.md              # /e2e - E2E test generation
|   |-- code-review.md      # /code-review - Quality review
|   |-- build-fix.md        # /build-fix - Fix build errors
|   |-- refactor-clean.md   # /refactor-clean - Dead code removal
|   |-- learn.md            # /learn - Extract patterns mid-session (Longform Guide)
|   |-- learn-eval.md       # /learn-eval - Extract, evaluate, and save patterns (NEW)
|   |-- checkpoint.md       # /checkpoint - Save verification state (Longform Guide)
|   |-- verify.md           # /verify - Run verification loop (Longform Guide)
|   |-- setup-pm.md         # /setup-pm - Configure package manager
|   |-- go-review.md        # /go-review - Go code review (NEW)
|   |-- go-test.md          # /go-test - Go TDD workflow (NEW)
|   |-- go-build.md         # /go-build - Fix Go build errors (NEW)
|   |-- skill-create.md     # /skill-create - Generate skills from git history (NEW)
|   |-- instinct-status.md  # /instinct-status - View learned instincts (NEW)
|   |-- instinct-import.md  # /instinct-import - Import instincts (NEW)
|   |-- instinct-export.md  # /instinct-export - Export instincts (NEW)
|   |-- evolve.md           # /evolve - Cluster instincts into skills
|   |-- prune.md            # /prune - Delete expired pending instincts (NEW)
|   |-- pm2.md              # /pm2 - PM2 service lifecycle management (NEW)
|   |-- multi-plan.md       # /multi-plan - Multi-agent task decomposition (NEW)
|   |-- multi-execute.md    # /multi-execute - Orchestrated multi-agent workflows (NEW)
|   |-- multi-backend.md    # /multi-backend - Backend multi-service orchestration (NEW)
|   |-- multi-frontend.md   # /multi-frontend - Frontend multi-service orchestration (NEW)
|   |-- multi-workflow.md   # /multi-workflow - General multi-service workflows (NEW)
|   |-- orchestrate.md      # /orchestrate - Multi-agent coordination
|   |-- sessions.md         # /sessions - Session history management
|   |-- eval.md             # /eval - Evaluate against criteria
|   |-- test-coverage.md    # /test-coverage - Test coverage analysis
|   |-- update-docs.md      # /update-docs - Update documentation
|   |-- update-codemaps.md  # /update-codemaps - Update codemaps
|   |-- python-review.md    # /python-review - Python code review (NEW)
|
|-- rules/            # Always-follow guidelines (copy to ~/.factory/rules/)
|   |-- README.md            # Structure overview and installation guide
|   |-- common/              # Language-agnostic principles
|   |   |-- coding-style.md    # Immutability, file organization
|   |   |-- git-workflow.md    # Commit format, PR process
|   |   |-- testing.md         # TDD, 80% coverage requirement
|   |   |-- performance.md     # Model selection, context management
|   |   |-- patterns.md        # Design patterns, skeleton projects
|   |   |-- hooks.md           # Hook architecture, TodoWrite
|   |   |-- agents.md          # When to delegate to subagents
|   |   |-- security.md        # Mandatory security checks
|   |-- typescript/          # TypeScript/JavaScript specific
|   |-- python/              # Python specific
|   |-- golang/              # Go specific
|   |-- swift/               # Swift specific
|   |-- php/                 # PHP specific (NEW)
|
|-- hooks/            # Trigger-based automations
|   |-- README.md                 # Hook documentation, recipes, and customization guide
|   |-- hooks.json                # All hooks config (PreToolUse, PostToolUse, Stop, etc.)
|   |-- memory-persistence/       # Session lifecycle hooks (Longform Guide)
|   |-- strategic-compact/        # Compaction suggestions (Longform Guide)
|
|-- scripts/          # Cross-platform Node.js scripts (NEW)
|   |-- lib/                     # Shared utilities
|   |   |-- utils.js             # Cross-platform file/path/system utilities
|   |   |-- package-manager.js   # Package manager detection and selection
|   |-- hooks/                   # Hook implementations
|   |   |-- session-start.js     # Load context on session start
|   |   |-- session-end.js       # Save state on session end
|   |   |-- pre-compact.js       # Pre-compaction state saving
|   |   |-- suggest-compact.js   # Strategic compaction suggestions
|   |   |-- evaluate-session.js  # Extract patterns from sessions
|   |-- setup-package-manager.js # Interactive PM setup
|
|-- tests/            # Test suite (NEW)
|   |-- lib/                     # Library tests
|   |-- hooks/                   # Hook tests
|   |-- run-all.js               # Run all tests
|
|-- contexts/         # Dynamic system prompt injection contexts (Longform Guide)
|   |-- dev.md              # Development mode context
|   |-- review.md           # Code review mode context
|   |-- research.md         # Research/exploration mode context
|
|-- examples/         # Example configurations and sessions
|   |-- AGENTS.md             # Example project-level config
|   |-- user-AGENTS.md        # Example user-level config
|   |-- saas-nextjs-AGENTS.md   # Real-world SaaS (Next.js + Supabase + Stripe)
|   |-- go-microservice-AGENTS.md # Real-world Go microservice (gRPC + PostgreSQL)
|   |-- django-api-AGENTS.md      # Real-world Django REST API (DRF + Celery)
|   |-- laravel-api-AGENTS.md     # Real-world Laravel API (PostgreSQL + Redis) (NEW)
|   |-- rust-api-AGENTS.md        # Real-world Rust API (Axum + SQLx + PostgreSQL) (NEW)
|
|-- mcp-configs/      # MCP server configurations
|   |-- mcp-servers.json    # GitHub, Supabase, Vercel, Railway, etc.
|
```

---

## Ecosystem Tools

### Skill Creator

Two ways to generate Factory Droid skills from your repository:

#### Option A: Local Analysis (Built-in)

Use the `/skill-create` command for local analysis without external services:

```bash
/skill-create                    # Analyze current repo
/skill-create --instincts        # Also generate instincts for continuous-learning
```

This analyzes your git history locally and generates SKILL.md files.

#### Option B: GitHub App (Advanced)

For advanced features (10k+ commits, auto-PRs, team sharing):

[Install GitHub App](https://github.com/apps/skill-creator) | [efd.tools](https://efd.tools)

```bash
# Comment on any issue:
/skill-creator analyze

# Or auto-triggers on push to default branch
```

Both options create:
- **SKILL.md files** - Ready-to-use skills for Factory Droid
- **Instinct collections** - For continuous-learning-v2
- **Pattern extraction** - Learns from your commit history

### AgentShield — Security Auditor

> Standalone security auditor for Factory Droid configs, misconfigurations, and prompt-injection hardening.

Scan your Factory Droid configuration for vulnerabilities, misconfigurations, and injection risks.

```bash
# Quick scan (no install needed)
npx efd-agentshield scan

# Auto-fix safe issues
npx efd-agentshield scan --fix

# Deep analysis with three Opus 4.6 agents
npx efd-agentshield scan --opus --stream

# Generate secure config from scratch
npx efd-agentshield init
```

**What it scans:** AGENTS.md, settings.json, MCP configs, hooks, agent definitions, and skills across 5 categories — secrets detection (14 patterns), permission auditing, hook injection analysis, MCP server risk profiling, and agent config review.

**The `--opus` flag** runs three Opus 4.6 agents in a red-team/blue-team/auditor pipeline. The attacker finds exploit chains, the defender evaluates protections, and the auditor synthesizes both into a prioritized risk assessment. Adversarial reasoning, not just pattern matching.

**Output formats:** Terminal (color-graded A-F), JSON (CI pipelines), Markdown, HTML. Exit code 2 on critical findings for build gates.

Use `/security-scan` in Factory Droid to run it, or add to CI with the [GitHub Action](https://github.com/affaan-m/agentshield).

[GitHub](https://github.com/affaan-m/agentshield) | [npm](https://www.npmjs.com/package/efd-agentshield)

### Continuous Learning v2

The instinct-based learning system automatically learns your patterns:

```bash
/instinct-status        # Show learned instincts with confidence
/instinct-import <file> # Import instincts from others
/instinct-export        # Export your instincts for sharing
/evolve                 # Cluster related instincts into skills
```

See `skills/continuous-learning-v2/` for full documentation.

---

## Requirements

### Factory Droid CLI Version

**Minimum version: v2.1.0 or later**

This plugin requires Factory Droid CLI v2.1.0+ due to changes in how the plugin system handles hooks.

Check your version:
```bash
droid --version
```

### Important: Hooks Auto-Loading Behavior

> WARNING: **For Contributors:** Do NOT add duplicate hook declarations outside `hooks/hooks.json`. This is enforced by a regression test.

Factory Droid v2.1+ **automatically loads** `hooks/hooks.json` from installed EFD content by convention. Adding a second explicit hook declaration causes a duplicate detection error:

```
Duplicate hooks file detected: ./hooks/hooks.json resolves to already-loaded file
```

**History:** This has caused repeated fix/revert cycles in this repo ([#29](https://github.com/r0k1n-c/everything-factory-droid/issues/29), [#52](https://github.com/r0k1n-c/everything-factory-droid/issues/52), [#103](https://github.com/r0k1n-c/everything-factory-droid/issues/103)). The behavior changed between Factory Droid versions, leading to confusion. We now have a regression test to prevent this from being reintroduced.

---

## Installation

### Option 1: Install as Plugin (Recommended)

The easiest way to use this repo - install as a Factory Droid plugin:

```bash
# Add this repo as a marketplace
/plugin marketplace add r0k1n-c/everything-factory-droid

# Install the plugin
/plugin install everything-factory-droid@everything-factory-droid
```

Or add directly to your `~/.factory/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "everything-factory-droid": {
      "source": {
        "source": "github",
        "repo": "r0k1n-c/everything-factory-droid"
      }
    }
  },
  "enabledPlugins": {
    "everything-factory-droid@everything-factory-droid": true
  }
}
```

This gives you instant access to all commands, agents, skills, and hooks.

> **Note:** The Factory Droid plugin system does not support distributing `rules` via plugins ([current plugin limitation](https://docs.factory.ai/cli/configuration/plugins.md)). You need to install rules manually:
>
> ```bash
> # Clone the repo first
> git clone https://github.com/r0k1n-c/everything-factory-droid.git
>
> # Option A: User-level rules (applies to all projects)
> mkdir -p ~/.factory/rules
> cp -r everything-factory-droid/rules/common ~/.factory/rules/
> cp -r everything-factory-droid/rules/typescript ~/.factory/rules/   # pick your stack
> cp -r everything-factory-droid/rules/python ~/.factory/rules/
> cp -r everything-factory-droid/rules/golang ~/.factory/rules/
> cp -r everything-factory-droid/rules/php ~/.factory/rules/
>
> # Option B: Project-level rules (applies to current project only)
> mkdir -p .factory/rules
> cp -r everything-factory-droid/rules/common .factory/rules/
> cp -r everything-factory-droid/rules/typescript .factory/rules/     # pick your stack
> ```

---

### Option 2: Manual Installation

If you prefer manual control over what's installed:

```bash
# Clone the repo
git clone https://github.com/r0k1n-c/everything-factory-droid.git

# Copy agents to your Factory Droid config
cp everything-factory-droid/agents/*.md ~/.factory/droids/

# Copy rules directories (common + language-specific)
mkdir -p ~/.factory/rules
cp -r everything-factory-droid/rules/common ~/.factory/rules/
cp -r everything-factory-droid/rules/typescript ~/.factory/rules/   # pick your stack
cp -r everything-factory-droid/rules/python ~/.factory/rules/
cp -r everything-factory-droid/rules/golang ~/.factory/rules/
cp -r everything-factory-droid/rules/php ~/.factory/rules/

# Copy skills first (primary workflow surface)
# Recommended (new users): core/general skills only
for s in article-writing content-engine e2e-testing eval-harness frontend-patterns frontend-slides market-research search-first security-review strategic-compact tdd-workflow verification-loop; do
  cp -r everything-factory-droid/skills/$s ~/.factory/skills/
done

# Optional: add niche/framework-specific skills only when needed
# for s in django-patterns django-tdd laravel-patterns springboot-patterns; do
# cp -r everything-factory-droid/skills/$s ~/.factory/skills/
# done

# Optional: keep legacy slash-command compatibility during migration
mkdir -p ~/.factory/commands
cp everything-factory-droid/commands/*.md ~/.factory/commands/
```

#### Add hooks to settings.json

Copy the hooks from `hooks/hooks.json` to your `~/.factory/settings.json`.

#### Configure MCPs

Copy desired MCP server definitions from `mcp-configs/mcp-servers.json` into your official Factory Droid config in `~/.factory/settings.json`, or into a project-scoped `.mcp.json` if you want repo-local MCP access.

**Important:** Replace `YOUR_*_HERE` placeholders with your actual API keys.

---

## Key Concepts

### Agents

Subagents handle delegated tasks with limited scope. Example:

```markdown
---
name: code-reviewer
description: Reviews code for quality, security, and maintainability
tools: ["Read", "Grep", "Glob", "Bash"]
model: claude-opus-4-6
---

You are a senior code reviewer...
```

### Skills

Skills are the primary workflow surface. They can be invoked directly, suggested automatically, and reused by agents. EFD still ships `commands/` during migration, but new workflow development should land in `skills/` first.

```markdown
# TDD Workflow

1. Define interfaces first
2. Write failing tests (RED)
3. Implement minimal code (GREEN)
4. Refactor (IMPROVE)
5. Verify 80%+ coverage
```

### Hooks

Hooks fire on tool events. Example - warn about console.log:

```json
{
  "matcher": "tool == \"Edit\" && tool_input.file_path matches \"\\\\.(ts|tsx|js|jsx)$\"",
  "hooks": [{
    "type": "command",
    "command": "#!/bin/bash\ngrep -n 'console\\.log' \"$file_path\" && echo '[Hook] Remove console.log' >&2"
  }]
}
```

### Rules

Rules are always-follow guidelines, organized into `common/` (language-agnostic) + language-specific directories:

```
rules/
  common/          # Universal principles (always install)
  typescript/      # TS/JS specific patterns and tools
  python/          # Python specific patterns and tools
  golang/          # Go specific patterns and tools
  swift/           # Swift specific patterns and tools
  php/             # PHP specific patterns and tools
```

See [`rules/README.md`](rules/README.md) for installation and structure details.

---

## Which Agent Should I Use?

Not sure where to start? Use this quick reference. Skills are the canonical workflow surface; slash entries below are the compatibility form most users already know.

| I want to... | Use this command | Agent used |
|--------------|-----------------|------------|
| Plan a new feature | `/everything-factory-droid:plan "Add auth"` | planner |
| Design system architecture | `/everything-factory-droid:plan` + architect agent | architect |
| Write code with tests first | `/tdd` | tdd-guide |
| Review code I just wrote | `/code-review` | code-reviewer |
| Fix a failing build | `/build-fix` | build-error-resolver |
| Run end-to-end tests | `/e2e` | e2e-runner |
| Find security vulnerabilities | `/security-scan` | security-reviewer |
| Remove dead code | `/refactor-clean` | refactor-cleaner |
| Update documentation | `/update-docs` | doc-updater |
| Review Go code | `/go-review` | go-reviewer |
| Review Python code | `/python-review` | python-reviewer |
| Review TypeScript/JavaScript code | *(invoke `typescript-reviewer` directly)* | typescript-reviewer |
| Audit database queries | *(auto-delegated)* | database-reviewer |

### Common Workflows

Slash forms below are shown because they are still the fastest familiar entrypoint. Under the hood, EFD is shifting these workflows toward skills-first definitions.

**Starting a new feature:**
```
/everything-factory-droid:plan "Add user authentication with OAuth"
                                              → planner creates implementation blueprint
/tdd                                          → tdd-guide enforces write-tests-first
/code-review                                  → code-reviewer checks your work
```

**Fixing a bug:**
```
/tdd                                          → tdd-guide: write a failing test that reproduces it
                                              → implement the fix, verify test passes
/code-review                                  → code-reviewer: catch regressions
```

**Preparing for production:**
```
/security-scan                                → security-reviewer: OWASP Top 10 audit
/e2e                                          → e2e-runner: critical user flow tests
/test-coverage                                → verify 80%+ coverage
```

---

## FAQ

<details>
<summary><b>How do I check which agents/commands are installed?</b></summary>

```bash
/plugin list everything-factory-droid@everything-factory-droid
```

This shows all available agents, commands, and skills from the plugin.
</details>

<details>
<summary><b>My hooks aren't working / I see "Duplicate hooks file" errors</b></summary>

This is the most common issue. **Do NOT add a second hooks declaration outside `hooks/hooks.json`.** Factory Droid v2.1+ automatically loads `hooks/hooks.json` from installed EFD content. Duplicating that configuration causes duplicate-hook errors. See [#29](https://github.com/r0k1n-c/everything-factory-droid/issues/29), [#52](https://github.com/r0k1n-c/everything-factory-droid/issues/52), [#103](https://github.com/r0k1n-c/everything-factory-droid/issues/103).
</details>

<details>
<summary><b>Can I use EFD with Factory Droid on a custom API endpoint or model gateway?</b></summary>

Yes. EFD does not hardcode Anthropic-hosted transport settings. It runs locally through Factory Droid's normal CLI/plugin surface, so it works with:

- Anthropic-hosted Factory Droid
- Official Factory Droid gateway setups using `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN`
- Compatible custom endpoints that speak the Anthropic API Factory Droid expects

Minimal example:

```bash
export ANTHROPIC_BASE_URL=https://your-gateway.example.com
export ANTHROPIC_AUTH_TOKEN=your-token
droid
```

If your gateway remaps model names, configure that in Factory Droid rather than in EFD. EFD's hooks, skills, commands, and rules are model-provider agnostic once the `droid` CLI is already working.

Official references:
- [Factory Droid LLM gateway docs](https://docs.factory.ai/enterprise/models-llm-gateways-and-integrations)
- [Factory Droid model configuration docs](https://docs.factory.ai/cli/user-guides/choosing-your-model)

</details>

<details>
<summary><b>My context window is shrinking / Droid is running out of context</b></summary>

Too many MCP servers eat your context. Each MCP tool description consumes tokens from your 200k window, potentially reducing it to ~70k.

**Fix:** Disable unused MCPs per project:
```json
// In your project's .factory/settings.json
{
  "disabledMcpServers": ["supabase", "railway", "vercel"]
}
```

Keep under 10 MCPs enabled and under 80 tools active.
</details>

<details>
<summary><b>Can I use only some components (e.g., just agents)?</b></summary>

Yes. Use Option 2 (manual installation) and copy only what you need:

```bash
# Just agents
cp everything-factory-droid/agents/*.md ~/.factory/droids/

# Just rules
mkdir -p ~/.factory/rules/
cp -r everything-factory-droid/rules/common ~/.factory/rules/
```

Each component is fully independent.
</details>

<details>
<summary><b>Does this project support other harnesses?</b></summary>

No. This project is intentionally **Factory Droid-only**.
</details>

<details>
<summary><b>How do I contribute a new skill or agent?</b></summary>

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version:
1. Fork the repo
2. Create your skill in `skills/your-skill-name/SKILL.md` (with YAML frontmatter)
3. Or create an agent in `agents/your-agent.md`
4. Submit a PR with a clear description of what it does and when to use it
</details>

---

## Running Tests

The plugin includes a comprehensive test suite:

```bash
# Run all tests
node tests/run-all.js

# Run individual test files
node tests/lib/utils.test.js
node tests/lib/package-manager.test.js
node tests/hooks/hooks.test.js
```

---

## Contributing

**Contributions are welcome and encouraged.**

This repo is meant to be a community resource. If you have:
- Useful agents or skills
- Clever hooks
- Better MCP configurations
- Improved rules

Please contribute! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ideas for Contributions

- Additional domain workflows and specialized agents
- Team-specific hooks, rules, and quality gates
- Install profiles, examples, and onboarding assets
- Verification and testing workflows for new stacks
- Research, operations, and internal tooling patterns

---

## Factory Droid Focus

This project keeps only the Factory Droid-compatible surface:

- `./install.sh`, `npx efd`, and `npx efd-install` all resolve to the Factory Droid target.
- Project-local installs write to `.factory/`.
- Hook runtime files remain in `./hooks/` and `./scripts/` so installed settings can invoke them by project-relative path.
- Packaged assets are limited to Factory Droid droids, skills, commands, and settings.
- Legacy Cursor/Codex/OpenCode/Antigravity setup docs were intentionally removed from this project.

| Component | Catalog | Scope |
|-----------|---------|-------|
| Agents | 47 agents | Factory Droid |
| Commands | 79 commands | Factory Droid |
| Skills | 171 skills | Factory Droid |

---

## Background

This configuration set comes from extended day-to-day Factory Droid usage across real product work.

These configs are battle-tested across multiple production applications.

---

## Token Optimization

Factory Droid usage can be expensive if you don't manage token consumption. These settings significantly reduce costs without sacrificing quality.

### Recommended Settings

Add to `~/.factory/settings.json`:

```json
{
  "model": "sonnet",
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50"
  }
}
```

| Setting | Default | Recommended | Impact |
|---------|---------|-------------|--------|
| `model` | opus | **sonnet** | ~60% cost reduction; handles 80%+ of coding tasks |
| `MAX_THINKING_TOKENS` | 31,999 | **10,000** | ~70% reduction in hidden thinking cost per request |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 95 | **50** | Compacts earlier — better quality in long sessions |

Switch to Opus only when you need deep architectural reasoning:
```
/model opus
```

### Daily Workflow Commands

| Command | When to Use |
|---------|-------------|
| `/model sonnet` | Default for most tasks |
| `/model opus` | Complex architecture, debugging, deep reasoning |
| `/clear` | Between unrelated tasks (free, instant reset) |
| `/compact` | At logical task breakpoints (research done, milestone complete) |
| `/cost` | Monitor token spending during session |

### Strategic Compaction

The `strategic-compact` skill (included in this plugin) suggests `/compact` at logical breakpoints instead of relying on auto-compaction at 95% context. See `skills/strategic-compact/SKILL.md` for the full decision guide.

**When to compact:**
- After research/exploration, before implementation
- After completing a milestone, before starting the next
- After debugging, before continuing feature work
- After a failed approach, before trying a new one

**When NOT to compact:**
- Mid-implementation (you'll lose variable names, file paths, partial state)

### Context Window Management

**Critical:** Don't enable all MCPs at once. Each MCP tool description consumes tokens from your 200k window, potentially reducing it to ~70k.

- Keep under 10 MCPs enabled per project
- Keep under 80 tools active
- Use `disabledMcpServers` in project config to disable unused ones

### Agent Teams Cost Warning

Agent Teams spawns multiple context windows. Each teammate consumes tokens independently. Only use for tasks where parallelism provides clear value (multi-module work, parallel reviews). For simple sequential tasks, subagents are more token-efficient.

---

## WARNING: Important Notes

### Token Optimization

Hitting daily limits? See the **[Token Optimization Guide](docs/token-optimization.md)** for recommended settings and workflow tips.

Quick wins:

```json
// ~/.factory/settings.json
{
  "model": "sonnet",
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50",
    "CLAUDE_CODE_SUBAGENT_MODEL": "haiku"
  }
}
```

Use `/clear` between unrelated tasks, `/compact` at logical breakpoints, and `/cost` to monitor spending.

### Customization

These configs work for my workflow. You should:
1. Start with what resonates
2. Modify for your stack
3. Remove what you don't use
4. Add your own patterns

---

## Sponsors

This project is free and open source. Sponsors help keep it maintained and growing.

[**Become a Sponsor**](https://github.com/sponsors/affaan-m) | [Sponsor Tiers](SPONSORS.md) | [Sponsorship Program](SPONSORING.md)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=r0k1n-c/everything-factory-droid&type=Date)](https://star-history.com/#r0k1n-c/everything-factory-droid&Date)

---

## Links

- **Shorthand Guide (Start Here):** [The Shorthand Guide to Everything Factory Droid](https://x.com/affaanmustafa/status/2012378465664745795)
- **Longform Guide (Advanced):** [The Longform Guide to Everything Factory Droid](https://x.com/affaanmustafa/status/2014040193557471352)
- **Security Guide:** [Security Guide](./the-security-guide.md) | [Thread](https://x.com/affaanmustafa/status/2033263813387223421)
- **Follow:** [@affaanmustafa](https://x.com/affaanmustafa)

---

## License

MIT - Use freely, modify as needed, contribute back if you can.

---

**Star this repo if it helps. Read both guides. Build something great.**
