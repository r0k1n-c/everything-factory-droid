---
name: security-scan
description: Scan your Factory Droid configuration (.factory/ directory) for security vulnerabilities, misconfigurations, and injection risks using AgentShield. Checks AGENTS.md, settings.json, MCP servers, hooks, and agent definitions.
origin: EFD
---

# Security Scan Skill

Audit your Factory Droid configuration for security issues using [AgentShield](https://github.com/affaan-m/agentshield).

## When to Activate

- Setting up a new Factory Droid project
- After modifying `.factory/settings.json`, `AGENTS.md`, or MCP configs
- Before committing configuration changes
- When onboarding to a new repository with existing Factory Droid configs
- Periodic security hygiene checks

## What It Scans

| File | Checks |
|------|--------|
| `AGENTS.md` | Hardcoded secrets, auto-run instructions, prompt injection patterns |
| `settings.json` | Overly permissive allow lists, missing deny lists, dangerous bypass flags |
| `mcp.json` | Risky MCP servers, hardcoded env secrets, npx supply chain risks |
| `hooks/` | Command injection via interpolation, data exfiltration, silent error suppression |
| `agents/*.md` | Unrestricted tool access, prompt injection surface, missing model specs |

## Prerequisites

AgentShield must be installed. Check and install if needed:

```bash
# Check if installed
npx efd-agentshield --version

# Install globally (recommended)
npm install -g efd-agentshield

# Or run directly via npx (no install needed)
npx efd-agentshield scan .
```

## Usage

### Basic Scan

Run against the current project's `.factory/` directory:

```bash
# Scan current project
npx efd-agentshield scan

# Scan a specific path
npx efd-agentshield scan --path /path/to/.factory

# Scan with minimum severity filter
npx efd-agentshield scan --min-severity medium
```

### Output Formats

```bash
# Terminal output (default) — colored report with grade
npx efd-agentshield scan

# JSON — for CI/CD integration
npx efd-agentshield scan --format json

# Markdown — for documentation
npx efd-agentshield scan --format markdown

# HTML — self-contained dark-theme report
npx efd-agentshield scan --format html > security-report.html
```

### Auto-Fix

Apply safe fixes automatically (only fixes marked as auto-fixable):

```bash
npx efd-agentshield scan --fix
```

This will:
- Replace hardcoded secrets with environment variable references
- Tighten wildcard permissions to scoped alternatives
- Never modify manual-only suggestions

### Opus 4.6 Deep Analysis

Run the adversarial three-agent pipeline for deeper analysis:

```bash
# Requires ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY=your-key
npx efd-agentshield scan --opus --stream
```

This runs:
1. **Attacker (Red Team)** — finds attack vectors
2. **Defender (Blue Team)** — recommends hardening
3. **Auditor (Final Verdict)** — synthesizes both perspectives

### Initialize Secure Config

Scaffold a new secure `.factory/` configuration from scratch:

```bash
npx efd-agentshield init
```

Creates:
- `settings.json` with scoped permissions and deny list
- `AGENTS.md` with security best practices
- `mcp.json` placeholder

### GitHub Action

Add to your CI pipeline:

```yaml
- uses: affaan-m/agentshield@v1
  with:
    path: '.'
    min-severity: 'medium'
    fail-on-findings: true
```

## Severity Levels

| Grade | Score | Meaning |
|-------|-------|---------|
| A | 90-100 | Secure configuration |
| B | 75-89 | Minor issues |
| C | 60-74 | Needs attention |
| D | 40-59 | Significant risks |
| F | 0-39 | Critical vulnerabilities |

## Interpreting Results

### Critical Findings (fix immediately)
- Hardcoded API keys or tokens in config files
- `Bash(*)` in the allow list (unrestricted shell access)
- Command injection in hooks via `${file}` interpolation
- Shell-running MCP servers

### High Findings (fix before production)
- Auto-run instructions in AGENTS.md (prompt injection vector)
- Missing deny lists in permissions
- Agents with unnecessary Bash access

### Medium Findings (recommended)
- Silent error suppression in hooks (`2>/dev/null`, `|| true`)
- Missing PreToolUse security hooks
- `npx -y` auto-install in MCP server configs

### Info Findings (awareness)
- Missing descriptions on MCP servers
- Prohibitive instructions correctly flagged as good practice

## Links

- **GitHub**: [github.com/affaan-m/agentshield](https://github.com/affaan-m/agentshield)
- **npm**: [npmjs.com/package/efd-agentshield](https://www.npmjs.com/package/efd-agentshield)
