'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'lib', 'session-adapters', 'canonical-session.js');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function loadInternals() {
  let source = fs.readFileSync(SCRIPT, 'utf8');
  source = source.replace(
    /const normalizeClaudeHistorySession = normalizeFactoryHistorySession;\s*\n\s*module\.exports = \{\s*SESSION_SCHEMA_VERSION,\s*buildAggregates,\s*getFallbackSessionRecordingPath,\s*normalizeFactoryHistorySession,\s*normalizeClaudeHistorySession,\s*normalizeDmuxSnapshot,\s*persistCanonicalSnapshot,\s*validateCanonicalSnapshot\s*\};\s*$/s,
    `const normalizeClaudeHistorySession = normalizeFactoryHistorySession;

module.exports = {
      SESSION_SCHEMA_VERSION,
      buildAggregates,
      getFallbackSessionRecordingPath,
      normalizeFactoryHistorySession,
      normalizeClaudeHistorySession,
      normalizeDmuxSnapshot,
      persistCanonicalSnapshot,
      validateCanonicalSnapshot,
      __test: {
        sanitizePathSegment,
        parseContextSeedPaths,
        parseUpdatedMs,
        deriveWorkerHealth,
        summarizeRawWorkerStates,
        deriveDmuxSessionState,
        resolveRecordingDir,
        readExistingRecording,
        writeFallbackSessionRecording,
        loadStateStore,
        resolveStateStoreWriter,
        deriveClaudeWorkerId
      }
    };\n`
  );

  const mod = new Module(SCRIPT, module);
  mod.filename = SCRIPT;
  mod.paths = Module._nodeModulePaths(path.dirname(SCRIPT));
  mod._compile(source, SCRIPT);
  return mod.exports;
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function makeSnapshot() {
  return {
    schemaVersion: 'efd.session.v1',
    adapterId: 'dmux-tmux',
    session: {
      id: 'workflow',
      kind: 'orchestrated',
      state: 'active',
      repoRoot: '/tmp/repo',
      sourceTarget: { type: 'session', value: 'workflow' }
    },
    workers: [{
      id: 'worker',
      label: 'Worker',
      state: 'running',
      health: 'healthy',
      branch: null,
      worktree: null,
      runtime: { kind: 'tmux-pane', command: null, active: false, dead: false },
      intent: { objective: 'Inspect', seedPaths: [] },
      outputs: { summary: [], validation: [], remainingRisks: [] },
      artifacts: {}
    }],
    aggregates: {
      workerCount: 1,
      states: { running: 1 },
      healths: { healthy: 1 }
    }
  };
}

const canonical = loadInternals();
const internals = canonical.__test;

console.log('\n=== Testing canonical-session internals ===\n');

let passed = 0;
let failed = 0;

if (test('path and context helpers cover empty, invalid, and fallback branches', () => {
  assert.strictEqual(internals.sanitizePathSegment('  weird path/[] '), 'weird_path');
  assert.strictEqual(internals.sanitizePathSegment(''), 'unknown');
  assert.deepStrictEqual(internals.parseContextSeedPaths('a\n\n b \n'), ['a', 'b']);
  assert.deepStrictEqual(internals.parseContextSeedPaths(''), []);
  assert.strictEqual(internals.parseUpdatedMs('not-a-date'), null);
  assert.ok(Number.isInteger(internals.parseUpdatedMs('2026-04-06T00:00:00Z')));
})) passed++; else failed++;

if (test('worker and session state helpers cover healthy, stale, degraded, and idle branches', () => {
  const staleTime = new Date(Date.now() - (10 * 60 * 1000)).toISOString();
  assert.strictEqual(internals.deriveWorkerHealth({ status: { state: 'failed' } }), 'degraded');
  assert.strictEqual(internals.deriveWorkerHealth({ status: { state: 'completed' } }), 'healthy');
  assert.strictEqual(internals.deriveWorkerHealth({ status: { state: 'running', updated: staleTime }, pane: { dead: false } }), 'stale');
  assert.strictEqual(internals.deriveWorkerHealth({ status: { state: 'running', updated: new Date().toISOString() }, pane: { dead: true } }), 'degraded');
  assert.strictEqual(internals.deriveWorkerHealth({ status: { state: 'active' }, pane: { dead: false } }), 'stale');
  assert.strictEqual(internals.deriveWorkerHealth({ status: { state: 'queued' } }), 'unknown');

  assert.deepStrictEqual(internals.summarizeRawWorkerStates({ workerStates: { running: 2 } }), { running: 2 });
  assert.deepStrictEqual(internals.summarizeRawWorkerStates({ workers: [{ status: { state: 'failed' } }, {}] }), { failed: 1, unknown: 1 });
  assert.strictEqual(internals.deriveDmuxSessionState({ sessionActive: true, workerCount: 0, workerStates: {} }), 'active');
  assert.strictEqual(internals.deriveDmuxSessionState({ sessionActive: false, workerCount: 0, workerStates: {} }), 'missing');
  assert.strictEqual(internals.deriveDmuxSessionState({ sessionActive: false, workerCount: 2, workerStates: { failed: 1, running: 1 } }), 'failed');
  assert.strictEqual(internals.deriveDmuxSessionState({ sessionActive: false, workerCount: 2, workerStates: { success: 1, done: 1 } }), 'completed');
  assert.strictEqual(internals.deriveDmuxSessionState({ sessionActive: false, workerCount: 2, workerStates: { running: 2 } }), 'idle');
})) passed++; else failed++;

