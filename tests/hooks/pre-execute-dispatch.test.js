/**
 * Tests for scripts/hooks/pre-execute-dispatch.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'pre-execute-dispatch.js');
const { PRE_EXECUTE_PIPELINE, normalizeStructuredResult, run } = require('../../scripts/hooks/pre-execute-dispatch');

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

console.log('\n=== Testing pre-execute-dispatch.js ===\n');

let passed = 0;
let failed = 0;

if (test('defines the expected pipeline order', () => {
  assert.deepStrictEqual(
    PRE_EXECUTE_PIPELINE.map(e => e.id),
    ['pre:execute:hookify', 'pre:execute:auto-tmux-dev', 'pre:execute:commit-quality']
  );
})) passed++; else failed++;

if (test('auto-tmux-dev entry has null profiles (always runs)', () => {
  const entry = PRE_EXECUTE_PIPELINE.find(e => e.id === 'pre:execute:auto-tmux-dev');
  assert.ok(entry, 'auto-tmux-dev entry exists');
  assert.strictEqual(entry.profiles, null);
})) passed++; else failed++;

if (test('normalizeStructuredResult handles string output', () => {
  const raw = '{"tool":"Execute"}';
  const result = normalizeStructuredResult(raw, 'some output');
  assert.strictEqual(result.exitCode, 0);
  assert.strictEqual(result.stdout, 'some output');
})) passed++; else failed++;

if (test('normalizeStructuredResult returns empty stdout when output matches raw input', () => {
  const raw = '{"tool":"Execute"}';
  const result = normalizeStructuredResult(raw, raw);
  assert.strictEqual(result.stdout, '');
})) passed++; else failed++;

if (test('normalizeStructuredResult handles object with exitCode', () => {
  const result = normalizeStructuredResult('{}', { exitCode: 2, stdout: 'blocked', stderr: '' });
  assert.strictEqual(result.exitCode, 2);
  assert.strictEqual(result.stdout, 'blocked');
})) passed++; else failed++;

if (test('run returns exit 0 on valid input', () => {
  const result = run('{"tool":"Execute","command":"echo hello"}');
  assert.strictEqual(result.exitCode, 0);
})) passed++; else failed++;

if (test('script exits 0 on valid input', () => {
  const r = runScript({ tool: 'Execute', command: 'echo hello' });
  assert.strictEqual(r.code, 0);
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
