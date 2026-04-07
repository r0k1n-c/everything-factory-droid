'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'pre-bash-commit-quality.js');
const GLOBAL_DEPS_KEY = '__PRE_BASH_COMMIT_QUALITY_TEST_DEPS__';

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

function stripShebang(source) {
  return source.startsWith('#!') ? source.replace(/^#!.*\r?\n/, '') : source;
}

function loadHook(testDeps = {}) {
  let source = stripShebang(fs.readFileSync(SCRIPT, 'utf8'));
  source = source.replace(
    "const { spawnSync } = require('child_process');",
    "const spawnSync = global.__PRE_BASH_COMMIT_QUALITY_TEST_DEPS__?.spawnSync || require('child_process').spawnSync;"
  );
  source = source.replace(
    "const path = require('path');",
    "const path = global.__PRE_BASH_COMMIT_QUALITY_TEST_DEPS__?.path || require('path');"
  );
  source = source.replace(
    "const fs = require('fs');",
    "const fs = global.__PRE_BASH_COMMIT_QUALITY_TEST_DEPS__?.fs || require('fs');"
  );
  source = source.replace(
    'module.exports = { run, evaluate };',
    'module.exports = { getStagedFiles, getStagedFileContent, shouldCheckFile, findFileIssues, validateCommitMessage, runLinter, evaluate, run };'
  );

  global[GLOBAL_DEPS_KEY] = testDeps;
  const mod = new Module(SCRIPT, module);
  mod.filename = SCRIPT;
  mod.paths = Module._nodeModulePaths(path.dirname(SCRIPT));

  try {
    mod._compile(source, SCRIPT);
  } finally {
    delete global[GLOBAL_DEPS_KEY];
  }

  return mod.exports;
}

console.log('\n=== Testing pre-bash-commit-quality direct coverage ===\n');

let passed = 0;
let failed = 0;

if (test('helper functions cover staged-file failures and issue classification branches', () => {
  const failedGitHook = loadHook({
    spawnSync(command, args) {
      if (command === 'git' && args[0] === 'diff') {
        return { status: 1, stdout: '', stderr: 'git failed' };
      }
      if (command === 'git' && args[0] === 'show') {
        return { status: 1, stdout: '', stderr: 'missing staged blob' };
      }
      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    },
  });

  assert.deepStrictEqual(failedGitHook.getStagedFiles(), []);
  assert.strictEqual(failedGitHook.getStagedFileContent('missing.js'), null);
  assert.strictEqual(failedGitHook.shouldCheckFile('index.ts'), true);
  assert.strictEqual(failedGitHook.shouldCheckFile('README.md'), false);

  const issueHook = loadHook({
    spawnSync(command, args) {
      if (command === 'git' && args[0] === 'show') {
        return {
          status: 0,
          stdout: [
            '// console.log("ignored");',
            ' * console.log("ignored");',
            'console.log("live");',
            '// debugger;',
            'debugger;',
            '// TODO: closes #123',
            '// TODO: follow up later',
            'const api_key = "abc123";',
          ].join('\n'),
          stderr: '',
        };
      }
      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    },
  });

  const issues = issueHook.findFileIssues('index.js');
  assert.deepStrictEqual(
    issues.map(issue => issue.type),
    ['console.log', 'debugger', 'todo', 'secret']
  );

  const throwingHook = loadHook({
    spawnSync() {
      throw new Error('git show exploded');
    },
  });
  assert.deepStrictEqual(throwingHook.findFileIssues('broken.js'), []);
})) passed++; else failed++;

if (test('validateCommitMessage handles null, invalid, warning, and valid conventional messages', () => {
  const hook = loadHook();

  assert.strictEqual(hook.validateCommitMessage('git status'), null);

  const invalid = hook.validateCommitMessage('git commit -m "Bad subject."');
  assert.ok(invalid);
  assert.deepStrictEqual(
    invalid.issues.map(issue => issue.type),
    ['format', 'punctuation']
  );

  const warned = hook.validateCommitMessage(
    `git commit -m "fix: ${'A'.repeat(73)}."`
  );
  assert.ok(warned);
  assert.deepStrictEqual(
    warned.issues.map(issue => issue.type),
    ['length', 'capitalization', 'punctuation']
  );

  const valid = hook.validateCommitMessage('git commit -m "fix(hooks): block staged debugger"');
  assert.ok(valid);
  assert.deepStrictEqual(valid.issues, []);
})) passed++; else failed++;

if (test('runLinter handles missing tools, explicit failures, and golint output warnings', () => {
  const unavailableHook = loadHook({
    fs: {
      existsSync() {
        return false;
      },
    },
    spawnSync(command) {
      if (command === 'pylint' || command === 'golint') {
        return { error: { code: 'ENOENT' }, status: null, stdout: '', stderr: '' };
      }
      throw new Error(`Unexpected command: ${command}`);
    },
  });

  assert.deepStrictEqual(
    unavailableHook.runLinter(['index.js', 'script.py', 'main.go']),
    {
      eslint: null,
      pylint: null,
      golint: null,
    }
  );

  const failingHook = loadHook({
    fs: {
      existsSync(filePath) {
        return filePath.endsWith(path.join('node_modules', '.bin', 'eslint'));
      },
    },
    spawnSync(command) {
      if (command.endsWith('eslint')) {
        return { status: 1, stdout: 'eslint failed', stderr: '' };
      }
      if (command === 'pylint') {
        return { status: 1, stdout: '', stderr: 'pylint failed' };
      }
      if (command === 'golint') {
        return { status: 0, stdout: 'main.go:1: issue', stderr: '' };
      }
      throw new Error(`Unexpected command: ${command}`);
    },
  });

  const results = failingHook.runLinter(['index.js', 'script.py', 'main.go']);
  assert.strictEqual(results.eslint.success, false);
  assert.strictEqual(results.eslint.output, 'eslint failed');
  assert.strictEqual(results.pylint.success, false);
  assert.strictEqual(results.pylint.output, 'pylint failed');
  assert.strictEqual(results.golint.success, false);
  assert.strictEqual(results.golint.output, 'main.go:1: issue');
})) passed++; else failed++;

if (test('evaluate covers bypass, warning, blocking, pass, error handling, and run wrapper branches', () => {
  const plainHook = loadHook();
  const passthroughInput = JSON.stringify({ tool_input: { command: 'echo hello' } });
  assert.deepStrictEqual(plainHook.evaluate(passthroughInput), {
    output: passthroughInput,
    exitCode: 0,
  });
  assert.deepStrictEqual(plainHook.evaluate(JSON.stringify({
    tool_input: { command: 'git commit --amend -m "fix: amend"' },
  })), {
    output: JSON.stringify({ tool_input: { command: 'git commit --amend -m "fix: amend"' } }),
    exitCode: 0,
  });
  assert.deepStrictEqual(plainHook.evaluate('not-json'), {
    output: 'not-json',
    exitCode: 0,
  });
  assert.strictEqual(plainHook.run(passthroughInput), passthroughInput);

  const noStagedHook = loadHook({
    spawnSync(command, args) {
      if (command === 'git' && args[0] === 'diff') {
        return { status: 0, stdout: '', stderr: '' };
      }
      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    },
  });
  const noStagedInput = JSON.stringify({ tool_input: { command: 'git commit -m "fix: no staged files"' } });
  assert.strictEqual(noStagedHook.evaluate(noStagedInput).exitCode, 0);

  const warningHook = loadHook({
    fs: { existsSync: () => false },
    spawnSync(command, args) {
      if (command === 'git' && args[0] === 'diff') {
        return { status: 0, stdout: 'index.js\n', stderr: '' };
      }
      if (command === 'git' && args[0] === 'show') {
        return {
          status: 0,
          stdout: 'console.log("warn");\n// TODO: investigate later\n',
          stderr: '',
        };
      }
      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    },
  });
  const warningInput = JSON.stringify({ tool_input: { command: 'git commit -m "bad subject."' } });
  assert.strictEqual(warningHook.evaluate(warningInput).exitCode, 0);

  const blockedHook = loadHook({
    fs: { existsSync: () => false },
    spawnSync(command, args) {
      if (command === 'git' && args[0] === 'diff') {
        return { status: 0, stdout: 'index.js\n', stderr: '' };
      }
      if (command === 'git' && args[0] === 'show') {
        return { status: 0, stdout: 'debugger;\n', stderr: '' };
      }
      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    },
  });
  const blockedInput = JSON.stringify({ tool_input: { command: 'git commit -m "fix: block debugger"' } });
  assert.strictEqual(blockedHook.evaluate(blockedInput).exitCode, 2);

  const lintBlockedHook = loadHook({
    fs: {
      existsSync(filePath) {
        return filePath.endsWith(path.join('node_modules', '.bin', 'eslint'));
      },
    },
    spawnSync(command, args) {
      if (command === 'git' && args[0] === 'diff') {
        return { status: 0, stdout: 'index.js\n', stderr: '' };
      }
      if (command === 'git' && args[0] === 'show') {
        return { status: 0, stdout: 'const value = 1;\n', stderr: '' };
      }
      if (command.endsWith('eslint')) {
        return { status: 1, stdout: 'eslint error', stderr: '' };
      }
      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    },
  });
  const lintBlockedInput = JSON.stringify({ tool_input: { command: 'git commit -m "fix: lint failure"' } });
  assert.strictEqual(lintBlockedHook.evaluate(lintBlockedInput).exitCode, 2);

  const passHook = loadHook({
    fs: { existsSync: () => false },
    spawnSync(command, args) {
      if (command === 'git' && args[0] === 'diff') {
        return { status: 0, stdout: 'index.js\nnotes.md\n', stderr: '' };
      }
      if (command === 'git' && args[0] === 'show') {
        return { status: 0, stdout: 'const value = 1;\n', stderr: '' };
      }
      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    },
  });
  const passInput = JSON.stringify({ tool_input: { command: 'git commit -m "fix: keep hook green"' } });
  assert.strictEqual(passHook.evaluate(passInput).exitCode, 0);
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
