'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tracker = require('../../scripts/lib/skill-evolution/tracker');

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

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupTempDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

console.log('\n=== Testing skill-evolution tracker direct coverage ===\n');

let passed = 0;
let failed = 0;

if (test('getRunsFilePath resolves explicit, custom home, and default home locations', () => {
  const originalHomedir = os.homedir;

  try {
    os.homedir = () => '/tmp/efd-default-home';

    assert.strictEqual(
      tracker.getRunsFilePath({ runsFilePath: './relative-skill-runs.jsonl' }),
      path.resolve('./relative-skill-runs.jsonl')
    );
    assert.strictEqual(
      tracker.getRunsFilePath({ homeDir: '/tmp/efd-custom-home' }),
      path.join('/tmp/efd-custom-home', '.factory', 'state', 'skill-runs.jsonl')
    );
    assert.strictEqual(
      tracker.getRunsFilePath(),
      path.join('/tmp/efd-default-home', '.factory', 'state', 'skill-runs.jsonl')
    );
  } finally {
    os.homedir = originalHomedir;
  }
})) passed++; else failed++;

if (test('normalizeExecutionRecord validates required fields and numeric telemetry', () => {
  const base = {
    skillId: 'alpha',
    skillVersion: 'v1',
    taskAttempted: 'Exercise tracker validation',
    outcome: 'success',
    userFeedback: null,
  };

  const normalized = tracker.normalizeExecutionRecord({
    ...base,
    tokensUsed: '42',
    durationMs: '84',
  }, {
    now: '2026-03-15T12:00:00.000Z',
  });

  assert.deepStrictEqual(normalized, {
    skill_id: 'alpha',
    skill_version: 'v1',
    task_description: 'Exercise tracker validation',
    outcome: 'success',
    failure_reason: null,
    tokens_used: 42,
    duration_ms: 84,
    user_feedback: null,
    recorded_at: '2026-03-15T12:00:00.000Z',
  });

  const errorCases = [
    {
      input: null,
      pattern: /skill execution payload must be an object/,
    },
    {
      input: [],
      pattern: /skill execution payload must be an object/,
    },
    {
      input: { ...base, skillId: '   ' },
      pattern: /skill_id is required/,
    },
    {
      input: { ...base, skillId: 'alpha', skillVersion: '' },
      pattern: /skill_version is required/,
    },
    {
      input: { ...base, taskAttempted: '   ' },
      pattern: /task_description is required/,
    },
    {
      input: { ...base, outcome: 'unknown' },
      pattern: /outcome must be one of success, failure, or partial/,
    },
    {
      input: { ...base, userFeedback: 'helpful' },
      pattern: /user_feedback must be accepted, corrected, rejected, or null/,
    },
    {
      input: { ...base, recorded_at: 'not-a-date' },
      pattern: /recorded_at must be an ISO timestamp/,
    },
    {
      input: { ...base, tokensUsed: 'abc' },
      pattern: /tokens_used must be a number/,
    },
    {
      input: { ...base, durationMs: 'abc' },
      pattern: /duration_ms must be a number/,
    },
  ];

  for (const { input, pattern } of errorCases) {
    assert.throws(() => tracker.normalizeExecutionRecord(input), pattern);
  }
})) passed++; else failed++;

if (test('recordSkillExecution and readSkillExecutionRecords delegate to a state store when available', () => {
  const recorded = [];
  const stateStore = {
    recordSkillExecution(record) {
      recorded.push(record);
      return { persisted: true };
    },
    listSkillExecutionRecords() {
      return [{ skill_id: 'delegated' }];
    },
  };

  const result = tracker.recordSkillExecution({
    skill_id: 'beta',
    skill_version: 'v2',
    task_description: 'Persist via state store',
    outcome: 'partial',
    failure_reason: null,
    tokens_used: 12,
    duration_ms: 34,
    user_feedback: 'corrected',
  }, {
    stateStore,
    now: '2026-03-15T12:05:00.000Z',
  });

  assert.strictEqual(result.storage, 'state-store');
  assert.deepStrictEqual(result.result, { persisted: true });
  assert.strictEqual(recorded.length, 1);
  assert.strictEqual(recorded[0].recorded_at, '2026-03-15T12:05:00.000Z');
  assert.deepStrictEqual(
    tracker.readSkillExecutionRecords({ stateStore }),
    [{ skill_id: 'delegated' }]
  );
})) passed++; else failed++;

if (test('JSONL reads return empty arrays for missing files and ignore malformed rows', () => {
  const testDir = createTempDir('efd-tracker-direct-');

  try {
    const runsFilePath = path.join(testDir, '.factory', 'state', 'skill-runs.jsonl');
    assert.deepStrictEqual(tracker.readSkillExecutionRecords({ runsFilePath }), []);

    fs.mkdirSync(path.dirname(runsFilePath), { recursive: true });
    fs.writeFileSync(
      runsFilePath,
      `${JSON.stringify({
        skill_id: 'gamma',
        skill_version: 'v1',
        task_description: 'good row',
        outcome: 'success',
        failure_reason: null,
        tokens_used: 1,
        duration_ms: 1,
        user_feedback: 'accepted',
        recorded_at: '2026-03-15T12:10:00.000Z',
      })}\n{bad-json}\n`,
      'utf8'
    );

    const records = tracker.readSkillExecutionRecords({ runsFilePath });
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].skill_id, 'gamma');
  } finally {
    cleanupTempDir(testDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
