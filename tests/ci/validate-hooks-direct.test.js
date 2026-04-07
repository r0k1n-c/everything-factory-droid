'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'ci', 'validate-hooks.js');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function stripShebang(source) {
  return source.startsWith('#!') ? source.replace(/^#!.*\r?\n/, '') : source;
}

function loadValidator(overrides = {}) {
  let source = stripShebang(fs.readFileSync(SCRIPT, 'utf8'));
  const defaultPaths = {
    HOOKS_FILE: path.join(os.tmpdir(), 'nonexistent-hooks.json'),
    HOOKS_SCHEMA_PATH: path.join(__dirname, '..', '..', 'schemas', 'hooks.schema.json'),
  };
  const replacements = { ...defaultPaths, ...overrides };

  for (const [constant, value] of Object.entries(replacements)) {
    source = source.replace(new RegExp(`const ${constant} = .*?;`), `const ${constant} = ${JSON.stringify(value)};`);
  }

  source = source.replace(
    /validateHooks\(\);\s*$/,
    'module.exports = { isNonEmptyString, isNonEmptyStringArray, validateHookEntry, validateHooks };\n'
  );

  const mod = new Module(SCRIPT, module);
  mod.filename = SCRIPT;
  mod.paths = Module._nodeModulePaths(path.dirname(SCRIPT));
  mod._compile(source, SCRIPT);
  return mod.exports;
}

