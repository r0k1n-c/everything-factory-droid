# Agent & Droid Ecosystem Audit — EFD

**Generated:** 2026-04-10
**Repo:** /Users/r0/Desktop/AIProjects/everything-factory-droid
**Branch:** main (767a559)

---

## 1. Agent Frontmatter Schema

All 47 agents live in `agents/*.md` as Markdown files with YAML frontmatter.

### Fields Observed

| Field | Required? | Type | Description |
|-------|-----------|------|-------------|
| `name` | Yes | string (kebab-case) | Unique agent identifier |
| `description` | Yes | string | One-line purpose summary; loaded into every Task tool context |
| `tools` | No | string[] | Subset of Factory Droid tools the agent can use (e.g., `["Read", "Grep", "Glob", "Bash"]`) |
| `model` | No | string | Preferred model (`claude-opus-4-6`, `claude-sonnet-4-6`) |

**Notes:**
- No `depends_on`, `capabilities`, `worktree-aware`, or `tier` fields exist.
- No `tags`, `domain`, or `category` field — domain grouping is purely by filename convention.
- The `description` field is critical: per `context-budget` skill, it loads into every Task tool invocation regardless of whether the agent is spawned.

---

## 2. Complete Agent Inventory (47 agents)

### Architecture & Planning (4)
| Agent | Description |
|-------|-------------|
| `architect` | Software architecture specialist for system design, scalability, and technical decision-making |
| `planner` | Expert planning specialist for complex features and refactoring |
| `code-architect` | Designs feature architectures by analyzing existing codebase patterns and conventions |
| `code-explorer` | Deeply analyzes existing codebase features by tracing execution paths |

### Code Review — General (3)
| Agent | Description |
|-------|-------------|
| `code-reviewer` | Expert code review for quality, security, and maintainability |
| `security-reviewer` | Security vulnerability detection and remediation (OWASP Top 10) |
| `healthcare-reviewer` | Reviews healthcare code for clinical safety, CDSS, PHI compliance |

### Code Review — Language-Specific (10)
| Agent | Description |
|-------|-------------|
| `typescript-reviewer` | TypeScript/JavaScript type safety, async correctness, security |
| `python-reviewer` | PEP 8, Pythonic idioms, type hints, security |
| `go-reviewer` | Idiomatic Go, concurrency patterns, error handling |
| `rust-reviewer` | Ownership, lifetimes, error handling, unsafe usage |
| `java-reviewer` | Java/Spring Boot layered architecture, JPA, security |
| `kotlin-reviewer` | Kotlin/Android/KMP coroutine safety, Compose, clean architecture |
| `csharp-reviewer` | .NET conventions, async patterns, nullable reference types |
| `cpp-reviewer` | Memory safety, modern C++ idioms, concurrency |
| `flutter-reviewer` | Flutter/Dart widget best practices, state management, accessibility |
| `database-reviewer` | PostgreSQL query optimization, schema design, security |

### Build Error Resolution (8)
| Agent | Description |
|-------|-------------|
| `build-error-resolver` | TypeScript/general build error resolution |
| `cpp-build-resolver` | C++ build, CMake, compilation errors |
| `dart-build-resolver` | Dart/Flutter build, analysis, dependency errors |
| `go-build-resolver` | Go build, vet, compilation errors |
| `java-build-resolver` | Java/Maven/Gradle build errors |
| `kotlin-build-resolver` | Kotlin/Gradle build errors |
| `rust-build-resolver` | Rust cargo build, borrow checker errors |
| `pytorch-build-resolver` | PyTorch runtime, CUDA, training errors |

### Testing & Quality (3)
| Agent | Description |
|-------|-------------|
| `tdd-guide` | Test-Driven Development specialist (80%+ coverage) |
| `e2e-runner` | End-to-end testing with Vercel Agent Browser / Playwright |
| `pr-test-analyzer` | Review PR test coverage quality and completeness |

### Documentation & Analysis (6)
| Agent | Description |
|-------|-------------|
| `doc-updater` | Documentation and codemap specialist |
| `docs-lookup` | Library/framework docs via Context7 MCP |
| `comment-analyzer` | Code comment accuracy, completeness, and rot risk |
| `type-design-analyzer` | Type design encapsulation, invariants, and enforcement |
| `code-simplifier` | Simplifies code for clarity, consistency, and maintainability |
| `silent-failure-hunter` | Finds silent failures, swallowed errors, and bad fallbacks |

