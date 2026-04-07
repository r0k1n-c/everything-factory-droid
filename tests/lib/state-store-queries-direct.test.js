'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const { createStateStore } = require('../../scripts/lib/state-store');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'lib', 'state-store', 'queries.js');

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ✓ ${name}`);
      return true;
    })
    .catch(error => {
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${error.message}`);
      return false;
    });
}

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupTempDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function loadQueries() {
  let source = fs.readFileSync(SCRIPT, 'utf8');
  source = source.replace(
    /module\.exports = \{[\s\S]*?\};\s*$/,
    `module.exports = {
  ACTIVE_SESSION_STATES,
  FAILURE_OUTCOMES,
  SUCCESS_OUTCOMES,
  createQueryApi,
  normalizeLimit,
  parseJsonColumn,
  stringifyJson,
  mapSessionRow,
  mapInstallStateRow,
  classifyOutcome,
  toPercent,
  summarizeSkillRuns,
  summarizeInstallHealth,
  normalizeSessionInput,
  normalizeSkillRunInput,
  normalizeSkillVersionInput,
  normalizeDecisionInput,
  normalizeInstallStateInput,
  normalizeGovernanceEventInput,
};
`
  );

  const mod = new Module(SCRIPT, module);
  mod.filename = SCRIPT;
  mod.paths = Module._nodeModulePaths(path.dirname(SCRIPT));
  mod._compile(source, SCRIPT);
  return mod.exports;
}

const queries = loadQueries();

