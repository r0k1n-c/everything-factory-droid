"use strict";

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createFlatRuleOperations,
  createInstallTargetAdapter,
  createManagedOperation,
  createNamespacedFlatRuleOperations,
  createRemappedOperation,
  normalizeRelativePath,
} = require('../../scripts/lib/install-targets/helpers');

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

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

console.log('\n=== Testing install-target helpers direct coverage ===\n');

let passed = 0;
let failed = 0;

if (test('normalizeRelativePath and managed operations apply normalization and defaults', () => {
  assert.strictEqual(normalizeRelativePath('./rules/common/'), 'rules/common');
  assert.strictEqual(normalizeRelativePath('\\rules\\nested\\file.md'), '/rules/nested/file.md');
  assert.strictEqual(normalizeRelativePath(''), '');

  const managed = createManagedOperation({
    moduleId: 'rules-core',
    sourceRelativePath: './rules/common/',
    destinationPath: '/tmp/rules/common',
  });
  assert.deepStrictEqual(managed, {
    kind: 'copy-path',
    moduleId: 'rules-core',
    sourceRelativePath: 'rules/common',
    destinationPath: '/tmp/rules/common',
    strategy: 'preserve-relative-path',
    ownership: 'managed',
    scaffoldOnly: true,
  });

  const remapped = createRemappedOperation({}, 'skill-core', 'skills/demo/', '/tmp/demo', {
    kind: 'template-file',
    strategy: 'flatten-copy',
    ownership: 'external',
    scaffoldOnly: false,
    extra: { note: 'ok' },
  });
  assert.deepStrictEqual(remapped, {
    kind: 'template-file',
    moduleId: 'skill-core',
    sourceRelativePath: 'skills/demo',
    destinationPath: '/tmp/demo',
    strategy: 'flatten-copy',
    ownership: 'external',
    scaffoldOnly: false,
    note: 'ok',
  });
})) passed++; else failed++;

if (test('createNamespacedFlatRuleOperations flattens directories and files and skips missing roots', () => {
  const repoRoot = createTempDir('efd-install-target-helpers-');
  try {
    const sourceRoot = path.join(repoRoot, 'rules');
    fs.mkdirSync(path.join(sourceRoot, 'common', 'nested'), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, 'common', 'nested', 'style.md'), '# style');
    fs.writeFileSync(path.join(sourceRoot, 'root.md'), '# root');

    const adapter = {
      resolveRoot() {
        return '/workspace/project/.factory';
      }
    };

    assert.deepStrictEqual(createNamespacedFlatRuleOperations(adapter, 'rules', 'rules', {}), []);
    assert.deepStrictEqual(createNamespacedFlatRuleOperations(adapter, 'rules', 'missing', { repoRoot }), []);

    const operations = createNamespacedFlatRuleOperations(adapter, 'rules', 'rules', { repoRoot });
    assert.strictEqual(operations.length, 2);
    assert.ok(operations.some(operation => operation.destinationPath === path.join('/workspace/project/.factory', 'rules', 'common-nested-style.md')));
    assert.ok(operations.some(operation => operation.destinationPath === path.join('/workspace/project/.factory', 'rules', 'root.md')));
    assert.ok(operations.every(operation => operation.strategy === 'flatten-copy'));
  } finally {
    cleanup(repoRoot);
  }
})) passed++; else failed++;

if (test('createFlatRuleOperations flattens namespace files into the destination directory', () => {
  const repoRoot = createTempDir('efd-flat-rule-');
  try {
    const sourceRoot = path.join(repoRoot, 'rules');
    fs.mkdirSync(path.join(sourceRoot, 'team', 'docs'), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, 'team', 'docs', 'readme.md'), '# readme');
    fs.writeFileSync(path.join(sourceRoot, 'base.md'), '# base');

    assert.deepStrictEqual(createFlatRuleOperations({ moduleId: 'rules', sourceRelativePath: 'rules', destinationDir: '/tmp/out' }), []);
    assert.deepStrictEqual(createFlatRuleOperations({ moduleId: 'rules', repoRoot, sourceRelativePath: 'missing', destinationDir: '/tmp/out' }), []);

    const operations = createFlatRuleOperations({
      moduleId: 'rules',
      repoRoot,
      sourceRelativePath: 'rules',
      destinationDir: '/tmp/out',
    });
    assert.strictEqual(operations.length, 2);
    assert.ok(operations.some(operation => operation.destinationPath === path.join('/tmp/out', 'team-docs-readme.md')));
    assert.ok(operations.some(operation => operation.destinationPath === path.join('/tmp/out', 'base.md')));
  } finally {
    cleanup(repoRoot);
  }
})) passed++; else failed++;

