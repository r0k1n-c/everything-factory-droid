#!/usr/bin/env node
/**
 * PreCompact Hook - Save state before context compaction
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs before Droid compacts context, giving you a chance to
 * preserve important state that might get lost in summarization.
 */

const path = require('path');
const {
  getSessionsDir,
  getDateTimeString,
  getTimeString,
  findFiles,
  ensureDir,
  migrateLegacySessions,
  reportLegacyMigrationErrors,
  migrateProjectSessions,
  getProjectName,
  appendFile,
  log
} = require('../lib/utils');
const { resolveProjectContext } = require('../lib/observer-sessions');

async function main() {
  const sessionsDir = getSessionsDir();
  const compactionLog = path.join(sessionsDir, 'compaction-log.txt');

  ensureDir(sessionsDir);
  reportLegacyMigrationErrors(migrateLegacySessions(), 'PreCompact');
  const observerContext = resolveProjectContext();
  const currentProjectName = observerContext.projectRoot
    ? path.basename(observerContext.projectRoot)
    : (getProjectName() || '');
  migrateProjectSessions({
    currentProjectName,
    currentProjectRoot: observerContext.projectRoot,
    previousProjects: observerContext.previousProjects
  });

  // Log compaction event with timestamp
  const timestamp = getDateTimeString();
  appendFile(compactionLog, `[${timestamp}] Context compaction triggered\n`);

  // If there's an active session file, note the compaction
  const sessions = findFiles(sessionsDir, '*-session.tmp');

  if (sessions.length > 0) {
    const activeSession = sessions[0].path;
    const timeStr = getTimeString();
    appendFile(activeSession, `\n---\n**[Compaction occurred at ${timeStr}]** - Context was summarized\n`);
  }

  log('[PreCompact] State saved before compaction');
  process.exit(0);
}

main().catch(err => {
  console.error('[PreCompact] Error:', err.message);
  process.exit(0);
});