### Refactoring & Performance (3)
| Agent | Description |
|-------|-------------|
| `refactor-cleaner` | Dead code cleanup and consolidation (knip, depcheck) |
| `performance-optimizer` | Performance analysis, profiling, bundle size, memory leaks |
| `harness-optimizer` | Analyze and improve local agent harness configuration |

### Open-Source Pipeline (3)
| Agent | Description |
|-------|-------------|
| `opensource-forker` | Fork projects, strip secrets, clean history |
| `opensource-sanitizer` | Verify fork is fully sanitized (20+ regex patterns) |
| `opensource-packager` | Generate AGENTS.md, setup.sh, README for open-source |

### GAN Harness (3)
| Agent | Description |
|-------|-------------|
| `gan-planner` | GAN Harness planner — expands prompts into full product specs |
| `gan-generator` | GAN Harness generator — implements features per spec |
| `gan-evaluator` | GAN Harness evaluator — tests via Playwright, scores against rubric |

### Orchestration & Communication (3)
| Agent | Description |
|-------|-------------|
| `loop-operator` | Operate autonomous agent loops, monitor progress, intervene safely |
| `chief-of-staff` | Communication triage (email, Slack, LINE, Messenger) |
| `conversation-analyzer` | Analyze transcripts to find behaviors for hookify rules |

### Domain Specialist (1)
| Agent | Description |
|-------|-------------|
| `seo-specialist` | Technical SEO audits, on-page optimization, structured data |

---

## 3. How Agents Are Currently Referenced in Orchestration

### 3.1 Task Tool Dispatch (Primary Mechanism)

The Task tool is the native Factory Droid mechanism for spawning sub-agents. Key parameters:
- `subagent_type` — references a Custom Droid name (e.g., `"worker"`, `"opensource-forker"`)
- `description` — task summary
- `prompt` — full instructions (often includes the agent markdown content)

**Observed patterns:**

| Skill | subagent_type | Pattern |
|-------|--------------|---------|
| `team-builder` | `"worker"` | Injects agent `.md` content into prompt, uses generic worker droid |
| `search-first` | `"worker"` | Generic worker for research task |
| `skill-stocktake` | `"worker"` | Generic worker for inventory analysis |
| `santa-method` | `"worker"` | Two independent reviewer agents (context-isolated) |
| `rules-distill` | `"worker"` | Generic worker for rule extraction |
| `opensource-pipeline` | `"opensource-forker"`, `"opensource-sanitizer"`, `"opensource-packager"` | Named custom droids matching agent names |
| `santa-loop` (command) | `"code-reviewer"` | References agent name as droid type |

**Critical insight:** There are TWO distinct dispatch patterns:
1. **Generic worker + agent prompt injection:** `subagent_type="worker"`, with the agent's markdown persona injected into the `prompt` field. The `worker` droid provides basic capabilities and the agent personality comes from the prompt.
2. **Named custom droid:** `subagent_type="opensource-forker"` etc. This requires a matching Custom Droid definition in `.factory/droids/` or `~/.factory/droids/`.

### 3.2 Team Builder (Ad-hoc Team Composition)

- Discovers agents from `./agents/`, `./.factory/droids/`, `~/.factory/droids/`
- Groups by domain (subdirectory or filename prefix)
- User picks 1-5 agents → spawns all in parallel via Task tool with `subagent_type: "worker"`
- Synthesizes results across agents

### 3.3 Claude DevFleet (External Multi-Agent with Worktrees)

- External MCP service (not built into EFD itself)
- `plan_project(prompt)` → generates mission DAG with `depends_on` chains
- `dispatch_mission()` → spawns agent in isolated git worktree
- Up to 3 concurrent agents; auto-dispatch on dependency resolution
- Auto-merge on completion
- **This is the only pattern that provides true DAG execution + worktree isolation today**

### 3.4 Orchestrate Command (Sequential Handoff Pipeline)

