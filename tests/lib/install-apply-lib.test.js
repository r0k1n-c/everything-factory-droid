'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { applyInstallPlan } = require('../../scripts/lib/install/apply');
const { createInstallState, readInstallState } = require('../../scripts/lib/install-state');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function createCopyOperation(moduleId, sourceRoot, sourceRelativePath, destinationRoot) {
  return {
    kind: 'copy-file',
    moduleId,
    sourcePath: path.join(sourceRoot, sourceRelativePath),
    sourceRelativePath,
    destinationPath: path.join(destinationRoot, sourceRelativePath),
    strategy: 'preserve-relative-path',
    ownership: 'managed',
    scaffoldOnly: false,
  };
}

function createPlan(sourceRoot, projectRoot, operations) {
  const installStatePath = path.join(projectRoot, '.factory', 'install-state.json');
  return {
    adapter: {
      id: 'factory-droid-project',
      target: 'factory-droid',
      kind: 'project',
    },
    targetRoot: projectRoot,
    installRoot: path.join(projectRoot, '.factory'),
    installStatePath,
    operations,
    statePreview: createInstallState({
      adapter: {
        id: 'factory-droid-project',
        target: 'factory-droid',
        kind: 'project',
      },
      targetRoot: projectRoot,
      installStatePath,
      request: {
        profile: 'core',
        modules: ['platform-configs', 'hooks-runtime'],
        includeComponents: [],
        excludeComponents: [],
        legacyLanguages: [],
        legacyMode: false,
      },
      resolution: {
        selectedModules: ['platform-configs', 'hooks-runtime'],
        skippedModules: [],
      },
      operations,
      source: {
        repoVersion: '1.0.0',
        repoCommit: 'abc123',
        manifestVersion: 1,
      },
    }),
  };
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

console.log('\n=== Testing install/apply.js ===\n');
let passed = 0;
let failed = 0;

if (test('applyInstallPlan records settings as merge-json and updates hooks by id', () => {
  const tempDir = createTempDir('install-apply-lib-');
  const sourceRoot = path.join(tempDir, 'source');
  const projectRoot = path.join(tempDir, 'project');

  try {
    writeJson(path.join(sourceRoot, '.factory', 'settings.json'), {
      theme: 'dark',
      hooks: {
        PreToolUse: [
          {
            id: 'shared-hook',
            matcher: '*',
            hooks: [{ type: 'command', command: 'echo source' }],
          },
        ],
      },
    });
    writeJson(path.join(sourceRoot, 'hooks', 'hooks.json'), {
      hooks: {
        PreToolUse: [
          {
            id: 'shared-hook',
            matcher: '*',
            hooks: [{ type: 'command', command: 'echo updated' }],
          },
          {
            id: 'new-hook',
            matcher: 'Read',
            hooks: [{ type: 'command', command: 'echo new' }],
          },
        ],
      },
    });

    writeJson(path.join(projectRoot, '.factory', 'settings.json'), {
      model: 'claude-sonnet-4-6',
      hooks: {
        PreToolUse: [
          {
            id: 'shared-hook',
            matcher: '*',
            hooks: [{ type: 'command', command: 'echo stale' }],
          },
        ],
      },
    });

    const operations = [
      createCopyOperation('platform-configs', sourceRoot, '.factory/settings.json', projectRoot),
      createCopyOperation('hooks-runtime', sourceRoot, 'hooks/hooks.json', projectRoot),
    ];

    const result = applyInstallPlan(createPlan(sourceRoot, projectRoot, operations));
    const settings = JSON.parse(fs.readFileSync(path.join(projectRoot, '.factory', 'settings.json'), 'utf8'));
    const hooks = JSON.parse(fs.readFileSync(path.join(projectRoot, 'hooks', 'hooks.json'), 'utf8'));
    const state = readInstallState(path.join(projectRoot, '.factory', 'install-state.json'));
    const settingsOperation = result.operations.find(operation => operation.destinationPath === path.join(projectRoot, '.factory', 'settings.json'));
    const hooksOperation = result.operations.find(operation => operation.destinationPath === path.join(projectRoot, 'hooks', 'hooks.json'));

    assert.strictEqual(settings.model, 'claude-sonnet-4-6');
    assert.strictEqual(settings.theme, 'dark');
    assert.strictEqual(settings.hooks.PreToolUse[0].hooks[0].command, 'echo updated');
    assert.ok(settings.hooks.PreToolUse.some(entry => entry.id === 'new-hook'));
    assert.strictEqual(hooks.hooks.PreToolUse[0].hooks[0].command, 'echo updated');
    assert.ok(settingsOperation, 'Expected managed settings operation');
    assert.strictEqual(settingsOperation.kind, 'merge-json');
    assert.ok(hooksOperation, 'Expected managed hooks operation');
    assert.strictEqual(hooksOperation.kind, 'render-template');
    assert.ok(!result.operations.some(operation => (
      operation.kind === 'copy-file'
      && operation.destinationPath === path.join(projectRoot, '.factory', 'settings.json')
    )));
    assert.ok(!result.operations.some(operation => (
      operation.kind === 'copy-file'
      && operation.destinationPath === path.join(projectRoot, 'hooks', 'hooks.json')
    )));
    assert.strictEqual(
      state.operations.find(operation => operation.destinationPath === path.join(projectRoot, '.factory', 'settings.json')).kind,
      'merge-json'
    );
    assert.strictEqual(
      state.operations.find(operation => operation.destinationPath === path.join(projectRoot, 'hooks', 'hooks.json')).kind,
      'render-template'
    );
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('applyInstallPlan tolerates hooks.json without a hooks key', () => {
  const tempDir = createTempDir('install-apply-lib-');
  const sourceRoot = path.join(tempDir, 'source');
  const projectRoot = path.join(tempDir, 'project');

  try {
    writeJson(path.join(sourceRoot, '.factory', 'settings.json'), {
      model: 'claude-opus-4-6',
    });
    writeJson(path.join(sourceRoot, 'hooks', 'hooks.json'), {});

    const operations = [
      createCopyOperation('platform-configs', sourceRoot, '.factory/settings.json', projectRoot),
      createCopyOperation('hooks-runtime', sourceRoot, 'hooks/hooks.json', projectRoot),
    ];

    applyInstallPlan(createPlan(sourceRoot, projectRoot, operations));

    const settings = JSON.parse(fs.readFileSync(path.join(projectRoot, '.factory', 'settings.json'), 'utf8'));
    assert.strictEqual(settings.model, 'claude-opus-4-6');
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
