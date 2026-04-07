#!/bin/bash
# Continuous Learning v2 - Project Detection Helper
#
# Shared logic for detecting current project context.
# Sourced by observe.sh and start-observer.sh.
#
# Exports:
#   _CLV2_PROJECT_ID     - Project storage ID derived from the project basename
#   _CLV2_PROJECT_NAME   - Human-readable project name
#   _CLV2_PROJECT_ROOT   - Absolute path to project root
#   _CLV2_PROJECT_DIR    - Project-scoped storage directory under homunculus
#
# Also sets unprefixed convenience aliases:
#   PROJECT_ID, PROJECT_NAME, PROJECT_ROOT, PROJECT_DIR
#
# Detection priority:
#   1. CLAUDE_PROJECT_DIR env var (if set)
#   2. git repo root from CWD
#   3. "global" (no project context detected)

_CLV2_HOMUNCULUS_DIR="${HOME}/.factory/homunculus"
_CLV2_PROJECTS_DIR="${_CLV2_HOMUNCULUS_DIR}/projects"
_CLV2_REGISTRY_FILE="${_CLV2_HOMUNCULUS_DIR}/projects.json"

_clv2_resolve_python_cmd() {
  if [ -n "${CLV2_PYTHON_CMD:-}" ] && command -v "$CLV2_PYTHON_CMD" >/dev/null 2>&1; then
    printf '%s\n' "$CLV2_PYTHON_CMD"
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    printf '%s\n' python3
    return 0
  fi

  if command -v python >/dev/null 2>&1; then
    printf '%s\n' python
    return 0
  fi

  return 1
}

_CLV2_PYTHON_CMD="$(_clv2_resolve_python_cmd 2>/dev/null || true)"
CLV2_PYTHON_CMD="$_CLV2_PYTHON_CMD"
export CLV2_PYTHON_CMD

CLV2_OBSERVER_PROMPT_PATTERN='Can you confirm|requires permission|Awaiting (user confirmation|confirmation|approval|permission)|confirm I should proceed|once granted access|grant.*access'
export CLV2_OBSERVER_PROMPT_PATTERN

_clv2_sanitize_project_id_fallback() {
  local raw="${1:-}"
  local sanitized=""

  sanitized=$(printf '%s' "$raw" | sed -E 's/^[.]+//; s/[^A-Za-z0-9_-]+/-/g; s/-{2,}/-/g; s/^-+//; s/-+$//')
  if [ -n "$sanitized" ]; then
    printf '%s\n' "$sanitized"
    return 0
  fi

  printf '%s\n' "project"
}

