'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  getFallbackSessionRecordingPath,
  persistCanonicalSnapshot
} = require('../../scripts/lib/session-adapters/canonical-session');
const { createFactoryHistoryAdapter } = require('../../scripts/lib/session-adapters/factory-history');
const { createDmuxTmuxAdapter } = require('../../scripts/lib/session-adapters/dmux-tmux');
const {
  createAdapterRegistry,
  inspectSessionTarget
} = require('../../scripts/lib/session-adapters/registry');

console.log('=== Testing session-adapters ===\n');

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

function withHome(homeDir, fn) {
  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = homeDir;
  process.env.USERPROFILE = homeDir;

  try {
    fn();
  } finally {
    if (typeof previousHome === 'string') {
      process.env.HOME = previousHome;
    } else {
      delete process.env.HOME;
    }

    if (typeof previousUserProfile === 'string') {
      process.env.USERPROFILE = previousUserProfile;
    } else {
      delete process.env.USERPROFILE;
    }
  }
}

test('dmux adapter normalizes orchestration snapshots into canonical form', () => {
  const recordingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'efd-session-recordings-'));

  try {
    const recentUpdated = new Date(Date.now() - 60000).toISOString();

    const adapter = createDmuxTmuxAdapter({
      loadStateStoreImpl: () => null,
      collectSessionSnapshotImpl: () => ({
        sessionName: 'workflow-visual-proof',
        coordinationDir: '/tmp/.factory/orchestration/workflow-visual-proof',
        repoRoot: '/tmp/repo',
        targetType: 'plan',
        sessionActive: true,
        paneCount: 1,
        workerCount: 1,
        workerStates: { running: 1 },
        panes: [{
          paneId: '%95',
          windowIndex: 1,
          paneIndex: 0,
          title: 'seed-check',
          currentCommand: 'codex',
          currentPath: '/tmp/worktree',
          active: false,
          dead: false,
          pid: 1234
        }],
        workers: [{
          workerSlug: 'seed-check',
          workerDir: '/tmp/.factory/orchestration/workflow-visual-proof/seed-check',
          status: {
            state: 'running',
            updated: recentUpdated,
            branch: 'feature/seed-check',
            worktree: '/tmp/worktree',
            taskFile: '/tmp/task.md',
            handoffFile: '/tmp/handoff.md'
          },
          task: {
            objective: 'Inspect seeded files.',
            seedPaths: ['scripts/orchestrate-worktrees.js']
          },
          handoff: {
            summary: ['Pending'],
            validation: [],
            remainingRisks: ['No screenshot yet']
          },
          files: {
            status: '/tmp/status.md',
            task: '/tmp/task.md',
            handoff: '/tmp/handoff.md'
          },
          pane: {
            paneId: '%95',
            title: 'seed-check'
          }
        }]
      }),
      recordingDir
    });

    const snapshot = adapter.open('workflow-visual-proof').getSnapshot();
    const recordingPath = getFallbackSessionRecordingPath(snapshot, { recordingDir });
    const persisted = JSON.parse(fs.readFileSync(recordingPath, 'utf8'));

    assert.strictEqual(snapshot.schemaVersion, 'efd.session.v1');
    assert.strictEqual(snapshot.adapterId, 'dmux-tmux');
    assert.strictEqual(snapshot.session.id, 'workflow-visual-proof');
    assert.strictEqual(snapshot.session.kind, 'orchestrated');
    assert.strictEqual(snapshot.session.state, 'active');
    assert.strictEqual(snapshot.session.sourceTarget.type, 'session');
    assert.strictEqual(snapshot.aggregates.workerCount, 1);
    assert.strictEqual(snapshot.workers[0].health, 'healthy');
    assert.strictEqual(snapshot.workers[0].runtime.kind, 'tmux-pane');
    assert.strictEqual(snapshot.workers[0].outputs.remainingRisks[0], 'No screenshot yet');
    assert.strictEqual(persisted.latest.session.state, 'active');
    assert.strictEqual(persisted.latest.adapterId, 'dmux-tmux');
    assert.strictEqual(persisted.history.length, 1);
  } finally {
    fs.rmSync(recordingDir, { recursive: true, force: true });
  }
});

