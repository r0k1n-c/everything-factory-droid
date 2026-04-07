'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'sessions-cli.js');

function loadSessionsCli(mocks = {}) {
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
          printSessionList,
          printWorkers,
          printSkillRuns,
          printDecisions,
          printSessionDetail
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

  console.log = (...args) => stdout.push(args.join(' '));
  console.error = (...args) => stderr.push(args.join(' '));
  process.exitCode = undefined;
  process.exit = code => {
    exitCode = code;
    throw new Error(`EXIT:${code}`);
  };

  try {
    await fn();
  } catch (error) {
    if (!String(error.message).startsWith('EXIT:')) {
      throw error;
    }
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
    process.exitCode = originalExitCode;
  }

  return { stdout, stderr, exitCode };
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
  console.log('\n=== Testing sessions-cli.js direct coverage ===\n');

  let passed = 0;
  let failed = 0;

  if (await test('parseArgs handles flags, and the CLI covers help and unknown-argument exits', async () => {
    const loaded = loadSessionsCli();
    const parsed = loaded.parseArgs(['node', 'script', 'session-123', '--db', '/tmp/state.db', '--json', '--limit', '25']);
    assert.strictEqual(parsed.sessionId, 'session-123');
    assert.strictEqual(parsed.dbPath, '/tmp/state.db');
    assert.strictEqual(parsed.json, true);
    assert.strictEqual(parsed.limit, '25');
    assert.throws(() => loaded.parseArgs(['node', 'script', '--wat']), /Unknown argument/);

    const helpResult = runCli(['--help']);
    assert.strictEqual(helpResult.status, 0, helpResult.stderr);
    assert.match(helpResult.stdout, /Usage: node scripts\/sessions-cli\.js/);

    const unknownResult = runCli(['--wat']);
    assert.strictEqual(unknownResult.status, 1);
    assert.match(unknownResult.stderr, /Unknown argument: --wat/);
  })) passed += 1; else failed += 1;

  if (await test('formatter helpers cover empty collections, fallbacks, and populated detail output', async () => {
    const loaded = loadSessionsCli();

    const empty = captureOutput(() => {
      loaded.__test.printSessionList({ sessions: [], totalCount: 0 });
      loaded.__test.printWorkers([]);
      loaded.__test.printSkillRuns([]);
      loaded.__test.printDecisions([]);
    });

    assert.match(empty.stdout.join('\n'), /No sessions found\./);
    assert.match(empty.stdout.join('\n'), /Workers: 0/);
    assert.match(empty.stdout.join('\n'), /Skill runs: 0/);
    assert.match(empty.stdout.join('\n'), /Decisions: 0/);

    const detail = captureOutput(() => {
      loaded.__test.printSessionDetail({
        session: {
          id: 'session-1',
          harness: 'droid',
          adapterId: 'factory-history',
          state: 'active',
          repoRoot: null,
          startedAt: null,
          endedAt: null
        },
        workers: [
          {
            id: null,
            label: null,
            state: null,
            branch: null,
            worktree: null
          }
        ],
        skillRuns: [
          {
            id: 'skill-1',
            outcome: 'success',
            skillId: 'planner',
            skillVersion: '1.0.0',
            taskDescription: 'Plan coverage',
            durationMs: null
          }
        ],
        decisions: [
          {
            id: 'decision-1',
            status: 'accepted',
            title: 'Keep wrapper lightweight',
            alternatives: []
          }
        ]
      });
    });

    const output = detail.stdout.join('\n');
    assert.match(output, /Session: session-1/);
    assert.match(output, /Repo: \(unknown\)/);
    assert.match(output, /Ended: \(active\)/);
    assert.match(output, /- \(unknown\) unknown/);
    assert.match(output, /Duration: \(unknown\) ms/);
    assert.match(output, /Alternatives: \(none\)/);
  })) passed += 1; else failed += 1;

  if (await test('main renders human lists and JSON detail views with the state store stub', async () => {
    const calls = [];
    let closeCount = 0;
    const loaded = loadSessionsCli({
      './lib/state-store': {
        createStateStore: async options => {
          calls.push(options);
          return {
            listRecentSessions(params) {
              assert.deepStrictEqual(params, { limit: '7' });
              return {
                sessions: [
                  {
                    id: 'session-list',
                    harness: 'droid',
                    adapterId: 'dmux-tmux',
                    state: 'active',
                    repoRoot: '/tmp/repo',
                    startedAt: '2026-04-06T10:00:00.000Z',
                    endedAt: null,
                    workerCount: 2
                  }
                ],
                totalCount: 1
              };
            },
            getSessionDetail(sessionId) {
              assert.strictEqual(sessionId, 'session-detail');
              return {
                session: {
                  id: sessionId,
                  harness: 'droid',
                  adapterId: 'factory-history',
                  state: 'recorded',
                  repoRoot: '/tmp/repo',
                  startedAt: '2026-04-06T09:00:00.000Z',
                  endedAt: '2026-04-06T09:30:00.000Z'
                },
                workers: [],
                skillRuns: [],
                decisions: []
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
      process.env.HOME = '/tmp/sessions-cli-home';

      process.argv = ['node', SCRIPT, '--db', '/tmp/custom.db', '--limit', '7'];
      const human = await captureRuntime(() => loaded.main());
      assert.strictEqual(human.exitCode, null);
      assert.match(human.stdout.join('\n'), /Recent sessions:/);
      assert.match(human.stdout.join('\n'), /session-list/);

      process.argv = ['node', SCRIPT, 'session-detail', '--db', '/tmp/custom.db', '--json'];
      const json = await captureRuntime(() => loaded.main());
      assert.strictEqual(json.exitCode, null);
      const payload = JSON.parse(json.stdout.join('\n'));
      assert.strictEqual(payload.session.id, 'session-detail');
      assert.deepStrictEqual(payload.workers, []);
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
      homeDir: '/tmp/sessions-cli-home'
    });
    assert.strictEqual(closeCount, 2);
  })) passed += 1; else failed += 1;

  if (await test('main reports missing sessions, exits with code 1, and still closes the store', async () => {
    let closeCount = 0;
    const loaded = loadSessionsCli({
      './lib/state-store': {
        createStateStore: async () => ({
          listRecentSessions() {
            throw new Error('unexpected list call');
          },
          getSessionDetail() {
            return null;
          },
          close() {
            closeCount += 1;
          }
        })
      }
    });

    const originalArgv = process.argv;
    try {
      process.argv = ['node', SCRIPT, 'missing-session'];
      const result = await captureRuntime(() => loaded.main());
      assert.strictEqual(result.exitCode, 1);
      assert.match(result.stderr.join('\n'), /Session not found: missing-session/);
    } finally {
      process.argv = originalArgv;
    }

    assert.strictEqual(closeCount, 1);
  })) passed += 1; else failed += 1;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
