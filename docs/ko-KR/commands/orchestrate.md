---
description: 멀티 에이전트 오케스트레이션 — 순차 핸드오프, 병렬 에이전트, 워크트리 격리, 컨트롤 플레인 스냅샷
---

# Orchestrate 커맨드

복잡한 작업을 위한 멀티 에이전트 워크플로우를 조율합니다. 순차적 에이전트 핸드오프, 병렬 실행, 워크트리 격리, 운영자 수준의 세션 관리를 지원합니다.

## 워크플로우 유형

$ARGUMENTS:
- `feature <description>` — 전체 기능 워크플로우
- `bugfix <description>` — 버그 수정 워크플로우
- `refactor <description>` — 리팩토링 워크플로우
- `security <description>` — 보안 리뷰 워크플로우
- `custom <agents> <description>` — 사용자 정의 에이전트 순서

### 사용자 정의 워크플로우 예시

```
/orchestrate custom "architect,tdd-guide,code-reviewer" "Redesign caching layer"
```

## 에이전트 핸드오프 파이프라인

에이전트를 순차적으로 연결하여 각 단계 간에 구조화된 컨텍스트를 전달합니다. 각 에이전트는 이전 에이전트의 출력을 받아 자신의 결과를 추가한 뒤 다음으로 넘깁니다.

Security Reviewer 템플릿:

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

## 병렬 실행

tmux 패인과 격리된 git 워크트리를 활용한 병렬 에이전트 실행을 위해, 이 커맨드는 `dmux-workflows` 스킬을 사용합니다. 다음 항목에 대한 전체 문서는 해당 스킬을 참고하세요:

- tmux 패인 오케스트레이션 패턴
- 워크트리 기반 병렬 작업을 위한 `node scripts/orchestrate-worktrees.js` 헬퍼
- 워크트리 간 로컬 파일 공유를 위한 `seedPaths` 설정

지속적인 자율 루프, 스케줄링 및 거버넌스에 대해서는 `autonomous-agent-harness` 스킬을 참고하세요.

## 컨트롤 플레인 스냅샷

실행 중인 tmux/워크트리 세션의 컨트롤 플레인 스냅샷을 내보내려면 다음을 실행하세요:

```bash
node scripts/orchestration-status.js .factory/plan/workflow-visual-proof.json
```

스냅샷에는 세션 활동, tmux 패인 메타데이터, 워커 상태, 목표, 시드된 오버레이, 최근 핸드오프 요약이 JSON 형식으로 포함됩니다.

## 운영자 커맨드 센터 핸드오프

워크플로우가 여러 세션, 워크트리 또는 tmux 패인에 걸쳐 있을 때, 최종 핸드오프에 컨트롤 플레인 블록을 추가하세요:

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

이를 통해 planner, implementer, reviewer, loop worker가 운영자 화면에서 명확하게 파악됩니다.

## 팁

1. 복잡한 기능에는 **planner부터 시작**하세요
2. merge 전에는 **항상 code-reviewer를 포함**하세요
3. 인증/결제/개인정보 처리에는 **security-reviewer를 사용**하세요
4. **핸드오프는 간결하게** 유지하세요 — 다음 에이전트에 필요한 것에 집중
5. 필요한 경우 에이전트 사이에 **검증을 실행**하세요