test('dmux adapter marks finished sessions as completed and records history', () => {
  const recordingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'efd-session-recordings-'));

  try {
    const adapter = createDmuxTmuxAdapter({
      loadStateStoreImpl: () => null,
      collectSessionSnapshotImpl: () => ({
        sessionName: 'workflow-visual-proof',
        coordinationDir: '/tmp/.factory/orchestration/workflow-visual-proof',
        repoRoot: '/tmp/repo',
        targetType: 'session',
        sessionActive: false,
        paneCount: 0,
        workerCount: 2,
        workerStates: { completed: 2 },
        panes: [],
        workers: [{
          workerSlug: 'seed-check',
          workerDir: '/tmp/.factory/orchestration/workflow-visual-proof/seed-check',
          status: {
            state: 'completed',
            updated: '2026-03-13T00:00:00Z',
            branch: 'feature/seed-check',
            worktree: '/tmp/worktree-a',
            taskFile: '/tmp/task-a.md',
            handoffFile: '/tmp/handoff-a.md'
          },
          task: {
            objective: 'Inspect seeded files.',
            seedPaths: ['scripts/orchestrate-worktrees.js']
          },
          handoff: {
            summary: ['Finished'],
            validation: ['Reviewed outputs'],
            remainingRisks: []
          },
          files: {
            status: '/tmp/status-a.md',
            task: '/tmp/task-a.md',
            handoff: '/tmp/handoff-a.md'
          },
          pane: null
        }, {
          workerSlug: 'proof',
          workerDir: '/tmp/.factory/orchestration/workflow-visual-proof/proof',
          status: {
            state: 'completed',
            updated: '2026-03-13T00:10:00Z',
            branch: 'feature/proof',
            worktree: '/tmp/worktree-b',
            taskFile: '/tmp/task-b.md',
            handoffFile: '/tmp/handoff-b.md'
          },
          task: {
            objective: 'Capture proof.',
            seedPaths: ['README.md']
          },
          handoff: {
            summary: ['Delivered proof'],
            validation: ['Checked screenshots'],
            remainingRisks: []
          },
          files: {
            status: '/tmp/status-b.md',
            task: '/tmp/task-b.md',
            handoff: '/tmp/handoff-b.md'
          },
          pane: null
        }]
      }),
      recordingDir
    });

    const snapshot = adapter.open('workflow-visual-proof').getSnapshot();
    const recordingPath = getFallbackSessionRecordingPath(snapshot, { recordingDir });
    const persisted = JSON.parse(fs.readFileSync(recordingPath, 'utf8'));

    assert.strictEqual(snapshot.session.state, 'completed');
    assert.strictEqual(snapshot.aggregates.states.completed, 2);
    assert.strictEqual(snapshot.workers[0].health, 'healthy');
    assert.strictEqual(snapshot.workers[1].health, 'healthy');
    assert.strictEqual(persisted.latest.session.state, 'completed');
    assert.strictEqual(persisted.history.length, 1);
  } finally {
    fs.rmSync(recordingDir, { recursive: true, force: true });
  }
});

test('fallback recording does not append duplicate history entries for unchanged snapshots', () => {
  const recordingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'efd-session-recordings-'));

  try {
    const adapter = createDmuxTmuxAdapter({
      loadStateStoreImpl: () => null,
      collectSessionSnapshotImpl: () => ({
        sessionName: 'workflow-visual-proof',
        coordinationDir: '/tmp/.factory/orchestration/workflow-visual-proof',
        repoRoot: '/tmp/repo',
        targetType: 'session',
        sessionActive: true,
        paneCount: 1,
        workerCount: 1,
        workerStates: { running: 1 },
        panes: [],
        workers: [{
          workerSlug: 'seed-check',
          workerDir: '/tmp/.factory/orchestration/workflow-visual-proof/seed-check',
          status: {
            state: 'running',
            updated: '2026-03-13T00:00:00Z',
            branch: 'feature/seed-check',
            worktree: '/tmp/worktree',
            taskFile: '/tmp/task.md',
            handoffFile: '/tmp/handoff.md'
          },
          task: {
            objective: 'Inspect seeded files.',
            seedPaths: ['scripts/orchestrate-worktrees.js']
          },
          handoff: {
            summary: ['Pending'],
            validation: [],
            remainingRisks: []
          },
          files: {
            status: '/tmp/status.md',
            task: '/tmp/task.md',
            handoff: '/tmp/handoff.md'
          },
          pane: null
        }]
      }),
      recordingDir
    });

    const handle = adapter.open('workflow-visual-proof');
    const firstSnapshot = handle.getSnapshot();
    const secondSnapshot = handle.getSnapshot();
    const recordingPath = getFallbackSessionRecordingPath(firstSnapshot, { recordingDir });
    const persisted = JSON.parse(fs.readFileSync(recordingPath, 'utf8'));

    assert.deepStrictEqual(secondSnapshot, firstSnapshot);
    assert.strictEqual(persisted.history.length, 1);
    assert.deepStrictEqual(persisted.latest, secondSnapshot);
  } finally {
    fs.rmSync(recordingDir, { recursive: true, force: true });
  }
});