if (test('createInstallTargetAdapter covers defaults, planning, custom hooks, and validation branches', () => {
  const homeAdapter = createInstallTargetAdapter({
    id: 'factory-droid-home',
    target: 'factory-droid',
    kind: 'home',
    rootSegments: ['.factory'],
    installStatePathSegments: ['install-state.json'],
    nativeRootRelativePath: '.factory',
  });

  assert.strictEqual(homeAdapter.supports('factory-droid'), true);
  assert.strictEqual(homeAdapter.supports('factory-droid-home'), true);
  assert.strictEqual(homeAdapter.supports('cursor'), false);
  assert.strictEqual(homeAdapter.resolveRoot({ homeDir: '/Users/tester' }), path.join('/Users/tester', '.factory'));
  assert.strictEqual(homeAdapter.getInstallStatePath({ homeDir: '/Users/tester' }), path.join('/Users/tester', '.factory', 'install-state.json'));
  assert.strictEqual(homeAdapter.resolveDestinationPath('.factory', { homeDir: '/Users/tester' }), path.join('/Users/tester', '.factory'));
  assert.strictEqual(homeAdapter.resolveDestinationPath('rules/common.md', { homeDir: '/Users/tester' }), path.join('/Users/tester', '.factory', 'rules/common.md'));
  assert.strictEqual(homeAdapter.determineStrategy('.factory'), 'sync-root-children');
  assert.strictEqual(homeAdapter.determineStrategy('rules/common.md'), 'preserve-relative-path');
  assert.deepStrictEqual(homeAdapter.validate({ homeDir: '/Users/tester' }), []);

  const scaffold = homeAdapter.createScaffoldOperation('rules-core', './.factory/', { homeDir: '/Users/tester' });
  assert.strictEqual(scaffold.strategy, 'sync-root-children');
  assert.strictEqual(scaffold.destinationPath, path.join('/Users/tester', '.factory'));

  const modulePlan = homeAdapter.planOperations({
    homeDir: '/Users/tester',
    modules: [{ id: 'rules-core', paths: ['rules', '.factory'] }],
  });
  assert.strictEqual(modulePlan.length, 2);
  assert.ok(modulePlan.some(operation => operation.destinationPath === path.join('/Users/tester', '.factory', 'rules')));

  const singlePlan = homeAdapter.planOperations({
    homeDir: '/Users/tester',
    module: { id: 'agents-core', paths: ['agents'] },
  });
  assert.strictEqual(singlePlan.length, 1);
  assert.strictEqual(singlePlan[0].destinationPath, path.join('/Users/tester', '.factory', 'agents'));
  assert.strictEqual(homeAdapter.supportsModule({ id: 'anything' }), true);

  const projectAdapter = createInstallTargetAdapter({
    id: 'factory-droid-project',
    target: 'factory-droid',
    kind: 'project',
    rootSegments: [],
    installStatePathSegments: ['.factory', 'install-state.json'],
  });
  const validationIssues = projectAdapter.validate({});
  assert.strictEqual(validationIssues.length, 1);
  assert.strictEqual(validationIssues[0].code, 'missing-project-root');

  const customAdapter = createInstallTargetAdapter({
    id: 'custom',
    target: 'custom-target',
    kind: 'project',
    rootSegments: [],
    installStatePathSegments: ['state.json'],
    planOperations(input) {
      return [{ moduleId: input.module.id, destinationPath: '/tmp/custom' }];
    },
    supportsModule(module) {
      return module.id === 'allowed';
    },
    validate() {
      return [{ severity: 'warning', code: 'custom-warning', message: 'warn' }];
    },
  });

  assert.deepStrictEqual(customAdapter.planOperations({ module: { id: 'allowed', paths: [] } }), [{ moduleId: 'allowed', destinationPath: '/tmp/custom' }]);
  assert.strictEqual(customAdapter.supportsModule({ id: 'allowed' }), true);
  assert.strictEqual(customAdapter.supportsModule({ id: 'blocked' }), false);
  assert.deepStrictEqual(customAdapter.validate({}), [{ severity: 'warning', code: 'custom-warning', message: 'warn' }]);

  const unsupported = createInstallTargetAdapter({
    id: 'broken',
    target: 'broken',
    kind: 'weird',
    rootSegments: [],
    installStatePathSegments: ['state.json'],
  });
  assert.throws(() => unsupported.resolveRoot({}), /Unsupported install target scope/);
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
