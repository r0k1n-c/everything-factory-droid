---
name: skill-health
description: Show skill portfolio health dashboard with charts and analytics
command: true
---

# Skill Health Dashboard

Shows a comprehensive health dashboard for all skills in the portfolio with success rate sparklines, failure pattern clustering, pending amendments, and version history.

## Implementation

Run the skill health CLI in dashboard mode:

```bash
EFD_ROOT="${FACTORY_PROJECT_DIR:-$(node -e "console.log((()=>{var p=require('path'),f=require('fs'),h=require('os').homedir(),d=p.join(h,'.factory'),q=p.join('scripts','lib','utils.js');if(f.existsSync(p.join(d,q)))return d;for(var l of [p.join(d,'plugins','everything-factory-droid'),p.join(d,'plugins','everything-factory-droid@everything-factory-droid'),p.join(d,'plugins','marketplace','everything-factory-droid')])if(f.existsSync(p.join(l,q)))return l;try{var b=p.join(d,'plugins','cache','everything-factory-droid');for(var o of f.readdirSync(b,{withFileTypes:true})){if(!o.isDirectory())continue;for(var v of f.readdirSync(p.join(b,o.name),{withFileTypes:true})){if(!v.isDirectory())continue;var c=p.join(b,o.name,v.name);if(f.existsSync(p.join(c,q)))return c}}}catch(x){}return d})())")}"
node "$EFD_ROOT/scripts/skills-health.js" --dashboard
```

For a specific panel only:

```bash
EFD_ROOT="${FACTORY_PROJECT_DIR:-$(node -e "console.log((()=>{var p=require('path'),f=require('fs'),h=require('os').homedir(),d=p.join(h,'.factory'),q=p.join('scripts','lib','utils.js');if(f.existsSync(p.join(d,q)))return d;for(var l of [p.join(d,'plugins','everything-factory-droid'),p.join(d,'plugins','everything-factory-droid@everything-factory-droid'),p.join(d,'plugins','marketplace','everything-factory-droid')])if(f.existsSync(p.join(l,q)))return l;try{var b=p.join(d,'plugins','cache','everything-factory-droid');for(var o of f.readdirSync(b,{withFileTypes:true})){if(!o.isDirectory())continue;for(var v of f.readdirSync(p.join(b,o.name),{withFileTypes:true})){if(!v.isDirectory())continue;var c=p.join(b,o.name,v.name);if(f.existsSync(p.join(c,q)))return c}}}catch(x){}return d})())")}"
node "$EFD_ROOT/scripts/skills-health.js" --dashboard --panel failures
```

For machine-readable output:

```bash
EFD_ROOT="${FACTORY_PROJECT_DIR:-$(node -e "console.log((()=>{var p=require('path'),f=require('fs'),h=require('os').homedir(),d=p.join(h,'.factory'),q=p.join('scripts','lib','utils.js');if(f.existsSync(p.join(d,q)))return d;for(var l of [p.join(d,'plugins','everything-factory-droid'),p.join(d,'plugins','everything-factory-droid@everything-factory-droid'),p.join(d,'plugins','marketplace','everything-factory-droid')])if(f.existsSync(p.join(l,q)))return l;try{var b=p.join(d,'plugins','cache','everything-factory-droid');for(var o of f.readdirSync(b,{withFileTypes:true})){if(!o.isDirectory())continue;for(var v of f.readdirSync(p.join(b,o.name),{withFileTypes:true})){if(!v.isDirectory())continue;var c=p.join(b,o.name,v.name);if(f.existsSync(p.join(c,q)))return c}}}catch(x){}return d})())")}"
node "$EFD_ROOT/scripts/skills-health.js" --dashboard --json
```

## Usage

```
/skill-health                    # Full dashboard view
/skill-health --panel failures   # Only failure clustering panel
/skill-health --json             # Machine-readable JSON output
```

## What to Do

1. Run the skills-health.js script with --dashboard flag
2. Display the output to the user
3. If any skills are declining, highlight them and suggest running /evolve
4. If there are pending amendments, suggest reviewing them

## Panels

- **Success Rate (30d)** — Sparkline charts showing daily success rates per skill
- **Failure Patterns** — Clustered failure reasons with horizontal bar chart
- **Pending Amendments** — Amendment proposals awaiting review
- **Version History** — Timeline of version snapshots per skill
