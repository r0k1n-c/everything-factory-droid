# Mission Dispatcher 使用指南

## 概述

`mission-dispatcher` 是 EFD 的统一调度层，将任务分解为 DAG、自动匹配专业 Agent、在隔离 worktree 中并行执行、最终合并结果。它串联了 AO-Pack 全部 5 个组件：

```
Mission Objective
    │
    ▼
dag-task-graph          ← 分解为 DAG（Phase 1）
    │
    ▼
Agent Capability Match  ← 47 个 agent 都有 capabilities/domain 字段（Phase 2）
    │
    ▼
git-worktree-isolation  ← 按任务创建隔离 worktree（Phase 3）
    │
    ▼
Task(subagent_type=     ← 原生 Droid 派发（Phase 4）
  "worker", prompt=agent.md)
    │
    ▼
autonomous-task-claiming ← 状态追踪 + 依赖解锁 + 断路器（Phase 5）
    │
    ▼
Merge + Report          ← squash merge + 标准化 handoff JSON（Phase 6-7）
```

---

## 用法一：直接调用（最简）

```
/mission-dispatcher

目标：为 api-auth-service 构建 JWT 认证 + RBAC 权限系统
```

Droid 会按 7 个阶段自动执行全部流程。

---

## 用法二：分步控制（推荐）

### Phase 1 — 分解为 DAG

```
帮我把这个需求分解为 task-graph.json：
- 数据库 schema 设计
- JWT 认证服务
- RBAC 权限服务
- 集成测试

其中 auth 和 rbac 依赖 schema，集成测试依赖两者。
```

Droid 生成 `.factory/artifacts/task-graph.json`：

```json
{
  "version": 1,
  "tasks": [
    {
      "id": "db-schema",
      "title": "数据库 schema 设计",
      "status": "pending",
      "dependencies": [],
      "required_capabilities": ["database-design", "architecture"],
      "tier": 0
    },
    {
      "id": "auth-service",
      "title": "JWT 认证服务",
      "status": "blocked",
      "dependencies": ["db-schema"],
      "required_capabilities": ["security", "authentication", "api-design"],
      "worktree_isolation": true,
      "tier": 1
    },
    {
      "id": "rbac-service",
      "title": "RBAC 权限服务",
      "status": "blocked",
      "dependencies": ["db-schema"],
      "required_capabilities": ["architecture", "authorization", "api-design"],
      "worktree_isolation": true,
      "tier": 1
    },
    {
      "id": "integration-tests",
      "title": "集成测试",
      "status": "blocked",
      "dependencies": ["auth-service", "rbac-service"],
      "required_capabilities": ["testing", "tdd"],
      "tier": 2
    }
  ]
}
```

**关键**：同一 tier 的任务可以并行执行。

### Phase 2 — 自动匹配 Agent

Droid 读取每个任务的 `required_capabilities`，在 47 个 agent 中查找最佳匹配：

| 任务 | 匹配 Agent | 匹配依据 |
|------|-----------|---------|
| db-schema | `architect` | capabilities: database-design, architecture |
| auth-service | `security-reviewer` | capabilities: security, authentication |
| rbac-service | `code-architect` | capabilities: architecture, design-patterns |
| integration-tests | `tdd-guide` | capabilities: testing, tdd, coverage |

匹配规则：
1. 过滤 `capabilities` 包含任务全部 `required_capabilities` 的 agent
2. 优先选择 `domain` 匹配的 agent
3. 无精确匹配时退回通用 `worker`
4. 可手动指定 `"assigned_agent": "security-reviewer"` 覆盖自动匹配

### Phase 3 — 创建隔离 Worktree

对 `worktree_isolation: true` 的任务：

```bash
git branch task/auth-service HEAD
git worktree add ../worktree-auth-service task/auth-service

git branch task/rbac-service HEAD
git worktree add ../worktree-rbac-service task/rbac-service
```

每个 worktree 拥有独立的工作目录和暂存区，共享 `.git` 对象库。

### Phase 4 — 并行派发

Droid 发出并行 `Task()` 调用：

```
Task(
  subagent_type = "worker",
  description = "实现 JWT 认证服务",
  prompt = """
    你是 security-reviewer：{agent 完整 markdown 内容}

    ## 任务
    在 worktree-auth-service/ 中实现 JWT 认证服务。

    ## 前置任务已完成
    - db-schema：已创建 users、sessions 表

    ## 完成后
    将 handoff 报告写入 .factory/handoffs/auth-service.json
  """
)
```

auth-service 和 rbac-service 同属 Tier 1，**同时并行执行**。

### Phase 5 — 状态追踪

每个 agent 完成后：
1. DAG 中对应任务状态更新为 `completed`
2. 运行 `task_unblock()` — 检查是否有任务从 `blocked` 转为 `pending`
3. auth + rbac 都完成后，integration-tests 自动解锁

安全机制：
- 单次会话最多派发 10 个任务（断路器）
- Claim TTL 30 分钟（agent 崩溃后任务自动释放）
- 失败重试上限 3 次

### Phase 6 — 合并 Worktree

按 tier 顺序合并（先 Tier 0，再 Tier 1）：