async function runTests() {
  console.log('\n=== Testing state-store queries direct coverage ===\n');

  let passed = 0;
  let failed = 0;

  if (await test('direct helpers cover fallback, warning, and validation branches', async () => {
    assert.strictEqual(queries.normalizeLimit(undefined, 7), 7);
    assert.strictEqual(queries.normalizeLimit(null, 7), 7);
    assert.strictEqual(queries.normalizeLimit('3', 7), 3);
    assert.throws(() => queries.normalizeLimit('0', 7), /Invalid limit: 0/);

    assert.deepStrictEqual(queries.parseJsonColumn('', ['fallback']), ['fallback']);
    assert.deepStrictEqual(queries.parseJsonColumn(null, ['fallback']), ['fallback']);
    assert.deepStrictEqual(queries.parseJsonColumn('{"ok":true}', {}), { ok: true });

    const circular = {};
    circular.self = circular;
    assert.throws(() => queries.stringifyJson(circular, 'circular'), /Failed to serialize circular/);

    const mappedSession = queries.mapSessionRow({
      id: 'session-empty',
      adapter_id: 'direct',
      harness: 'droid',
      state: 'idle',
      repo_root: '/tmp/repo',
      started_at: '2026-03-15T10:00:00.000Z',
      ended_at: null,
      snapshot: '{"workers":{"unexpected":true}}',
    });
    assert.strictEqual(mappedSession.workerCount, 0);

    const mappedInstall = queries.mapInstallStateRow({
      target_id: 'project',
      target_root: '/tmp/project',
      profile: 'developer',
      modules: '{"unexpected":true}',
      operations: '',
      installed_at: null,
      source_version: null,
    });
    assert.strictEqual(mappedInstall.status, 'warning');
    assert.strictEqual(mappedInstall.moduleCount, 0);
    assert.strictEqual(mappedInstall.operationCount, 0);

    assert.strictEqual(queries.classifyOutcome('FAILED'), 'failure');
    assert.strictEqual(queries.classifyOutcome('maybe'), 'unknown');
    assert.strictEqual(queries.toPercent(0, 0), null);

    const unknownSummary = queries.summarizeSkillRuns([
      { outcome: 'pending' },
      { outcome: 'queued' },
    ]);
    assert.strictEqual(unknownSummary.knownCount, 0);
    assert.strictEqual(unknownSummary.unknownCount, 2);
    assert.strictEqual(unknownSummary.successRate, null);
    assert.strictEqual(unknownSummary.failureRate, null);

    assert.deepStrictEqual(queries.summarizeInstallHealth([]), {
      status: 'missing',
      totalCount: 0,
      healthyCount: 0,
      warningCount: 0,
      installations: [],
    });
    assert.strictEqual(
      queries.summarizeInstallHealth([{ status: 'warning' }]).status,
      'warning'
    );

    const normalizedSession = queries.normalizeSessionInput({
      id: 'session-1',
      adapterId: 'direct',
      harness: 'droid',
      state: 'active',
    });
    assert.strictEqual(normalizedSession.repoRoot, null);
    assert.strictEqual(normalizedSession.startedAt, null);
    assert.deepStrictEqual(normalizedSession.snapshot, {});

    const normalizedSkillRun = queries.normalizeSkillRunInput({
      id: 'run-1',
      skillId: 'alpha',
      skillVersion: '1.0.0',
      sessionId: 'session-1',
      taskDescription: 'Exercise query helpers',
      outcome: 'success',
    });
    assert.strictEqual(normalizedSkillRun.failureReason, null);
    assert.strictEqual(normalizedSkillRun.tokensUsed, null);
    assert.strictEqual(normalizedSkillRun.durationMs, null);
    assert.strictEqual(normalizedSkillRun.userFeedback, null);

    const normalizedDecision = queries.normalizeDecisionInput({
      id: 'decision-1',
      sessionId: 'session-1',
      title: 'Adopt direct tests',
      rationale: 'Improve branch coverage',
      alternatives: null,
      status: 'accepted',
    });
    assert.deepStrictEqual(normalizedDecision.alternatives, []);
    assert.strictEqual(normalizedDecision.supersedes, null);

    const normalizedInstall = queries.normalizeInstallStateInput({
      targetId: 'target-1',
      targetRoot: '/tmp/target',
      modules: null,
      operations: null,
    });
    assert.deepStrictEqual(normalizedInstall.modules, []);
    assert.deepStrictEqual(normalizedInstall.operations, []);
    assert.strictEqual(normalizedInstall.profile, null);
    assert.strictEqual(normalizedInstall.sourceVersion, null);

    const normalizedEvent = queries.normalizeGovernanceEventInput({
      id: 'gov-1',
      eventType: 'warning',
    });
    assert.strictEqual(normalizedEvent.sessionId, null);
    assert.strictEqual(normalizedEvent.payload, null);
    assert.strictEqual(normalizedEvent.resolvedAt, null);
    assert.strictEqual(normalizedEvent.resolution, null);
  })) passed += 1; else failed += 1;

  if (await test('state-store query API handles empty status snapshots and missing sessions', async () => {
    const testDir = createTempDir('efd-state-store-queries-');
    const dbPath = path.join(testDir, 'state.db');

    try {
      const store = await createStateStore({ dbPath });

      assert.strictEqual(store.getSessionDetail('missing-session'), null);
      assert.throws(() => store.listRecentSessions({ limit: '0' }), /Invalid limit: 0/);
      assert.throws(() => store.getStatus({ activeLimit: '-1' }), /Invalid limit: -1/);

      const emptyStatus = store.getStatus();
      assert.strictEqual(emptyStatus.activeSessions.activeCount, 0);
      assert.strictEqual(emptyStatus.skillRuns.summary.totalCount, 0);
      assert.strictEqual(emptyStatus.skillRuns.summary.knownCount, 0);
      assert.strictEqual(emptyStatus.skillRuns.summary.successRate, null);
      assert.strictEqual(emptyStatus.skillRuns.summary.failureRate, null);
      assert.strictEqual(emptyStatus.installHealth.status, 'missing');
      assert.strictEqual(emptyStatus.governance.pendingCount, 0);

      store.upsertSession({
        id: 'session-empty-workers',
        adapterId: 'direct',
        harness: 'droid',
        state: 'idle',
        repoRoot: '/tmp/repo',
        startedAt: '2026-03-15T12:00:00.000Z',
        endedAt: null,
        snapshot: {},
      });

      const detail = store.getSessionDetail('session-empty-workers');
      assert.ok(detail);
      assert.deepStrictEqual(detail.workers, []);
      assert.strictEqual(detail.session.workerCount, 0);

      store.close();
    } finally {
      cleanupTempDir(testDir);
    }
  })) passed += 1; else failed += 1;

  if (await test('status marks incomplete install state records as warnings', async () => {
    const testDir = createTempDir('efd-state-store-install-warning-');
    const dbPath = path.join(testDir, 'state.db');

    try {
      const store = await createStateStore({ dbPath });

      store.upsertInstallState({
        targetId: 'target-warning',
        targetRoot: '/tmp/target-warning',
        profile: 'developer',
        modules: ['rules-core'],
        operations: [],
        installedAt: '2026-03-15T12:30:00.000Z',
        sourceVersion: null,
      });

      const status = store.getStatus();
      assert.strictEqual(status.installHealth.status, 'warning');
      assert.strictEqual(status.installHealth.warningCount, 1);
      assert.strictEqual(status.installHealth.healthyCount, 0);

      store.close();
    } finally {
      cleanupTempDir(testDir);
    }
  })) passed += 1; else failed += 1;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
