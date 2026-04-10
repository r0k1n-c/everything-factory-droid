---
name: background-job-injection
description: Register, track, and re-inject results from fire-and-forget background tasks into subsequent agent sessions without manual log reading.
origin: EFD
disable-model-invocation: true
---

# Background Job Injection

When agents launch long-running tasks via Execute's fireAndForget mode, the results are lost to subsequent sessions. This skill defines a pattern for registering background jobs, capturing their outcomes, and re-injecting summaries into future sessions or orchestration rounds — closing the async feedback loop.

## When to Use

- Long-running builds, test suites, or deployments launched with fireAndForget
- Any task where the agent shouldn't block waiting for completion
- Multi-session workflows where a later session needs results from an earlier background task
- Continuous integration-style flows within agent orchestration

## When NOT to Use

| Instead | Use |
| --- | --- |
| Quick synchronous commands | Regular Execute (no fireAndForget) |
| Subagent delegation | Task tool with Custom Droids |
| Persistent task tracking | dag-task-graph |

## Core Concepts

**Job Lifecycle:**

```
registered → running → completed | failed | timed_out
                                   ↓
                              injected (summary read by next session)
```

**Key Principle:** Only inject summaries, never full logs. Context is expensive; a 3-line summary is worth more than 500 lines of build output.

## Data Model

Registry location: `.factory/background-jobs/registry.json`
Log storage: `.factory/background-jobs/logs/{job_id}.log`

```json
{
  "version": 1,
  "jobs": [
    {
      "job_id": "unique-id",
      "command": "npm test",
      "status": "registered|running|completed|failed|timed_out",
      "pid": 12345,
      "log_path": ".factory/background-jobs/logs/job-001.log",
      "registered_at": "ISO timestamp",
      "completed_at": "ISO timestamp|null",
      "summary": "short outcome text|null",
      "injected": false,
      "injected_at": "ISO timestamp|null",
      "ttl_seconds": 3600,
      "metadata": {}
    }
  ]
}
```

## Workflow

**Phase 1: Register** — Before launching a fireAndForget command, create a registry entry with job_id, command, and TTL. Write to registry.json.

**Phase 2: Launch** — Execute the command with fireAndForget=true. Record the PID and log path returned by the Execute tool.

**Phase 3: Poll** — Periodically check job status. Read the log file, check if PID is still running (ps -p PID). Update status when complete.

**Phase 4: Summarize** — When a job completes, generate a brief summary (exit code, key output lines, pass/fail). Write summary to the registry entry.

**Phase 5: Inject** — At the start of a new session or orchestration round, read the registry. For each completed job where injected=false, present the summary to the current agent context. Mark as injected=true to prevent re-injection.

## Operations

- `job_register(command, ttl_seconds?)` — Create a registry entry, return job_id
- `job_launch(job_id)` — Execute with fireAndForget, record PID
- `job_poll(job_id?)` — Check status of one or all jobs
- `job_summarize(job_id)` — Generate and store summary from log
- `job_inject_pending()` — Read all completed+uninjected jobs, return summaries
- `job_cleanup(older_than?)` — Remove completed+injected jobs and their logs

## Injection Strategy

Three injection points (choose based on workflow):

1. **Session Start** — Read registry at the beginning of each session. Inject pending summaries as context.
2. **Orchestration Round** — Before each orchestration decision, check for completed background work.
3. **Explicit Poll** — Agent explicitly calls job_poll when it needs results.

## Safety Guards

- **TTL enforcement** — Jobs exceeding TTL are marked timed_out, not left running forever
- **Summary size limit** — Cap summaries at ~500 chars to prevent context bloat
- **Injection deduplication** — Track injected_at to prevent re-injection
- **Registry size limit** — Auto-cleanup completed+injected jobs older than 24h
- **PID validation** — Verify PID belongs to the expected command before trusting status

## Best Practices

- Always set a TTL (default: 1 hour)
- Write summaries in the format: "[PASS/FAIL] {command} — {key result in one line}"
- Clean up logs after injection
- Use job_ids that encode intent (e.g., "test-suite-run-1" not "job-abc123")

## Anti-Patterns

- Injecting full log contents (context explosion)
- Launching background jobs without TTL (zombie processes)
- Polling too frequently (wasted context on status checks)
- Never cleaning up the registry (unbounded growth)
- Relying on PID alone without log verification

## Examples

1. Background test suite: register → launch `npm test` → next session polls and gets "PASS: 1898/1898 tests passed"
2. Background build: register → launch `npm run build` → summary injected as "FAIL: TypeScript error in src/api.ts:45"

## Integration Points

- **Execute.fireAndForget** — The launch mechanism
- **dag-task-graph** — Background jobs can be nodes in a DAG
- **autonomous-task-claiming** — Workers can check for background job results before claiming new work
- **agent-messaging-protocol** — Job completion can trigger a message to the orchestrator

## Related Skills

- dag-task-graph
- autonomous-agent-harness
- enterprise-agent-ops
- continuous-agent-loop