```bash
git checkout main
git merge --squash task/auth-service
git commit -m "feat: JWT auth service"

git merge --squash task/rbac-service
git commit -m "feat: RBAC permission service"

git worktree remove ../worktree-auth-service
git worktree remove ../worktree-rbac-service
git branch -d task/auth-service task/rbac-service
```

冲突处理：**永不自动解决** — 报告给 orchestrator 决策。

### Phase 7 — 收集报告

每个 agent 写出的标准 handoff 格式：

```json
{
  "task_id": "auth-service",
  "agent": "security-reviewer",
  "status": "completed",
  "files_changed": ["src/auth.ts", "tests/auth.test.ts"],
  "test_results": { "total": 12, "passed": 12, "failed": 0 },
  "summary": "实现了 JWT 认证，含注册/登录/刷新/登出四个端点，添加了速率限制。",
  "recommendation": "SHIP"
}
```

Droid 汇总所有 handoff，输出最终 Mission 报告。

---

## 用法三：在 Mission 系统中使用

在 Mission 的 `features.json` 中，orchestrator 可以将复杂任务委托给 mission-dispatcher：

```json
{
  "id": "parallel-auth-rbac",
  "description": "用 mission-dispatcher 并行构建 auth + rbac 模块",
  "skillName": "mission-dispatcher",
  "milestone": "core-api",
  "expectedBehavior": [
    "auth 和 rbac 在独立 worktree 中并行构建",
    "自动匹配 security-reviewer 和 code-architect",
    "合并后全部测试通过"
  ]
}
```

---

## 查看可用 Agent

```
列出所有 worktree-safe 的 agent 及其 capabilities
```

### Agent 能力索引

| Domain | Agent | 核心能力 | Worktree |
|--------|-------|---------|----------|
| architecture | `architect` | system-design, scalability, api-design, database-design | Yes |
| architecture | `code-architect` | architecture, codebase-analysis, design-patterns | Yes |
| security | `security-reviewer` | security, owasp, authentication, authorization | Yes |
| code-review | `code-reviewer` | code-review, security, maintainability, testing | Yes |
| code-review | `typescript-reviewer` | typescript, javascript, type-safety, async | Yes |
| code-review | `python-reviewer` | python, pep8, type-hints | Yes |
| code-review | `go-reviewer` | go, concurrency | Yes |
| code-review | `rust-reviewer` | rust, ownership, memory-safety | Yes |
| code-review | `java-reviewer` | java, spring-boot, jpa | Yes |
| code-review | `kotlin-reviewer` | kotlin, android, kmp, coroutines | Yes |
| code-review | `csharp-reviewer` | csharp, dotnet, async | Yes |
| code-review | `cpp-reviewer` | cpp, memory-safety, concurrency | Yes |
| code-review | `flutter-reviewer` | dart, flutter, state-management, accessibility | Yes |
| code-review | `database-reviewer` | postgresql, sql, query-optimization, schema-design | Yes |
| testing | `tdd-guide` | testing, tdd, coverage, test-design | Yes |
| testing | `e2e-runner` | e2e-testing, playwright, browser-testing | Yes |
| build | `build-error-resolver` | typescript, javascript, build-errors | Yes |
| refactoring | `refactor-cleaner` | refactoring, dead-code, cleanup | Yes |
| refactoring | `code-simplifier` | refactoring, simplification, maintainability | Yes |
| performance | `performance-optimizer` | performance, profiling, bundle-size, memory | Yes |
| implementation | `gan-generator` | implementation, full-stack, code-generation | Yes |
| documentation | `doc-updater` | documentation, codemap, markdown | Yes |
| analysis | `code-explorer` | codebase-analysis, flow-tracing, debugging | Yes |
| analysis | `silent-failure-hunter` | debugging, error-handling, reliability | Yes |
| seo | `seo-specialist` | seo, structured-data, performance, accessibility | Yes |

> 完整列表含 47 个 agent，其中 43 个标记为 `worktree-safe: true`。4 个需要 MCP 或全局状态的 agent（`docs-lookup`、`harness-optimizer`、`loop-operator`、`chief-of-staff`）标记为 `worktree-safe: false`。

---

## AO-Pack 组件关系

| 组件 | 对应阶段 | 作用 |
|------|---------|------|
| `dag-task-graph` | S07 | 任务依赖图、状态机、tier 分层 |
| `background-job-injection` | S08 | 后台任务注册、结果摘要回灌 |
| `agent-messaging-protocol` | S09-S10 | Agent 间消息、request-response 关联 |
| `autonomous-task-claiming` | S11 | 受控自治认领、断路器、冲突保护 |
| `git-worktree-isolation` | S12 | 每任务 worktree 隔离、合并、清理 |
| **`mission-dispatcher`** | **统一层** | **串联以上全部组件的 7 阶段调度** |

---

## 安全机制

| 机制 | 默认值 | 作用 |
|------|-------|------|
| 断路器 | 10 次/会话 | 防止无限派发 |
| Claim TTL | 30 分钟 | Agent 崩溃后任务自动释放 |
| 失败重试上限 | 3 次 | 超限标记为 failed，等待人工介入 |
| 紧急停止 | `.factory/artifacts/ao-pack-stop` | 创建此文件立即停止所有派发 |
| 合并冲突 | 永不自动解决 | 报告给 orchestrator 决策 |
| Worktree 清理 | 验证后才删除 | 防止误删主工作区 |
