/**
 * Tests for scripts/repair.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const INSTALL_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'install-apply.js');
const DOCTOR_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'doctor.js');
const REPAIR_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'repair.js');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function runNode(scriptPath, args = [], options = {}) {
  try {
    const stdout = execFileSync('node', [scriptPath, ...args], {
      cwd: options.cwd,
      env: { ...process.env, HOME: options.homeDir || process.env.HOME },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
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

console.log('\n=== Testing repair.js ===\n');
let passed = 0;
let failed = 0;

if (test('repairs drifted files from a real factory-droid install', () => {
  const homeDir = createTempDir('repair-home-');
  const projectRoot = createTempDir('repair-project-');

  try {
    const installResult = runNode(INSTALL_SCRIPT, ['typescript'], { cwd: projectRoot, homeDir });
    assert.strictEqual(installResult.code, 0, installResult.stderr);

    const managedPath = path.join(projectRoot, '.factory', 'rules', 'common', 'coding-style.md');
    const expected = fs.readFileSync(managedPath, 'utf8');
    fs.writeFileSync(managedPath, '// drifted\n');

    const doctorBefore = runNode(DOCTOR_SCRIPT, ['--target', 'factory-droid', '--json'], { cwd: projectRoot, homeDir });
    assert.strictEqual(doctorBefore.code, 1);

    const repairResult = runNode(REPAIR_SCRIPT, ['--target', 'factory-droid', '--json'], { cwd: projectRoot, homeDir });
    assert.strictEqual(repairResult.code, 0, repairResult.stderr);
    assert.strictEqual(fs.readFileSync(managedPath, 'utf8'), expected);
  } finally {
    cleanup(homeDir);
    cleanup(projectRoot);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
