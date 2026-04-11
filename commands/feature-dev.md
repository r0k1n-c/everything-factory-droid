---
description: Guided feature development with codebase understanding and architecture focus
---

A structured feature-development workflow that emphasizes understanding existing code before writing new code.

> **与原生 Spec Mode 的区别 / vs native Spec Mode**
> 原生 Spec Mode（Shift+Tab）适合范围明确的任务，自动规划后直接实现。本命令适合需要先做深度代码库探索（Phase 2：`code-explorer`）和独立架构设计（Phase 4：`code-architect`）的复杂功能。
> Native Spec Mode (Shift+Tab) suits well-scoped tasks with automatic planning. Use `/feature-dev` when you need deep codebase exploration first and a dedicated architecture design step.
>
> **Spec mode 激活时 / In spec mode**: Phase 4 不单独调用 `ExitSpecMode`，整个 feature-dev 流程共享一次 spec mode 审批。 Phase 4 must not call `ExitSpecMode` separately — the entire workflow shares one spec mode approval.

## Phases

### 1. Discovery

- read the feature request carefully
- identify requirements, constraints, and acceptance criteria
- ask clarifying questions if the request is ambiguous

### 2. Codebase Exploration

- use `code-explorer` to analyze the relevant existing code
- trace execution paths and architecture layers
- understand integration points and conventions

### 3. Clarifying Questions

- present findings from exploration
- ask targeted design and edge-case questions
- wait for user response before proceeding

### 4. Architecture Design

- use `code-architect` to design the feature
- provide the implementation blueprint
- wait for approval before implementing

### 5. Implementation

- implement the feature following the approved design
- prefer TDD where appropriate
- keep commits small and focused

### 6. Quality Review

- use `code-reviewer` to review the implementation
- address critical and important issues
- verify test coverage

### 7. Summary

- summarize what was built
- list follow-up items or limitations
- provide testing instructions
