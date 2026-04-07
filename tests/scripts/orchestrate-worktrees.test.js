/**
 * Tests for scripts/orchestrate-worktrees.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'orchestrate-worktrees.js');

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

function run(args = [], options = {}) {
  try {
    const stdout = execFileSync('node', [SCRIPT, ...args], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: options.cwd || process.cwd(),
      timeout: 10000,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      code: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    };
  }
}

function writePlan(repoRoot) {
  const planPath = path.join(repoRoot, 'workflow.json');
  fs.writeFileSync(
    planPath,
    JSON.stringify({
      sessionName: 'coverage-proof',
      repoRoot,
      coordinationRoot: path.join(repoRoot, '.factory', 'orchestration'),
      launcherCommand: 'node worker.js --task {task_file}',
      workers: [
        {
          name: 'Worker One',
          task: 'Audit the migration state',
        },
      ],
    }),
    'utf8'
  );
  return planPath;
}

console.log('\n=== Testing orchestrate-worktrees.js ===\n');

let passed = 0;
let failed = 0;

if (test('shows usage and exits non-zero when no plan path is provided', () => {
  const result = run([]);
  assert.strictEqual(result.code, 1, result.stderr);
  assert.ok(result.stdout.includes('Usage:'), result.stdout);
})) passed++; else failed++;

if (test('prints a dry-run orchestration plan for a valid workflow config', () => {
  const repoRoot = createTempDir('efd-orchestrate-');

  try {
    const planPath = writePlan(repoRoot);
    const result = run([planPath], { cwd: repoRoot });
    assert.strictEqual(result.code, 0, result.stderr);
    const preview = JSON.parse(result.stdout);
    assert.strictEqual(preview.sessionName, 'coverage-proof');
    assert.strictEqual(preview.workers.length, 1);
    assert.ok(preview.commands.some(command => command.includes('tmux new-session')), result.stdout);
  } finally {
    cleanup(repoRoot);
  }
})) passed++; else failed++;

if (test('materializes coordination files in write-only mode', () => {
  const repoRoot = createTempDir('efd-orchestrate-');

  try {
    const planPath = writePlan(repoRoot);
    const result = run([planPath, '--write-only'], { cwd: repoRoot });
    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('Wrote orchestration files'), result.stdout);
    const coordinationDir = path.join(repoRoot, '.factory', 'orchestration', 'coverage-proof', 'worker-one');
    assert.ok(fs.existsSync(path.join(coordinationDir, 'task.md')));
    assert.ok(fs.existsSync(path.join(coordinationDir, 'handoff.md')));
    assert.ok(fs.existsSync(path.join(coordinationDir, 'status.md')));
  } finally {
    cleanup(repoRoot);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
