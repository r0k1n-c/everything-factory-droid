# Plugins and Marketplaces

Plugins extend Factory Droid with new tools and capabilities. This guide covers installation only - see the [full article](https://x.com/affaanmustafa/status/2012378465664745795) for when and why to use them.

---

## Marketplaces

Marketplaces are repositories of installable plugins.

### Adding a Marketplace

```bash
# Add official Factory marketplace
droid plugin marketplace add https://github.com/Factory-AI/factory-plugins

# Add community marketplaces (mgrep by @mixedbread-ai)
droid plugin marketplace add https://github.com/mixedbread-ai/mgrep
```

### Recommended Marketplaces

| Marketplace | Source |
|-------------|--------|
| claude-plugins-official | `anthropics/claude-plugins-official` |
| factory-plugins | `Factory-AI/factory-plugins` |
| Mixedbread-Grep (@mixedbread-ai) | `mixedbread-ai/mgrep` |

---

## Installing Plugins

```bash
# Open plugins browser
/plugins

# Or install directly
droid plugin install droid-evolved@factory-plugins
```

### Recommended Plugins

**Development:**
- `typescript-lsp` - TypeScript intelligence
- `pyright-lsp` - Python type checking
- `hookify` - Create hooks conversationally
- `code-simplifier` - Refactor code

**Code Quality:**
- `code-review` - Code review
- `pr-review-toolkit` - PR automation
- `security-guidance` - Security checks

**Search:**
- `mgrep` - Enhanced search (better than ripgrep)
- `context7` - Live documentation lookup

**Workflow:**
- `commit-commands` - Git workflow
- `frontend-design` - UI patterns
- `feature-dev` - Feature development

---

## Quick Setup

```bash
# Add marketplaces
droid plugin marketplace add https://github.com/Factory-AI/factory-plugins
droid plugin marketplace add https://github.com/mixedbread-ai/mgrep

# Open /plugins and install what you need
```

---

## Plugin Files Location

```
~/.factory/plugins/
|-- cache/                    # Downloaded plugins
|-- installed_plugins.json    # Installed list
|-- known_marketplaces.json   # Added marketplaces
|-- marketplaces/             # Marketplace data
```
