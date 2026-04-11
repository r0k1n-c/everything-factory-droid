/**
 * Tests for scripts/hooks/stop-dispatch.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'stop-dispatch.js');
const { STOP_HOOK_PIPELINE, MISSION_WORKER_SKIP_IDS, isMissionWorker } = require('../../scripts/hooks/stop-dispatch');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
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

function runScript(input, env = {}) {
  const result = spawnSync('node', [SCRIPT], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000,
  });

  return {
    code: Number.isInteger(result.status) ? result.status : 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

console.log('\n=== Testing stop-dispatch.js ===\n');

let passed = 0;
let failed = 0;

if (test('defines the expected stop hook pipeline order', () => {
  assert.deepStrictEqual(
    STOP_HOOK_PIPELINE.map(entry => entry.id),
    ['stop:hookify', 'stop:format-typecheck', 'stop:check-console-log', 'stop:todo-check', 'stop:session-end']
  );
})) passed++; else failed++;

if (test('stays quiet when every stop sub-hook is disabled', () => {
  const result = runScript(
    { hook_event_name: 'Stop', session_id: 'abc123' },
    { EFD_DISABLED_HOOKS: 'stop:hookify,stop:format-typecheck,stop:check-console-log,stop:todo-check,stop:session-end' }
  );

  assert.strictEqual(result.code, 0, result.stderr);
  assert.strictEqual(result.stdout, '', 'Expected no stdout when the dispatcher has nothing to do');
  assert.strictEqual(result.stderr, '');
})) passed++; else failed++;

if (test('emits one session-end status line instead of multiple raw stop payload echoes', () => {
  const homeDir = createTempDir('efd-stop-dispatch-');
  const projectDir = path.join(homeDir, 'project');
  fs.mkdirSync(projectDir, { recursive: true });

  try {
    const result = runScript(
      {
        hook_event_name: 'Stop',
        session_id: 'abc123',
        transcript_path: path.join(homeDir, 'missing.jsonl'),
        cwd: projectDir,
      },
      {
        HOME: homeDir,
        FACTORY_SESSION_ID: 'abc123',
        FACTORY_PROJECT_DIR: projectDir,
        EFD_DISABLED_HOOKS: 'stop:hookify,stop:format-typecheck,stop:check-console-log',
      }
    );

    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(
      result.stdout.includes('[SessionEnd] Created session file') || result.stdout.includes('[SessionEnd] Updated session file'),
      `Expected one session-end status line, got: ${result.stdout}`
    );
    assert.ok(!result.stdout.includes('"hook_event_name":"Stop"'), 'Expected dispatcher to suppress raw Stop payload echo');
  } finally {
    cleanup(homeDir);
  }
})) passed++; else failed++;

if (test('MISSION_WORKER_SKIP_IDS contains todo-check and session-end', () => {
  assert.ok(MISSION_WORKER_SKIP_IDS.has('stop:todo-check'));
  assert.ok(MISSION_WORKER_SKIP_IDS.has('stop:session-end'));
  assert.strictEqual(MISSION_WORKER_SKIP_IDS.size, 2);
})) passed++; else failed++;

if (test('isMissionWorker returns false when no mission env vars set', () => {
  const original = { FACTORY_MISSION_ID: process.env.FACTORY_MISSION_ID, DROID_MISSION_ID: process.env.DROID_MISSION_ID };
  delete process.env.FACTORY_MISSION_ID;
  delete process.env.DROID_MISSION_ID;
  try {
    assert.strictEqual(isMissionWorker(), false);
  } finally {
    if (original.FACTORY_MISSION_ID !== undefined) process.env.FACTORY_MISSION_ID = original.FACTORY_MISSION_ID;
    if (original.DROID_MISSION_ID !== undefined) process.env.DROID_MISSION_ID = original.DROID_MISSION_ID;
  }
})) passed++; else failed++;

if (test('skips todo-check and session-end when FACTORY_MISSION_ID is set', () => {
  const homeDir = createTempDir('efd-stop-dispatch-mission-');
  const projectDir = path.join(homeDir, 'project');
  fs.mkdirSync(projectDir, { recursive: true });

  try {
    const result = runScript(
      {
        hook_event_name: 'Stop',
        session_id: 'abc123',
        transcript_path: path.join(homeDir, 'missing.jsonl'),
        cwd: projectDir,
      },
      {
        HOME: homeDir,
        FACTORY_SESSION_ID: 'abc123',
        FACTORY_PROJECT_DIR: projectDir,
        FACTORY_MISSION_ID: 'mission-xyz',
        EFD_DISABLED_HOOKS: 'stop:hookify,stop:format-typecheck,stop:check-console-log',
      }
    );

    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(
      !result.stdout.includes('[SessionEnd]'),
      `Expected session-end to be skipped in mission context, got: ${result.stdout}`
    );
  } finally {
    cleanup(homeDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
