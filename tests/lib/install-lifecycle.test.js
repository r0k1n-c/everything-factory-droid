/**
 * Tests for scripts/lib/install-lifecycle.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildDoctorReport,
  discoverInstalledStates,
  normalizeTargets,
  repairInstalledStates,
  uninstallInstalledStates,
} = require('../../scripts/lib/install-lifecycle');
const { createInstallState, writeInstallState } = require('../../scripts/lib/install-state');
const REPO_ROOT = path.join(__dirname, '..', '..');
const CURRENT_PACKAGE_VERSION = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version;
const CURRENT_MANIFEST_VERSION = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'manifests', 'install-modules.json'), 'utf8')).version;
function test(name, fn) { try { fn(); console.log(`  ✓ ${name}`); return true; } catch (error) { console.log(`  ✗ ${name}`); console.log(`    Error: ${error.message}`); return false; } }
function createTempDir(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
function cleanup(dirPath) { fs.rmSync(dirPath, { recursive: true, force: true }); }
function writeState(filePath, options) { const state = createInstallState(options); writeInstallState(filePath, state); return state; }
function buildManagedCopyOperation(projectRoot) {
  return {
    kind: 'copy-file',
    moduleId: 'rules-core',
    sourceRelativePath: 'rules/common/coding-style.md',
    destinationPath: path.join(projectRoot, '.factory', 'rules', 'common', 'coding-style.md'),
    strategy: 'preserve-relative-path',
    ownership: 'managed',
    scaffoldOnly: false,
  };
}

console.log('\n=== Testing install-lifecycle.js ===\n');
let passed = 0; let failed = 0;

if (test('normalizeTargets defaults and deduplicates adapter targets', () => {
  assert.deepStrictEqual(normalizeTargets(), ['factory-droid']);
  assert.deepStrictEqual(normalizeTargets(['factory-droid', 'factory-droid']), ['factory-droid']);
})) passed++; else failed++;

if (test('discovers factory-droid install-state in the current project', () => {
  const projectRoot = createTempDir('install-lifecycle-project-');
  try {
    const statePath = path.join(projectRoot, '.factory', 'install-state.json');
    writeState(statePath, { adapter: { id: 'factory-droid-project', target: 'factory-droid', kind: 'project' }, targetRoot: projectRoot, installStatePath: statePath, request: { profile: 'core', modules: [], legacyLanguages: [], legacyMode: false }, resolution: { selectedModules: ['rules-core'], skippedModules: [] }, operations: [], source: { repoVersion: CURRENT_PACKAGE_VERSION, repoCommit: 'abc123', manifestVersion: CURRENT_MANIFEST_VERSION } });
    const records = discoverInstalledStates({ homeDir: process.env.HOME, projectRoot, targets: ['factory-droid'] });
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].state.target.id, 'factory-droid-project');
  } finally { cleanup(projectRoot); }
})) passed++; else failed++;

if (test('doctor reports missing managed files as an error', () => {
  const projectRoot = createTempDir('install-lifecycle-project-');
  try {
    const statePath = path.join(projectRoot, '.factory', 'install-state.json');
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    writeState(statePath, { adapter: { id: 'factory-droid-project', target: 'factory-droid', kind: 'project' }, targetRoot: projectRoot, installStatePath: statePath, request: { profile: 'core', modules: ['rules-core'], legacyLanguages: [], legacyMode: false }, resolution: { selectedModules: ['rules-core'], skippedModules: [] }, operations: [{ kind: 'copy-file', moduleId: 'rules-core', sourceRelativePath: 'rules/common/coding-style.md', destinationPath: path.join(projectRoot, '.factory', 'rules', 'common', 'coding-style.md'), strategy: 'preserve-relative-path', ownership: 'managed', scaffoldOnly: false }], source: { repoVersion: CURRENT_PACKAGE_VERSION, repoCommit: 'abc123', manifestVersion: CURRENT_MANIFEST_VERSION } });
    const report = buildDoctorReport({ repoRoot: REPO_ROOT, homeDir: process.env.HOME, projectRoot, targets: ['factory-droid'] });
    assert.strictEqual(report.results[0].status, 'error');
  } finally { cleanup(projectRoot); }
})) passed++; else failed++;

if (test('doctor reports warnings for target-root drift and version mismatch', () => {
  const projectRoot = createTempDir('install-lifecycle-project-');
  try {
    const statePath = path.join(projectRoot, '.factory', 'install-state.json');
    const managedOperation = buildManagedCopyOperation(projectRoot);
    const recordedRoot = path.join(projectRoot, 'old-root');
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.mkdirSync(path.dirname(managedOperation.destinationPath), { recursive: true });
    fs.mkdirSync(recordedRoot, { recursive: true });
    fs.writeFileSync(
      managedOperation.destinationPath,
      fs.readFileSync(path.join(REPO_ROOT, managedOperation.sourceRelativePath), 'utf8')
    );

    writeState(statePath, {
      adapter: { id: 'factory-droid-project', target: 'factory-droid', kind: 'project' },
      targetRoot: recordedRoot,
      installStatePath: path.join(projectRoot, '.factory', 'old-install-state.json'),
      request: { profile: 'core', modules: ['rules-core'], legacyLanguages: [], legacyMode: false },
      resolution: { selectedModules: ['rules-core'], skippedModules: [] },
      operations: [managedOperation],
      source: { repoVersion: '0.0.1', repoCommit: 'abc123', manifestVersion: CURRENT_MANIFEST_VERSION + 1 },
    });

    const report = buildDoctorReport({ repoRoot: REPO_ROOT, homeDir: process.env.HOME, projectRoot, targets: ['factory-droid'] });
    const issueCodes = report.results[0].issues.map(issue => issue.code);
    assert.strictEqual(report.results[0].status, 'warning');
    assert.ok(issueCodes.includes('target-root-mismatch'));
    assert.ok(issueCodes.includes('install-state-path-mismatch'));
    assert.ok(issueCodes.includes('manifest-version-mismatch'));
    assert.ok(issueCodes.includes('repo-version-mismatch'));
  } finally { cleanup(projectRoot); }
})) passed++; else failed++;

if (test('repairInstalledStates plans and repairs drifted managed files', () => {
  const projectRoot = createTempDir('install-lifecycle-project-');
  try {
    const statePath = path.join(projectRoot, '.factory', 'install-state.json');
    const managedOperation = buildManagedCopyOperation(projectRoot);
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.mkdirSync(path.dirname(managedOperation.destinationPath), { recursive: true });
    fs.writeFileSync(managedOperation.destinationPath, 'drifted\n', 'utf8');

    writeState(statePath, {
      adapter: { id: 'factory-droid-project', target: 'factory-droid', kind: 'project' },
      targetRoot: projectRoot,
      installStatePath: statePath,
      request: { profile: 'core', modules: ['rules-core'], legacyLanguages: ['typescript'], legacyMode: true },
      resolution: { selectedModules: ['rules-core'], skippedModules: [] },
      operations: [managedOperation],
      source: { repoVersion: CURRENT_PACKAGE_VERSION, repoCommit: 'abc123', manifestVersion: CURRENT_MANIFEST_VERSION },
    });

    const dryRun = repairInstalledStates({ repoRoot: REPO_ROOT, homeDir: process.env.HOME, projectRoot, targets: ['factory-droid'], dryRun: true });
    assert.strictEqual(dryRun.results[0].status, 'planned');
    assert.ok(dryRun.results[0].plannedRepairs.includes(managedOperation.destinationPath));

    const repaired = repairInstalledStates({ repoRoot: REPO_ROOT, homeDir: process.env.HOME, projectRoot, targets: ['factory-droid'] });
    assert.strictEqual(repaired.results[0].status, 'repaired');
    assert.strictEqual(
      fs.readFileSync(managedOperation.destinationPath, 'utf8'),
      fs.readFileSync(path.join(REPO_ROOT, managedOperation.sourceRelativePath), 'utf8')
    );
  } finally { cleanup(projectRoot); }
})) passed++; else failed++;

if (test('uninstallInstalledStates plans and removes managed files', () => {
  const projectRoot = createTempDir('install-lifecycle-project-');
  try {
    const statePath = path.join(projectRoot, '.factory', 'install-state.json');
    const managedOperation = buildManagedCopyOperation(projectRoot);
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.mkdirSync(path.dirname(managedOperation.destinationPath), { recursive: true });
    fs.writeFileSync(
      managedOperation.destinationPath,
      fs.readFileSync(path.join(REPO_ROOT, managedOperation.sourceRelativePath), 'utf8')
    );

    writeState(statePath, {
      adapter: { id: 'factory-droid-project', target: 'factory-droid', kind: 'project' },
      targetRoot: projectRoot,
      installStatePath: statePath,
      request: { profile: 'core', modules: ['rules-core'], legacyLanguages: [], legacyMode: false },
      resolution: { selectedModules: ['rules-core'], skippedModules: [] },
      operations: [managedOperation],
      source: { repoVersion: CURRENT_PACKAGE_VERSION, repoCommit: 'abc123', manifestVersion: CURRENT_MANIFEST_VERSION },
    });

    const dryRun = uninstallInstalledStates({ projectRoot, targets: ['factory-droid'], dryRun: true });
    assert.strictEqual(dryRun.results[0].status, 'planned');
    assert.ok(dryRun.results[0].plannedRemovals.includes(managedOperation.destinationPath));
    assert.ok(dryRun.results[0].plannedRemovals.includes(statePath));

    const uninstalled = uninstallInstalledStates({ projectRoot, targets: ['factory-droid'] });
    assert.strictEqual(uninstalled.results[0].status, 'uninstalled');
    assert.ok(!fs.existsSync(managedOperation.destinationPath));
    assert.ok(!fs.existsSync(statePath));
  } finally { cleanup(projectRoot); }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
