'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createFlatRuleOperations,
  createNamespacedFlatRuleOperations,
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

console.log('\n=== Testing OS metadata file filtering ===\n');

let passed = 0;
let failed = 0;

if (test('createNamespacedFlatRuleOperations excludes .DS_Store, Thumbs.db, and ._* files', () => {
  const repoRoot = createTempDir('efd-os-metadata-ns-');
  try {
    const sourceRoot = path.join(repoRoot, 'rules');
    fs.mkdirSync(path.join(sourceRoot, 'common'), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, 'common', 'style.md'), '# style');
    fs.writeFileSync(path.join(sourceRoot, 'common', '.DS_Store'), '');
    fs.writeFileSync(path.join(sourceRoot, 'common', 'Thumbs.db'), '');
    fs.writeFileSync(path.join(sourceRoot, 'common', '._hidden'), '');
    fs.writeFileSync(path.join(sourceRoot, '.DS_Store'), '');
    fs.writeFileSync(path.join(sourceRoot, 'root.md'), '# root');

    const adapter = {
      resolveRoot() {
        return '/workspace/project/.factory';
      }
    };

    const operations = createNamespacedFlatRuleOperations(adapter, 'rules', 'rules', { repoRoot });

    const destPaths = operations.map(op => path.basename(op.destinationPath));
    assert.ok(destPaths.includes('common-style.md'), 'should include style.md');
    assert.ok(destPaths.includes('root.md'), 'should include root.md');
    assert.ok(!destPaths.some(p => p.includes('.DS_Store')), 'should exclude .DS_Store');
    assert.ok(!destPaths.some(p => p.includes('Thumbs.db')), 'should exclude Thumbs.db');
    assert.ok(!destPaths.some(p => p.includes('._hidden')), 'should exclude ._hidden');
    assert.strictEqual(operations.length, 2, 'should only have 2 operations');
  } finally {
    cleanup(repoRoot);
  }
})) passed++; else failed++;

if (test('createFlatRuleOperations excludes .DS_Store, Thumbs.db, and ._* files', () => {
  const repoRoot = createTempDir('efd-os-metadata-flat-');
  try {
    const sourceRoot = path.join(repoRoot, 'rules');
    fs.mkdirSync(path.join(sourceRoot, 'team'), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, 'team', 'guide.md'), '# guide');
    fs.writeFileSync(path.join(sourceRoot, 'team', '.DS_Store'), '');
    fs.writeFileSync(path.join(sourceRoot, 'team', 'Thumbs.db'), '');
    fs.writeFileSync(path.join(sourceRoot, 'team', '._resource'), '');
    fs.writeFileSync(path.join(sourceRoot, 'base.md'), '# base');
    fs.writeFileSync(path.join(sourceRoot, '.DS_Store'), '');
    fs.writeFileSync(path.join(sourceRoot, 'Thumbs.db'), '');

    const operations = createFlatRuleOperations({
      moduleId: 'rules',
      repoRoot,
      sourceRelativePath: 'rules',
      destinationDir: '/tmp/out',
    });

    const destPaths = operations.map(op => path.basename(op.destinationPath));
    assert.ok(destPaths.includes('team-guide.md'), 'should include team-guide.md');
    assert.ok(destPaths.includes('base.md'), 'should include base.md');
    assert.ok(!destPaths.some(p => p.includes('.DS_Store')), 'should exclude .DS_Store');
    assert.ok(!destPaths.some(p => p.includes('Thumbs.db')), 'should exclude Thumbs.db');
    assert.ok(!destPaths.some(p => p.includes('._resource')), 'should exclude ._resource');
    assert.strictEqual(operations.length, 2, 'should only have 2 operations');
  } finally {
    cleanup(repoRoot);
  }
})) passed++; else failed++;

if (test('materializeScaffoldOperation excludes OS metadata files from directory expansion', () => {
  const repoRoot = createTempDir('efd-os-metadata-manifest-');
  try {
    const rulesDir = path.join(repoRoot, 'rules', 'common');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'style.md'), '# style');
    fs.writeFileSync(path.join(rulesDir, '.DS_Store'), '');
    fs.writeFileSync(path.join(rulesDir, 'Thumbs.db'), '');
    fs.writeFileSync(path.join(rulesDir, '._metadata'), '');

    const skillsDir = path.join(repoRoot, 'skills', 'demo');
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'skill.md'), '# skill');
    fs.writeFileSync(path.join(skillsDir, '.DS_Store'), '');

    // Use createManifestInstallPlan indirectly by testing the file listing
    // that feeds into materializeScaffoldOperation
    const { createLegacyInstallPlan } = require('../../scripts/lib/install-executor');

    // Create minimal structure needed for legacy install
    fs.mkdirSync(path.join(repoRoot, 'manifests'), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, 'package.json'), JSON.stringify({ version: '0.0.0-test' }));

    const projectRoot = createTempDir('efd-os-metadata-project-');
    try {
      const plan = createLegacyInstallPlan({
        sourceRoot: repoRoot,
        projectRoot,
        target: 'factory-droid',
        languages: ['common'],
      });

      const sourceRelPaths = plan.operations.map(op => op.sourceRelativePath);
      assert.ok(!sourceRelPaths.some(p => p.includes('.DS_Store')), 'should exclude .DS_Store from plan');
      assert.ok(!sourceRelPaths.some(p => p.includes('Thumbs.db')), 'should exclude Thumbs.db from plan');
      assert.ok(!sourceRelPaths.some(p => p.includes('._metadata')), 'should exclude ._metadata from plan');
      assert.ok(sourceRelPaths.some(p => p.includes('style.md')), 'should include style.md in plan');
    } finally {
      cleanup(projectRoot);
    }
  } finally {
    cleanup(repoRoot);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
