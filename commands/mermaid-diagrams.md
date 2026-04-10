---
name: mermaid-diagrams
description: Generate Mermaid diagrams from codebase analysis
skill: mermaid-diagrams
---

# Mermaid Diagrams

Generate syntactically valid Mermaid diagrams by analyzing the current codebase.

## Usage

```
/mermaid-diagrams                     → architecture overview of the current project
/mermaid-diagrams sequence auth flow  → sequence diagram of the authentication flow
/mermaid-diagrams erd                 → ER diagram of the database schema
```

## Supported Diagram Types

- `flowchart` — architecture overview, module relationships
- `sequenceDiagram` — API call chains, multi-service interactions
- `classDiagram` — OOP hierarchies, interface contracts
- `erDiagram` — database schema, entity relationships
- `stateDiagram-v2` — state machines, lifecycle transitions
- `C4Context` / `C4Container` — system context, container diagrams
- `graph` — dependency graphs, import trees
- `gitGraph` — branch strategies, release flows

## Arguments

`$ARGUMENTS` is optional. When provided, it narrows the diagram type and scope.

| Argument pattern | Diagram produced |
| --- | --- |
| (empty) | Flowchart of the overall architecture |
| `sequence <topic>` | Sequence diagram for the given flow |
| `erd` or `er` | ER diagram of detected database models |
| `class <module>` | Class diagram for the specified module |
| `state <entity>` | State diagram for the given entity lifecycle |
| `deps` or `dependencies` | Dependency graph of project modules |
| `c4` | C4 system context diagram |
| `git` | Git graph of the branching strategy |

## Full Documentation

See `skills/mermaid-diagrams/SKILL.md` for the complete workflow, syntax rules, validation steps, and examples.
