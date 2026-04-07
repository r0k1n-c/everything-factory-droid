'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'install-plan.js');

function loadInstallPlan(mocks = {}) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    let source = fs.readFileSync(SCRIPT, 'utf8');
    source = source.replace(
      /main\(\);\s*$/s,
      `module.exports = {
        main,
        parseArgs,
        __test: {
          showHelp,
          printProfiles,
          printModules,
          printComponents,
          printPlan
        }
      };\n`
    );

    const mod = new Module(SCRIPT, module);
    mod.filename = SCRIPT;
    mod.paths = Module._nodeModulePaths(path.dirname(SCRIPT));
    mod._compile(source, SCRIPT);
    return mod.exports;
  } finally {
    Module._load = originalLoad;
  }
}

function captureOutput(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  const stdout = [];
  const stderr = [];

  console.log = (...args) => stdout.push(args.join(' '));
  console.error = (...args) => stderr.push(args.join(' '));

  try {
    fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }

  return { stdout, stderr };
}

async function captureRuntime(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit;
  const originalExitCode = process.exitCode;
  const stdout = [];
  const stderr = [];
  let exitCode = null;
  let processExitCode;

  console.log = (...args) => stdout.push(args.join(' '));
  console.error = (...args) => stderr.push(args.join(' '));
  process.exitCode = undefined;
  process.exit = code => {
    exitCode = code;
    throw new Error(`EXIT:${code}`);
  };

  try {
    await fn();
    processExitCode = process.exitCode;
  } catch (error) {
    processExitCode = process.exitCode;
    if (!String(error.message).startsWith('EXIT:')) {
      throw error;
    }
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
    process.exitCode = originalExitCode;
  }

  return { stdout, stderr, exitCode, processExitCode };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n=== Testing install-plan.js direct coverage ===\n');

  let passed = 0;
  let failed = 0;

  if (await test('parseArgs accepts install-plan selectors and rejects unknown flags', async () => {
    const loaded = loadInstallPlan();
    const parsed = loaded.parseArgs([
      'node',
      'script',
      '--json',
      '--list-profiles',
      '--list-modules',
      '--list-components',
      '--family',
      'language',
      '--profile',
      'core',
      '--modules',
      'rules-core,skills-core',
      '--with',
      'lang:typescript',
      '--with',
      'capability:security',
      '--without',
      'rules:legacy',
      '--config',
      '/tmp/efd-install.json',
      '--target',
      'factory-droid'
    ]);

    assert.strictEqual(parsed.json, true);
    assert.strictEqual(parsed.listProfiles, true);
    assert.strictEqual(parsed.listModules, true);
    assert.strictEqual(parsed.listComponents, true);
    assert.strictEqual(parsed.family, 'language');
    assert.strictEqual(parsed.profileId, 'core');
    assert.deepStrictEqual(parsed.moduleIds, ['rules-core', 'skills-core']);
    assert.deepStrictEqual(parsed.includeComponentIds, ['lang:typescript', 'capability:security']);
    assert.deepStrictEqual(parsed.excludeComponentIds, ['rules:legacy']);
    assert.strictEqual(parsed.configPath, '/tmp/efd-install.json');
    assert.strictEqual(parsed.target, 'factory-droid');
    assert.throws(() => loaded.parseArgs(['node', 'script', '--bogus']), /Unknown argument/);
  })) passed += 1; else failed += 1;

  if (await test('help and printer helpers cover profiles, modules, components, and detailed plans', async () => {
    const loaded = loadInstallPlan();
    const result = captureOutput(() => {
      loaded.__test.showHelp();
      loaded.__test.printProfiles([
        { id: 'core', moduleCount: 2, description: 'Core defaults' }
      ]);
      loaded.__test.printModules([
        {
          id: 'rules-core',
          kind: 'rules',
          targets: ['factory-droid'],
          defaultInstall: true,
          cost: 'low',
          stability: 'stable',
          description: 'Core rules'
        }
      ]);
      loaded.__test.printComponents([
        {
          id: 'lang:typescript',
          family: 'language',
          targets: ['factory-droid'],
          moduleIds: ['rules-core'],
          description: 'TypeScript support'
        }
      ]);
      loaded.__test.printPlan({
        profileId: null,
        target: 'factory-droid',
        includedComponentIds: [],
        excludedComponentIds: ['rules:legacy'],
        requestedModuleIds: ['rules-core'],
        targetAdapterId: 'factory-droid-project',
        targetRoot: '/tmp/project',
        installStatePath: '/tmp/project/.factory/install-state.json',
        selectedModuleIds: ['rules-core'],
        selectedModules: [{ id: 'rules-core', kind: 'rules' }],
        skippedModuleIds: ['skills-core'],
        skippedModules: [{ id: 'skills-core', kind: 'skills' }],
        excludedModuleIds: ['rules:legacy'],
        excludedModules: [{ id: 'rules:legacy', kind: 'rules' }],
        operations: [
          {
            moduleId: 'rules-core',
            sourceRelativePath: 'rules/common/coding-style.md',
            destinationPath: '/tmp/project/rules/common/coding-style.md',
            strategy: 'copy'
          }
        ]
      });
      loaded.__test.printPlan({
        profileId: 'core',
        target: null,
        includedComponentIds: ['lang:typescript'],
        excludedComponentIds: [],
        requestedModuleIds: ['rules-core'],
        targetAdapterId: null,
        targetRoot: null,
        installStatePath: null,
        selectedModuleIds: ['rules-core'],
        selectedModules: [{ id: 'rules-core', kind: 'rules' }],
        skippedModuleIds: [],
        skippedModules: [],
        excludedModuleIds: [],
        excludedModules: [],
        operations: []
      });
    });

    const text = result.stdout.join('\n');
    assert.match(text, /Inspect EFD selective-install manifests/);
    assert.match(text, /Install profiles:/);
    assert.match(text, /Install modules:/);
    assert.match(text, /Install components:/);
    assert.match(text, /Adapter: factory-droid-project/);
    assert.match(text, /Skipped for target factory-droid \(1\):/);
    assert.match(text, /Excluded by selection \(1\):/);
    assert.match(text, /Operation plan \(1\):/);
    assert.match(text, /Target: \(all targets\)/);
  })) passed += 1; else failed += 1;

  if (await test('main routes list commands to the appropriate manifest helpers', async () => {
    const componentCalls = [];
    const loaded = loadInstallPlan({
      './lib/install-manifests': {
        listInstallProfiles: () => [{ id: 'core', moduleCount: 1, description: 'Core' }],
        listInstallModules: () => [{
          id: 'rules-core',
          kind: 'rules',
          targets: ['factory-droid'],
          defaultInstall: true,
          cost: 'low',
          stability: 'stable',
          description: 'Core rules'
        }],
        listInstallComponents: options => {
          componentCalls.push(options);
          return [{
            id: 'lang:typescript',
            family: 'language',
            targets: ['factory-droid'],
            moduleIds: ['rules-core'],
            description: 'TypeScript support'
          }];
        },
        resolveInstallPlan: () => {
          throw new Error('resolveInstallPlan should not be called for list commands');
        }
      },
      './lib/install/config': {
        findDefaultInstallConfigPath: () => null,
        loadInstallConfig: () => {
          throw new Error('loadInstallConfig should not be called for list commands');
        }
      },
      './lib/install/request': {
        normalizeInstallRequest: () => {
          throw new Error('normalizeInstallRequest should not be called for list commands');
        }
      }
    });

    const originalArgv = process.argv;
    try {
      process.argv = ['node', SCRIPT, '--list-profiles', '--json'];
      const profiles = await captureRuntime(() => loaded.main());
      assert.strictEqual(profiles.exitCode, null);
      assert.strictEqual(JSON.parse(profiles.stdout.join('\n')).profiles[0].id, 'core');

      process.argv = ['node', SCRIPT, '--list-modules'];
      const modules = await captureRuntime(() => loaded.main());
      assert.match(modules.stdout.join('\n'), /rules-core \[rules\]/);

      process.argv = ['node', SCRIPT, '--list-components', '--family', 'language', '--target', 'factory-droid'];
      const components = await captureRuntime(() => loaded.main());
      assert.match(components.stdout.join('\n'), /lang:typescript \[language\]/);
    } finally {
      process.argv = originalArgv;
    }

    assert.deepStrictEqual(componentCalls, [{ family: 'language', target: 'factory-droid' }]);
  })) passed += 1; else failed += 1;

  if (await test('main loads explicit and default configs, normalizes requests, and emits plan output', async () => {
    const loadedPaths = [];
    const normalizedRequests = [];
    const resolvedPlans = [];
    const defaultConfigPath = '/tmp/default-efd-install.json';
    const basePlan = {
      profileId: 'core',
      target: 'factory-droid',
      includedComponentIds: ['lang:typescript'],
      excludedComponentIds: [],
      requestedModuleIds: ['rules-core'],
      targetAdapterId: 'factory-droid-project',
      targetRoot: '/tmp/project',
      installStatePath: '/tmp/project/.factory/install-state.json',
      selectedModuleIds: ['rules-core'],
      selectedModules: [{ id: 'rules-core', kind: 'rules' }],
      skippedModuleIds: [],
      skippedModules: [],
      excludedModuleIds: [],
      excludedModules: [],
      operations: []
    };

    const loaded = loadInstallPlan({
      './lib/install-manifests': {
        listInstallProfiles: () => [],
        listInstallModules: () => [],
        listInstallComponents: () => [],
        resolveInstallPlan: request => {
          resolvedPlans.push(request);
          return {
            ...basePlan,
            profileId: request.profileId,
            target: request.target
          };
        }
      },
      './lib/install/config': {
        findDefaultInstallConfigPath: ({ cwd }) => {
          assert.strictEqual(cwd, process.cwd());
          return defaultConfigPath;
        },
        loadInstallConfig: (configPath, options) => {
          loadedPaths.push({ configPath, options });
          return {
            version: 1,
            profile: configPath.includes('explicit') ? 'explicit-profile' : 'default-profile',
            target: 'factory-droid'
          };
        }
      },
      './lib/install/request': {
        normalizeInstallRequest: request => {
          normalizedRequests.push(request);
          return {
            profileId: request.profileId || request.config.profile,
            moduleIds: request.moduleIds,
            includeComponentIds: request.includeComponentIds,
            excludeComponentIds: request.excludeComponentIds,
            target: request.target || request.config.target
          };
        }
      }
    });

    const originalArgv = process.argv;
    try {
      process.argv = ['node', SCRIPT, '--config', '/tmp/explicit-efd-install.json', '--json'];
      const explicit = await captureRuntime(() => loaded.main());
      const explicitPayload = JSON.parse(explicit.stdout.join('\n'));
      assert.strictEqual(explicitPayload.target, 'factory-droid');

      process.argv = ['node', SCRIPT];
      const implicit = await captureRuntime(() => loaded.main());
      assert.match(implicit.stdout.join('\n'), /Install plan:/);
      assert.match(implicit.stdout.join('\n'), /Profile: default-profile/);
    } finally {
      process.argv = originalArgv;
    }

    assert.deepStrictEqual(loadedPaths, [
      {
        configPath: '/tmp/explicit-efd-install.json',
        options: { cwd: process.cwd() }
      },
      {
        configPath: defaultConfigPath,
        options: { cwd: process.cwd() }
      }
    ]);

    assert.strictEqual(normalizedRequests.length, 2);
    assert.strictEqual(normalizedRequests[0].languages.length, 0);
    assert.strictEqual(normalizedRequests[0].config.profile, 'explicit-profile');
    assert.strictEqual(normalizedRequests[1].config.profile, 'default-profile');

    assert.deepStrictEqual(resolvedPlans, [
      {
        profileId: 'explicit-profile',
        moduleIds: [],
        includeComponentIds: [],
        excludeComponentIds: [],
        target: 'factory-droid'
      },
      {
        profileId: 'default-profile',
        moduleIds: [],
        includeComponentIds: [],
        excludeComponentIds: [],
        target: 'factory-droid'
      }
    ]);
  })) passed += 1; else failed += 1;

  if (await test('main reports planning failures on stderr and exits with code 1', async () => {
    const loaded = loadInstallPlan({
      './lib/install-manifests': {
        listInstallProfiles: () => [],
        listInstallModules: () => [],
        listInstallComponents: () => [],
        resolveInstallPlan: () => {
          throw new Error('manifest resolution failed');
        }
      },
      './lib/install/config': {
        findDefaultInstallConfigPath: () => null,
        loadInstallConfig: () => null
      },
      './lib/install/request': {
        normalizeInstallRequest: request => ({
          profileId: request.profileId,
          moduleIds: request.moduleIds,
          includeComponentIds: request.includeComponentIds,
          excludeComponentIds: request.excludeComponentIds,
          target: request.target
        })
      }
    });

    const originalArgv = process.argv;
    try {
      process.argv = ['node', SCRIPT, '--profile', 'core'];
      const result = await captureRuntime(() => loaded.main());
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr.join('\n'), /manifest resolution failed/);
    } finally {
      process.argv = originalArgv;
    }
  })) passed += 1; else failed += 1;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
