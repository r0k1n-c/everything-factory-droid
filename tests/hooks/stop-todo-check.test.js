/**
 * Tests for scripts/hooks/stop-todo-check.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { run, parseTodos } = require('../../scripts/hooks/stop-todo-check');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function writeTranscript(dir, entries) {
  const filePath = path.join(dir, 'transcript.jsonl');
  fs.writeFileSync(filePath, entries.map(e => JSON.stringify(e)).join('\n') + '\n');
  return filePath;
}

/** Build a Factory Droid JSONL assistant message with a TodoWrite tool_use block. */
function makeTodoWriteEntry(todosStr, role = 'assistant') {
  return {
    type: role,
    message: {
      role,
      content: [
        {
          type: 'tool_use',
          name: 'TodoWrite',
          input: { todos: todosStr },
        },
      ],
    },
  };
}

function makeUserEntry(text = 'do something') {
  return { type: 'user', message: { role: 'user', content: text } };
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

console.log('\n=== Testing stop-todo-check.js ===\n');

let passed = 0;
let failed = 0;

// ── parseTodos ────────────────────────────────────────────────────────────────

if (test('parseTodos: detects in_progress', () => {
  const r = parseTodos('1. [in_progress] Step one');
  assert.strictEqual(r.hasInProgress, true);
  assert.strictEqual(r.hasPending, false);
})) passed++; else failed++;

if (test('parseTodos: detects pending', () => {
  const r = parseTodos('1. [completed] Done\n2. [pending] Not yet');
  assert.strictEqual(r.hasPending, true);
  assert.strictEqual(r.hasInProgress, false);
})) passed++; else failed++;

if (test('parseTodos: all completed', () => {
  const r = parseTodos('1. [completed] A\n2. [completed] B');
  assert.strictEqual(r.hasInProgress, false);
  assert.strictEqual(r.hasPending, false);
  assert.strictEqual(r.count, 2);
})) passed++; else failed++;

if (test('parseTodos: empty string', () => {
  const r = parseTodos('');
  assert.strictEqual(r.hasInProgress, false);
  assert.strictEqual(r.hasPending, false);
  assert.strictEqual(r.count, 0);
})) passed++; else failed++;

// ── run: no transcript ────────────────────────────────────────────────────────

if (test('run: no transcript_path → exit 0', () => {
  const result = run(JSON.stringify({ hook_event_name: 'Stop' }));
  assert.strictEqual(result.exitCode, 0);
})) passed++; else failed++;

if (test('run: missing transcript file → exit 0', () => {
  const result = run(JSON.stringify({ transcript_path: '/tmp/nonexistent-efd-test.jsonl' }));
  assert.strictEqual(result.exitCode, 0);
})) passed++; else failed++;

// ── run: transcript with no TodoWrite calls ───────────────────────────────────

if (test('run: transcript with no TodoWrite → exit 0', () => {
  const dir = createTempDir('efd-todo-check-');
  try {
    const tp = writeTranscript(dir, [
      makeUserEntry('fix the bug'),
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'done' }] } },
    ]);
    const result = run(JSON.stringify({ transcript_path: tp }));
    assert.strictEqual(result.exitCode, 0);
  } finally {
    cleanup(dir);
  }
})) passed++; else failed++;

// ── run: in_progress + pending → still working, no block ─────────────────────

if (test('run: last TodoWrite has in_progress AND pending → exit 0 (still working)', () => {
  const dir = createTempDir('efd-todo-check-');
  try {
    const todos = '1. [completed] Step 1\n2. [in_progress] Step 2\n3. [pending] Step 3';
    const tp = writeTranscript(dir, [
      makeUserEntry('build feature'),
      makeTodoWriteEntry(todos),
    ]);
    const result = run(JSON.stringify({ transcript_path: tp }));
    assert.strictEqual(result.exitCode, 0);
  } finally {
    cleanup(dir);
  }
})) passed++; else failed++;

// ── run: in_progress, no pending, no TodoWrite this turn → block ──────────────

if (test('run: last step in_progress, no pending, no TodoWrite this turn → exit 2', () => {
  const dir = createTempDir('efd-todo-check-');
  try {
    const todos = '1. [completed] Step 1\n2. [completed] Step 2\n3. [in_progress] Step 3';
    const tp = writeTranscript(dir, [
      makeTodoWriteEntry(todos),    // previous turn
      makeUserEntry('verify'),      // new user message (current turn boundary)
      // agent responds without calling TodoWrite
    ]);
    const result = run(JSON.stringify({ transcript_path: tp }));
    assert.strictEqual(result.exitCode, 2);
    assert.ok(result.stderr.includes('[TodoCheck]'), `Expected [TodoCheck] in stderr, got: ${result.stderr}`);
  } finally {
    cleanup(dir);
  }
})) passed++; else failed++;

// ── run: agent called TodoWrite this turn → no block ─────────────────────────

if (test('run: TodoWrite called this turn → exit 0', () => {
  const dir = createTempDir('efd-todo-check-');
  try {
    const prev = '1. [completed] Step 1\n2. [in_progress] Step 2';
    const current = '1. [completed] Step 1\n2. [completed] Step 2';
    const tp = writeTranscript(dir, [
      makeTodoWriteEntry(prev),
      makeUserEntry('next'),
      makeTodoWriteEntry(current),  // agent updated todos this turn
    ]);
    const result = run(JSON.stringify({ transcript_path: tp }));
    assert.strictEqual(result.exitCode, 0);
  } finally {
    cleanup(dir);
  }
})) passed++; else failed++;

// ── run: all completed → no block ────────────────────────────────────────────

if (test('run: all todos completed → exit 0', () => {
  const dir = createTempDir('efd-todo-check-');
  try {
    const todos = '1. [completed] Step 1\n2. [completed] Step 2';
    const tp = writeTranscript(dir, [
      makeTodoWriteEntry(todos),
      makeUserEntry('done?'),
    ]);
    const result = run(JSON.stringify({ transcript_path: tp }));
    assert.strictEqual(result.exitCode, 0);
  } finally {
    cleanup(dir);
  }
})) passed++; else failed++;

// ── run: single in_progress item (only one step, forgotten) ──────────────────

if (test('run: single in_progress item, no pending, no TodoWrite this turn → exit 2', () => {
  const dir = createTempDir('efd-todo-check-');
  try {
    const todos = '1. [in_progress] 语法验证';
    const tp = writeTranscript(dir, [
      makeTodoWriteEntry(todos),
      makeUserEntry('check'),
      // agent responds, forgets TodoWrite
    ]);
    const result = run(JSON.stringify({ transcript_path: tp }));
    assert.strictEqual(result.exitCode, 2);
  } finally {
    cleanup(dir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
