/**
 * Tests for scripts/hooks/desktop-notify.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'desktop-notify.js');

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
    input: typeof input === 'string' ? input : JSON.stringify(input),
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

function createOsaScriptShim(binDir, logFile) {
  const shimPath = path.join(binDir, 'osascript');
  const shimSource = `#!/usr/bin/env node
const fs = require('fs');
fs.writeFileSync(${JSON.stringify(logFile)}, process.argv.slice(2).join(' '), 'utf8');
`;
  fs.writeFileSync(shimPath, shimSource, 'utf8');
  fs.chmodSync(shimPath, 0o755);
}

console.log('\n=== Testing desktop-notify.js ===\n');

let passed = 0;
let failed = 0;

if (test('passes input through and triggers macOS notification command', () => {
  const tempDir = createTempDir('efd-desktop-notify-');
  const binDir = path.join(tempDir, 'bin');
  const logFile = path.join(tempDir, 'osascript.log');
  fs.mkdirSync(binDir, { recursive: true });
  createOsaScriptShim(binDir, logFile);

  try {
    const payload = {
      last_assistant_message: 'Finished validating the migration.\nAdditional details should be ignored.',
    };
    const result = runScript(payload, {
      PATH: `${binDir}:${process.env.PATH || ''}`,
    });

    assert.strictEqual(result.code, 0, result.stderr);
    assert.strictEqual(result.stdout, JSON.stringify(payload));
    const loggedCommand = fs.readFileSync(logFile, 'utf8');
    assert.ok(loggedCommand.includes('display notification'), loggedCommand);
    assert.ok(loggedCommand.includes('Finished validating the migration.'), loggedCommand);
    assert.ok(loggedCommand.includes('Factory Droid'), loggedCommand);
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('truncates long notification bodies to the configured limit', () => {
  const tempDir = createTempDir('efd-desktop-notify-');
  const binDir = path.join(tempDir, 'bin');
  const logFile = path.join(tempDir, 'osascript.log');
  fs.mkdirSync(binDir, { recursive: true });
  createOsaScriptShim(binDir, logFile);

  try {
    const longLine = 'A'.repeat(140);
    const result = runScript({ last_assistant_message: longLine }, {
      PATH: `${binDir}:${process.env.PATH || ''}`,
    });

    assert.strictEqual(result.code, 0, result.stderr);
    const loggedCommand = fs.readFileSync(logFile, 'utf8');
    assert.ok(loggedCommand.includes(`${'A'.repeat(100)}...`), loggedCommand);
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('handles invalid JSON without failing', () => {
  const result = runScript('not-json');
  assert.strictEqual(result.code, 0, result.stderr);
  assert.strictEqual(result.stdout, 'not-json');
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
