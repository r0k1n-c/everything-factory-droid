/**
 * Tests for scripts/hooks/session-start-bootstrap.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'session-start-bootstrap.js');

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

function runScript(input, extraEnv = {}) {
  const result = spawnSync('node', [SCRIPT], {
    input,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000,
  });

  return {
    code: result.status || 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function createRunnerRoot(rootDir, logFile) {
  const hooksDir = path.join(rootDir, 'scripts', 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  fs.writeFileSync(
    path.join(hooksDir, 'run-with-flags.js'),
    `#!/usr/bin/env node
const fs = require('fs');
const raw = fs.readFileSync(0, 'utf8');
fs.writeFileSync(${JSON.stringify(logFile)}, JSON.stringify(process.argv.slice(2)), 'utf8');
process.stderr.write('[stub-run-with-flags]\\n');
process.stdout.write(raw);
`,
    'utf8'
  );
  fs.chmodSync(path.join(hooksDir, 'run-with-flags.js'), 0o755);
}

console.log('\n=== Testing session-start-bootstrap.js ===\n');

let passed = 0;
let failed = 0;

if (test('delegates to run-with-flags using FACTORY_PROJECT_DIR', () => {
  const tempDir = createTempDir('efd-session-bootstrap-');
  const fakeRoot = path.join(tempDir, 'plugin-root');
  const logFile = path.join(tempDir, 'runner-args.json');
  createRunnerRoot(fakeRoot, logFile);

  try {
    const rawInput = JSON.stringify({ hook_event_name: 'SessionStart' });
    const result = runScript(rawInput, {
      FACTORY_PROJECT_DIR: fakeRoot,
    });

    assert.strictEqual(result.code, 0, result.stderr);
    assert.strictEqual(result.stdout, rawInput);
    assert.ok(result.stderr.includes('[stub-run-with-flags]'), result.stderr);
    const args = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    assert.deepStrictEqual(args, ['session:start', 'scripts/hooks/session-start.js', 'minimal,standard,strict']);
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('warns and passes input through when no plugin root can be resolved', () => {
  const tempDir = createTempDir('efd-session-bootstrap-');

  try {
    const rawInput = JSON.stringify({ hook_event_name: 'SessionStart' });
    const result = runScript(rawInput, {
      HOME: tempDir,
      USERPROFILE: tempDir,
      FACTORY_PROJECT_DIR: '',
    });

    assert.strictEqual(result.code, 0, result.stderr);
    assert.strictEqual(result.stdout, rawInput);
    assert.ok(result.stderr.includes('could not resolve EFD plugin root'), result.stderr);
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
