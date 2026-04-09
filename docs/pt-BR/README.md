**Idioma:** [English](../../README.md) | [简体中文](../zh-CN/README.md) | [繁體中文](../zh-TW/README.md) | [日本語](../ja-JP/README.md) | [한국어](../ko-KR/README.md) | [Türkçe](../tr/README.md) | Português (BR)

# Everything Factory Droid

[![Stars](https://img.shields.io/github/stars/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/stargazers)
[![Forks](https://img.shields.io/github/forks/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/network/members)
[![Contributors](https://img.shields.io/github/contributors/r0k1n-c/everything-factory-droid?style=flat)](https://github.com/r0k1n-c/everything-factory-droid/graphs/contributors)
[![npm efd-install](https://img.shields.io/npm/dw/%40r0k1n-c%2Fefd-install?label=efd-install%20weekly%20downloads&logo=npm)](https://www.npmjs.com/package/@r0k1n-c/efd-install)
[![npm efd-agentshield](https://img.shields.io/npm/dw/efd-agentshield?label=efd-agentshield%20weekly%20downloads&logo=npm)](https://www.npmjs.com/package/efd-agentshield)
[![GitHub App Install](https://img.shields.io/badge/GitHub%20App-150%20installs-2ea44f?logo=github)](https://github.com/marketplace/efd-tools)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
![Shell](https://img.shields.io/badge/-Shell-4EAA25?logo=gnu-bash&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/-Python-3776AB?logo=python&logoColor=white)
![Go](https://img.shields.io/badge/-Go-00ADD8?logo=go&logoColor=white)
![Java](https://img.shields.io/badge/-Java-ED8B00?logo=openjdk&logoColor=white)
![Markdown](https://img.shields.io/badge/-Markdown-000000?logo=markdown&logoColor=white)

> **Foco em Factory Droid** | **47 agentes** | **172 skills** | **79 comandos** | **Instaladores multiplataforma**

---

<div align="center">

**Idioma / Language / 语言**

[**English**](../../README.md) | [简体中文](../zh-CN/README.md) | [繁體中文](../zh-TW/README.md) | [日本語](../ja-JP/README.md) | [한국어](../ko-KR/README.md) | [Türkçe](../tr/README.md) | [Português (BR)](README.md)

</div>

---

**Um sistema completo de fluxos de trabalho do Factory Droid para equipes de engenharia modernas.**

Uma coleção curada de agentes, skills, hooks, regras, configurações MCP, instaladores e command shims para Factory Droid, cobrindo planejamento, implementação, revisão, segurança, pesquisa e operações.

Este projeto agora é focado exclusivamente em **Factory Droid**.

---

## Os Guias

Este repositório contém apenas o código. Os guias explicam tudo.

<table>
<tr>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2012378465664745795">
<img src="../../assets/images/guides/shorthand-guide.png" alt="The Shorthand Guide to Everything Factory Droid" />
</a>
</td>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2014040193557471352">
<img src="../../assets/images/guides/longform-guide.png" alt="The Longform Guide to Everything Factory Droid" />
</a>
</td>
<td width="33%">
<a href="https://x.com/affaanmustafa/status/2033263813387223421">
<img src="../../assets/images/security/security-guide-header.png" alt="The Shorthand Guide to Everything Agentic Security" />
</a>
</td>
</tr>
<tr>
<td align="center"><b>Guia Resumido</b><br/>Configuração, fundamentos, filosofia. <b>Leia este primeiro.</b></td>
<td align="center"><b>Guia Completo</b><br/>Otimização de tokens, persistência de memória, evals, paralelização.</td>
<td align="center"><b>Guia de Segurança</b><br/>Vetores de ataque, sandboxing, sanitização, CVEs, AgentShield.</td>
</tr>
</table>

| Tópico | O Que Você Aprenderá |
|--------|----------------------|
| Otimização de Tokens | Seleção de modelo, redução de prompt de sistema, processos em segundo plano |
| Persistência de Memória | Hooks que salvam/carregam contexto entre sessões automaticamente |
| Aprendizado Contínuo | Extração automática de padrões das sessões em skills reutilizáveis |
| Loops de Verificação | Checkpoint vs evals contínuos, tipos de avaliador, métricas pass@k |
| Paralelização | Git worktrees, método cascade, quando escalar instâncias |
| Orquestração de Subagentes | O problema de contexto, padrão de recuperação iterativa |

---

## Início Rápido

Comece em menos de 2 minutos:

### Passo 1: Instalar o Plugin

```bash
# Adicionar marketplace
droid plugin marketplace add https://github.com/r0k1n-c/everything-factory-droid

# Instalar plugin
droid plugin install everything-factory-droid@everything-factory-droid
```

### Passo 2: Instalar as Regras (Obrigatório)

> WARNING: **Importante:** Plugins do Factory Droid não podem distribuir `rules` automaticamente. Instale-as manualmente:

```bash
# Execute o instalador na RAIZ DO PROJETO de destino
cd /caminho/do/seu-projeto

# Recomendado: sem clonar o repositório
npx @r0k1n-c/efd-install --profile full

# Ou instale só o que precisar
npx @r0k1n-c/efd-install typescript    # ou python ou golang ou swift ou php
# npx @r0k1n-c/efd-install typescript python golang swift php
# npx @r0k1n-c/efd-install --profile developer
# npx @r0k1n-c/efd-install --with lang:typescript --with capability:security
```

```powershell
# Windows PowerShell — também na RAIZ DO PROJETO de destino
Set-Location C:\caminho\do\seu-projeto
npx @r0k1n-c/efd-install --profile full
# npx @r0k1n-c/efd-install typescript
# npx @r0k1n-c/efd-install --profile developer
# npx @r0k1n-c/efd-install --with lang:typescript --with capability:security
```

```bash
# Alternativa: clone este repositório em qualquer lugar, mas execute o instalador
# na RAIZ DO PROJETO de destino (não dentro do clone nem de ~/.factory/plugins/...)
git clone https://github.com/r0k1n-c/everything-factory-droid.git ~/everything-factory-droid
cd /caminho/do/seu-projeto
bash ~/everything-factory-droid/install.sh typescript
# bash ~/everything-factory-droid/install.sh --profile full
```

Não execute `install.sh` dentro de `~/.factory/plugins/...` nem dentro do repositório clonado, a menos que aquele diretório seja o projeto que você realmente quer configurar.

### Passo 3: Começar a Usar

```bash
# Experimente um comando (a instalação do plugin usa forma com namespace)
/everything-factory-droid:plan "Adicionar autenticação de usuário"

# Instalação manual (Opção 2) usa a forma mais curta:
# /plan "Adicionar autenticação de usuário"

# Verificar a instalação do plugin
droid plugin list
```

**Pronto!** Você agora tem acesso a 47 agentes, 172 skills e 79 comandos.

---

## Foco no Factory Droid

Este projeto mantém apenas a superfície compatível com o **Factory Droid**:

- `./install.sh`, `npx efd` e `npx @r0k1n-c/efd-install` resolvem para o alvo Factory Droid.
- Instalações locais no projeto gravam em `.factory/`.
- Os artefatos empacotados ficam limitados a droids, skills, commands e `settings.json` do Factory Droid.
- A documentação de Cursor/Codex/OpenCode/Antigravity foi removida intencionalmente deste projeto.

## O Que Está Incluído

```
everything-factory-droid/
|-- .factory/         # Configuração local de projeto do Factory Droid
|   |-- settings.json       # Configurações de projeto deste repositório
|   |-- package-manager.json # Gerenciador de pacotes preferido para o repositório
|   |-- identity.json       # Metadados de identidade do projeto
|   |-- rules/              # Guardrails locais do Droid
|
|-- agents/           # 47 subagentes especializados para delegação
|-- skills/           # Definições de fluxo de trabalho e conhecimento de domínio
|-- commands/         # Comandos slash para execução rápida
|-- rules/            # Diretrizes sempre seguidas (copiar para ~/.factory/rules/)
|-- hooks/            # Automações baseadas em gatilhos
|-- scripts/          # Scripts Node.js multiplataforma
|-- tests/            # Suíte de testes
|-- contexts/         # Contextos de injeção de prompt de sistema
|-- examples/         # Configurações e sessões de exemplo
|-- mcp-configs/      # Configurações de servidor MCP
```

---

## Ferramentas do Ecossistema

### Criador de Skills

Dois modos de gerar skills do Factory Droid a partir do seu repositório:

#### Opção A: Análise Local (Integrada)

Use o comando `/skill-create` para análise local sem serviços externos:

```bash
/skill-create                    # Analisar repositório atual
/skill-create --instincts        # Também gerar instincts para continuous-learning
```

#### Opção B: GitHub App (Avançado)

Para recursos avançados (10k+ commits, PRs automáticos, compartilhamento em equipe):

[Instalar GitHub App](https://github.com/apps/skill-creator) | [efd.tools](https://efd.tools)

### AgentShield — Auditor de Segurança

> Auditor de segurança independente para configurações do Factory Droid, riscos de configuração e defesa contra prompt injection.

```bash
# Verificação rápida (sem instalação necessária)
npx efd-agentshield scan

# Corrigir automaticamente problemas seguros
npx efd-agentshield scan --fix

# Análise profunda com três agentes Opus 4.6
npx efd-agentshield scan --opus --stream

# Gerar configuração segura do zero
npx efd-agentshield init
```

### Aprendizado Contínuo v2

O sistema de aprendizado baseado em instincts aprende automaticamente seus padrões:

```bash
/instinct-status        # Mostrar instincts aprendidos com confiança
/instinct-import <file> # Importar instincts de outros
/instinct-export        # Exportar seus instincts para compartilhar
/evolve                 # Agrupar instincts relacionados em skills
```

---

## Requisitos

### Versão do Factory Droid CLI

**Versão mínima: v2.1.0 ou posterior**

Verifique sua versão:
```bash
droid --version
```

---

## Instalação

### Opção 1: Instalar como Plugin (Recomendado)

```bash
# Adicionar este repositório como marketplace
droid plugin marketplace add https://github.com/r0k1n-c/everything-factory-droid

# Instalar o plugin
droid plugin install everything-factory-droid@everything-factory-droid
```

Ou adicione diretamente ao seu `~/.factory/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "everything-factory-droid": {
      "source": {
        "source": "github",
        "repo": "r0k1n-c/everything-factory-droid"
      }
    }
  },
  "enabledPlugins": {
    "everything-factory-droid@everything-factory-droid": true
  }
}
```

> **Nota:** O sistema de plugins do Factory Droid não suporta distribuição de `rules` via plugins. Faça a instalação no projeto de destino, por exemplo:
>
> ```bash
> cd /caminho/do/seu-projeto
> npx @r0k1n-c/efd-install typescript
> # npx @r0k1n-c/efd-install --profile full
> #
> # Ou, se você clonou este repo em outro lugar:
> # bash /caminho/para/everything-factory-droid/install.sh typescript
> ```
>
> Se preferir copiar os arquivos manualmente:
>
> ```bash
> # Clone o repositório primeiro
> git clone https://github.com/r0k1n-c/everything-factory-droid.git
>
> # Opção A: Regras no nível do usuário (aplica a todos os projetos)
> mkdir -p ~/.factory/rules
> cp -r everything-factory-droid/rules/common ~/.factory/rules/
> cp -r everything-factory-droid/rules/typescript ~/.factory/rules/   # escolha sua stack
>
> # Opção B: Regras no nível do projeto (aplica apenas ao projeto atual)
> mkdir -p .factory/rules
> cp -r everything-factory-droid/rules/common .factory/rules/
> ```

---

### Opção 2: Instalação Manual

```bash
# Clonar o repositório
git clone https://github.com/r0k1n-c/everything-factory-droid.git

# Copiar agentes para sua config do Factory Droid
cp everything-factory-droid/agents/*.md ~/.factory/droids/

# Copiar regras (comuns + específicas da linguagem)
cp -r everything-factory-droid/rules/common ~/.factory/rules/
cp -r everything-factory-droid/rules/typescript ~/.factory/rules/

# Copiar comandos
cp everything-factory-droid/commands/*.md ~/.factory/commands/

# Copiar skills (core vs nicho)
for s in article-writing content-engine e2e-testing eval-harness frontend-patterns frontend-slides market-research search-first security-review strategic-compact tdd-workflow verification-loop; do
  cp -r everything-factory-droid/skills/$s ~/.factory/skills/
done
```

---

## Conceitos-Chave

### Agentes

Subagentes lidam com tarefas delegadas com escopo limitado.

### Skills

Skills são definições de fluxo de trabalho invocadas por comandos ou agentes.

### Hooks

Hooks disparam em eventos de ferramenta. Exemplo — avisar sobre console.log:

```json
{
  "matcher": "tool == \"Edit\" && tool_input.file_path matches \"\\\\.(ts|tsx|js|jsx)$\"",
  "hooks": [{
    "type": "command",
    "command": "#!/bin/bash\ngrep -n 'console\\.log' \"$file_path\" && echo '[Hook] Remova o console.log' >&2"
  }]
}
```

### Regras

Regras são diretrizes sempre seguidas, organizadas em `common/` (agnóstico à linguagem) + diretórios específicos por linguagem.

---

## Qual Agente Devo Usar?

| Quero... | Use este comando | Agente usado |
|----------|-----------------|--------------|
| Planejar um novo recurso | `/everything-factory-droid:plan "Adicionar auth"` | planner |
| Projetar arquitetura de sistema | `/everything-factory-droid:plan` + agente architect | architect |
| Escrever código com testes primeiro | `/tdd` | tdd-guide |
| Revisar código que acabei de escrever | `/code-review` | code-reviewer |
| Corrigir build com falha | `/build-fix` | build-error-resolver |
| Executar testes end-to-end | `/e2e` | e2e-runner |
| Encontrar vulnerabilidades de segurança | `/security-scan` | security-reviewer |
| Remover código morto | `/refactor-clean` | refactor-cleaner |
| Atualizar documentação | `/update-docs` | doc-updater |
| Revisar código Go | `/go-review` | go-reviewer |
| Revisar código Python | `/python-review` | python-reviewer |

### Fluxos de Trabalho Comuns

**Começando um novo recurso:**
```
/everything-factory-droid:plan "Adicionar autenticação de usuário com OAuth"
                                              → planner cria blueprint de implementação
/tdd                                          → tdd-guide aplica escrita de testes primeiro
/code-review                                  → code-reviewer verifica seu trabalho
```

**Corrigindo um bug:**
```
/tdd                                          → tdd-guide: escrever teste falhando que reproduz o bug
                                              → implementar a correção, verificar se o teste passa
/code-review                                  → code-reviewer: detectar regressões
```

**Preparando para produção:**
```
/security-scan                                → security-reviewer: auditoria OWASP Top 10
/e2e                                          → e2e-runner: testes de fluxo crítico do usuário
/test-coverage                                → verificar cobertura 80%+
```

---

## FAQ

<details>
<summary><b>Como verificar quais agentes/comandos estão instalados?</b></summary>

```bash
droid plugin list
```
</details>

<details>
<summary><b>Meus hooks não estão funcionando / Vejo erros "Duplicate hooks file"</b></summary>

Este é o problema mais comum. **NÃO adicione declarações duplicadas de hooks fora de `hooks/hooks.json`.** O Factory Droid v2.1+ carrega `hooks/hooks.json` automaticamente; declarar hooks de novo causa erros de detecção de duplicatas.
</details>

<details>
<summary><b>Este projeto suporta outros harnesses?</b></summary>

Não. Este projeto mantém intencionalmente apenas a superfície **Factory Droid**.
</details>

<details>
<summary><b>Como contribuir com uma nova skill ou agente?</b></summary>

Veja [CONTRIBUTING.md](../../CONTRIBUTING.md). Em resumo:
1. Faça um fork do repositório
2. Crie sua skill em `skills/seu-nome-de-skill/SKILL.md` (com frontmatter YAML)
3. Ou crie um agente em `agents/seu-agente.md`
4. Envie um PR com uma descrição clara do que faz e quando usar
</details>

---

## Executando Testes

```bash
# Executar todos os testes
node tests/run-all.js

# Executar arquivos de teste individuais
node tests/lib/utils.test.js
node tests/lib/package-manager.test.js
node tests/hooks/hooks.test.js
```

---

## Contribuindo

**Contribuições são bem-vindas e incentivadas.**

Este repositório é um recurso para a comunidade. Se você tem:
- Agentes ou skills úteis
- Hooks inteligentes
- Melhores configurações MCP
- Regras aprimoradas

Por favor contribua! Veja [CONTRIBUTING.md](../../CONTRIBUTING.md) para diretrizes.

---

## Licença

MIT — consulte o [arquivo LICENSE](../../LICENSE) para detalhes.
