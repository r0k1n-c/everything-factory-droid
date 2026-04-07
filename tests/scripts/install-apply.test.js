/**
 * Tests for scripts/install-apply.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'install-apply.js');

function createTempDir(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
function cleanup(dirPath) { fs.rmSync(dirPath, { recursive: true, force: true }); }
function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function run(args = [], options = {}) {
  const env = { ...process.env, HOME: options.homeDir || process.env.HOME, USERPROFILE: options.homeDir || process.env.HOME };
  try {
    const stdout = execFileSync('node', [SCRIPT, ...args], { cwd: options.cwd, env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    return { code: error.status || 1, stdout: error.stdout || '', stderr: error.stderr || '' };
  }
}
function test(name, fn) { try { fn(); console.log(`  ✓ ${name}`); return true; } catch (error) { console.log(`  ✗ ${name}`); console.log(`    Error: ${error.message}`); return false; } }

console.log('\n=== Testing install-apply.js ===\n');
let passed = 0; let failed = 0;

if (test('shows help with --help', () => {
  const result = run(['--help']);
  assert.strictEqual(result.code, 0);
  assert.ok(result.stdout.includes('factory-droid'));
})) passed++; else failed++;

if (test('installs Factory Droid assets into project .factory and writes install-state', () => {
  const homeDir = createTempDir('install-apply-home-');
  const projectDir = createTempDir('install-apply-project-');
  try {
    const result = run(['typescript'], { cwd: projectDir, homeDir });
    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(projectDir, '.factory', 'install-state.json')));
    assert.ok(fs.existsSync(path.join(projectDir, '.factory', 'rules', 'common', 'coding-style.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.factory', 'droids', 'planner.md')));
    assert.ok(fs.existsSync(path.join(projectDir, '.factory', 'settings.json')));
    assert.ok(fs.existsSync(path.join(projectDir, 'hooks', 'hooks.json')));
    assert.ok(fs.existsSync(path.join(projectDir, 'scripts', 'hooks', 'session-start-bootstrap.js')));
    const state = readJson(path.join(projectDir, '.factory', 'install-state.json'));
    assert.strictEqual(state.target.id, 'factory-droid-project');
    assert.deepStrictEqual(state.request.legacyLanguages, ['typescript']);
  } finally { cleanup(homeDir); cleanup(projectDir); }
})) passed++; else failed++;

if (test('merges installed settings with existing project settings', () => {
  const homeDir = createTempDir('install-apply-home-');
  const projectDir = createTempDir('install-apply-project-');
  try {
    fs.mkdirSync(path.join(projectDir, '.factory'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, '.factory', 'settings.json'),
      JSON.stringify({ model: 'claude-sonnet-4-6', disabledMcpServers: ['vercel'] }, null, 2)
    );

    const result = run(['typescript'], { cwd: projectDir, homeDir });
    assert.strictEqual(result.code, 0, result.stderr);

    const settings = readJson(path.join(projectDir, '.factory', 'settings.json'));
    assert.strictEqual(settings.model, 'claude-sonnet-4-6');
    assert.deepStrictEqual(settings.disabledMcpServers, ['vercel']);
    assert.ok(settings.hooks && typeof settings.hooks === 'object', 'Expected hooks object to be merged');
  } finally { cleanup(homeDir); cleanup(projectDir); }
})) passed++; else failed++;

if (test('supports dry-run without mutating the project', () => {
  const homeDir = createTempDir('install-apply-home-');
  const projectDir = createTempDir('install-apply-project-');
  try {
    const result = run(['--dry-run', 'typescript'], { cwd: projectDir, homeDir });
    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('Dry-run install plan'));
    assert.ok(!fs.existsSync(path.join(projectDir, '.factory', 'install-state.json')));
  } finally { cleanup(homeDir); cleanup(projectDir); }
})) passed++; else failed++;

if (test('supports dry-run JSON output', () => {
  const homeDir = createTempDir('install-apply-home-');
  const projectDir = createTempDir('install-apply-project-');
  try {
    const result = run(['--dry-run', '--json', 'typescript'], { cwd: projectDir, homeDir });
    assert.strictEqual(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.dryRun, true);
    assert.strictEqual(payload.plan.mode, 'legacy-compat');
    assert.strictEqual(payload.plan.target, 'factory-droid');
  } finally { cleanup(homeDir); cleanup(projectDir); }
})) passed++; else failed++;

if (test('prints help text on invalid arguments', () => {
  const result = run(['--bogus']);
  assert.strictEqual(result.code, 1);
  assert.ok(result.stderr.includes('Error:'), result.stderr);
  assert.ok(result.stderr.includes('Usage: install.sh'), result.stderr);
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
