'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'status.js');

function loadStatusCli(mocks = {}) {
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
      /module\.exports = \{\s*main,\s*parseArgs,\s*\};\s*$/s,
      `module.exports = {
        main,
        parseArgs,
        __test: {
          showHelp,
          printActiveSessions,
          printSkillRuns,
          printInstallHealth,
          printGovernance,
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

function runCli(args = [], options = {}) {
  return spawnSync('node', [SCRIPT, ...args], {
    encoding: 'utf8',
    cwd: options.cwd || process.cwd(),
    env: {
      ...process.env,
      ...(options.env || {})
    }
  });
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
  console.log('\n=== Testing status.js direct coverage ===\n');

  let passed = 0;
  let failed = 0;

  if (await test('parseArgs handles supported flags, and the CLI covers help and unknown-argument exits', async () => {
    const loaded = loadStatusCli();
    const parsed = loaded.parseArgs(['node', 'script', '--db', '/tmp/state.db', '--json', '--limit', '8']);
    assert.strictEqual(parsed.dbPath, '/tmp/state.db');
    assert.strictEqual(parsed.json, true);
    assert.strictEqual(parsed.limit, '8');
    assert.throws(() => loaded.parseArgs(['node', 'script', '--wat']), /Unknown argument/);

    const helpResult = runCli(['--help']);
    assert.strictEqual(helpResult.status, 0, helpResult.stderr);
    assert.match(helpResult.stdout, /Usage: node scripts\/status\.js/);

    const unknownResult = runCli(['--wat']);
    assert.strictEqual(unknownResult.status, 1);
    assert.match(unknownResult.stderr, /Unknown argument: --wat/);
  })) passed += 1; else failed += 1;

  if (await test('formatter helpers cover empty sections, fallback strings, and full human output', async () => {
    const loaded = loadStatusCli();

    const empty = captureOutput(() => {
      loaded.__test.printActiveSessions({ activeCount: 0, sessions: [] });
      loaded.__test.printSkillRuns({
        windowSize: 20,
        summary: {
          successCount: 0,
          failureCount: 0,
          unknownCount: 0,
          successRate: null,
          failureRate: null
        },
        recent: []
      });
      loaded.__test.printInstallHealth({
        status: 'unknown',
        totalCount: 0,
        healthyCount: 0,
        warningCount: 0,
        installations: []
      });
      loaded.__test.printGovernance({ pendingCount: 0, events: [] });
    });

    const emptyText = empty.stdout.join('\n');
    assert.match(emptyText, /Active sessions: 0/);
    assert.match(emptyText, /- none/);
    assert.match(emptyText, /Success rate: n\/a/);
    assert.match(emptyText, /Installations: none/);
    assert.match(emptyText, /Pending governance events: 0/);

    const human = captureOutput(() => {
      loaded.__test.printHuman({
        dbPath: '/tmp/efd/state.db',
        activeSessions: {
          activeCount: 1,
          sessions: [
            {
              id: 'session-1',
              harness: 'droid',
              adapterId: 'dmux-tmux',
              state: 'active',
              repoRoot: null,
              startedAt: null,
              workerCount: 3
            }
          ]
        },
        skillRuns: {
          windowSize: 10,
          summary: {
            successCount: 4,
            failureCount: 1,
            unknownCount: 2,
            successRate: 57,
            failureRate: 14
          },
          recent: [
            { id: 'skill-1', outcome: 'success', skillId: 'planner', skillVersion: '1.0.0' }
          ]
        },
        installHealth: {
          status: 'warning',
          totalCount: 1,
          healthyCount: 0,
          warningCount: 1,
          installations: [
            {
              targetId: 'factory-droid-project',
              status: 'warning',
              targetRoot: '/tmp/project',
              profile: null,
              moduleCount: 6,
              sourceVersion: null
            }
          ]
        },
        governance: {
          pendingCount: 1,
          events: [
            {
              id: 'gov-1',
              eventType: 'policy-review-required',
              sessionId: null,
              createdAt: '2026-04-06T12:00:00.000Z'
            }
          ]
        }
      });
    });

    const humanText = human.stdout.join('\n');
    assert.match(humanText, /EFD status/);
    assert.match(humanText, /Database: \/tmp\/efd\/state\.db/);
    assert.match(humanText, /Repo: \(unknown\)/);
    assert.match(humanText, /Success rate: 57%/);
    assert.match(humanText, /Profile: \(custom\)/);
    assert.match(humanText, /Source version: \(unknown\)/);
    assert.match(humanText, /Session: \(none\)/);
  })) passed += 1; else failed += 1;

  if (await test('main renders both human and JSON output through the state store stub', async () => {
    const calls = [];
    let closeCount = 0;
    const loaded = loadStatusCli({
      './lib/state-store': {
        createStateStore: async options => {
          calls.push(options);
          return {
            dbPath: '/tmp/custom.db',
            getStatus(params) {
              assert.deepStrictEqual(params, {
                activeLimit: '6',
                recentSkillRunLimit: 20,
                pendingLimit: '6'
              });
              return {
                activeSessions: {
                  activeCount: 1,
                  sessions: [
                    {
                      id: 'session-1',
                      harness: 'droid',
                      adapterId: 'factory-history',
                      state: 'active',
                      repoRoot: '/tmp/repo',
                      startedAt: '2026-04-06T12:00:00.000Z',
                      workerCount: 2
                    }
                  ]
                },
                skillRuns: {
                  windowSize: 20,
                  summary: {
                    successCount: 1,
                    failureCount: 0,
                    unknownCount: 0,
                    successRate: 100,
                    failureRate: 0
                  },
                  recent: []
                },
                installHealth: {
                  status: 'healthy',
                  totalCount: 1,
                  healthyCount: 1,
                  warningCount: 0,
                  installations: []
                },
                governance: {
                  pendingCount: 0,
                  events: []
                }
              };
            },
            close() {
              closeCount += 1;
            }
          };
        }
      }
    });

    const originalArgv = process.argv;
    const originalHome = process.env.HOME;

    try {
      process.env.HOME = '/tmp/status-cli-home';

      process.argv = ['node', SCRIPT, '--db', '/tmp/custom.db', '--limit', '6'];
      const human = await captureRuntime(() => loaded.main());
      assert.strictEqual(human.exitCode, null);
      assert.match(human.stdout.join('\n'), /Active sessions: 1/);
      assert.match(human.stdout.join('\n'), /Install health: healthy/);

      process.argv = ['node', SCRIPT, '--db', '/tmp/custom.db', '--limit', '6', '--json'];
      const json = await captureRuntime(() => loaded.main());
      assert.strictEqual(json.exitCode, null);
      const payload = JSON.parse(json.stdout.join('\n'));
      assert.strictEqual(payload.dbPath, '/tmp/custom.db');
      assert.strictEqual(payload.activeSessions.activeCount, 1);
    } finally {
      process.argv = originalArgv;
      if (originalHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = originalHome;
      }
    }

    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(calls[0], {
      dbPath: '/tmp/custom.db',
      homeDir: '/tmp/status-cli-home'
    });
    assert.strictEqual(closeCount, 2);
  })) passed += 1; else failed += 1;

  if (await test('main reports store errors, exits with code 1, and still closes the store', async () => {
    let closeCount = 0;
    const loaded = loadStatusCli({
      './lib/state-store': {
        createStateStore: async () => ({
          dbPath: '/tmp/broken.db',
          getStatus() {
            throw new Error('status exploded');
          },
          close() {
            closeCount += 1;
          }
        })
      }
    });

    const originalArgv = process.argv;
    try {
      process.argv = ['node', SCRIPT];
      const result = await captureRuntime(() => loaded.main());
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr.join('\n'), /status exploded/);
    } finally {
      process.argv = originalArgv;
    }

    assert.strictEqual(closeCount, 1);
  })) passed += 1; else failed += 1;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
