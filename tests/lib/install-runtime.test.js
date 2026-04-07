'use strict';

const assert = require('assert');
const Module = require('module');

const RUNTIME_PATH = require.resolve('../../scripts/lib/install/runtime');

function loadRuntime(stubbedExecutor) {
  const originalLoad = Module._load;
  delete require.cache[RUNTIME_PATH];

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '../install-executor') {
      return stubbedExecutor;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(RUNTIME_PATH);
  } finally {
    Module._load = originalLoad;
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${error.message}`);
    return false;
  }
}

async function run() {
  console.log('\n=== Testing install/runtime.js direct coverage ===\n');
  let passed = 0;
  let failed = 0;

  await test('createInstallPlanFromRequest rejects missing requests', () => {
    const runtime = loadRuntime({
      createLegacyCompatInstallPlan: () => null,
      createLegacyInstallPlan: () => null,
      createManifestInstallPlan: () => null,
    });

    assert.throws(() => runtime.createInstallPlanFromRequest(null), /normalized install request/);
  }) ? passed++ : failed++;

  await test('createInstallPlanFromRequest forwards manifest requests', () => {
    const calls = [];
    const runtime = loadRuntime({
      createManifestInstallPlan: options => {
        calls.push({ mode: 'manifest', options });
        return { mode: 'manifest', options };
      },
      createLegacyCompatInstallPlan: () => {
        throw new Error('unexpected legacy-compat call');
      },
      createLegacyInstallPlan: () => {
        throw new Error('unexpected legacy call');
      },
    });

    const result = runtime.createInstallPlanFromRequest(
      {
        mode: 'manifest',
        target: 'factory-droid',
        profileId: 'core',
        moduleIds: ['commands'],
        includeComponentIds: ['hooks'],
        excludeComponentIds: ['docs'],
      },
      {
        projectRoot: '/tmp/project',
        homeDir: '/tmp/home',
        sourceRoot: '/tmp/source',
      }
    );

    assert.strictEqual(calls.length, 1);
    assert.deepStrictEqual(result, {
      mode: 'manifest',
      options: {
        target: 'factory-droid',
        profileId: 'core',
        moduleIds: ['commands'],
        includeComponentIds: ['hooks'],
        excludeComponentIds: ['docs'],
        projectRoot: '/tmp/project',
        homeDir: '/tmp/home',
        sourceRoot: '/tmp/source',
      }
    });
  }) ? passed++ : failed++;

  await test('createInstallPlanFromRequest forwards legacy-compat rulesDir', () => {
    const runtime = loadRuntime({
      createManifestInstallPlan: () => {
        throw new Error('unexpected manifest call');
      },
      createLegacyCompatInstallPlan: options => ({ mode: 'legacy-compat', options }),
      createLegacyInstallPlan: () => {
        throw new Error('unexpected legacy call');
      },
    });

    const result = runtime.createInstallPlanFromRequest(
      {
        mode: 'legacy-compat',
        target: 'factory-droid',
        legacyLanguages: ['typescript'],
      },
      {
        projectRoot: '/tmp/project',
        homeDir: '/tmp/home',
        rulesDir: '/tmp/rules',
        sourceRoot: '/tmp/source',
      }
    );

    assert.deepStrictEqual(result, {
      mode: 'legacy-compat',
      options: {
        target: 'factory-droid',
        legacyLanguages: ['typescript'],
        projectRoot: '/tmp/project',
        homeDir: '/tmp/home',
        rulesDir: '/tmp/rules',
        sourceRoot: '/tmp/source',
      }
    });
  }) ? passed++ : failed++;

  await test('createInstallPlanFromRequest forwards legacy rulesDir', () => {
    const runtime = loadRuntime({
      createManifestInstallPlan: () => {
        throw new Error('unexpected manifest call');
      },
      createLegacyCompatInstallPlan: () => {
        throw new Error('unexpected legacy-compat call');
      },
      createLegacyInstallPlan: options => ({ mode: 'legacy', options }),
    });

    const result = runtime.createInstallPlanFromRequest(
      {
        mode: 'legacy',
        target: 'factory-droid',
        languages: ['typescript'],
      },
      {
        projectRoot: '/tmp/project',
        homeDir: '/tmp/home',
        rulesDir: '/tmp/rules',
        sourceRoot: '/tmp/source',
      }
    );

    assert.deepStrictEqual(result, {
      mode: 'legacy',
      options: {
        target: 'factory-droid',
        languages: ['typescript'],
        projectRoot: '/tmp/project',
        homeDir: '/tmp/home',
        rulesDir: '/tmp/rules',
        sourceRoot: '/tmp/source',
      }
    });
  }) ? passed++ : failed++;

  await test('createInstallPlanFromRequest rejects unsupported modes', () => {
    const runtime = loadRuntime({
      createManifestInstallPlan: () => null,
      createLegacyCompatInstallPlan: () => null,
      createLegacyInstallPlan: () => null,
    });

    assert.throws(
      () => runtime.createInstallPlanFromRequest({ mode: 'unknown' }),
      /Unsupported install request mode: unknown/
    );
  }) ? passed++ : failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
