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

## Mission Worker 行为 / Mission Worker Behavior

> **在 /missions worker 内不要使用本命令 / Do not use inside /missions workers**
> 原生 **/missions** 已管理 agent 派发、功能排序和里程碑跟踪。在 worker 内调用 `/orchestrate` 会形成三层嵌套编排（mission → orchestrate pipeline → sub-agents），导致上下文爆炸和 handoff 状态不同步。
> Factory's native **/missions** already manages agent dispatch, feature sequencing, and milestone tracking. Calling `/orchestrate` inside a worker creates three-level nested orchestration, causing context explosion and breaking handoff synchronization.

In a mission worker, implement directly using `/tdd`, `/code-review`, or individual Task calls — do not start a new orchestration pipeline.

## Spec Mode 行为 / Spec Mode Behavior

> **两个阶段，规则不同 / Two phases, different rules**
> 规划迭代阶段：可以多次调用 ExitSpecMode，每次基于**原始用户需求**重新生成方案，不读取任何已保存的 spec 文件。
> 执行阶段（用户审批后）：不再调用 ExitSpecMode，子 agent 也不调用。
>
> Planning phase: `ExitSpecMode` may be called multiple times as the user iterates. Each call must regenerate from the **original user request**, not from any saved spec file.
> Execution phase (after approval): never call `ExitSpecMode` again — neither the orchestrator nor any sub-agent.

When spec mode is active (system message says "Spec mode is active"):

### 规划阶段 / Planning phase

- Generate the orchestration plan from the **original user request** directly — the agent sequence, workflow type, handoff steps, and what each agent will produce.
- Call `ExitSpecMode` to present this plan.
- If the user requests changes or re-planning ("modify", "re-plan", "change the approach"):
  - Regenerate the plan from the **original user request** plus the user's feedback.
  - Do **not** read `.factory/docs/`, `.factory/specs/`, or any previously saved spec file as the starting point — doing so creates a circular dependency where the plan iterates on itself instead of the requirement.
  - Call `ExitSpecMode` again with the revised plan.
- Repeat until the user approves.

Example plan content for `ExitSpecMode`:
```
Workflow: feature — "build auth system"
Agent pipeline:
  1. planner      → implementation plan with phases and file list
  2. tdd-guide    → code written test-first, 80%+ coverage
  3. code-reviewer → review findings, SHIP/NEEDS WORK verdict
Handoff format: structured markdown passed between each step.
```

### 执行阶段 / Execution phase

- Once the user approves, begin executing the pipeline immediately.
- Do **not** call `ExitSpecMode` again at any point during execution.
- When constructing the Task prompt for every sub-agent, prepend this block verbatim:

  ```
  ORCHESTRATION CONTEXT: You are a worker inside an approved orchestration
  pipeline. Spec mode approval has already been given by the orchestrator.
  Do NOT call ExitSpecMode under any circumstances. Proceed directly with
  the task described below.
  ```

- Do **not** invoke the `blueprint` skill — the approved plan IS the spec.

## Tips

1. **Start with planner** for complex features
2. **Always include code-reviewer** before merge
3. **Use security-reviewer** for auth/payment/PII
4. **Keep handoffs concise** — focus on what the next agent needs
5. **Run verification** between agents if needed
