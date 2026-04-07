'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildAggregates,
  getFallbackSessionRecordingPath,
  normalizeClaudeHistorySession,
  normalizeDmuxSnapshot,
  persistCanonicalSnapshot,
  validateCanonicalSnapshot
} = require('../../scripts/lib/session-adapters/canonical-session');

console.log('=== Testing canonical-session direct coverage ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`  ✗ ${name}: ${error.message}`);
    failed += 1;
  }
}

function makeSnapshot(overrides = {}) {
  return {
    schemaVersion: 'efd.session.v1',
    adapterId: 'dmux-tmux',
    session: {
      id: 'workflow-1',
      kind: 'orchestrated',
      state: 'active',
      repoRoot: '/tmp/repo',
      sourceTarget: { type: 'session', value: 'workflow-1' }
    },
    workers: [{
      id: 'worker-1',
      label: 'Worker 1',
      state: 'running',
      health: 'healthy',
      branch: 'feature/a',
      worktree: '/tmp/worktree-a',
      runtime: {
        kind: 'tmux-pane',
        command: 'droid',
        active: true,
        dead: false
      },
      intent: {
        objective: 'Inspect files',
        seedPaths: ['scripts/test.js']
      },
      outputs: {
        summary: ['Started'],
        validation: [],
        remainingRisks: ['None']
      },
      artifacts: {
        statusFile: '/tmp/status.md'
      }
    }],
    aggregates: {
      workerCount: 1,
      states: { running: 1 },
      healths: { healthy: 1 }
    },
    ...overrides
  };
}

test('buildAggregates tallies worker states and healths', () => {
  const aggregates = buildAggregates([
    { state: 'running', health: 'healthy' },
    { state: 'running', health: 'stale' },
    { state: 'failed', health: 'degraded' },
    { state: null, health: null }
  ]);

  assert.deepStrictEqual(aggregates, {
    workerCount: 4,
    states: {
      running: 2,
      failed: 1,
      unknown: 1
    },
    healths: {
      healthy: 1,
      stale: 1,
      degraded: 1,
      unknown: 1
    }
  });
});

test('normalizeDmuxSnapshot marks missing and completed session states', () => {
  const missing = normalizeDmuxSnapshot({
    sessionName: 'empty',
    sessionActive: false,
    workerCount: 0,
    workerStates: {},
    workers: []
  }, { type: 'session', value: 'empty' });
  const completed = normalizeDmuxSnapshot({
    sessionName: 'done',
    sessionActive: false,
    workerCount: 2,
    workerStates: { succeeded: 1, done: 1 },
    workers: [{
      workerSlug: 'a',
      status: { state: 'succeeded', branch: 'a', worktree: '/tmp/a', updated: '2026-04-06T00:00:00Z' },
      task: { objective: 'A', seedPaths: [] },
      handoff: { summary: [], validation: [], remainingRisks: [] },
      files: { status: '/tmp/a-status', task: '/tmp/a-task', handoff: '/tmp/a-handoff' },
      pane: null
    }, {
      workerSlug: 'b',
      status: { state: 'done', branch: 'b', worktree: '/tmp/b', updated: '2026-04-06T00:00:00Z' },
      task: { objective: 'B', seedPaths: [] },
      handoff: { summary: [], validation: [], remainingRisks: [] },
      files: { status: '/tmp/b-status', task: '/tmp/b-task', handoff: '/tmp/b-handoff' },
      pane: null
    }]
  }, { type: 'session', value: 'done' });

  assert.strictEqual(missing.session.state, 'missing');
  assert.strictEqual(completed.session.state, 'completed');
  assert.strictEqual(completed.aggregates.states.succeeded, 1);
  assert.strictEqual(completed.aggregates.states.done, 1);
});

test('normalizeDmuxSnapshot derives degraded and stale worker health states', () => {
  const staleUpdated = new Date(Date.now() - (10 * 60 * 1000)).toISOString();
  const snapshot = normalizeDmuxSnapshot({
    sessionName: 'mixed',
    sessionActive: false,
    workerCount: 3,
    workerStates: { failed: 1, running: 2 },
    repoRoot: '/tmp/repo',
    workers: [{
      workerSlug: 'failed',
      status: { state: 'failed', branch: 'failed', worktree: '/tmp/failed', updated: staleUpdated },
      task: { objective: 'Failed', seedPaths: [] },
      handoff: { summary: [], validation: [], remainingRisks: [] },
      files: { status: '/tmp/status-1', task: '/tmp/task-1', handoff: '/tmp/handoff-1' },
      pane: null
    }, {
      workerSlug: 'stale',
      status: { state: 'running', branch: 'stale', worktree: '/tmp/stale', updated: staleUpdated },
      task: { objective: 'Stale', seedPaths: [] },
      handoff: { summary: [], validation: [], remainingRisks: [] },
      files: { status: '/tmp/status-2', task: '/tmp/task-2', handoff: '/tmp/handoff-2' },
      pane: { active: false, dead: false, currentCommand: 'droid', pid: 1 }
    }, {
      workerSlug: 'dead-pane',
      status: { state: 'running', branch: 'dead', worktree: '/tmp/dead', updated: new Date().toISOString() },
      task: { objective: 'Dead pane', seedPaths: [] },
      handoff: { summary: [], validation: [], remainingRisks: [] },
      files: { status: '/tmp/status-3', task: '/tmp/task-3', handoff: '/tmp/handoff-3' },
      pane: { active: false, dead: true, currentCommand: 'droid', pid: 2 }
    }]
  }, { type: 'session', value: 'mixed' });

  assert.strictEqual(snapshot.session.state, 'failed');
  assert.strictEqual(snapshot.workers[0].health, 'degraded');
  assert.strictEqual(snapshot.workers[1].health, 'stale');
  assert.strictEqual(snapshot.workers[2].health, 'degraded');
  assert.strictEqual(snapshot.aggregates.healths.degraded, 2);
  assert.strictEqual(snapshot.aggregates.healths.stale, 1);
});