- Chains agents sequentially: planner → implementer → reviewer
- Passes structured context (handoff documents) between steps
- References agents by name in custom workflows: `/orchestrate custom "architect,tdd-guide,code-reviewer" "..."`
- For parallel execution, delegates to `dmux-workflows` skill
- Control-plane snapshots for multi-session visibility

### 3.5 Blueprint (Multi-Session Plan Generator)

- Generates Markdown plans with steps, dependency graphs, parallel detection
- Assigns model tiers per step (strongest vs default)
- Adversarial review gate (strongest-model sub-agent)
- **Does NOT dispatch agents itself** — produces plans for manual or automated execution
- No worktree integration

### 3.6 Ralphinho RFC Pipeline (DAG Decomposition Pattern)

- RFC → DAG decomposition → unit assignment → implementation → validation → merge
- Defines unit spec template with `id`, `depends_on`, `scope`, `acceptance_tests`
- Complexity tiers (1-3)
- Quality pipeline per unit (research → plan → implement → test → review → merge-ready)
- **Conceptual pattern only** — no concrete dispatch mechanism defined

---

## 4. Supporting Infrastructure Skills

### 4.1 dag-task-graph
- Formal DAG data model (`task-graph.json`) with task states: `blocked → pending → in_progress → completed/failed`
- Automatic tier assignment (dependency depth)
- Parallel execution detection (same-tier tasks)
- **No agent dispatch integration** — pure task tracking

### 4.2 autonomous-task-claiming
- Pull-based task assignment (workers claim from pool vs orchestrator push)
- Safety limits: one task per worker, circuit breaker, claim TTL
- Extends dag-task-graph with `owner`, `claim_expires_at`, `claim_count`
- **No worktree binding or agent spawn logic**

### 4.3 git-worktree-isolation
- Per-task worktree creation, agent binding, seed file sharing, merge-back
- Naming convention: `{repo-parent}/worktree-{task-id}/`
- Merge strategies: fast-forward, squash, rebase
- **No integration with dag-task-graph or Task tool dispatch**

### 4.4 agent-messaging-protocol
- Filesystem-based inbox/outbox messaging (`.factory/messages/`)
- Request-response correlation, notifications, broadcasts
- Designed for when Task tool's single-return-value model isn't enough
- **No integration with mission orchestration**

### 4.5 background-job-injection
- Fire-and-forget job registry with result re-injection
- Summary-based injection (not full logs)
- **No DAG or dependency awareness**

---

## 5. The Gap: What's Missing for DAG-Aware, Worktree-Compatible Agent Orchestration

### Gap A: No Agent-to-DAG Binding
- `agents/*.md` have no `capabilities`, `tier`, or `domain` fields
- `dag-task-graph` tasks have no `assigned_agent` or `required_agent_type` field
- No mechanism to auto-assign an agent to a task based on task properties

### Gap B: No Native Worktree-Per-Task Dispatch
- `git-worktree-isolation` knows how to create/destroy worktrees
- `dag-task-graph` knows task dependencies
- But there's no skill/command that:
  1. Takes a DAG task in `pending` state
  2. Creates a worktree for it
  3. Spawns the appropriate agent via Task tool
  4. Updates task status on completion
  5. Merges the worktree back

### Gap C: Task Tool subagent_type Mismatch
- `agents/*.md` names (e.g., `architect`, `code-reviewer`) don't automatically map to Custom Droids
- The `subagent_type` parameter requires a Custom Droid to exist in `.factory/droids/`
- Most skills work around this by using `subagent_type="worker"` and injecting the agent markdown into the prompt
- The `opensource-pipeline` is the only skill that uses named subagent types (`opensource-forker`, etc.), implying those droids exist separately
- **No bridge** between `agents/` directory and `.factory/droids/` system

### Gap D: No Inter-Task Communication During Execution
- `agent-messaging-protocol` defines the pattern but nothing wires it into mission execution
- When Agent A's output is needed by Agent B (not just dependency completion but content passing), there's no standardized handoff format

### Gap E: No Unified Orchestrator
- `claude-devfleet` is closest but requires an external MCP service
- `orchestrate` command only does sequential handoffs (parallel is delegated to dmux)
- `blueprint` produces plans but doesn't execute them
- `ralphinho-rfc-pipeline` defines the pattern but has no implementation
- `autonomous-task-claiming` + `dag-task-graph` are infrastructure but have no dispatch layer on top
- **No single skill/command ties DAG + worktree + agent dispatch + status tracking together natively**

