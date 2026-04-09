/**
 * Tests for scripts/hooks/run-with-flags.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const RUNNER = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'run-with-flags.js');

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

function writeHookScript(rootDir, fileName, content) {
  const scriptsDir = path.join(rootDir, 'scripts', 'hooks');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(RUNNER, path.join(scriptsDir, 'run-with-flags.js'));
  const scriptPath = path.join(scriptsDir, fileName);
  fs.writeFileSync(scriptPath, content, 'utf8');
  return scriptPath;
}

function runWrappedHook(pluginRoot, hookId, scriptName, input) {
  const result = spawnSync('node', [RUNNER, hookId, `scripts/hooks/${scriptName}`, 'standard,strict'], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    env: {
      ...process.env,
      DROID_PLUGIN_ROOT: pluginRoot,
      EFD_HOOK_PROFILE: 'standard',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000,
  });

  return {
    code: Number.isInteger(result.status) ? result.status : 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

console.log('\n=== Testing run-with-flags.js ===\n');

let passed = 0;
let failed = 0;

if (test('suppresses raw passthrough for run()-export hooks', () => {
  const tempDir = createTempDir('efd-run-with-flags-');

  try {
    writeHookScript(
      tempDir,
      'quiet-stop.js',
      `module.exports = { run(rawInput) { return rawInput; } };\n`
    );

    const rawInput = JSON.stringify({ hook_event_name: 'Stop', session_id: 'abc123' });
    const result = runWrappedHook(tempDir, 'stop:quiet', 'quiet-stop.js', rawInput);

    assert.strictEqual(result.code, 0, result.stderr);
    assert.strictEqual(result.stdout, '', 'Expected wrapper to suppress echoed hook input');
    assert.strictEqual(result.stderr, '');
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('forwards meaningful stdout from run()-export hooks', () => {
  const tempDir = createTempDir('efd-run-with-flags-');

  try {
    writeHookScript(
      tempDir,
      'structured-stop.js',
      `module.exports = { run() { return JSON.stringify({ decision: 'block', reason: 'continue' }); } };\n`
    );

    const result = runWrappedHook(tempDir, 'stop:structured', 'structured-stop.js', {
      hook_event_name: 'Stop',
      session_id: 'abc123',
    });

    assert.strictEqual(result.code, 0, result.stderr);
    assert.deepStrictEqual(JSON.parse(result.stdout), { decision: 'block', reason: 'continue' });
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('suppresses legacy child-process passthrough when stdout is empty', () => {
  const tempDir = createTempDir('efd-run-with-flags-');

  try {
    writeHookScript(
      tempDir,
      'legacy-stop.js',
      `#!/usr/bin/env node\nprocess.exit(0);\n`
    );

    const result = runWrappedHook(tempDir, 'stop:legacy', 'legacy-stop.js', {
      hook_event_name: 'Stop',
      session_id: 'abc123',
    });

    assert.strictEqual(result.code, 0, result.stderr);
    assert.strictEqual(result.stdout, '', 'Expected quiet success when legacy hook prints nothing');
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
