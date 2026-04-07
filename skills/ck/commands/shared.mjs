/**
 * ck — Context Keeper v2
 * shared.mjs — common utilities for all command scripts
 *
 * No external dependencies. Node.js stdlib only.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, lstatSync, renameSync, copyFileSync, rmSync, realpathSync } from 'fs';
import { resolve, basename } from 'path';
import { homedir } from 'os';
import { spawnSync } from 'child_process';
import { randomBytes } from 'crypto';

// ─── Paths ────────────────────────────────────────────────────────────────────

export const CK_HOME          = resolve(homedir(), '.factory', 'ck');
export const CONTEXTS_DIR     = resolve(CK_HOME, 'contexts');
export const PROJECTS_FILE    = resolve(CK_HOME, 'projects.json');
export const CURRENT_SESSION  = resolve(CK_HOME, 'current-session.json');
export const SKILL_FILE       = resolve(homedir(), '.factory', 'skills', 'ck', 'SKILL.md');

// ─── JSON I/O ─────────────────────────────────────────────────────────────────

export function readJson(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function writeJson(filePath, data) {
  const dir = resolve(filePath, '..');
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function readProjects() {
  return readJson(PROJECTS_FILE) || {};
}

export function writeProjects(projects) {
  writeJson(PROJECTS_FILE, projects);
}

function canonicalPath(filePath) {
  if (!filePath) return '';
  try {
    if (existsSync(filePath)) {
      return realpathSync.native ? realpathSync.native(filePath) : realpathSync(filePath);
    }
  } catch {
    // Fall back to a resolved string when realpath cannot be read.
  }
  return resolve(filePath);
}

function stripRemoteCredentials(remoteUrl) {
  if (!remoteUrl) return '';
  return String(remoteUrl).replace(/:\/\/[^@]+@/, '://');
}

function getGitRemoteUrl(projectPath) {
  try {
    const result = spawnSync('git', ['-C', projectPath, 'config', '--get', 'remote.origin.url'], {
      timeout: 3000,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    if (result.status !== 0) return '';
    return (result.stdout || '').trim();
  } catch {
    return '';
  }
}

function isRenamedProjectPath(previousPath, currentPath) {
  if (!previousPath || !currentPath) return false;
  if (sameProjectRoot(previousPath, currentPath)) return false;
  if (!sameProjectParent(previousPath, currentPath)) return false;
  if (basename(resolve(previousPath)) === basename(resolve(currentPath))) return false;
  if (existsSync(previousPath)) return false;
  return true;
}

export function resolveRegisteredProject(cwd) {
  const projects = readProjects();
  const directEntry = projects[cwd];
  if (directEntry) {
    return { projects, projectPath: cwd, entry: directEntry, migrated: false };
  }

  const caseAliasCandidate = Object.entries(projects).find(([projectPath]) =>
    sameProjectRoot(projectPath, cwd)
  );
  if (caseAliasCandidate) {
    const [previousPath, entry] = caseAliasCandidate;
    const nextProjects = { ...projects };
    nextProjects[cwd] = entry;
    delete nextProjects[previousPath];
    writeProjects(nextProjects);

    const context = loadContext(entry.contextDir);
    if (context && context.path !== cwd) {
      saveContext(entry.contextDir, { ...context, path: cwd });
    }

    return { projects: nextProjects, projectPath: cwd, entry, migrated: true, previousPath };
  }

  const renameCandidates = Object.entries(projects).filter(([projectPath, projectEntry]) => {
    if (!isRenamedProjectPath(projectPath, cwd)) {
      return false;
    }

    const context = loadContext(projectEntry?.contextDir);
    const expectedRemote = stripRemoteCredentials(context?.repo || '');
    const currentRemote = stripRemoteCredentials(getGitRemoteUrl(cwd));
    return Boolean(expectedRemote && currentRemote && expectedRemote === currentRemote);
  });
  if (renameCandidates.length !== 1) {
    return { projects, projectPath: cwd, entry: null, migrated: false };
  }

  const [previousPath, entry] = renameCandidates[0];
  const nextProjects = { ...projects };
  nextProjects[cwd] = entry;
  delete nextProjects[previousPath];
  writeProjects(nextProjects);

  const context = loadContext(entry.contextDir);
  if (context && context.path !== cwd) {
    saveContext(entry.contextDir, { ...context, path: cwd });
  }

  return { projects: nextProjects, projectPath: cwd, entry, migrated: true, previousPath };
}

// ─── Context I/O ──────────────────────────────────────────────────────────────

export function contextPath(contextDir) {
  return resolve(CONTEXTS_DIR, contextDir, 'context.json');
}

export function contextMdPath(contextDir) {
  return resolve(CONTEXTS_DIR, contextDir, 'CONTEXT.md');
}

export function loadContext(contextDir) {
  return readJson(contextPath(contextDir));
}

export function saveContext(contextDir, data) {
  const dir = resolve(CONTEXTS_DIR, contextDir);
  mkdirSync(dir, { recursive: true });
  writeJson(contextPath(contextDir), data);
  writeFileSync(contextMdPath(contextDir), renderContextMd(data), 'utf8');
}

/**
 * Resolve which project to operate on.
 * @param {string|undefined} arg  — undefined = cwd match, number string = alphabetical index, else name search
 * @param {string} cwd
 * @returns {{ name, contextDir, projectPath, context } | null}
 */
