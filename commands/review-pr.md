---
description: Comprehensive PR review using specialized agents
---

> **与原生 /review 的区别 / vs native /review**
> 原生 **/review** 的 "base branch" 模式适合单次 PR 审查。本命令并行调用 6 个专用 agent，去重后按严重程度输出，覆盖面更广。
> Factory's native **/review** base-branch mode covers single-pass PR review. This command chains 6 specialized agents in parallel and deduplicates findings across all perspectives.

Run a comprehensive multi-perspective review of a pull request.

## Usage

`/review-pr [PR-number-or-URL] [--focus=comments|tests|errors|types|code|simplify]`

If no PR is specified, review the current branch's PR. If no focus is specified, run the full review stack.

## Steps

1. Identify the PR:
   - use `gh pr view` to get PR details, changed files, and diff
2. Find project guidance:
   - look for `CLAUDE.md`, lint config, TypeScript config, repo conventions
3. Run specialized review agents:
   - `code-reviewer`
   - `comment-analyzer`
   - `pr-test-analyzer`
   - `silent-failure-hunter`
   - `type-design-analyzer`
   - `code-simplifier`
4. Aggregate results:
   - dedupe overlapping findings
   - rank by severity
5. Report findings grouped by severity

## Confidence Rule

Only report issues with confidence >= 80:

- Critical: bugs, security, data loss
- Important: missing tests, quality problems, style violations
- Advisory: suggestions only when explicitly requested
