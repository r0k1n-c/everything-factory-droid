'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'uninstall.js');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function loadUninstallCli(mocks = {}) {
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
          printHuman
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
  console.log('\n=== Testing uninstall.js direct coverage ===\n');

  let passed = 0;
  let failed = 0;

  if (await test('parseArgs accepts uninstall flags and rejects unknown arguments', async () => {
    const loaded = loadUninstallCli();
    const parsed = loaded.parseArgs([
      'node',
      'script',
      '--target',
      'factory-droid',
      '--target',
      'codex',
      '--dry-run',
      '--json'
    ]);

    assert.deepStrictEqual(parsed.targets, ['factory-droid', 'codex']);
    assert.strictEqual(parsed.dryRun, true);
    assert.strictEqual(parsed.json, true);
    assert.throws(() => loaded.parseArgs(['node', 'script', '--wat']), /Unknown argument/);
  })) passed += 1; else failed += 1;

  if (await test('showHelp and printHuman cover empty, error, dry-run, and uninstall summaries', async () => {
    const loaded = loadUninstallCli();
    const help = await captureRuntime(() => loaded.__test.showHelp(0));
    assert.strictEqual(help.exitCode, 0);
    assert.match(help.stdout.join('\n'), /Usage: node scripts\/uninstall\.js/);

    const printed = captureOutput(() => {
      loaded.__test.printHuman({
        dryRun: false,
        results: [],
        summary: {
          checkedCount: 0,
          uninstalledCount: 0,
          errorCount: 0
        }
      });
      loaded.__test.printHuman({
        dryRun: false,
        results: [
          {
            adapter: { id: 'factory-droid-project' },
            status: 'error',
            installStatePath: '/tmp/project/.factory/install-state.json',
            error: 'permission denied'
          }
        ],
        summary: {
          checkedCount: 1,
          uninstalledCount: 0,
          errorCount: 1
        }
      });
      loaded.__test.printHuman({
        dryRun: true,
        results: [
          {
            adapter: { id: 'factory-droid-project' },
            status: 'planned',
            installStatePath: '/tmp/project/.factory/install-state.json',
            plannedRemovals: ['a', 'b'],
            removedPaths: []
          }
        ],
        summary: {
          checkedCount: 1,
          plannedRemovalCount: 2,
          errorCount: 0
        }
      });
      loaded.__test.printHuman({
        dryRun: false,
        results: [
          {
            adapter: { id: 'factory-droid-project' },
            status: 'removed',
            installStatePath: '/tmp/project/.factory/install-state.json',
            plannedRemovals: [],
            removedPaths: ['a']
          }
        ],
        summary: {
          checkedCount: 1,
          uninstalledCount: 1,
          errorCount: 0
        }
      });
    });

    const text = printed.stdout.join('\n');
    assert.match(text, /No EFD install-state files found/);
    assert.match(text, /Error: permission denied/);
    assert.match(text, /Planned removals: 2/);
    assert.match(text, /Removed paths: 1/);
    assert.match(text, /Summary: checked=1, planned=2, errors=0/);
    assert.match(text, /Summary: checked=1, uninstalled=1, errors=0/);
  })) passed += 1; else failed += 1;

  if (await test('main passes cwd and HOME into uninstallInstalledStates, emits JSON, and sets process.exitCode for errors', async () => {
    const calls = [];
    const loaded = loadUninstallCli({
      './lib/install-lifecycle': {
        uninstallInstalledStates: options => {
          calls.push(options);
          return {
            dryRun: true,
            results: [
              {
                adapter: { id: 'factory-droid-project' },
                status: 'error',
                installStatePath: '/tmp/project/.factory/install-state.json',
                error: 'broken state file',
                plannedRemovals: [],
                removedPaths: []
              }
            ],
            summary: {
              checkedCount: 1,
              plannedRemovalCount: 0,
              uninstalledCount: 0,
              errorCount: 1
            }
          };
        }
      },
      './lib/install-manifests': {
        SUPPORTED_INSTALL_TARGETS: ['factory-droid', 'codex']
      }
    });

    const workingDir = createTempDir('efd-uninstall-direct-');
    const previousCwd = process.cwd();
    const originalArgv = process.argv;
    const originalHome = process.env.HOME;
    let expectedProjectRoot;

    try {
      process.chdir(workingDir);
      expectedProjectRoot = process.cwd();
      process.env.HOME = '/tmp/uninstall-home';
      process.argv = ['node', SCRIPT, '--target', 'factory-droid', '--target', 'codex', '--dry-run', '--json'];

      const result = await captureRuntime(() => loaded.main());
      assert.strictEqual(result.exitCode, null);
      assert.strictEqual(result.processExitCode, 1);
      const payload = JSON.parse(result.stdout.join('\n'));
      assert.strictEqual(payload.summary.errorCount, 1);
      assert.strictEqual(payload.dryRun, true);
    } finally {
      process.chdir(previousCwd);
      process.argv = originalArgv;
      if (originalHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = originalHome;
      }
      cleanup(workingDir);
    }

    assert.deepStrictEqual(calls, [
      {
        homeDir: '/tmp/uninstall-home',
        projectRoot: expectedProjectRoot,
        targets: ['factory-droid', 'codex'],
        dryRun: true
      }
    ]);
  })) passed += 1; else failed += 1;

  if (await test('main prints human summaries for successful uninstalls without setting process.exitCode', async () => {
    const loaded = loadUninstallCli({
      './lib/install-lifecycle': {
        uninstallInstalledStates: () => ({
          dryRun: false,
          results: [
            {
              adapter: { id: 'factory-droid-project' },
              status: 'removed',
              installStatePath: '/tmp/project/.factory/install-state.json',
              plannedRemovals: [],
              removedPaths: ['/tmp/project/rules/common/coding-style.md']
            }
          ],
          summary: {
            checkedCount: 1,
            plannedRemovalCount: 0,
            uninstalledCount: 1,
            errorCount: 0
          }
        })
      },
      './lib/install-manifests': {
        SUPPORTED_INSTALL_TARGETS: ['factory-droid']
      }
    });

    const originalArgv = process.argv;
    try {
      process.argv = ['node', SCRIPT, '--target', 'factory-droid'];
      const result = await captureRuntime(() => loaded.main());
      assert.strictEqual(result.exitCode, null);
      assert.strictEqual(result.processExitCode, 0);
      assert.match(result.stdout.join('\n'), /Uninstall summary:/);
      assert.match(result.stdout.join('\n'), /Removed paths: 1/);
    } finally {
      process.argv = originalArgv;
    }
  })) passed += 1; else failed += 1;

  if (await test('main reports lifecycle failures on stderr and exits with code 1', async () => {
    const loaded = loadUninstallCli({
      './lib/install-lifecycle': {
        uninstallInstalledStates: () => {
          throw new Error('lifecycle exploded');
        }
      },
      './lib/install-manifests': {
        SUPPORTED_INSTALL_TARGETS: ['factory-droid']
      }
    });

    const originalArgv = process.argv;
    try {
      process.argv = ['node', SCRIPT];
      const result = await captureRuntime(() => loaded.main());
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr.join('\n'), /lifecycle exploded/);
    } finally {
      process.argv = originalArgv;
    }
  })) passed += 1; else failed += 1;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
