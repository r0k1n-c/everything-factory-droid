---
name: autonomous-task-claiming
description: Controlled task queue protocol where idle workers autonomously claim pending tasks from a DAG with safety limits, conflict resolution, and graceful shutdown.
origin: EFD
disable-model-invocation: true
---

# Autonomous Task Claiming

In multi-agent workflows, the orchestrator traditionally assigns tasks to workers. This skill inverts that: idle workers autonomously inspect the task pool, claim available work, and execute it — reducing orchestrator bottleneck and enabling self-healing workflows. But autonomy without constraints is dangerous. This skill defines a controlled claiming protocol with hard safety limits to prevent runaway loops, resource exhaustion, and task conflicts.

## When to Use

- Multi-worker orchestration where the orchestrator shouldn't be a bottleneck
- Continuous integration/deployment pipelines with a task backlog
- Recovery scenarios where workers restart and need to resume from the task pool
- Any workflow pattern where "pull-based" task assignment is more efficient than "push-based"

## When NOT to Use

| Instead | Use |
| --- | --- |
| Simple one-shot delegation | Task tool |
| Orchestrator-driven assignment | Missions (features.json) |
| Sequential checklist | TodoWrite |
| Planning without execution | blueprint |

## Core Concepts

**Pull vs Push Model:**
- Push (traditional): Orchestrator assigns task → Worker executes
- Pull (this skill): Worker queries pool → Claims available task → Executes → Repeats or exits

**Claiming Protocol:**

```
idle → scan_pool → claim(task_id) → execute → complete/fail → scan_pool | exit
```

**Safety Invariants:**
1. One task per worker at a time
2. Maximum N consecutive claims per session (circuit breaker)
3. Claimed tasks have an expiration (claim TTL)
4. No task can be claimed by two workers simultaneously
5. When no tasks are available, worker MUST exit (no busy-wait)

## Claiming Rules

**Eligibility:** A task is claimable if ALL of these are true:
- status = `pending` (dependencies resolved)
- owner = `null` (not already claimed)
- No active claim lock exists for this task_id
- The task's required capabilities match the worker's capabilities (if specified)

**Priority Order** (when multiple tasks are eligible):
1. Highest tier first (earliest dependency layer)
2. Within same tier: oldest created_at first (FIFO)
3. Within same age: alphabetical by task_id (deterministic)

**Claim Process:**
1. Worker reads task-graph.json
2. Filters for claimable tasks
3. Selects highest-priority task
4. Writes claim: set owner={worker-id}, status=in_progress, started_at=now, claim_expires_at=now+TTL
5. Re-reads task-graph.json to verify claim succeeded (optimistic locking)
6. If conflict detected (owner changed), abandon and re-scan

## Data Model Extensions

Extends the dag-task-graph data model with:

```json
{
  "owner": "worker-id|null",
  "claim_expires_at": "ISO timestamp|null",
  "claim_count": 0,
  "max_retries": 3
}
```

Session-level tracking:

```json
{
  "worker_id": "worker-001",
  "session_claims": 0,
  "max_session_claims": 5,
  "last_claim_at": "ISO timestamp|null"
}
```

## Safety Guards (CRITICAL)

**Circuit Breaker — Maximum Claims Per Session:**
- Default: 5 consecutive claims per session
- After reaching the limit, worker MUST exit regardless of remaining tasks
- Prevents runaway loops where a worker claims and fails indefinitely

**Claim TTL:**
- Default: 30 minutes
- If a worker crashes or hangs, the claim expires and the task returns to pending
- Other workers can then claim it

**Failure Handling:**
- On task failure: increment claim_count on the task
- If claim_count >= max_retries: mark task as `failed`, do NOT auto-retry
- Failed tasks require orchestrator intervention to reset

**Conflict Resolution:**
- File-level optimistic locking: read-modify-write with version check
- If write fails (version mismatch), abandon the claim attempt
- Back off with a small delay before re-scanning

**No Busy-Wait:**
- If scan_pool returns zero claimable tasks → worker exits immediately
- No polling, no sleep-and-retry, no "check again in 5 seconds"
- The next session or orchestration round will spawn new workers if tasks become available

**Emergency Stop:**
- Worker checks for `.factory/artifacts/ao-pack-stop` sentinel file before each claim
- If the file exists, worker exits immediately without claiming
- Provides a manual kill switch for runaway scenarios

## Workflow

**Phase 1: Initialize** — Worker starts, reads its configuration (worker_id, max_session_claims). Checks for emergency stop sentinel.

**Phase 2: Scan** — Read task-graph.json. Filter for claimable tasks. If none, exit.

**Phase 3: Claim** — Select highest-priority task. Write claim atomically. Verify claim succeeded.

**Phase 4: Execute** — Perform the task. Write result_summary on completion.

**Phase 5: Complete** — Update task status (completed/failed). Increment session_claims counter.

**Phase 6: Decide** — If session_claims < max_session_claims, go to Phase 2. Otherwise, exit with "claim limit reached" message.

## Integration Points

- **dag-task-graph** — Provides the task pool. Autonomous claiming operates ON the DAG.
- **agent-messaging-protocol** — Workers can broadcast claim/release events for coordination
- **background-job-injection** — Workers check for completed background jobs before claiming new work
- **git-worktree-isolation** — Each claimed task can be bound to an isolated worktree
- **safety-guard** — Inherits safety-first patterns for destructive operation prevention
- **enterprise-agent-ops** — Lifecycle management for long-running autonomous workers

## Best Practices

- Start with max_session_claims=3 for initial deployment, increase only after stability is proven
- Always set claim TTL shorter than the expected maximum task duration
- Log every claim/release/failure for auditability
- Use the emergency stop sentinel during testing
- Let the orchestrator handle failed tasks, not workers

## Anti-Patterns

- Setting max_session_claims to infinity (guaranteed runaway)
- Busy-waiting for tasks (context and resource waste)
- Workers retrying failed tasks without orchestrator review
- Claiming multiple tasks simultaneously (race condition magnifier)
- Disabling the circuit breaker "just this once"

## Examples

1. A 10-task DAG with 3 workers: each worker claims, executes, claims again until pool is empty or limit reached
2. Recovery: Worker crashes mid-task, claim expires, another worker picks it up
3. Emergency stop: Operator creates sentinel file, all workers exit gracefully

## Related Skills

- dag-task-graph
- agent-messaging-protocol
- background-job-injection
- git-worktree-isolation
- safety-guard
- continuous-agent-loop
- enterprise-agent-ops