test('factory-history adapter loads the latest recorded session', () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'efd-session-adapter-home-'));
  const recordingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'efd-session-recordings-'));
  const sessionsDir = path.join(homeDir, '.factory', 'session-data');
  fs.mkdirSync(sessionsDir, { recursive: true });

  const canonicalSessionPath = path.join(sessionsDir, '2026-03-13-a1b2c3d4-session.tmp');
  fs.writeFileSync(canonicalSessionPath, [
    '# Session Review',
    '',
    '**Date:** 2026-03-13',
    '**Started:** 09:00',
    '**Last Updated:** 11:30',
    '**Project:** everything-factory-droid',
    '**Branch:** feat/session-adapter',
    '**Worktree:** /tmp/efd-worktree',
    '',
    '### Completed',
    '- [x] Build snapshot prototype',
    '',
    '### In Progress',
    '- [ ] Add CLI wrapper',
    '',
    '### Notes for Next Session',
    'Need a second adapter.',
    '',
    '### Context to Load',
    '```',
    'scripts/lib/orchestration-session.js',
    '```'
  ].join('\n'));

  try {
    withHome(homeDir, () => {
      const adapter = createFactoryHistoryAdapter({
        loadStateStoreImpl: () => null,
        recordingDir
      });
      const snapshot = adapter.open('factory:latest').getSnapshot();
      const recordingPath = getFallbackSessionRecordingPath(snapshot, { recordingDir });
      const persisted = JSON.parse(fs.readFileSync(recordingPath, 'utf8'));

      assert.strictEqual(snapshot.schemaVersion, 'efd.session.v1');
      assert.strictEqual(snapshot.adapterId, 'factory-history');
      assert.strictEqual(snapshot.session.kind, 'history');
      assert.strictEqual(snapshot.session.state, 'recorded');
      assert.strictEqual(snapshot.workers.length, 1);
      assert.strictEqual(snapshot.workers[0].branch, 'feat/session-adapter');
      assert.strictEqual(snapshot.workers[0].worktree, '/tmp/efd-worktree');
      assert.strictEqual(snapshot.workers[0].runtime.kind, 'factory-session');
      assert.deepStrictEqual(snapshot.workers[0].intent.seedPaths, ['scripts/lib/orchestration-session.js']);
      assert.strictEqual(snapshot.workers[0].artifacts.sessionFile, canonicalSessionPath);
      assert.ok(snapshot.workers[0].outputs.summary.includes('Build snapshot prototype'));
      assert.strictEqual(persisted.latest.adapterId, 'factory-history');
      assert.strictEqual(persisted.history.length, 1);
    });
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
    fs.rmSync(recordingDir, { recursive: true, force: true });
  }
});

