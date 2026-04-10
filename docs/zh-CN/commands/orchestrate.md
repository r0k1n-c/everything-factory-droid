---
description: 多智能体编排 — 顺序交接、并行代理、工作树隔离和控制平面快照
---

# 编排命令

协调多智能体工作流以完成复杂任务。支持顺序代理交接、并行执行、工作树隔离和操作员级会话管理。

## 工作流类型

$ARGUMENTS:
- `feature <description>` — 完整功能工作流
- `bugfix <description>` — 错误修复工作流
- `refactor <description>` — 重构工作流
- `security <description>` — 安全审查工作流
- `custom <agents> <description>` — 自定义代理序列

### 自定义工作流示例

```
/orchestrate custom "architect,tdd-guide,code-reviewer" "Redesign caching layer"
```

## 代理交接流水线

将代理按顺序链接，在每个步骤之间传递结构化上下文。每个代理接收前一个代理的输出，并添加自己的内容后再进行交接。

安全审查员模板：

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

## 并行执行

对于跨 tmux 窗格和隔离 git 工作树的并行代理执行，此命令利用 `dmux-workflows` 技能。有关以下内容的完整文档，请参阅该技能：

- Tmux 窗格编排模式
- `node scripts/orchestrate-worktrees.js` 辅助工具，用于基于工作树的并行工作
- `seedPaths` 配置，用于跨工作树共享本地文件

对于持久自主循环、调度和治理，请参阅 `autonomous-agent-harness` 技能。

## 控制平面快照

要导出实时 tmux/worktree 会话的控制平面快照，请运行：

```bash
node scripts/orchestration-status.js .factory/plan/workflow-visual-proof.json
```

快照包含会话活动、tmux 窗格元数据、工作器状态、目标、已播种的覆盖层以及最近的交接摘要，均以 JSON 格式保存。

## 操作员指挥中心交接

当工作流跨越多个会话、工作树或 tmux 窗格时，请在最终交接内容中附加一个控制平面块：

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

这使得规划者、实施者、审查者和循环工作器在操作员界面上保持清晰可辨。

## 提示

1. **从规划代理开始**处理复杂功能
2. **始终在合并前包含代码审查代理**
3. 处理认证/支付/个人身份信息时**使用安全审查代理**
4. **保持交接文档简洁** — 关注下一个代理需要什么
5. 如有需要，**在代理之间运行验证**
