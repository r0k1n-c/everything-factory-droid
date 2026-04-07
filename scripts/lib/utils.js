/**
 * Cross-platform utility functions for Factory Droid hooks and scripts
 * Works on Windows, macOS, and Linux
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');

// Platform detection
const isWindows = process.platform === 'win32';
const isMacOS = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const CONFIG_DIR_NAME = '.factory';
const SESSION_DATA_DIR_NAME = 'session-data';
const WINDOWS_RESERVED_SESSION_IDS = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);
const reportedLegacyMigrationErrors = new Set();

/**
 * Get the user's home directory (cross-platform)
 */
function getHomeDir() {
  const explicitHome = process.env.HOME || process.env.USERPROFILE;
  if (explicitHome && explicitHome.trim().length > 0) {
    return path.resolve(explicitHome);
  }
  return os.homedir();
}

/**
 * Get the Factory Droid config directory.
 */
function getFactoryDir() {
  return path.join(getHomeDir(), CONFIG_DIR_NAME);
}

/**
 * Deprecated alias for getFactoryDir().
 */
function getClaudeDir() {
  return getFactoryDir();
}

/**
 * Get the sessions directory
 */
function getSessionsDir() {
  return path.join(getFactoryDir(), SESSION_DATA_DIR_NAME);
}

/**
 * Get all session directories to search.
 */
function getSessionSearchDirs() {
  return [getSessionsDir()];
}

/**
 * Import legacy Claude-managed session files into canonical Factory storage.
 */
function migrateLegacySessions() {
  const canonicalDir = ensureDir(getSessionsDir());
  const migrationMarkerPath = path.join(canonicalDir, '.claude-migration-complete');
  if (fs.existsSync(migrationMarkerPath)) {
    return {
      migrated: 0,
      removedDuplicates: 0,
      removedDirs: 0,
      errors: [],
    };
  }
  const legacyDirs = [
    path.join(getHomeDir(), '.claude', SESSION_DATA_DIR_NAME),
    path.join(getHomeDir(), '.claude', 'sessions'),
  ];
  const result = {
    migrated: 0,
    removedDuplicates: 0,
    removedDirs: 0,
    errors: [],
  };

  for (const legacyDir of legacyDirs) {
    if (!fs.existsSync(legacyDir)) {
      continue;
    }

    let entries = [];
    try {
      entries = fs.readdirSync(legacyDir, { withFileTypes: true });
    } catch (err) {
      result.errors.push({ path: legacyDir, message: err.message });
      continue;
    }

    for (const entry of entries) {
      const sourcePath = path.join(legacyDir, entry.name);
      const targetPath = path.join(canonicalDir, entry.name);

      try {
        const existed = fs.existsSync(targetPath);
        movePathToCanonical(sourcePath, targetPath);
        if (existed) {
          result.removedDuplicates += 1;
        } else {
          result.migrated += 1;
        }
      } catch (err) {
        result.errors.push({ path: sourcePath, message: err.message });
      }
    }

    try {
      if (fs.existsSync(legacyDir) && fs.readdirSync(legacyDir).length === 0) {
        fs.rmSync(legacyDir, { recursive: true, force: true });
        result.removedDirs += 1;
      }
    } catch (err) {
      result.errors.push({ path: legacyDir, message: err.message });
    }
  }

  if (result.errors.length === 0) {
    try {
      fs.writeFileSync(migrationMarkerPath, `${new Date().toISOString()}\n`, 'utf8');
    } catch (err) {
      result.errors.push({ path: migrationMarkerPath, message: err.message });
    }
  }

  return result;
}

function reportLegacyMigrationErrors(result, context = 'LegacyMigration') {
  if (!result || !Array.isArray(result.errors) || result.errors.length === 0) {
    return;
  }

  const label = String(context || 'LegacyMigration').replace(/^\[|\]$/g, '');
  const unseenErrors = result.errors.filter(error => {
    const key = `${error.path}\n${error.message}`;
    if (reportedLegacyMigrationErrors.has(key)) {
      return false;
    }
    reportedLegacyMigrationErrors.add(key);
    return true;
  });

  if (unseenErrors.length === 0) {
    return;
  }

  log(
    `[${label}] ${unseenErrors.length} legacy session migration issue(s) need manual resolution; unresolved sessions remain in ~/.claude and are not visible in ~/.factory/session-data`
  );

  for (const error of unseenErrors) {
    log(`[${label}] ${error.path}: ${error.message}`);
  }
}