### Gap F: No Agent Capability Matching
- Tasks don't declare what kind of agent they need (e.g., "needs Rust reviewer")
- Agents don't declare what tasks they can handle
- Assignment is always manual or hard-coded

---

## 6. Recommended Approach to Close the Loop

### 6.1 Extend Agent Frontmatter (Low Effort)
Add optional fields to `agents/*.md`:
```yaml
domain: code-review    # for auto-grouping
capabilities: [rust, code-review, security]  # for task matching
preferred-tier: default  # model cost tier
worktree-safe: true     # can operate in isolated worktree
```

### 6.2 Create a Mission Dispatcher Skill (High Impact)
A new skill (e.g., `mission-dispatcher`) that:
1. Reads a `task-graph.json` (from dag-task-graph)
2. For each `pending` task, matches it to an agent by capabilities
3. Creates a worktree (from git-worktree-isolation) if `worktree-safe`
4. Spawns the agent via Task tool (using `worker` + prompt injection pattern)
5. Updates task status in `task-graph.json` on completion
6. Merges worktree back on success
7. Handles failures (retry, eviction, scope narrowing per ralphinho)

This would unify: dag-task-graph + git-worktree-isolation + autonomous-task-claiming + Task tool dispatch.

### 6.3 Bridge agents/ → Custom Droids (Medium Effort)
Either:
- **Option A:** Generate `.factory/droids/*.md` from `agents/*.md` at install time (a build step or install hook)
- **Option B:** Make team-builder's "worker + prompt injection" pattern the canonical approach and document it as the official dispatch mechanism
- **Option C:** Add a `generate-droids` command that reads `agents/` and produces matching droid definitions

### 6.4 Standardize Handoff Format (Low Effort)
Define a `HANDOFF.md` or `.factory/handoffs/{task-id}.json` format that every agent writes on completion. Include: files changed, test results, security status, recommendation. The orchestrate command already has a template for this — promote it to a shared spec.

### 6.5 New Agent: `mission-worker` (Medium Effort)
A generic agent designed for DAG-dispatched work:
- Reads task spec from task-graph.json
- Operates in assigned worktree
- Writes standardized handoff on completion
- Knows how to claim next task (autonomous-task-claiming)
- Loads appropriate specialist agent persona based on task capabilities

---

## 7. Summary of File Discovery Trail

### Agents Read
- `agents/architect.md`, `agents/planner.md`, `agents/code-reviewer.md`
- `agents/security-reviewer.md`, `agents/tdd-guide.md`
- All 47 agent names/descriptions extracted via grep

### Skills Read
- `skills/team-builder/SKILL.md` — agent discovery + parallel dispatch
- `skills/claude-devfleet/SKILL.md` — external DAG + worktree orchestration
- `skills/ralphinho-rfc-pipeline/SKILL.md` — RFC DAG pattern
- `skills/blueprint/SKILL.md` — multi-session plan generation
- `skills/dag-task-graph/SKILL.md` — formal DAG data model
- `skills/autonomous-task-claiming/SKILL.md` — pull-based task claiming
- `skills/git-worktree-isolation/SKILL.md` — worktree lifecycle
- `skills/agent-messaging-protocol/SKILL.md` — inter-agent messaging
- `skills/background-job-injection/SKILL.md` — async job tracking
- `skills/autonomous-loops/SKILL.md` — loop pattern spectrum
- `skills/dmux-workflows/SKILL.md` — tmux-based parallelism
- `skills/opensource-pipeline/SKILL.md` — named subagent dispatch example

### Commands Read
- `commands/orchestrate.md` — multi-agent orchestration command
- `commands/plan.md` — planning command

### Config Read
- `agent.yaml` — root agent config (178 skills, model preferences, metadata)

### Searches Performed
- Grep for `subagent_type` across all skills → 15+ references found
- Grep for `worker` in agents/ → only incidental mentions (web workers, database workers)
- Grep for `worktree|DAG|depends_on` across skills → mapped all DAG-aware skills
- Grep for `custom droid|.factory/droids` → found 3 skills referencing droid locations
- Glob for `.factory/droids/` in repo → **none found** (no droid definitions ship with repo)