test('normalizeClaudeHistorySession parses context seed paths and metadata', () => {
  const snapshot = normalizeClaudeHistorySession({
    shortId: 'abc123',
    filename: 'session.tmp',
    sessionPath: '/tmp/session.tmp',
    metadata: {
      title: 'Review branch',
      branch: 'feature/review',
      worktree: '/tmp/repo',
      inProgress: ['Check tests'],
      completed: ['Ran validators'],
      notes: 'Need screenshots',
      context: 'scripts/a.js\n\nscripts/b.js  '
    }
  }, { type: 'history', value: 'abc123' });

  assert.strictEqual(snapshot.session.id, 'abc123');
  assert.strictEqual(snapshot.workers[0].label, 'Review branch');
  assert.deepStrictEqual(snapshot.workers[0].intent.seedPaths, ['scripts/a.js', 'scripts/b.js']);
  assert.deepStrictEqual(snapshot.workers[0].outputs.summary, ['Ran validators']);
  assert.deepStrictEqual(snapshot.workers[0].outputs.remainingRisks, ['Need screenshots']);
});

test('normalizeClaudeHistorySession falls back to filename-derived worker ids', () => {
  const snapshot = normalizeClaudeHistorySession({
    shortId: 'no-id',
    filename: '2026-04-06-my-session.tmp',
    sessionPath: '/tmp/2026-04-06-my-session.tmp',
    metadata: {
      title: 'Recovered title'
    }
  }, { type: 'history', value: 'session' });

  assert.strictEqual(snapshot.session.id, '2026-04-06-my-session');
  assert.strictEqual(snapshot.workers[0].intent.objective, 'Recovered title');
  assert.deepStrictEqual(snapshot.workers[0].intent.seedPaths, []);
});

test('validateCanonicalSnapshot rejects invalid aggregate counts', () => {
  assert.throws(
    () => validateCanonicalSnapshot(makeSnapshot({
      aggregates: {
        workerCount: 2,
        states: { running: 1 },
        healths: { healthy: 1 }
      }
    })),
    /aggregates\.workerCount to match workers\.length/
  );
});

test('validateCanonicalSnapshot rejects invalid runtime booleans', () => {
  const snapshot = makeSnapshot();
  snapshot.workers[0].runtime.active = 'yes';

  assert.throws(
    () => validateCanonicalSnapshot(snapshot),
    /runtime\.active to be a boolean/
  );
});

test('getFallbackSessionRecordingPath sanitizes ids and honors env recording dir', () => {
  const previousRecordingDir = process.env.EFD_SESSION_RECORDING_DIR;
  process.env.EFD_SESSION_RECORDING_DIR = path.join(os.tmpdir(), 'efd recordings');

  try {
    const recordingPath = getFallbackSessionRecordingPath(makeSnapshot({
      adapterId: 'dmux tmux',
      session: {
        id: 'workflow / 1',
        kind: 'orchestrated',
        state: 'active',
        repoRoot: '/tmp/repo',
        sourceTarget: { type: 'session', value: 'workflow-1' }
      }
    }));

    assert.ok(recordingPath.endsWith(path.join('dmux_tmux', 'workflow_1.json')), `Unexpected path: ${recordingPath}`);
  } finally {
    if (previousRecordingDir === undefined) {
      delete process.env.EFD_SESSION_RECORDING_DIR;
    } else {
      process.env.EFD_SESSION_RECORDING_DIR = previousRecordingDir;
    }
  }
});

test('persistCanonicalSnapshot can skip persistence explicitly', () => {
  const result = persistCanonicalSnapshot(makeSnapshot(), { persist: false });

  assert.deepStrictEqual(result, {
    backend: 'skipped',
    path: null,
    recordedAt: null
  });
});

test('persistCanonicalSnapshot uses the first available state-store writer', () => {
  const calls = [];
  const snapshot = makeSnapshot();
  const result = persistCanonicalSnapshot(snapshot, {
    stateStore: {
      sessions: {
        recordSessionSnapshot(receivedSnapshot, metadata) {
          calls.push({ receivedSnapshot, metadata });
        }
      }
    }
  });

  assert.strictEqual(result.backend, 'state-store');
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].receivedSnapshot.session.id, 'workflow-1');
  assert.strictEqual(calls[0].metadata.adapterId, 'dmux-tmux');
});

test('persistCanonicalSnapshot falls back to JSON recording when state store is unavailable', () => {
  const recordingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'efd-canonical-session-'));

  try {
    const snapshot = makeSnapshot();
    const result = persistCanonicalSnapshot(snapshot, {
      recordingDir,
      loadStateStoreImpl() {
        const error = new Error("Cannot find module '../state-store'");
        error.code = 'MODULE_NOT_FOUND';
        throw error;
      }
    });

    assert.strictEqual(result.backend, 'json-file');
    assert.ok(fs.existsSync(result.path), `Expected JSON recording at ${result.path}`);
    const payload = JSON.parse(fs.readFileSync(result.path, 'utf8'));
    assert.strictEqual(payload.schemaVersion, 'efd.session.recording.v1');
    assert.strictEqual(payload.history.length, 1);
  } finally {
    fs.rmSync(recordingDir, { recursive: true, force: true });
  }
});

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