if (test('recording helpers cover env fallback, invalid existing JSON, dedupe, and append history branches', () => {
  const tempDir = createTempDir('efd-canonical-internals-');
  const previousRecordingDir = process.env.EFD_SESSION_RECORDING_DIR;

  try {
    process.env.EFD_SESSION_RECORDING_DIR = tempDir;
    assert.strictEqual(internals.resolveRecordingDir(), tempDir);
    assert.strictEqual(internals.resolveRecordingDir({ recordingDir: path.join(tempDir, 'override') }), path.join(tempDir, 'override'));
    assert.strictEqual(internals.readExistingRecording(path.join(tempDir, 'missing.json')), null);
    const invalidPath = path.join(tempDir, 'invalid.json');
    fs.writeFileSync(invalidPath, '{bad-json', 'utf8');
    assert.strictEqual(internals.readExistingRecording(invalidPath), null);

    const first = internals.writeFallbackSessionRecording(makeSnapshot(), { recordingDir: tempDir });
    const second = internals.writeFallbackSessionRecording(makeSnapshot(), { recordingDir: tempDir });
    const changedSnapshot = makeSnapshot();
    changedSnapshot.session.state = 'completed';
    const third = internals.writeFallbackSessionRecording(changedSnapshot, { recordingDir: tempDir });
    const payload = JSON.parse(fs.readFileSync(third.path, 'utf8'));

    assert.strictEqual(first.backend, 'json-file');
    assert.strictEqual(second.path, first.path);
    assert.strictEqual(payload.history.length, 2);
    assert.strictEqual(payload.latest.session.state, 'completed');
  } finally {
    if (previousRecordingDir === undefined) {
      delete process.env.EFD_SESSION_RECORDING_DIR;
    } else {
      process.env.EFD_SESSION_RECORDING_DIR = previousRecordingDir;
    }
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('state-store helpers cover direct values, missing-module fallback, writer resolution, and error propagation', () => {
  const directStore = {};
  assert.strictEqual(internals.loadStateStore({ stateStore: directStore }), directStore);
  assert.strictEqual(
    internals.loadStateStore({
      loadStateStoreImpl() {
        const error = new Error("Cannot find module '../state-store'");
        error.code = 'MODULE_NOT_FOUND';
        throw error;
      }
    }),
    null
  );
  assert.throws(
    () => internals.loadStateStore({
      loadStateStoreImpl() {
        const error = new Error('boom');
        error.code = 'ERR_OTHER';
        throw error;
      }
    }),
    /boom/
  );

  const rootWriter = { persistSessionSnapshot() {} };
  const nestedWriter = { sessions: { recordCanonicalSessionSnapshot() {} } };
  assert.strictEqual(typeof internals.resolveStateStoreWriter(rootWriter), 'function');
  assert.strictEqual(typeof internals.resolveStateStoreWriter(nestedWriter), 'function');
  assert.strictEqual(internals.resolveStateStoreWriter({ createStateStore() {} }), null);
})) passed++; else failed++;

if (test('deriveClaudeWorkerId and validation cover fallback and error branches', () => {
  assert.strictEqual(internals.deriveClaudeWorkerId({ shortId: 'abc123' }), 'abc123');
  assert.strictEqual(internals.deriveClaudeWorkerId({ shortId: 'no-id', filename: 'session.tmp' }), 'session');
  assert.strictEqual(internals.deriveClaudeWorkerId({ shortId: 'no-id', sessionPath: '/tmp/fallback.tmp' }), 'fallback');

  const invalidSnapshot = makeSnapshot();
  invalidSnapshot.aggregates.states = null;
  assert.throws(() => canonical.validateCanonicalSnapshot(invalidSnapshot), /aggregates\.states to be an object/);
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
