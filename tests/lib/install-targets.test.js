/**
 * Tests for scripts/lib/install-targets/registry.js
 */

const assert = require('assert');
const path = require('path');
const { getInstallTargetAdapter, listInstallTargetAdapters, planInstallTargetScaffold } = require('../../scripts/lib/install-targets/registry');

function test(name, fn) { try { fn(); console.log(`  ✓ ${name}`); return true; } catch (error) { console.log(`  ✗ ${name}`); console.log(`    Error: ${error.message}`); return false; } }

console.log('\n=== Testing install-target adapters ===\n');
let passed = 0;
let failed = 0;

if (test('lists only the factory-droid adapter', () => {
  const adapters = listInstallTargetAdapters();
  assert.strictEqual(adapters.length, 1);
  assert.strictEqual(adapters[0].target, 'factory-droid');
})) passed++; else failed++;

if (test('resolves factory-droid adapter root and install-state path from project root', () => {
  const adapter = getInstallTargetAdapter('factory-droid');
  const projectRoot = '/workspace/app';
  assert.strictEqual(adapter.resolveRoot({ projectRoot }), projectRoot);
  assert.strictEqual(adapter.getInstallStatePath({ projectRoot }), path.join(projectRoot, '.factory', 'install-state.json'));
})) passed++; else failed++;

if (test('plans scaffold operations for factory-droid target', () => {
  const repoRoot = path.join(__dirname, '..', '..');
  const projectRoot = '/workspace/app';
  const modules = [{ id: 'rules-core', paths: ['rules'] }, { id: 'agents-core', paths: ['agents', 'AGENTS.md'] }];
  const plan = planInstallTargetScaffold({ target: 'factory-droid', repoRoot, projectRoot, modules });
  assert.strictEqual(plan.adapter.id, 'factory-droid-project');
  assert.strictEqual(plan.targetRoot, projectRoot);
  assert.strictEqual(plan.installStatePath, path.join(projectRoot, '.factory', 'install-state.json'));
  assert.ok(plan.operations.some(operation => operation.destinationPath === path.join(projectRoot, '.factory', 'rules')));
  assert.ok(plan.operations.some(operation => operation.destinationPath === path.join(projectRoot, '.factory', 'droids')));
  assert.ok(plan.operations.some(operation => operation.destinationPath === path.join(projectRoot, 'AGENTS.md')));
})) passed++; else failed++;

if (test('throws on unknown adapter', () => {
  assert.throws(() => getInstallTargetAdapter('cursor'), /Unknown install target adapter/);
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