test('adapter registry routes plan files to dmux and explicit factory targets to history', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'efd-session-registry-repo-'));
  const planPath = path.join(repoRoot, 'workflow.json');
  fs.writeFileSync(planPath, JSON.stringify({
    sessionName: 'workflow-visual-proof',
    repoRoot,
    coordinationRoot: path.join(repoRoot, '.factory', 'orchestration')
  }));

  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'efd-session-registry-home-'));
  const sessionsDir = path.join(homeDir, '.factory', 'session-data');
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, '2026-03-13-z9y8x7w6-session.tmp'),
    '# History Session\n\n**Branch:** feat/history\n'
  );

  try {
    withHome(homeDir, () => {
      const registry = createAdapterRegistry({
        adapters: [
          createDmuxTmuxAdapter({
            loadStateStoreImpl: () => null,
            collectSessionSnapshotImpl: () => ({
              sessionName: 'workflow-visual-proof',
              coordinationDir: path.join(repoRoot, '.factory', 'orchestration', 'workflow-visual-proof'),
              repoRoot,
              targetType: 'plan',
              sessionActive: false,
              paneCount: 0,
              workerCount: 0,
              workerStates: {},
              panes: [],
              workers: []
            })
          }),
          createFactoryHistoryAdapter({ loadStateStoreImpl: () => null })
        ]
      });

      const dmuxSnapshot = registry.open(planPath, { cwd: repoRoot }).getSnapshot();
      const claudeSnapshot = registry.open('factory:latest', { cwd: repoRoot }).getSnapshot();

      assert.strictEqual(dmuxSnapshot.adapterId, 'dmux-tmux');
      assert.strictEqual(claudeSnapshot.adapterId, 'factory-history');
    });
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('adapter registry resolves structured target types into the correct adapter', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'efd-session-typed-repo-'));
  const planPath = path.join(repoRoot, 'workflow.json');
  fs.writeFileSync(planPath, JSON.stringify({
    sessionName: 'workflow-typed-proof',
    repoRoot,
    coordinationRoot: path.join(repoRoot, '.factory', 'orchestration')
  }));

  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'efd-session-typed-home-'));
  const sessionsDir = path.join(homeDir, '.factory', 'session-data');
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, '2026-03-13-z9y8x7w6-session.tmp'),
    '# Typed History Session\n\n**Branch:** feat/typed-targets\n'
  );

  try {
    withHome(homeDir, () => {
      const registry = createAdapterRegistry({
        adapters: [
          createDmuxTmuxAdapter({
            loadStateStoreImpl: () => null,
            collectSessionSnapshotImpl: () => ({
              sessionName: 'workflow-typed-proof',
              coordinationDir: path.join(repoRoot, '.factory', 'orchestration', 'workflow-typed-proof'),
              repoRoot,
              targetType: 'plan',
              sessionActive: true,
              paneCount: 0,
              workerCount: 0,
              workerStates: {},
              panes: [],
              workers: []
            })
          }),
          createFactoryHistoryAdapter({ loadStateStoreImpl: () => null })
        ]
      });

      const dmuxSnapshot = registry.open({ type: 'plan', value: planPath }, { cwd: repoRoot }).getSnapshot();
      const claudeSnapshot = registry.open({ type: 'factory-history', value: 'latest' }, { cwd: repoRoot }).getSnapshot();

      assert.strictEqual(dmuxSnapshot.adapterId, 'dmux-tmux');
      assert.strictEqual(dmuxSnapshot.session.sourceTarget.type, 'plan');
      assert.strictEqual(claudeSnapshot.adapterId, 'factory-history');
      assert.strictEqual(claudeSnapshot.session.sourceTarget.type, 'factory-history');
      assert.strictEqual(claudeSnapshot.workers[0].branch, 'feat/typed-targets');
    });
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('default registry forwards a nested state-store writer to adapters', () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'efd-session-registry-home-'));
  const sessionsDir = path.join(homeDir, '.factory', 'session-data');
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, '2026-03-13-z9y8x7w6-session.tmp'),
    '# History Session\n\n**Branch:** feat/history\n'
  );

  const stateStore = {
    sessions: {
      persisted: [],
      persistCanonicalSessionSnapshot(snapshot, metadata) {
        this.persisted.push({ snapshot, metadata });
      }
    }
  };

  try {
    withHome(homeDir, () => {
      const snapshot = inspectSessionTarget('factory:latest', {
        cwd: process.cwd(),
        stateStore
      });

      assert.strictEqual(snapshot.adapterId, 'factory-history');
      assert.strictEqual(stateStore.sessions.persisted.length, 1);
      assert.strictEqual(stateStore.sessions.persisted[0].snapshot.adapterId, 'factory-history');
      assert.strictEqual(stateStore.sessions.persisted[0].metadata.sessionId, snapshot.session.id);
    });
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('adapter registry lists adapter metadata and target types', () => {
  const registry = createAdapterRegistry();
  const adapters = registry.listAdapters();
  const ids = adapters.map(adapter => adapter.id);

  assert.ok(ids.includes('factory-history'));
  assert.ok(ids.includes('dmux-tmux'));
  assert.ok(
    adapters.some(adapter => adapter.id === 'factory-history' && adapter.targetTypes.includes('factory-history')),
    'factory-history should advertise its canonical target type'
  );
  assert.ok(
    adapters.some(adapter => adapter.id === 'dmux-tmux' && adapter.targetTypes.includes('plan')),
    'dmux-tmux should advertise plan targets'
  );
});

test('persistence only falls back when the state-store module is missing', () => {
  const snapshot = {
    schemaVersion: 'efd.session.v1',
    adapterId: 'factory-history',
    session: {
      id: 'a1b2c3d4',
      kind: 'history',
      state: 'recorded',
      repoRoot: null,
      sourceTarget: {
        type: 'factory-history',
        value: 'latest'
      }
    },
    workers: [{
      id: 'a1b2c3d4',
      label: 'Session Review',
      state: 'recorded',
      health: 'healthy',
      branch: null,
      worktree: null,
      runtime: {
        kind: 'factory-session',
        command: 'droid',
        pid: null,
        active: false,
        dead: true
      },
      intent: {
        objective: 'Session Review',
        seedPaths: []
      },
      outputs: {
        summary: [],
        validation: [],
        remainingRisks: []
      },
      artifacts: {
        sessionFile: '/tmp/session.tmp',
        context: null
      }
    }],
    aggregates: {
      workerCount: 1,
      states: {
        recorded: 1
      },
      healths: {
        healthy: 1
      }
    }
  };

  const loadError = new Error('state-store bootstrap failed');
  loadError.code = 'ERR_STATE_STORE_BOOT';

  assert.throws(() => {
    persistCanonicalSnapshot(snapshot, {
      loadStateStoreImpl() {
        throw loadError;
      }
    });
  }, /state-store bootstrap failed/);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
