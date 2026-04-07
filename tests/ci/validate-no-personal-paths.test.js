/**
 * Tests for scripts/ci/validate-no-personal-paths.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'ci', 'validate-no-personal-paths.js');

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

function stripShebang(source) {
  return source.startsWith('#!') ? source.replace(/^#!.*\r?\n/, '') : source;
}

function runValidatorWithRoot(rootDir) {
  let source = stripShebang(fs.readFileSync(SCRIPT, 'utf8'));
  source = source.replace(/const ROOT = .*?;/, `const ROOT = ${JSON.stringify(rootDir)};`);

  const harnessPath = path.join(rootDir, `.tmp-validator-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
  const wrapper = [
    'const Module = require(\'module\');',
    'const path = require(\'path\');',
    `const source = ${JSON.stringify(source)};`,
    `const filename = ${JSON.stringify(SCRIPT)};`,
    'const mod = new Module(filename, module);',
    'mod.filename = filename;',
    'mod.paths = Module._nodeModulePaths(path.dirname(filename));',
    'mod._compile(source, filename);',
  ].join('\n');

  try {
    fs.writeFileSync(harnessPath, wrapper, 'utf8');
    const stdout = execFileSync('node', [harnessPath], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: rootDir,
      timeout: 10000,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      code: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    };
  } finally {
    try {
      fs.unlinkSync(harnessPath);
    } catch {
      // ignore
    }
  }
}

console.log('\n=== Testing validate-no-personal-paths.js ===\n');

let passed = 0;
let failed = 0;

if (test('passes when tracked files do not contain blocked personal paths', () => {
  const rootDir = createTempDir('efd-no-personal-paths-');

  try {
    fs.mkdirSync(path.join(rootDir, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'README.md'), 'Factory Droid only\n', 'utf8');
    const result = runValidatorWithRoot(rootDir);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('Validated: no personal absolute paths'), result.stdout);
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('fails when tracked files contain blocked personal paths', () => {
  const rootDir = createTempDir('efd-no-personal-paths-');

  try {
    fs.writeFileSync(path.join(rootDir, 'README.md'), 'bad path: /Users/affoon/projects/demo\n', 'utf8');
    const result = runValidatorWithRoot(rootDir);
    assert.strictEqual(result.code, 1, result.stderr);
    assert.ok(result.stderr.includes('personal path detected in README.md'), result.stderr);
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('fails when tracked files contain the current maintainer path', () => {
  const rootDir = createTempDir('efd-no-personal-paths-');

  try {
    fs.writeFileSync(path.join(rootDir, 'README.md'), 'bad path: /Users/r0/Desktop/AIProjects/demo\n', 'utf8');
    const result = runValidatorWithRoot(rootDir);
    assert.strictEqual(result.code, 1, result.stderr);
    assert.ok(result.stderr.includes('personal path detected in README.md'), result.stderr);
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
