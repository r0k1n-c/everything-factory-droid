---
name: git-worktree-isolation
description: Per-task git worktree isolation for parallel agent execution — creation, branch binding, seed file sharing, merge-back strategies, and safe cleanup.
origin: EFD
disable-model-invocation: true
---

# Git Worktree Isolation

When multiple agents work on the same repository simultaneously, they conflict on the working tree. Git worktrees solve this by giving each agent an independent working directory backed by the same `.git` object store. This skill consolidates worktree patterns from across EFD — creation, agent binding, file sharing, merge-back, and cleanup — into a single reference for safe parallel agent execution.

## When to Use

- Multiple agents modifying the same repository concurrently
- Mission workers that need isolated environments for independent features
- Parallel testing where each test suite runs against different code states
- Any scenario where "one repo, multiple working directories" eliminates merge conflicts

## When NOT to Use

| Instead | Use |
| --- | --- |
| Sequential single-agent work | Normal git workflow |
| Completely separate repositories | git clone |
| Container-based isolation | Docker patterns |
| Code review without changes | Read-only access |

## Core Concepts

**How Git Worktrees Work:**

```
Main repo (.git/)
├── main worktree (your normal working directory)
├── worktree-task-001/ (linked, separate directory)
├── worktree-task-002/ (linked, separate directory)
└── ...
```

Each worktree:
- Has its own working directory and index (staging area)
- Shares the `.git` object store (commits, branches, objects)
- Must be on a DIFFERENT branch from all other worktrees
- Changes in one worktree are invisible to others until merged

**Naming Convention:**

```
{repo-parent}/worktree-{task-id}/
```

Example: `/Users/dev/worktree-api-endpoint/`

## Workflow

### Phase 1: Setup (worktree_setup)

Create an isolated worktree for a task.

Steps:
1. Verify the repo supports worktrees: `git rev-parse --git-dir` succeeds
2. Create a branch for the task: `git branch task/{task-id} HEAD`
3. Create the worktree: `git worktree add ../worktree-{task-id} task/{task-id}`
4. Copy seed files if needed (see Seed Files section)
5. Record the binding: task-id <-> worktree path <-> branch name

### Phase 2: Execute

Agent works in the worktree directory.

Key rules:
- Always `cd` into the worktree directory before any git operations
- Commits go to the task branch, not main
- The main worktree remains untouched
- Multiple worktrees can run in parallel safely

### Phase 3: Resolve (worktree_resolve)

Merge changes back to the main branch.

Strategies (choose based on workflow):
1. **Merge** — `git checkout main && git merge task/{task-id}` (preserves history)
2. **Squash merge** — `git merge --squash task/{task-id}` (clean single commit)
3. **Rebase** — `git rebase main task/{task-id}` (linear history)
4. **PR-based** — Push branch, create PR, review, merge (team workflow)

Conflict handling:
- If merge conflicts occur, report to orchestrator with conflict details
- Never auto-resolve conflicts in agent workflows
- Provide the file list with conflicts for human/orchestrator decision

### Phase 4: Cleanup (worktree_cleanup)

Remove the worktree and branch.

Steps:
1. Verify the task is complete (check dag-task-graph if using)
2. Verify all changes are merged (no unpushed commits on task branch)
3. Remove the worktree: `git worktree remove ../worktree-{task-id}`
4. Delete the task branch: `git branch -d task/{task-id}` (safe delete — fails if unmerged)
5. Run `git worktree prune` to clean up stale references

## Seed Files

Some files need to exist in every worktree but aren't tracked by git (env files, local configs, build caches):

```json
{
  "seedPaths": [
    ".env",
    ".env.local",
    "node_modules",
    ".factory/settings.json"
  ]
}
```

Seeding strategy:
- **Symlink** (preferred for large dirs like node_modules): `ln -s ../main-repo/node_modules ./node_modules`
- **Copy** (for small config files): `cp ../main-repo/.env ./.env`
- Never seed files that are git-tracked (they exist via the worktree itself)

## Operations

- `worktree_setup(task_id, base_branch?)` — Create worktree + branch. Default base: current HEAD.
- `worktree_resolve(task_id, strategy?)` — Merge changes back. Default strategy: squash merge.
- `worktree_cleanup(task_id, force?)` — Remove worktree + branch. force=true skips unmerged check.
- `worktree_list()` — List all active worktrees with their task bindings.
- `worktree_status(task_id)` — Show diff summary, commit count, merge readiness for a specific worktree.

## Binding Registry

Track the mapping between tasks and worktrees:

```json
{
  "version": 1,
  "bindings": [
    {
      "task_id": "api-endpoint",
      "worktree_path": "/Users/dev/worktree-api-endpoint",
      "branch": "task/api-endpoint",
      "base_branch": "main",
      "created_at": "ISO timestamp",
      "status": "active|resolved|cleaned"
    }
  ]
}
```

Location: `.factory/artifacts/worktree-bindings.json`

## Safety Guards (CRITICAL)

**Cleanup Protection:**
- NEVER delete a directory that isn't a registered worktree (verify via `git worktree list`)
- NEVER force-delete branches with unmerged commits (use `-d` not `-D`)
- ALWAYS verify the worktree path starts with the expected parent directory
- REFUSE to remove if the worktree has uncommitted changes

**Concurrency Safety:**
- Each worktree MUST be on a unique branch (git enforces this)
- Branch naming must be deterministic: `task/{task-id}` (prevents collisions)
- Worktree paths must be outside the main repo directory (sibling, not child)

**Graceful Degradation:**
- If `git worktree` is not supported (old git version): fall back to separate clones
- If disk space is insufficient: warn and refuse to create
- If the repo has submodules: document that submodules need separate init in each worktree

## Integration Points

- **dag-task-graph** — Each DAG task can be bound to an isolated worktree
- **autonomous-task-claiming** — When a worker claims a task, it auto-creates a worktree
- **dmux-workflows** — tmux panes can be bound to worktree directories (existing pattern)
- **agent-messaging-protocol** — Workers can broadcast worktree status changes
- **git-workflow** — Extends git-workflow with parallel execution patterns

## Best Practices

- One worktree per task (never share worktrees between tasks)
- Always resolve before cleanup (don't lose work)
- Use squash merge for clean history when tasks are independent
- Symlink node_modules/venv to save disk space
- Run `git worktree prune` periodically to clean stale entries
- Name branches consistently: `task/{task-id}`

## Anti-Patterns

- Creating worktrees inside the main repo directory (path confusion)
- Using force-delete for cleanup (loses unmerged work)
- Sharing a worktree between multiple agents (defeats isolation purpose)
- Forgetting to seed .env files (builds fail in worktree)
- Creating unbounded worktrees without cleanup policy

## Examples

1. **Two parallel feature workers:** setup worktree-auth + worktree-catalog → work in parallel → squash merge both → cleanup
2. **Test isolation:** create worktree for experimental change → run tests → discard (cleanup without resolve)
3. **Recovery:** Worker crashes → worktree persists → new worker resumes from the worktree's branch state

## Compatibility

| Git Version | Worktree Support |
|---|---|
| >= 2.5 | Basic worktree support |
| >= 2.15 | `git worktree move` and `git worktree remove` |
| >= 2.17 | `git worktree list --porcelain` |

Minimum recommended: Git 2.15+

## Related Skills

- dmux-workflows
- git-workflow
- dag-task-graph
- autonomous-task-claiming
- autonomous-loops
- safety-guard
