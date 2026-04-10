---
description: 多 Agent 協調 — 循序交接、平行 Agent、Worktree 隔離與控制面板快照
---

# Orchestrate 指令

協調多 Agent 工作流程，處理複雜任務。支援循序 Agent 交接、平行執行、Worktree 隔離，以及操作層級的 Session 管理。

## 工作流程類型

$ARGUMENTS:
- `feature <description>` — 完整功能工作流程
- `bugfix <description>` — Bug 修復工作流程
- `refactor <description>` — 重構工作流程
- `security <description>` — 安全性審查工作流程
- `custom <agents> <description>` — 自訂 Agent 序列

### 自訂工作流程範例

```
/orchestrate custom "architect,tdd-guide,code-reviewer" "Redesign caching layer"
```

## Agent 交接管線

將 Agent 循序串接，在每個步驟之間傳遞結構化上下文。每個 Agent 會接收前一個 Agent 的輸出，加入自己的內容後再交接給下一個。

Security Reviewer 範本：

```markdown
Security Reviewer: [摘要]

### FILES CHANGED

[列出所有修改的檔案]

### TEST RESULTS

[測試通過/失敗摘要]

### SECURITY STATUS

[安全性發現]

### RECOMMENDATION

[SHIP / NEEDS WORK / BLOCKED]
```

## 平行執行

若需在 tmux 窗格及隔離的 git worktree 中平行執行 Agent，此指令會利用 `dmux-workflows` skill。詳細文件請參閱該 skill，涵蓋：

- Tmux 窗格協調模式
- `node scripts/orchestrate-worktrees.js` 輔助工具，用於基於 Worktree 的平行作業
- `seedPaths` 設定，用於在 Worktree 之間共享本地檔案

若需持久性自主迴圈、排程與治理，請參閱 `autonomous-agent-harness` skill。

## 控制面板快照

若要匯出即時 tmux/worktree session 的控制面板快照，請執行：

```bash
node scripts/orchestration-status.js .factory/plan/workflow-visual-proof.json
```

快照內容包含 session 活動、tmux 窗格中繼資料、worker 狀態、目標、種子覆蓋層，以及最近的交接摘要，格式為 JSON。

## 操作員指揮中心交接

當工作流程橫跨多個 session、worktree 或 tmux 窗格時，請在最終交接中附加控制面板區塊：

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

這使得 planner、implementer、reviewer 和 loop worker 都能從操作員介面清楚辨識。

## 提示

1. **複雜功能從 planner 開始**
2. **合併前總是包含 code-reviewer**
3. **對驗證/支付/PII 使用 security-reviewer**
4. **保持交接簡潔** — 專注於下一個 Agent 需要的內容
5. **如有需要，在 Agent 之間執行驗證**