export function resolveContext(arg, cwd) {
  const { projects, entry } = resolveRegisteredProject(cwd);
  const entries = Object.entries(projects); // [path, {name, contextDir, lastUpdated}]

  if (!arg) {
    if (!entry) return null;
    const context = loadContext(entry.contextDir);
    if (!context) return null;
    return { name: entry.name, contextDir: entry.contextDir, projectPath: cwd, context };
  }

  // Collect all contexts sorted alphabetically by contextDir
  const sorted = entries
    .map(([path, info]) => ({ path, ...info }))
    .sort((a, b) => a.contextDir.localeCompare(b.contextDir));

  const asNumber = parseInt(arg, 10);
  if (!isNaN(asNumber) && String(asNumber) === arg) {
    // Number-based lookup (1-indexed)
    const item = sorted[asNumber - 1];
    if (!item) return null;
    const context = loadContext(item.contextDir);
    if (!context) return null;
    return { name: item.name, contextDir: item.contextDir, projectPath: item.path, context };
  }

  // Name-based lookup: exact > prefix > substring (case-insensitive)
  const lower = arg.toLowerCase();
  let match =
    sorted.find(e => e.name.toLowerCase() === lower) ||
    sorted.find(e => e.name.toLowerCase().startsWith(lower)) ||
    sorted.find(e => e.name.toLowerCase().includes(lower));

  if (!match) return null;
  const context = loadContext(match.contextDir);
  if (!context) return null;
  return { name: match.name, contextDir: match.contextDir, projectPath: match.path, context };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoLabel(dateStr) {
  if (!dateStr) return 'unknown';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

export function stalenessIcon(dateStr) {
  if (!dateStr) return '○';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86_400_000);
  if (diff < 1) return '●';
  if (diff <= 5) return '◐';
  return '○';
}

// ─── ID generation ────────────────────────────────────────────────────────────

export function shortId() {
  return randomBytes(4).toString('hex');
}

// ─── Git helpers ──────────────────────────────────────────────────────────────

function runGit(args, cwd) {
  try {
    const result = spawnSync('git', ['-C', cwd, ...args], {
      timeout: 3000,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    if (result.status !== 0) return null;
    return result.stdout.trim();
  } catch {
    return null;
  }
}

export function gitLogSince(projectPath, sinceDate) {
  if (!sinceDate) return null;
  return runGit(['log', '--oneline', `--since=${sinceDate}`], projectPath);
}

export function gitSummary(projectPath, sinceDate) {
  const log = gitLogSince(projectPath, sinceDate);
  if (!log) return null;
  const commits = log.split('\n').filter(Boolean).length;
  if (commits === 0) return null;

  // Count unique files changed: use a separate runGit call to avoid nested shell substitution
  const countStr = runGit(['rev-list', '--count', 'HEAD', `--since=${sinceDate}`], projectPath);
  const revCount = countStr ? parseInt(countStr, 10) : commits;
  const diff = runGit(['diff', '--shortstat', `HEAD~${Math.min(revCount, 50)}..HEAD`], projectPath);

  if (diff) {
    const filesMatch = diff.match(/(\d+) file/);
    const files = filesMatch ? parseInt(filesMatch[1]) : '?';
    return `${commits} commit${commits !== 1 ? 's' : ''}, ${files} file${files !== 1 ? 's' : ''} changed`;
  }
  return `${commits} commit${commits !== 1 ? 's' : ''}`;
}

// ─── Native memory path encoding ──────────────────────────────────────────────

function sanitizeProjectDirName(name) {
  const normalized = String(name || '').replace(/^\.+/, '');
  const sanitized = normalized
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  if (sanitized) {
    const hasNonAscii = Array.from(normalized).some(char => char.codePointAt(0) > 0x7f);
    if (!hasNonAscii) return sanitized;
    return `${sanitized}-${Buffer.from(normalized).toString('hex').slice(0, 6)}`;
  }

  return 'project';
}

function projectStorageRoot() {
  return resolve(homedir(), '.factory', 'projects');
}

function projectMetadataPath(projectId) {
  return resolve(projectStorageRoot(), projectId, 'project.json');
}

function readProjectMetadata(projectId) {
  return readJson(projectMetadataPath(projectId));
}

function sameProjectRoot(left, right) {
  return Boolean(left && right) && canonicalPath(left) === canonicalPath(right);
}

function sameProjectParent(left, right) {
  return Boolean(left && right) && canonicalPath(resolve(left, '..')) === canonicalPath(resolve(right, '..'));
}

function projectIdBelongsToRoot(projectId, absolutePath) {
  const metadata = readProjectMetadata(projectId);
  return Boolean(metadata && sameProjectRoot(metadata.root, absolutePath));
}

function projectIdIsTaken(projectId, absolutePath) {
  if (projectIdBelongsToRoot(projectId, absolutePath)) return false;
  if (!existsSync(resolve(projectStorageRoot(), projectId))) return false;
  const metadata = readProjectMetadata(projectId);
  return Boolean(metadata && !sameProjectRoot(metadata.root, absolutePath));
}

function sameProjectStorageDir(leftId, rightId) {
  if (!leftId || !rightId) return false;
  return sameProjectRoot(resolve(projectStorageRoot(), leftId), resolve(projectStorageRoot(), rightId));
}

function isRenamedProjectMetadata(metadata, absolutePath) {
  if (!metadata?.root || sameProjectRoot(metadata.root, absolutePath)) return false;
  if (!sameProjectParent(metadata.root, absolutePath)) return false;
  if (basename(resolve(metadata.root)) === basename(resolve(absolutePath))) return false;
  if (existsSync(metadata.root)) return false;
  const previousRemote = stripRemoteCredentials(metadata.remote || '');
  const currentRemote = stripRemoteCredentials(getGitRemoteUrl(absolutePath));
  if (!previousRemote || !currentRemote || previousRemote !== currentRemote) return false;
  return true;
}

function moveProjectTree(sourcePath, targetPath) {
  const stats = lstatSync(sourcePath);

  if (stats.isDirectory()) {
    mkdirSync(targetPath, { recursive: true });
    for (const entry of readdirSync(sourcePath, { withFileTypes: true })) {
      moveProjectTree(resolve(sourcePath, entry.name), resolve(targetPath, entry.name));
    }
    rmSync(sourcePath, { recursive: true, force: true });
    return;
  }

  if (!existsSync(targetPath)) {
    mkdirSync(resolve(targetPath, '..'), { recursive: true });
    try {
      renameSync(sourcePath, targetPath);
    } catch (error) {
      if (error.code === 'EXDEV') {
        copyFileSync(sourcePath, targetPath);
        rmSync(sourcePath, { force: true });
      } else {
        throw error;
      }
    }
    return;
  }

  rmSync(sourcePath, { recursive: true, force: true });
}

function writeProjectMetadata(projectId, absolutePath) {
  writeJson(projectMetadataPath(projectId), {
    id: projectId,
    name: basename(absolutePath),
    root: resolve(absolutePath),
    remote: stripRemoteCredentials(getGitRemoteUrl(absolutePath)) || null,
  });
}

export function encodeProjectPath(absolutePath) {
  const projectRoot = resolve(absolutePath);
  const baseId = sanitizeProjectDirName(basename(projectRoot));
  let projectId = baseId;
  let suffix = 2;

  const storageRoot = projectStorageRoot();
  mkdirSync(storageRoot, { recursive: true });

  const legacyId = projectRoot.replace(/[\\/]/g, '-');
  const knownIds = new Set();

  for (const entry of readdirSync(storageRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (projectIdBelongsToRoot(entry.name, projectRoot)) {
      knownIds.add(entry.name);
    }
  }

  const renameCandidates = [];
  for (const entry of readdirSync(storageRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const metadata = readProjectMetadata(entry.name);
    if (isRenamedProjectMetadata(metadata, projectRoot)) {
      renameCandidates.push(entry.name);
    }
  }

  if (renameCandidates.length === 1) {
    knownIds.add(renameCandidates[0]);
  }

  if (legacyId) {
    knownIds.add(legacyId);
  }

  const matchingKnownId = Array.from(knownIds).find(knownId => sameProjectStorageDir(knownId, projectId));
  if (matchingKnownId) {
    projectId = matchingKnownId;
  }

  while (projectIdIsTaken(projectId, projectRoot) && !knownIds.has(projectId)) {
    projectId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const targetDir = resolve(storageRoot, projectId);
  mkdirSync(targetDir, { recursive: true });

  for (const knownId of knownIds) {
    if (!knownId || knownId === projectId || sameProjectStorageDir(knownId, projectId)) continue;
    const sourceDir = resolve(storageRoot, knownId);
    if (existsSync(sourceDir)) {
      moveProjectTree(sourceDir, targetDir);
    }
  }

  writeProjectMetadata(projectId, projectRoot);
  return projectId;
}

export function nativeMemoryDir(absolutePath) {
  const encoded = encodeProjectPath(absolutePath);
  return resolve(projectStorageRoot(), encoded, 'memory');
}

// ─── Rendering ────────────────────────────────────────────────────────────────

/** Render the human-readable CONTEXT.md from context.json */
export function renderContextMd(ctx) {
  const latest = ctx.sessions?.[ctx.sessions.length - 1] || null;
  const lines = [
    `<!-- Generated by ck v2 — edit context.json instead -->`,
    `# Project: ${ctx.displayName ?? ctx.name}`,
    `> Path: ${ctx.path}`,
  ];
  if (ctx.repo) lines.push(`> Repo: ${ctx.repo}`);
  const sessionCount = ctx.sessions?.length || 0;
  lines.push(`> Last Session: ${ctx.sessions?.[sessionCount - 1]?.date || 'never'} | Sessions: ${sessionCount}`);
  lines.push(``);
  lines.push(`## What This Is`);
  lines.push(ctx.description || '_Not set._');
  lines.push(``);
  lines.push(`## Tech Stack`);
  lines.push(Array.isArray(ctx.stack) ? ctx.stack.join(', ') : (ctx.stack || '_Not set._'));
  lines.push(``);
  lines.push(`## Current Goal`);
  lines.push(ctx.goal || '_Not set._');
  lines.push(``);
  lines.push(`## Where I Left Off`);
  lines.push(latest?.leftOff || '_Not yet recorded. Run /ck:save after your first session._');
  lines.push(``);
  lines.push(`## Next Steps`);
  if (latest?.nextSteps?.length) {
    latest.nextSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  } else {
    lines.push(`_Not yet recorded._`);
  }
  lines.push(``);
  lines.push(`## Blockers`);
  if (latest?.blockers?.length) {
    latest.blockers.forEach(b => lines.push(`- ${b}`));
  } else {
    lines.push(`- None`);
  }
  lines.push(``);
  lines.push(`## Do Not Do`);
  if (ctx.constraints?.length) {
    ctx.constraints.forEach(c => lines.push(`- ${c}`));
  } else {
    lines.push(`- None specified`);
  }
  lines.push(``);

  // All decisions across sessions
  const allDecisions = (ctx.sessions || []).flatMap(s =>
    (s.decisions || []).map(d => ({ ...d, date: s.date }))
  );
  lines.push(`## Decisions Made`);
  lines.push(`| Decision | Why | Date |`);
  lines.push(`|----------|-----|------|`);
  if (allDecisions.length) {
    allDecisions.forEach(d => lines.push(`| ${d.what} | ${d.why || ''} | ${d.date || ''} |`));
  } else {
    lines.push(`| _(none yet)_ | | |`);
  }
  lines.push(``);

  // Session history (most recent first)
  if (ctx.sessions?.length > 1) {
    lines.push(`## Session History`);
    const reversed = [...ctx.sessions].reverse();
    reversed.forEach(s => {
      lines.push(`### ${s.date} — ${s.summary || 'Session'}`);
      if (s.gitActivity) lines.push(`_${s.gitActivity}_`);
      if (s.leftOff) lines.push(`**Left off:** ${s.leftOff}`);
    });
    lines.push(``);
  }

  return lines.join('\n');
}

/** Render the bordered briefing box used by /ck:resume */
export function renderBriefingBox(ctx, _meta = {}) {
  const latest = ctx.sessions?.[ctx.sessions.length - 1] || {};
  const W = 57;
  const pad = (str, w) => {
    const s = String(str || '');
    return s.length > w ? s.slice(0, w - 1) + '…' : s.padEnd(w);
  };
  const row = (label, value) => `│  ${label} → ${pad(value, W - label.length - 7)}│`;

  const when = daysAgoLabel(ctx.sessions?.[ctx.sessions.length - 1]?.date);
  const sessions = ctx.sessions?.length || 0;
  const shortSessId = latest.id?.slice(0, 8) || null;

  const lines = [
    `┌${'─'.repeat(W)}┐`,
    `│  RESUMING: ${pad(ctx.displayName ?? ctx.name, W - 12)}│`,
    `│  Last session: ${pad(`${when}  |  Sessions: ${sessions}`, W - 16)}│`,
  ];
  if (shortSessId) lines.push(`│  Session ID: ${pad(shortSessId, W - 14)}│`);
  lines.push(`├${'─'.repeat(W)}┤`);
  lines.push(row('WHAT IT IS', ctx.description || '—'));
  lines.push(row('STACK     ', Array.isArray(ctx.stack) ? ctx.stack.join(', ') : (ctx.stack || '—')));
  lines.push(row('PATH      ', ctx.path));
  if (ctx.repo) lines.push(row('REPO      ', ctx.repo));
  lines.push(row('GOAL      ', ctx.goal || '—'));
  lines.push(`├${'─'.repeat(W)}┤`);
  lines.push(`│  WHERE I LEFT OFF${' '.repeat(W - 18)}│`);
  const leftOffLines = (latest.leftOff || '—').split('\n').filter(Boolean);
  leftOffLines.forEach(l => lines.push(`│    • ${pad(l, W - 7)}│`));
  lines.push(`├${'─'.repeat(W)}┤`);
  lines.push(`│  NEXT STEPS${' '.repeat(W - 12)}│`);
  const steps = latest.nextSteps || [];
  if (steps.length) {
    steps.forEach((s, i) => lines.push(`│    ${i + 1}. ${pad(s, W - 8)}│`));
  } else {
    lines.push(`│    —${' '.repeat(W - 5)}│`);
  }
  const blockers = latest.blockers?.length ? latest.blockers.join(', ') : 'None';
  lines.push(`│  BLOCKERS → ${pad(blockers, W - 13)}│`);
  if (latest.gitActivity) {
    lines.push(`│  GIT      → ${pad(latest.gitActivity, W - 13)}│`);
  }
  lines.push(`└${'─'.repeat(W)}┘`);
  return lines.join('\n');
}

/** Render compact info block used by /ck:info */
export function renderInfoBlock(ctx) {
  const latest = ctx.sessions?.[ctx.sessions.length - 1] || {};
  const sep = '─'.repeat(44);
  const lines = [
    `ck: ${ctx.displayName ?? ctx.name}`,
    sep,
  ];
  lines.push(`PATH     ${ctx.path}`);
  if (ctx.repo) lines.push(`REPO     ${ctx.repo}`);
  if (latest.id) lines.push(`SESSION  ${latest.id.slice(0, 8)}`);
  lines.push(`GOAL     ${ctx.goal || '—'}`);
  lines.push(sep);
  lines.push(`WHERE I LEFT OFF`);
  (latest.leftOff || '—').split('\n').filter(Boolean).forEach(l => lines.push(`  • ${l}`));
  lines.push(`NEXT STEPS`);
  (latest.nextSteps || []).forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  if (!latest.nextSteps?.length) lines.push(`  —`);
  lines.push(`BLOCKERS`);
  if (latest.blockers?.length) {
    latest.blockers.forEach(b => lines.push(`  • ${b}`));
  } else {
    lines.push(`  • None`);
  }
  return lines.join('\n');
}

/** Render ASCII list table used by /ck:list */
export function renderListTable(entries, cwd, _todayStr) {
  // entries: [{name, contextDir, path, context, lastUpdated}]
  // Sorted alphabetically by contextDir before calling
  const rows = entries.map((e, i) => {
    const isHere = e.path === cwd;
    const latest = e.context?.sessions?.[e.context.sessions.length - 1] || {};
    const when = daysAgoLabel(latest.date);
    const icon = stalenessIcon(latest.date);
    const statusLabel = icon === '●' ? '● Active' : icon === '◐' ? '◐ Warm' : '○ Stale';
    const sessId = latest.id ? latest.id.slice(0, 8) : '—';
    const summary = (latest.summary || '—').slice(0, 34);
    const displayName = ((e.context?.displayName ?? e.name) + (isHere ? ' <-' : '')).slice(0, 18);
    return {
      num: String(i + 1),
      name: displayName,
      status: statusLabel,
      when: when.slice(0, 10),
      sessId,
      summary,
    };
  });

  const cols = {
    num:     Math.max(1, ...rows.map(r => r.num.length)),
    name:    Math.max(7, ...rows.map(r => r.name.length)),
    status:  Math.max(6, ...rows.map(r => r.status.length)),
    when:    Math.max(9, ...rows.map(r => r.when.length)),
    sessId:  Math.max(7, ...rows.map(r => r.sessId.length)),
    summary: Math.max(12, ...rows.map(r => r.summary.length)),
  };

  const hr = `+${'-'.repeat(cols.num + 2)}+${'-'.repeat(cols.name + 2)}+${'-'.repeat(cols.status + 2)}+${'-'.repeat(cols.when + 2)}+${'-'.repeat(cols.sessId + 2)}+${'-'.repeat(cols.summary + 2)}+`;
  const cell = (val, width) => ` ${val.padEnd(width)} `;
  const headerRow = `|${cell('#', cols.num)}|${cell('Project', cols.name)}|${cell('Status', cols.status)}|${cell('Last Seen', cols.when)}|${cell('Session', cols.sessId)}|${cell('Last Summary', cols.summary)}|`;

  const dataRows = rows.map(r =>
    `|${cell(r.num, cols.num)}|${cell(r.name, cols.name)}|${cell(r.status, cols.status)}|${cell(r.when, cols.when)}|${cell(r.sessId, cols.sessId)}|${cell(r.summary, cols.summary)}|`
  );

  return [hr, headerRow, hr, ...dataRows, hr].join('\n');
}
