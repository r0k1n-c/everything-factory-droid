'use strict';

const fs = require('fs');
const path = require('path');

const sessionManager = require('../session-manager');
const sessionAliases = require('../session-aliases');
const { normalizeFactoryHistorySession, persistCanonicalSnapshot } = require('./canonical-session');

function parseFactoryTarget(target) {
  if (typeof target !== 'string') {
    return null;
  }

  for (const prefix of ['factory-history:', 'factory:', 'history:', 'claude-history:', 'claude:']) {
    if (target.startsWith(prefix)) {
      return target.slice(prefix.length).trim();
    }
  }

  return null;
}

function isSessionFileTarget(target, cwd) {
  if (typeof target !== 'string' || target.length === 0) {
    return false;
  }

  const absoluteTarget = path.resolve(cwd, target);
  return fs.existsSync(absoluteTarget)
    && fs.statSync(absoluteTarget).isFile()
    && absoluteTarget.endsWith('.tmp');
}

function hydrateSessionFromPath(sessionPath) {
  const filename = path.basename(sessionPath);
  const parsed = sessionManager.parseSessionFilename(filename);
  if (!parsed) {
    throw new Error(`Unsupported session file: ${sessionPath}`);
  }

  const content = sessionManager.getSessionContent(sessionPath);
  const stats = fs.statSync(sessionPath);

  return {
    ...parsed,
    sessionPath,
    content,
    metadata: sessionManager.parseSessionMetadata(content),
    stats: sessionManager.getSessionStats(content || ''),
    size: stats.size,
    modifiedTime: stats.mtime,
    createdTime: stats.birthtime || stats.ctime
  };
}

function resolveSessionRecord(target, cwd) {
  const explicitTarget = parseFactoryTarget(target);

  if (explicitTarget) {
    if (explicitTarget === 'latest') {
      const [latest] = sessionManager.getAllSessions({ limit: 1 }).sessions;
      if (!latest) {
        throw new Error('No Factory Droid session history found');
      }

      return {
        session: sessionManager.getSessionById(latest.filename, true),
        sourceTarget: {
          type: 'factory-history',
          value: 'latest'
        }
      };
    }

    const alias = sessionAliases.resolveAlias(explicitTarget);
    if (alias) {
      return {
        session: hydrateSessionFromPath(alias.sessionPath),
        sourceTarget: {
          type: 'factory-alias',
          value: explicitTarget
        }
      };
    }

    const session = sessionManager.getSessionById(explicitTarget, true);
    if (!session) {
      throw new Error(`Factory Droid session not found: ${explicitTarget}`);
    }

    return {
      session,
      sourceTarget: {
        type: 'factory-history',
        value: explicitTarget
      }
    };
  }

  if (isSessionFileTarget(target, cwd)) {
    return {
      session: hydrateSessionFromPath(path.resolve(cwd, target)),
      sourceTarget: {
        type: 'session-file',
        value: path.resolve(cwd, target)
      }
    };
  }

  throw new Error(`Unsupported Factory Droid session target: ${target}`);
}

function createFactoryHistoryAdapter(options = {}) {
  const persistCanonicalSnapshotImpl = options.persistCanonicalSnapshotImpl || persistCanonicalSnapshot;

  return {
    id: 'factory-history',
    description: 'Factory Droid local session history and session-file snapshots',
    targetTypes: ['factory-history', 'factory-alias', 'session-file', 'claude-history', 'claude-alias'],
    canOpen(target, context = {}) {
      if (context.adapterId && context.adapterId !== 'factory-history') {
        return false;
      }

      if (context.adapterId === 'factory-history') {
        return true;
      }

      const cwd = context.cwd || process.cwd();
      return parseFactoryTarget(target) !== null || isSessionFileTarget(target, cwd);
    },
    open(target, context = {}) {
      const cwd = context.cwd || process.cwd();

      return {
        adapterId: 'factory-history',
        getSnapshot() {
          const { session, sourceTarget } = resolveSessionRecord(target, cwd);
          const canonicalSnapshot = normalizeFactoryHistorySession(session, sourceTarget);

          persistCanonicalSnapshotImpl(canonicalSnapshot, {
            loadStateStoreImpl: options.loadStateStoreImpl,
            persist: context.persistSnapshots !== false && options.persistSnapshots !== false,
            recordingDir: context.recordingDir || options.recordingDir,
            stateStore: options.stateStore
          });

          return canonicalSnapshot;
        }
      };
    }
  };
}

const createClaudeHistoryAdapter = createFactoryHistoryAdapter;
const parseClaudeTarget = parseFactoryTarget;

module.exports = {
  createFactoryHistoryAdapter,
  createClaudeHistoryAdapter,
  isSessionFileTarget,
  parseFactoryTarget,
  parseClaudeTarget
};