function movePathToCanonical(sourcePath, targetPath) {
  const stats = fs.lstatSync(sourcePath);
  const targetExists = fs.existsSync(targetPath);

  if (stats.isDirectory()) {
    if (targetExists && !fs.lstatSync(targetPath).isDirectory()) {
      throw new Error(`Cannot merge directory '${sourcePath}' into file '${targetPath}'`);
    }
    ensureDir(targetPath);

    for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
      movePathToCanonical(
        path.join(sourcePath, entry.name),
        path.join(targetPath, entry.name)
      );
    }

    fs.rmSync(sourcePath, { recursive: true, force: true });
    return;
  }

  if (!targetExists) {
    ensureDir(path.dirname(targetPath));
    try {
      fs.renameSync(sourcePath, targetPath);
    } catch (err) {
      if (err.code === 'EXDEV') {
        fs.copyFileSync(sourcePath, targetPath);
        fs.rmSync(sourcePath, { force: true });
      } else {
        throw err;
      }
    }
    return;
  }

  if (fs.lstatSync(targetPath).isDirectory()) {
    throw new Error(`Cannot replace directory '${targetPath}' with file '${sourcePath}'`);
  }

  fs.rmSync(sourcePath, { recursive: true, force: true });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSessionHeaderField(content, label) {
  const match = String(content || '').match(new RegExp(`^\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : '';
}

function replaceSessionHeaderField(content, label, nextValue) {
  return String(content || '').replace(
    new RegExp(`^(\\*\\*${escapeRegExp(label)}:\\*\\*\\s*).+$`, 'm'),
    `$1${nextValue}`
  );
}

function sameOrDescendantPath(candidatePath, rootPath) {
  if (!candidatePath || !rootPath) return false;
  const candidate = path.resolve(candidatePath);
  const root = path.resolve(rootPath);
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function sameFilesystemPath(leftPath, rightPath) {
  if (!leftPath || !rightPath) return false;
  if (path.resolve(leftPath) === path.resolve(rightPath)) return true;

  try {
    if (!fs.existsSync(leftPath) || !fs.existsSync(rightPath)) return false;
    const leftRealPath = fs.realpathSync.native ? fs.realpathSync.native(leftPath) : fs.realpathSync(leftPath);
    const rightRealPath = fs.realpathSync.native ? fs.realpathSync.native(rightPath) : fs.realpathSync(rightPath);
    return leftRealPath === rightRealPath;
  } catch {
    return false;
  }
}

function migrateProjectSessions(options = {}) {
  const {
    currentProjectName = getProjectName(),
    currentProjectRoot = '',
    previousProjects = [],
  } = options;

  const currentShortId = sanitizeSessionId(currentProjectName || '');
  const result = {
    migrated: 0,
    removedDuplicates: 0,
    errors: [],
  };

  if (!currentShortId || !Array.isArray(previousProjects) || previousProjects.length === 0) {
    return result;
  }

  const previousByShortId = new Map();
  const previousEntries = [];
  for (const project of previousProjects) {
    const name = typeof project === 'string' ? project : project?.name || '';
    const root = typeof project === 'object' ? project?.root || '' : '';
    const shortId = sanitizeSessionId(name || path.basename(root || ''));
    if (!shortId || shortId === currentShortId) {
      continue;
    }

    const previousEntry = {
      name,
      root: root ? path.resolve(root) : '',
    };
    const entries = previousByShortId.get(shortId) || [];
    entries.push(previousEntry);
    previousByShortId.set(shortId, entries);
    previousEntries.push(previousEntry);
  }

  if (previousByShortId.size === 0) {
    return result;
  }

  const sessionsDir = ensureDir(getSessionsDir());
  let entries = [];
  try {
    entries = fs.readdirSync(sessionsDir, { withFileTypes: true });
  } catch (err) {
    result.errors.push({ path: sessionsDir, message: err.message });
    return result;
  }

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const match = entry.name.match(/^(\d{4}-\d{2}-\d{2})(?:-([A-Za-z0-9_][A-Za-z0-9_-]*))?-session\.tmp$/);
    if (!match) {
      continue;
    }

    const [, datePart, shortId] = match;
    const sourcePath = path.join(sessionsDir, entry.name);

    try {
      const original = fs.readFileSync(sourcePath, 'utf8');
      const projectName = extractSessionHeaderField(original, 'Project');
      const worktree = extractSessionHeaderField(original, 'Worktree');
      let matchingEntries = previousEntries.filter(previous => {
        if (worktree && previous.root) {
          return sameOrDescendantPath(worktree, previous.root);
        }
        return Boolean(projectName && (!previous.name || previous.name === projectName));
      });

      if (matchingEntries.length === 0 && shortId && previousByShortId.has(shortId) && !projectName && !worktree) {
        matchingEntries = previousByShortId.get(shortId) || [];
      }

      if (matchingEntries.length === 0) {
        continue;
      }

      const renameEntries = shortId ? (previousByShortId.get(shortId) || []) : [];
      const targetPath = renameEntries.length > 0
        ? path.join(sessionsDir, `${datePart}-${currentShortId}-session.tmp`)
        : sourcePath;

      let updated = original;
      if (projectName) {
        updated = replaceSessionHeaderField(updated, 'Project', currentProjectName);
      }

      if (worktree && currentProjectRoot) {
        for (const previous of matchingEntries) {
          if (!sameOrDescendantPath(worktree, previous.root)) {
            continue;
          }
          const relativePath = path.relative(previous.root, path.resolve(worktree));
          updated = replaceSessionHeaderField(
            updated,
            'Worktree',
            path.join(path.resolve(currentProjectRoot), relativePath)
          );
          break;
        }
      }

      if (targetPath === sourcePath || sameFilesystemPath(sourcePath, targetPath)) {
        if (updated !== original) {
          fs.writeFileSync(sourcePath, updated, 'utf8');
          result.migrated += 1;
        }
        continue;
      }

      if (!fs.existsSync(targetPath)) {
        if (updated === original) {
          try {
            fs.renameSync(sourcePath, targetPath);
          } catch (err) {
            if (err.code === 'EXDEV') {
              fs.copyFileSync(sourcePath, targetPath);
              fs.rmSync(sourcePath, { force: true });
            } else {
              throw err;
            }
          }
        } else {
          fs.writeFileSync(targetPath, updated, 'utf8');
          fs.rmSync(sourcePath, { force: true });
        }
        result.migrated += 1;
        continue;
      }

      fs.rmSync(sourcePath, { force: true });
      result.removedDuplicates += 1;
    } catch (err) {
      result.errors.push({ path: sourcePath, message: err.message });
    }
  }

  return result;
}

/**
 * Get the learned skills directory
 */
function getLearnedSkillsDir() {
  return path.join(getFactoryDir(), 'skills', 'learned');
}

/**
 * Get the temp directory (cross-platform)
 */
function getTempDir() {
  return os.tmpdir();
}

/**
 * Ensure a directory exists (create if not)
 * @param {string} dirPath - Directory path to create
 * @returns {string} The directory path
 * @throws {Error} If directory cannot be created (e.g., permission denied)
 */
function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    // EEXIST is fine (race condition with another process creating it)
    if (err.code !== 'EEXIST') {
      throw new Error(`Failed to create directory '${dirPath}': ${err.message}`);
    }
  }
  return dirPath;
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current time in HH:MM format
 */
function getTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get the git repository name
 */
function getGitRepoName() {
  const result = runCommand('git rev-parse --show-toplevel');
  if (!result.success) return null;
  return path.basename(result.output);
}

/**
 * Get project name from git repo or current directory
 */
function getProjectName() {
  const repoName = getGitRepoName();
  if (repoName) return repoName;
  return path.basename(process.cwd()) || null;
}

/**
 * Sanitize a string for use as a session filename segment.
 * Replaces invalid characters with hyphens, collapses runs, strips
 * leading/trailing hyphens, and removes leading dots so hidden-dir names
 * like ".factory" or ".claude" map cleanly to readable ids.
 *
 * Pure non-ASCII inputs get a stable 8-char hash so distinct names do not
 * collapse to the same fallback session id. Mixed-script inputs retain their
 * ASCII part and gain a short hash suffix for disambiguation.
 */
function sanitizeSessionId(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const hasNonAscii = Array.from(raw).some(char => char.codePointAt(0) > 0x7f);
  const normalized = raw.replace(/^\.+/, '');
  const sanitized = normalized
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  if (sanitized.length > 0) {
    const suffix = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 6);
    if (WINDOWS_RESERVED_SESSION_IDS.has(sanitized.toUpperCase())) {
      return `${sanitized}-${suffix}`;
    }
    if (!hasNonAscii) return sanitized;
    return `${sanitized}-${suffix}`;
  }

  const meaningful = normalized.replace(/[\s\p{P}]/gu, '');
  if (meaningful.length === 0) return null;

  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 8);
}

/**
 * Get short session ID from FACTORY_SESSION_ID (or legacy CLAUDE_SESSION_ID).
 * Returns last 8 characters, falls back to a sanitized project name then 'default'.
 */
function getSessionIdShort(fallback = 'default') {
  const sessionId = process.env.FACTORY_SESSION_ID || process.env.CLAUDE_SESSION_ID;
  if (sessionId && sessionId.length > 0) {
    const sanitized = sanitizeSessionId(sessionId.slice(-8));
    if (sanitized) return sanitized;
  }
  return sanitizeSessionId(getProjectName()) || sanitizeSessionId(fallback) || 'default';
}

/**
 * Get current datetime in YYYY-MM-DD HH:MM:SS format
 */
function getDateTimeString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Find files matching a pattern in a directory (cross-platform alternative to find)
 * @param {string} dir - Directory to search
 * @param {string} pattern - File pattern (e.g., "*.tmp", "*.md")
 * @param {object} options - Options { maxAge: days, recursive: boolean }
 */
function findFiles(dir, pattern, options = {}) {
  if (!dir || typeof dir !== 'string') return [];
  if (!pattern || typeof pattern !== 'string') return [];

  const { maxAge = null, recursive = false } = options;
  const results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  // Escape all regex special characters, then convert glob wildcards.
  // Order matters: escape specials first, then convert * and ? to regex equivalents.
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);

  function searchDir(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isFile() && regex.test(entry.name)) {
          let stats;
          try {
            stats = fs.statSync(fullPath);
          } catch {
            continue; // File deleted between readdir and stat
          }

          if (maxAge !== null) {
            const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
            if (ageInDays <= maxAge) {
              results.push({ path: fullPath, mtime: stats.mtimeMs });
            }
          } else {
            results.push({ path: fullPath, mtime: stats.mtimeMs });
          }
        } else if (entry.isDirectory() && recursive) {
          searchDir(fullPath);
        }
      }
    } catch (_err) {
      // Ignore permission errors
    }
  }

  searchDir(dir);

  // Sort by modification time (newest first)
  results.sort((a, b) => b.mtime - a.mtime);

  return results;
}

/**
 * Read JSON from stdin (for hook input)
 * @param {object} options - Options
 * @param {number} options.timeoutMs - Timeout in milliseconds (default: 5000).
 *   Prevents hooks from hanging indefinitely if stdin never closes.
 * @returns {Promise<object>} Parsed JSON object, or empty object if stdin is empty
 */
async function readStdinJson(options = {}) {
  const { timeoutMs = 5000, maxSize = 1024 * 1024 } = options;

  return new Promise((resolve) => {
    let data = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        // Clean up stdin listeners so the event loop can exit
        process.stdin.removeAllListeners('data');
        process.stdin.removeAllListeners('end');
        process.stdin.removeAllListeners('error');
        if (process.stdin.unref) process.stdin.unref();
        // Resolve with whatever we have so far rather than hanging
        try {
          resolve(data.trim() ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      }
    }, timeoutMs);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      if (data.length < maxSize) {
        data += chunk;
      }
    });

    process.stdin.on('end', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        resolve(data.trim() ? JSON.parse(data) : {});
      } catch {
        // Consistent with timeout path: resolve with empty object
        // so hooks don't crash on malformed input
        resolve({});
      }
    });

    process.stdin.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Resolve with empty object so hooks don't crash on stdin errors
      resolve({});
    });
  });
}

/**
 * Log to stderr (visible to user in Factory Droid)
 */
function log(message) {
  console.error(message);
}

/**
 * Output to stdout (returned to Droid)
 */
function output(data) {
  if (typeof data === 'object') {
    console.log(JSON.stringify(data));
  } else {
    console.log(data);
  }
}

/**
 * Read a text file safely
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Write a text file
 */
function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Append to a text file
 */
function appendFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, content, 'utf8');
}

/**
 * Check if a command exists in PATH
 * Uses execFileSync to prevent command injection
 */
function commandExists(cmd) {
  // Validate command name - only allow alphanumeric, dash, underscore, dot
  if (!/^[a-zA-Z0-9_.-]+$/.test(cmd)) {
    return false;
  }

  try {
    if (isWindows) {
      // Use spawnSync to avoid shell interpolation
      const result = spawnSync('where', [cmd], { stdio: 'pipe' });
      return result.status === 0;
    } else {
      const result = spawnSync('which', [cmd], { stdio: 'pipe' });
      return result.status === 0;
    }
  } catch {
    return false;
  }
}

/**
 * Run a command and return output
 *
 * SECURITY NOTE: This function executes shell commands. Only use with
 * trusted, hardcoded commands. Never pass user-controlled input directly.
 * For user input, use spawnSync with argument arrays instead.
 *
 * @param {string} cmd - Command to execute (should be trusted/hardcoded)
 * @param {object} options - execSync options
 */
function runCommand(cmd, options = {}) {
  // Allowlist: only permit known-safe command prefixes
  const allowedPrefixes = ['git ', 'node ', 'npx ', 'which ', 'where '];
  if (!allowedPrefixes.some(prefix => cmd.startsWith(prefix))) {
    return { success: false, output: 'runCommand blocked: unrecognized command prefix' };
  }

  // Reject shell metacharacters. $() and backticks are evaluated inside
  // double quotes, so block $ and ` anywhere in cmd. Other operators
  // (;|&) are literal inside quotes, so only check unquoted portions.
  const unquoted = cmd.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '');
  if (/[;|&\n]/.test(unquoted) || /[`$]/.test(cmd)) {
    return { success: false, output: 'runCommand blocked: shell metacharacters not allowed' };
  }

  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return { success: false, output: err.stderr || err.message };
  }
}

/**
 * Check if current directory is a git repository
 */
function isGitRepo() {
  return runCommand('git rev-parse --git-dir').success;
}

/**
 * Get git modified files, optionally filtered by regex patterns
 * @param {string[]} patterns - Array of regex pattern strings to filter files.
 *   Invalid patterns are silently skipped.
 * @returns {string[]} Array of modified file paths
 */
function getGitModifiedFiles(patterns = []) {
  if (!isGitRepo()) return [];

  const result = runCommand('git diff --name-only HEAD');
  if (!result.success) return [];

  let files = result.output.split('\n').filter(Boolean);

  if (patterns.length > 0) {
    // Pre-compile patterns, skipping invalid ones
    const compiled = [];
    for (const pattern of patterns) {
      if (typeof pattern !== 'string' || pattern.length === 0) continue;
      try {
        compiled.push(new RegExp(pattern));
      } catch {
        // Skip invalid regex patterns
      }
    }
    if (compiled.length > 0) {
      files = files.filter(file => compiled.some(regex => regex.test(file)));
    }
  }

  return files;
}

/**
 * Replace text in a file (cross-platform sed alternative)
 * @param {string} filePath - Path to the file
 * @param {string|RegExp} search - Pattern to search for. String patterns replace
 *   the FIRST occurrence only; use a RegExp with the `g` flag for global replacement.
 * @param {string} replace - Replacement string
 * @param {object} options - Options
 * @param {boolean} options.all - When true and search is a string, replaces ALL
 *   occurrences (uses String.replaceAll). Ignored for RegExp patterns.
 * @returns {boolean} true if file was written, false on error
 */
function replaceInFile(filePath, search, replace, options = {}) {
  const content = readFile(filePath);
  if (content === null) return false;

  try {
    let newContent;
    if (options.all && typeof search === 'string') {
      newContent = content.replaceAll(search, replace);
    } else {
      newContent = content.replace(search, replace);
    }
    writeFile(filePath, newContent);
    return true;
  } catch (err) {
    log(`[Utils] replaceInFile failed for ${filePath}: ${err.message}`);
    return false;
  }
}

/**
 * Count occurrences of a pattern in a file
 * @param {string} filePath - Path to the file
 * @param {string|RegExp} pattern - Pattern to count. Strings are treated as
 *   global regex patterns. RegExp instances are used as-is but the global
 *   flag is enforced to ensure correct counting.
 * @returns {number} Number of matches found
 */
function countInFile(filePath, pattern) {
  const content = readFile(filePath);
  if (content === null) return 0;

  let regex;
  try {
    if (pattern instanceof RegExp) {
      // Always create new RegExp to avoid shared lastIndex state; ensure global flag
      regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    } else if (typeof pattern === 'string') {
      regex = new RegExp(pattern, 'g');
    } else {
      return 0;
    }
  } catch {
    return 0; // Invalid regex pattern
  }
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Strip all ANSI escape sequences from a string.
 *
 * Handles:
 * - CSI sequences: \x1b[ … <letter>  (colors, cursor movement, erase, etc.)
 * - OSC sequences: \x1b] … BEL/ST    (window titles, hyperlinks)
 * - Charset selection: \x1b(B
 * - Bare ESC + single letter: \x1b <letter>  (e.g. \x1bM for reverse index)
 *
 * @param {string} str - Input string possibly containing ANSI codes
 * @returns {string} Cleaned string with all escape sequences removed
 */
function stripAnsi(str) {
  if (typeof str !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b(?:\[[0-9;?]*[A-Za-z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|\([A-Z]|[A-Z])/g, '');
}

/**
 * Search for pattern in file and return matching lines with line numbers
 */
function grepFile(filePath, pattern) {
  const content = readFile(filePath);
  if (content === null) return [];

  let regex;
  try {
    if (pattern instanceof RegExp) {
      // Always create a new RegExp without the 'g' flag to prevent lastIndex
      // state issues when using .test() in a loop (g flag makes .test() stateful,
      // causing alternating match/miss on consecutive matching lines)
      const flags = pattern.flags.replace('g', '');
      regex = new RegExp(pattern.source, flags);
    } else {
      regex = new RegExp(pattern);
    }
  } catch {
    return []; // Invalid regex pattern
  }
  const lines = content.split('\n');
  const results = [];

  lines.forEach((line, index) => {
    if (regex.test(line)) {
      results.push({ lineNumber: index + 1, content: line });
    }
  });

  return results;
}

module.exports = {
  // Platform info
  isWindows,
  isMacOS,
  isLinux,

  // Directories
  getHomeDir,
  getFactoryDir,
  getClaudeDir,
  getSessionsDir,
  getSessionSearchDirs,
  getLearnedSkillsDir,
  getTempDir,
  ensureDir,
  migrateLegacySessions,
  reportLegacyMigrationErrors,
  migrateProjectSessions,

  // Date/Time
  getDateString,
  getTimeString,
  getDateTimeString,

  // Session/Project
  sanitizeSessionId,
  getSessionIdShort,
  getGitRepoName,
  getProjectName,

  // File operations
  findFiles,
  readFile,
  writeFile,
  appendFile,
  replaceInFile,
  countInFile,
  grepFile,

  // String sanitisation
  stripAnsi,

  // Hook I/O
  readStdinJson,
  log,
  output,

  // System
  commandExists,
  runCommand,
  isGitRepo,
  getGitModifiedFiles
};
