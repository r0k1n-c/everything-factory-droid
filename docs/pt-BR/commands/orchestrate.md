---
description: Orquestração multiagente — handoffs sequenciais, agentes paralelos, isolamento por worktree e snapshots do plano de controle
---

# Comando Orchestrate

Coordene workflows multiagente para tarefas complexas. Suporta handoffs sequenciais entre agentes, execução paralela, isolamento por worktree e gerenciamento de sessão em nível de operador.

## Tipos de Workflow

$ARGUMENTS:
- `feature <description>` — Workflow completo de feature
- `bugfix <description>` — Workflow de correção de bug
- `refactor <description>` — Workflow de refatoração
- `security <description>` — Workflow de revisão de segurança
- `custom <agents> <description>` — Sequência customizada de agentes

### Exemplo de Workflow Customizado

```
/orchestrate custom "architect,tdd-guide,code-reviewer" "Redesign caching layer"
```

## Pipeline de Handoff entre Agentes

Encadeie agentes sequencialmente, passando contexto estruturado entre cada etapa. Cada agente recebe a saída do agente anterior e adiciona a sua própria antes de passar adiante.

Template do Security Reviewer:

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

## Execução Paralela

Para execução paralela de agentes em panes tmux e git worktrees isolados, este comando utiliza a skill `dmux-workflows`. Consulte essa skill para documentação completa sobre:

- Padrões de orquestração com panes tmux
- Helper `node scripts/orchestrate-worktrees.js` para trabalho paralelo baseado em worktrees
- Configuração `seedPaths` para compartilhar arquivos locais entre worktrees

Para loops autônomos persistentes, agendamento e governança, consulte a skill `autonomous-agent-harness`.

## Snapshots do Plano de Controle

Para exportar um snapshot do plano de controle de uma sessão tmux/worktree ao vivo, rode:

```bash
node scripts/orchestration-status.js .factory/plan/workflow-visual-proof.json
```

O snapshot inclui atividade da sessão, metadados de pane do tmux, estado dos workers, objetivos, overlays semeados e resumos recentes de handoff em formato JSON.

## Handoff do Command Center do Operador

Quando o workflow atravessar múltiplas sessões, worktrees ou panes tmux, acrescente um bloco de plano de controle ao handoff final:

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

Isso mantém planner, implementador, revisor e loop workers legíveis pela superfície de operação.

## Dicas

1. **Comece com planner** para features complexas
2. **Sempre inclua code-reviewer** antes do merge
3. **Use security-reviewer** para auth/pagamento/PII
4. **Mantenha handoffs concisos** — foque no que o próximo agente precisa
5. **Rode verificação** entre agentes quando necessário