_clv2_resolve_project_id_with_python() {
  if [ -z "$_CLV2_PYTHON_CMD" ]; then
    return 1
  fi

  _CLV2_RESOLVE_ROOT="$1" \
  _CLV2_RESOLVE_NAME="$2" \
  _CLV2_RESOLVE_REMOTE="$3" \
  _CLV2_RESOLVE_PROJECTS_DIR="$_CLV2_PROJECTS_DIR" \
  _CLV2_RESOLVE_REGISTRY="$_CLV2_REGISTRY_FILE" \
  "$_CLV2_PYTHON_CMD" -c '
import hashlib
import json
import os
import re
import shutil
import tempfile
from datetime import datetime, timezone

project_root = os.environ["_CLV2_RESOLVE_ROOT"]
project_name = os.environ["_CLV2_RESOLVE_NAME"]
remote_url = os.environ["_CLV2_RESOLVE_REMOTE"]
projects_dir = os.environ["_CLV2_RESOLVE_PROJECTS_DIR"]
registry_path = os.environ["_CLV2_RESOLVE_REGISTRY"]

os.makedirs(projects_dir, exist_ok=True)
os.makedirs(os.path.dirname(registry_path), exist_ok=True)

def sha12(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]

def sanitize_project_id(raw: str) -> str:
    raw = raw or ""
    normalized = re.sub(r"^\.+", "", raw)
    sanitized = re.sub(r"[^A-Za-z0-9_-]+", "-", normalized)
    sanitized = re.sub(r"-{2,}", "-", sanitized).strip("-")
    has_non_ascii = any(ord(ch) > 127 for ch in normalized)
    if sanitized:
      return f"{sanitized}-{sha12(normalized)[:6]}" if has_non_ascii else sanitized
    meaningful = re.sub(r"[\s\W_]+", "", normalized, flags=re.UNICODE)
    return sha12(normalized)[:8] if meaningful else "project"

def atomic_write_json(path: str, payload: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(
        prefix=f".{os.path.basename(path)}.tmp.",
        dir=os.path.dirname(path),
        text=True,
    )
    try:
        with os.fdopen(fd, "w") as handle:
            json.dump(payload, handle, indent=2)
            handle.write("\n")
        os.replace(tmp_path, path)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

def load_registry() -> dict:
    try:
        with open(registry_path, encoding="utf-8") as handle:
            return json.load(handle)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def read_project_metadata(project_id: str):
    project_file = os.path.join(projects_dir, project_id, "project.json")
    try:
        with open(project_file, encoding="utf-8") as handle:
            return json.load(handle)
    except (FileNotFoundError, json.JSONDecodeError):
        return None

def same_root(value: str) -> bool:
    return bool(value) and os.path.abspath(value) == os.path.abspath(project_root)

def same_parent(value: str) -> bool:
    return bool(value) and os.path.dirname(os.path.abspath(value)) == os.path.dirname(os.path.abspath(project_root))

def legacy_ids() -> list[str]:
    ids = {sha12(project_root)}
    stripped_remote = re.sub(r"://[^@]+@", "://", remote_url or "")
    if stripped_remote:
        ids.add(sha12(stripped_remote))
    if remote_url:
        ids.add(sha12(remote_url))
    return sorted(ids)

def owns_project_id(project_id: str, registry: dict) -> bool:
    entry = registry.get(project_id)
    if entry and same_root(entry.get("root", "")):
        return True
    metadata = read_project_metadata(project_id)
    return bool(metadata and same_root(metadata.get("root", "")))

def is_taken(project_id: str, registry: dict) -> bool:
    if owns_project_id(project_id, registry):
        return False
    if project_id in registry:
        return True
    project_dir = os.path.join(projects_dir, project_id)
    if not os.path.exists(project_dir):
        return False
    metadata = read_project_metadata(project_id)
    return bool(metadata and not same_root(metadata.get("root", "")))

def is_rename_candidate(record: dict) -> bool:
    root = record.get("root", "")
    if not root or same_root(root):
        return False
    if not same_parent(root):
        return False
    if os.path.basename(os.path.abspath(root)) == os.path.basename(os.path.abspath(project_root)):
        return False
    if os.path.exists(root):
        return False

    candidate_remote = re.sub(r"://[^@]+@", "://", record.get("remote", "") or "")
    current_remote = re.sub(r"://[^@]+@", "://", remote_url or "")
    if candidate_remote and current_remote and candidate_remote != current_remote:
        return False

    return True

def merge_tree(source_dir: str, target_dir: str) -> None:
    os.makedirs(target_dir, exist_ok=True)
    for name in os.listdir(source_dir):
        source_path = os.path.join(source_dir, name)
        target_path = os.path.join(target_dir, name)
        if os.path.isdir(source_path) and not os.path.islink(source_path):
            merge_tree(source_path, target_path)
        elif not os.path.exists(target_path):
            try:
                os.replace(source_path, target_path)
            except OSError:
                shutil.copy2(source_path, target_path)
                os.unlink(source_path)
        else:
            if os.path.isdir(source_path) and os.path.islink(source_path):
                os.unlink(source_path)
            elif os.path.isdir(source_path):
                shutil.rmtree(source_path, ignore_errors=True)
            else:
                os.unlink(source_path)
    shutil.rmtree(source_dir, ignore_errors=True)

registry = load_registry()
prior_ids = {
    project_id for project_id, entry in registry.items()
    if isinstance(entry, dict) and same_root(entry.get("root", ""))
}

for candidate in os.listdir(projects_dir):
    if owns_project_id(candidate, registry):
        prior_ids.add(candidate)

rename_candidates = set()
for project_id, entry in registry.items():
    if isinstance(entry, dict) and is_rename_candidate(entry):
        rename_candidates.add(project_id)

for candidate in os.listdir(projects_dir):
    metadata = read_project_metadata(candidate) or {}
    metadata.setdefault("id", candidate)
    if is_rename_candidate(metadata):
        rename_candidates.add(candidate)

if len(rename_candidates) == 1:
    prior_ids.update(rename_candidates)

prior_ids.update(legacy_ids())

base_project_id = sanitize_project_id(project_name)
project_id = base_project_id
suffix = 2
while is_taken(project_id, registry) and project_id not in prior_ids:
    project_id = f"{base_project_id}-{suffix}"
    suffix += 1

target_dir = os.path.join(projects_dir, project_id)
os.makedirs(target_dir, exist_ok=True)

for previous_id in sorted(prior_ids):
    if previous_id in ("", "global", project_id):
        continue
    previous_dir = os.path.join(projects_dir, previous_id)
    if os.path.exists(previous_dir):
        merge_tree(previous_dir, target_dir)

now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
created_at = now
for old_id in list(registry.keys()):
    entry = registry.get(old_id) or {}
    if old_id == project_id or old_id in prior_ids or same_root(entry.get("root", "")):
        created_at = entry.get("created_at", created_at)
        if old_id != project_id:
            registry.pop(old_id, None)

metadata = {
    "id": project_id,
    "name": project_name,
    "root": os.path.abspath(project_root),
    "remote": re.sub(r"://[^@]+@", "://", remote_url or ""),
    "created_at": created_at,
    "last_seen": now,
}

registry[project_id] = metadata
atomic_write_json(os.path.join(target_dir, "project.json"), metadata)
atomic_write_json(registry_path, registry)
print(project_id)
' 2>/dev/null
}

_clv2_detect_project() {
  local project_root=""
  local project_name=""
  local project_id=""
  local source_hint=""

  # 1. Try CLAUDE_PROJECT_DIR env var
  if [ -n "$CLAUDE_PROJECT_DIR" ] && [ -d "$CLAUDE_PROJECT_DIR" ]; then
    project_root="$CLAUDE_PROJECT_DIR"
    source_hint="env"
  fi

  # 2. Try git repo root from CWD (only if git is available)
  if [ -z "$project_root" ] && command -v git &>/dev/null; then
    project_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
    if [ -n "$project_root" ]; then
      source_hint="git"
    fi
  fi

  # 3. No project detected — fall back to global
  if [ -z "$project_root" ]; then
    _CLV2_PROJECT_ID="global"
    _CLV2_PROJECT_NAME="global"
    _CLV2_PROJECT_ROOT=""
    _CLV2_PROJECT_DIR="${_CLV2_HOMUNCULUS_DIR}"
    return 0
  fi

  # Derive project name from directory basename
  project_name=$(basename "$project_root")

  local remote_url=""
  local raw_remote_url=""
  if command -v git &>/dev/null; then
    if [ "$source_hint" = "git" ] || [ -e "${project_root}/.git" ]; then
      raw_remote_url=$(git -C "$project_root" remote get-url origin 2>/dev/null || true)
      remote_url="$raw_remote_url"
    fi
  fi

  if [ -n "$remote_url" ]; then
    remote_url=$(printf '%s' "$remote_url" | sed -E 's|://[^@]+@|://|')
  fi

  project_id=$(_clv2_resolve_project_id_with_python "$project_root" "$project_name" "${raw_remote_url:-$remote_url}" 2>/dev/null || true)
  if [ -z "$project_id" ]; then
    project_id=$(_clv2_sanitize_project_id_fallback "$project_name")
  fi

  # Export results
  _CLV2_PROJECT_ID="$project_id"
  _CLV2_PROJECT_NAME="$project_name"
  _CLV2_PROJECT_ROOT="$project_root"
  _CLV2_PROJECT_DIR="${_CLV2_PROJECTS_DIR}/${project_id}"

  # Ensure project directory structure exists
  mkdir -p "${_CLV2_PROJECT_DIR}/instincts/personal"
  mkdir -p "${_CLV2_PROJECT_DIR}/instincts/inherited"
  mkdir -p "${_CLV2_PROJECT_DIR}/observations.archive"
  mkdir -p "${_CLV2_PROJECT_DIR}/evolved/skills"
  mkdir -p "${_CLV2_PROJECT_DIR}/evolved/commands"
  mkdir -p "${_CLV2_PROJECT_DIR}/evolved/agents"
}

_clv2_update_project_registry() {
  local pid="$1"
  local pname="$2"
  local proot="$3"
  local premote="$4"
  local pdir="$_CLV2_PROJECT_DIR"

  mkdir -p "$(dirname "$_CLV2_REGISTRY_FILE")"

  if [ -z "$_CLV2_PYTHON_CMD" ]; then
    return 0
  fi

  # Pass values via env vars to avoid shell→python injection.
  # Python reads them with os.environ, which is safe for any string content.
  _CLV2_REG_PID="$pid" \
  _CLV2_REG_PNAME="$pname" \
  _CLV2_REG_PROOT="$proot" \
  _CLV2_REG_PREMOTE="$premote" \
  _CLV2_REG_PDIR="$pdir" \
  _CLV2_REG_FILE="$_CLV2_REGISTRY_FILE" \
  "$_CLV2_PYTHON_CMD" -c '
import json, os, tempfile
from datetime import datetime, timezone

registry_path = os.environ["_CLV2_REG_FILE"]
project_dir = os.environ["_CLV2_REG_PDIR"]
project_file = os.path.join(project_dir, "project.json")

os.makedirs(project_dir, exist_ok=True)

def atomic_write_json(path, payload):
    fd, tmp_path = tempfile.mkstemp(
        prefix=f".{os.path.basename(path)}.tmp.",
        dir=os.path.dirname(path),
        text=True,
    )
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(payload, f, indent=2)
            f.write("\n")
        os.replace(tmp_path, path)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

try:
    with open(registry_path) as f:
        registry = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    registry = {}

now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
entry = registry.get(os.environ["_CLV2_REG_PID"], {})

metadata = {
    "id": os.environ["_CLV2_REG_PID"],
    "name": os.environ["_CLV2_REG_PNAME"],
    "root": os.environ["_CLV2_REG_PROOT"],
    "remote": os.environ["_CLV2_REG_PREMOTE"],
    "created_at": entry.get("created_at", now),
    "last_seen": now,
}

registry[os.environ["_CLV2_REG_PID"]] = metadata

atomic_write_json(project_file, metadata)
atomic_write_json(registry_path, registry)
' 2>/dev/null || true
}

# Auto-detect on source
_clv2_detect_project

# Convenience aliases for callers (short names pointing to prefixed vars)
PROJECT_ID="$_CLV2_PROJECT_ID"
PROJECT_NAME="$_CLV2_PROJECT_NAME"
PROJECT_ROOT="$_CLV2_PROJECT_ROOT"
PROJECT_DIR="$_CLV2_PROJECT_DIR"

if [ -n "$PROJECT_ROOT" ]; then
  CLV2_OBSERVER_SENTINEL_FILE="${PROJECT_ROOT}/.observer.lock"
else
  CLV2_OBSERVER_SENTINEL_FILE="${PROJECT_DIR}/.observer.lock"
fi
export CLV2_OBSERVER_SENTINEL_FILE
