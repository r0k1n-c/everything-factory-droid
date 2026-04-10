---
description: Multi-agent orchestration — sequential handoffs, parallel agents, worktree isolation, and control-plane snapshots
---

# Orchestrate Command

Coordinate multi-agent workflows for complex tasks. Supports sequential agent handoffs, parallel execution, worktree isolation, and operator-level session management.

## Workflow Types

$ARGUMENTS:
- `feature <description>` — Full feature workflow
- `bugfix <description>` — Bug fix workflow
- `refactor <description>` — Refactoring workflow
- `security <description>` — Security review workflow
- `custom <agents> <description>` — Custom agent sequence

### Custom Workflow Example

```
/orchestrate custom "architect,tdd-guide,code-reviewer" "Redesign caching layer"
```

## Agent Handoff Pipeline

Chain agents sequentially, passing structured context between each step. Each agent receives the previous agent's output and adds its own before handing off.

Security Reviewer template:

```markdown
Security Reviewer: [summary]

### FILES CHANGED

[List all files modified]

### TEST RESULTS

[Test pass/fail summary]

### SECURITY STATUS

[Security findings]

### RECOMMENDATION

[SHIP / NEEDS WORK / BLOCKED]
```

## Parallel Execution

For parallel agent execution across tmux panes and isolated git worktrees, this command leverages the `dmux-workflows` skill. See that skill for full documentation on:

- Tmux pane orchestration patterns
- `node scripts/orchestrate-worktrees.js` helper for worktree-based parallel work
- `seedPaths` configuration for sharing local files across worktrees

For persistent autonomous loops, scheduling, and governance, see the `autonomous-agent-harness` skill.

## Control-Plane Snapshots

To export a control-plane snapshot for a live tmux/worktree session, run:

```bash
node scripts/orchestration-status.js .factory/plan/workflow-visual-proof.json
```

The snapshot includes session activity, tmux pane metadata, worker states, objectives, seeded overlays, and recent handoff summaries in JSON form.

## Operator Command-Center Handoff

When the workflow spans multiple sessions, worktrees, or tmux panes, append a control-plane block to the final handoff:

```markdown
CONTROL PLANE
-------------
Sessions:
- active session ID or alias
- branch + worktree path for each active worker
- tmux pane or detached session name when applicable

Diffs:
- git status summary
- git diff --stat for touched files
- merge/conflict risk notes

Approvals:
- pending user approvals
- blocked steps awaiting confirmation

Telemetry:
- last activity timestamp or idle signal
- estimated token or cost drift
- policy events raised by hooks or reviewers
```

This keeps planner, implementer, reviewer, and loop workers legible from the operator surface.

## Tips

1. **Start with planner** for complex features
2. **Always include code-reviewer** before merge
3. **Use security-reviewer** for auth/payment/PII
4. **Keep handoffs concise** — focus on what the next agent needs
5. **Run verification** between agents if needed
