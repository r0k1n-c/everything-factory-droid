/**
 * Tests for scripts/hooks/pre-write-doc-warn.js
 */

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'pre-write-doc-warn.js');

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

function runScript(input) {
  const result = spawnSync('node', [SCRIPT], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000,
  });

  return {
    code: result.status || 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

console.log('\n=== Testing pre-write-doc-warn.js ===\n');

let passed = 0;
let failed = 0;

if (test('warns on suspicious ad-hoc documentation paths', () => {
  const payload = {
    tool_input: {
      file_path: '/tmp/project/TODO.md',
    },
  };
  const result = runScript(payload);
  assert.strictEqual(result.code, 0, result.stderr);
  assert.strictEqual(result.stdout, JSON.stringify(payload));
  assert.ok(result.stderr.includes('Ad-hoc documentation filename detected'), result.stderr);
})) passed++; else failed++;

if (test('passes through structured documentation paths without warning', () => {
  const payload = {
    tool_input: {
      file_path: '/tmp/project/.factory/TODO.md',
    },
  };
  const result = runScript(payload);
  assert.strictEqual(result.code, 0, result.stderr);
  assert.strictEqual(result.stdout, JSON.stringify(payload));
  assert.ok(!result.stderr.includes('Ad-hoc documentation filename detected'), result.stderr);
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