function captureRun(fn) {
  const originalError = console.error;
  const originalLog = console.log;
  const originalExit = process.exit;
  const stderr = [];
  const stdout = [];
  let exitCode = null;

  console.error = (...args) => stderr.push(args.join(' '));
  console.log = (...args) => stdout.push(args.join(' '));
  process.exit = code => {
    exitCode = code;
    throw new Error(`EXIT:${code}`);
  };

  try {
    fn();
  } catch (error) {
    if (!String(error.message).startsWith('EXIT:')) {
      throw error;
    }
  } finally {
    console.error = originalError;
    console.log = originalLog;
    process.exit = originalExit;
  }

  return { exitCode, stderr, stdout };
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

console.log('\n=== Testing validate-hooks.js direct coverage ===\n');

let passed = 0;
let failed = 0;

if (test('string helpers distinguish valid and invalid values', () => {
  const { isNonEmptyString, isNonEmptyStringArray } = loadValidator();
  assert.strictEqual(isNonEmptyString('ok'), true);
  assert.strictEqual(isNonEmptyString('   '), false);
  assert.strictEqual(isNonEmptyString(7), false);
  assert.strictEqual(isNonEmptyStringArray(['HOME', 'PATH']), true);
  assert.strictEqual(isNonEmptyStringArray([]), false);
  assert.strictEqual(isNonEmptyStringArray(['HOME', ' ']), false);
  assert.strictEqual(isNonEmptyStringArray('HOME'), false);
})) passed++; else failed++;

if (test('validateHookEntry covers command, http, prompt, and agent error branches', () => {
  const { validateHookEntry } = loadValidator();
  const stderr = [];
  const originalError = console.error;
  console.error = message => stderr.push(message);

  try {
    assert.strictEqual(validateHookEntry({}, 'Hook[0]'), true);
    assert.strictEqual(validateHookEntry({ type: 'weird' }, 'Hook[1]'), true);
    assert.strictEqual(validateHookEntry({ type: 'command', timeout: -1, async: 'yes', command: '' }, 'Hook[2]'), true);
    assert.strictEqual(validateHookEntry({ type: 'command', command: 'node -e "if ("' }, 'Hook[3]'), true);
    assert.strictEqual(validateHookEntry({ type: 'http', async: false, url: '', headers: [], allowedEnvVars: [' ', 'OK'] }, 'Hook[4]'), true);
    assert.strictEqual(validateHookEntry({ type: 'prompt', prompt: ' ', model: ' ' }, 'Hook[5]'), true);
    assert.strictEqual(validateHookEntry({ type: 'agent', prompt: 'delegate this' }, 'Hook[6]'), false);
  } finally {
    console.error = originalError;
  }

  assert.ok(stderr.some(line => line.includes("missing or invalid 'type' field")));
  assert.ok(stderr.some(line => line.includes("unsupported hook type 'weird'")));
  assert.ok(stderr.some(line => line.includes("'timeout' must be a non-negative number")));
  assert.ok(stderr.some(line => line.includes("'async' must be a boolean")));
  assert.ok(stderr.some(line => line.includes("missing or invalid 'command' field")));
  assert.ok(stderr.some(line => line.includes('invalid inline JS')));
  assert.ok(stderr.some(line => line.includes("'async' is only supported for command hooks")));
  assert.ok(stderr.some(line => line.includes("missing or invalid 'url' field")));
  assert.ok(stderr.some(line => line.includes("'headers' must be an object with string values")));
  assert.ok(stderr.some(line => line.includes("'allowedEnvVars' must be an array of strings")));
  assert.ok(stderr.some(line => line.includes("missing or invalid 'prompt' field")));
  assert.ok(stderr.some(line => line.includes("'model' must be a non-empty string")));
})) passed++; else failed++;

if (test('validateHookEntry accepts valid command, http, and prompt hooks', () => {
  const { validateHookEntry } = loadValidator();
  const stderr = [];
  const originalError = console.error;
  console.error = message => stderr.push(message);

  try {
    assert.strictEqual(validateHookEntry({ type: 'command', command: 'echo ok', timeout: 0 }, 'Hook[0]'), false);
    assert.strictEqual(
      validateHookEntry({ type: 'http', url: 'https://example.com', headers: { Authorization: 'token' }, allowedEnvVars: ['HOME'] }, 'Hook[1]'),
      false
    );
    assert.strictEqual(validateHookEntry({ type: 'prompt', prompt: 'delegate', model: 'sonnet' }, 'Hook[2]'), false);
  } finally {
    console.error = originalError;
  }

  assert.deepStrictEqual(stderr, []);
})) passed++; else failed++;

if (test('validateHookEntry accepts valid inline JS, bare http, and agent hooks', () => {
  const { validateHookEntry } = loadValidator();
  const stderr = [];
  const originalError = console.error;
  console.error = message => stderr.push(message);

  try {
    assert.strictEqual(
      validateHookEntry({ type: 'command', command: 'node -e "const msg = \\"ok\\";\\nconsole.log(msg)"', async: false }, 'Hook[0]'),
      false
    );
    assert.strictEqual(validateHookEntry({ type: 'http', url: 'https://example.com/hooks' }, 'Hook[1]'), false);
    assert.strictEqual(validateHookEntry({ type: 'agent', prompt: 'delegate', model: 'sonnet' }, 'Hook[2]'), false);
  } finally {
    console.error = originalError;
  }

  assert.deepStrictEqual(stderr, []);
})) passed++; else failed++;

if (test('validateHooks exits 0 when hooks.json is missing', () => {
  const tempDir = createTempDir('efd-validate-hooks-direct-');

  try {
    const validator = loadValidator({
      HOOKS_FILE: path.join(tempDir, 'hooks.json'),
      HOOKS_SCHEMA_PATH: path.join(tempDir, 'schema.json'),
    });
    const result = captureRun(() => validator.validateHooks());
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.stdout.some(line => line.includes('No hooks.json found')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateHooks passes with schema validation and allowed matcherless events', () => {
  const tempDir = createTempDir('efd-validate-hooks-direct-');

  try {
    const hooksPath = path.join(tempDir, 'hooks.json');
    fs.writeFileSync(hooksPath, JSON.stringify({
      hooks: {
        Notification: [{
          hooks: [{ type: 'command', command: 'echo ok' }]
        }],
        PreToolUse: [{
          matcher: { tool_name: 'Read' },
          hooks: [{ type: 'prompt', prompt: 'delegate', model: 'sonnet' }]
        }]
      }
    }, null, 2));

    const validator = loadValidator({ HOOKS_FILE: hooksPath });
    const result = captureRun(() => validator.validateHooks());
    assert.strictEqual(result.exitCode, null);
    assert.ok(result.stdout.some(line => line.includes('Validated 2 hook matchers')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateHooks accepts matcherless success cases for all supported events', () => {
  const tempDir = createTempDir('efd-validate-hooks-direct-');

  try {
    const hooksPath = path.join(tempDir, 'hooks.json');
    fs.writeFileSync(hooksPath, JSON.stringify({
      hooks: {
        UserPromptSubmit: [{
          hooks: [{ type: 'prompt', prompt: 'delegate' }]
        }],
        Notification: [{
          hooks: [{ type: 'command', command: ['node', '-e', 'console.log(1)'] }]
        }],
        Stop: [{
          hooks: [{ type: 'http', url: 'https://example.com/stop' }]
        }],
        SubagentStop: [{
          hooks: [{ type: 'agent', prompt: 'delegate cleanup', model: 'sonnet' }]
        }]
      }
    }, null, 2));

    const validator = loadValidator({
      HOOKS_FILE: hooksPath,
      HOOKS_SCHEMA_PATH: path.join(tempDir, 'missing-schema.json'),
    });
    const result = captureRun(() => validator.validateHooks());
    assert.strictEqual(result.exitCode, null);
    assert.ok(result.stdout.some(line => line.includes('Validated 4 hook matchers')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateHooks exits 1 on invalid JSON and schema failures', () => {
  const tempDir = createTempDir('efd-validate-hooks-direct-');

  try {
    const hooksPath = path.join(tempDir, 'hooks.json');
    const schemaPath = path.join(tempDir, 'hooks.schema.json');
    fs.writeFileSync(hooksPath, '{not-json', 'utf8');
    fs.writeFileSync(schemaPath, JSON.stringify({
      type: 'object',
      properties: {
        hooks: { type: 'object' },
      },
      required: ['hooks']
    }, null, 2));

    let validator = loadValidator({ HOOKS_FILE: hooksPath, HOOKS_SCHEMA_PATH: schemaPath });
    let result = captureRun(() => validator.validateHooks());
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('Invalid JSON in hooks.json')));

    fs.writeFileSync(hooksPath, JSON.stringify({}), 'utf8');
    validator = loadValidator({ HOOKS_FILE: hooksPath, HOOKS_SCHEMA_PATH: schemaPath });
    result = captureRun(() => validator.validateHooks());
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('hooks.json schema')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateHooks covers object-format structural errors and matcher exceptions', () => {
  const tempDir = createTempDir('efd-validate-hooks-direct-');

  try {
    const hooksPath = path.join(tempDir, 'hooks.json');
    fs.writeFileSync(hooksPath, JSON.stringify({
      TotallyWrong: [],
      PreToolUse: [
        'bad-matcher',
        { hooks: [] },
        { matcher: 42, hooks: [] },
        { matcher: 'ok' },
        { matcher: 'ok', hooks: [{ type: 'command', command: '' }] }
      ],
      UserPromptSubmit: [
        { hooks: [{ type: 'http', url: 'https://example.com', headers: { Authorization: 1 } }] }
      ],
      SessionStart: {}
    }, null, 2));

    const validator = loadValidator({
      HOOKS_FILE: hooksPath,
      HOOKS_SCHEMA_PATH: path.join(tempDir, 'missing-schema.json'),
    });
    const result = captureRun(() => validator.validateHooks());

    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('Invalid event type: TotallyWrong')));
    assert.ok(result.stderr.some(line => line.includes('SessionStart must be an array')));
    assert.ok(result.stderr.some(line => line.includes('PreToolUse[0] is not an object')));
    assert.ok(result.stderr.some(line => line.includes("PreToolUse[1] missing 'matcher' field")));
    assert.ok(result.stderr.some(line => line.includes("PreToolUse[2] has invalid 'matcher' field")));
    assert.ok(result.stderr.some(line => line.includes("PreToolUse[3] missing 'hooks' array")));
    assert.ok(result.stderr.some(line => line.includes("PreToolUse[4].hooks[0] missing or invalid 'command' field")));
    assert.ok(result.stderr.some(line => line.includes("'headers' must be an object with string values")));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateHooks covers legacy-array and invalid top-level branches', () => {
  const tempDir = createTempDir('efd-validate-hooks-direct-');

  try {
    const hooksPath = path.join(tempDir, 'hooks.json');
    fs.writeFileSync(hooksPath, JSON.stringify([
      {},
      { matcher: 12, hooks: [] },
      { matcher: 'ok' },
      { matcher: 'ok', hooks: [{ type: 'prompt', prompt: ' ' }] }
    ], null, 2));

    let validator = loadValidator({
      HOOKS_FILE: hooksPath,
      HOOKS_SCHEMA_PATH: path.join(tempDir, 'missing-schema.json'),
    });
    let result = captureRun(() => validator.validateHooks());
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes("Hook 0 missing 'matcher' field")));
    assert.ok(result.stderr.some(line => line.includes("Hook 1 has invalid 'matcher' field")));
    assert.ok(result.stderr.some(line => line.includes("Hook 2 missing 'hooks' array")));
    assert.ok(result.stderr.some(line => line.includes("Hook 3.hooks[0] missing or invalid 'prompt' field")));

    fs.writeFileSync(hooksPath, JSON.stringify('not-an-object'), 'utf8');
    validator = loadValidator({
      HOOKS_FILE: hooksPath,
      HOOKS_SCHEMA_PATH: path.join(tempDir, 'missing-schema.json'),
    });
    result = captureRun(() => validator.validateHooks());
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('hooks.json must be an object or array')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateHooks accepts valid wrapped object and legacy array formats', () => {
  const tempDir = createTempDir('efd-validate-hooks-direct-');

  try {
    const hooksPath = path.join(tempDir, 'hooks.json');
    fs.writeFileSync(hooksPath, JSON.stringify({
      hooks: {
        Notification: [{
          hooks: [{ type: 'command', command: 'echo ok', async: true }]
        }],
        PreToolUse: [{
          matcher: 'Read',
          hooks: [{ type: 'http', url: 'https://example.com', headers: { Authorization: 'token' }, allowedEnvVars: ['HOME'] }]
        }]
      }
    }, null, 2));

    let validator = loadValidator({
      HOOKS_FILE: hooksPath,
      HOOKS_SCHEMA_PATH: path.join(tempDir, 'missing-schema.json'),
    });
    let result = captureRun(() => validator.validateHooks());
    assert.strictEqual(result.exitCode, null);
    assert.ok(result.stdout.some(line => line.includes('Validated 2 hook matchers')));

    fs.writeFileSync(hooksPath, JSON.stringify([
      {
        matcher: { tool_name: 'Read' },
        hooks: [{ type: 'agent', prompt: 'delegate' }]
      }
    ], null, 2));
    validator = loadValidator({
      HOOKS_FILE: hooksPath,
      HOOKS_SCHEMA_PATH: path.join(tempDir, 'missing-schema.json'),
    });
    result = captureRun(() => validator.validateHooks());
    assert.strictEqual(result.exitCode, null);
    assert.ok(result.stdout.some(line => line.includes('Validated 1 hook matchers')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
