'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const MODULE_PATH = '../../scripts/lib/observer-sessions';

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

function cleanupTempDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function loadObserverSessions() {
  delete require.cache[require.resolve(MODULE_PATH)];
  return require(MODULE_PATH);
}

function withEnv(overrides, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function initGitRepo(repoDir, remoteUrl) {
  spawnSync('git', ['init'], { cwd: repoDir, stdio: 'pipe', encoding: 'utf8' });
  if (remoteUrl) {
    spawnSync('git', ['remote', 'add', 'origin', remoteUrl], {
      cwd: repoDir,
      stdio: 'pipe',
      encoding: 'utf8',
    });
  }
}

console.log('\n=== Testing observer-sessions direct coverage ===\n');

let passed = 0;
let failed = 0;

if (test('resolves global and registry-backed project contexts and manages lease files', () => {
  const homeDir = createTempDir('efd-observer-home-');
  const workDir = createTempDir('efd-observer-work-');
  const projectRoot = createTempDir('efd-observer-project-');

  try {
    withEnv(
      {
        HOME: homeDir,
        FACTORY_PROJECT_DIR: undefined,
        CLAUDE_PROJECT_DIR: undefined,
      },
      () => {
        const observer = loadObserverSessions();
        const globalContext = observer.resolveProjectContext(workDir);
        assert.strictEqual(globalContext.projectId, 'global');
        assert.strictEqual(globalContext.projectRoot, '');
        assert.strictEqual(globalContext.isGlobal, true);
        assert.ok(fs.existsSync(globalContext.projectDir));
        assert.deepStrictEqual(observer.listSessionLeases(globalContext), []);
        assert.strictEqual(observer.resolveSessionId(''), '');
        assert.strictEqual(observer.writeSessionLease(globalContext, ''), '');
        assert.strictEqual(observer.removeSessionLease(globalContext, ''), false);
      }
    );

    const homunculusDir = path.join(homeDir, '.factory', 'homunculus');
    const legacyProjectDir = path.join(homunculusDir, 'projects', 'project-123');
    fs.mkdirSync(homunculusDir, { recursive: true });
    fs.mkdirSync(legacyProjectDir, { recursive: true });
    fs.writeFileSync(path.join(legacyProjectDir, 'legacy.txt'), 'legacy observer data', 'utf8');
    fs.writeFileSync(
      path.join(homunculusDir, 'projects.json'),
      JSON.stringify({
        tracked: {
          id: 'project-123',
          root: projectRoot,
        },
      }),
      'utf8'
    );

    withEnv(
      {
        HOME: homeDir,
        FACTORY_PROJECT_DIR: homeDir,
        CLAUDE_PROJECT_DIR: projectRoot,
      },
      () => {
        const observer = loadObserverSessions();
        const context = observer.resolveProjectContext(workDir);
        const expectedId = path.basename(projectRoot);
        assert.strictEqual(context.projectId, expectedId);
        assert.strictEqual(context.projectRoot, path.resolve(projectRoot));
        assert.strictEqual(context.isGlobal, false);
        assert.ok(fs.existsSync(path.join(context.projectDir, 'legacy.txt')));
        assert.ok(!fs.existsSync(legacyProjectDir), 'legacy project dir should be migrated');

        const registry = JSON.parse(fs.readFileSync(path.join(homunculusDir, 'projects.json'), 'utf8'));
        assert.ok(registry[expectedId], 'registry should be updated to the basename project id');
        assert.ok(!registry['project-123'], 'legacy registry id should be removed');

        const leasePath = observer.writeSessionLease(context, 'session-123', {
          role: 'observer',
        });
        assert.ok(leasePath.endsWith(path.join('.observer-sessions', 'session-123.json')));
        assert.deepStrictEqual(observer.listSessionLeases(context), [leasePath]);

        const leasePayload = JSON.parse(fs.readFileSync(leasePath, 'utf8'));
        assert.strictEqual(leasePayload.sessionId, 'session-123');
        assert.strictEqual(leasePayload.role, 'observer');
        assert.strictEqual(observer.removeSessionLease(context, 'session-123'), true);
        assert.deepStrictEqual(observer.listSessionLeases(context), []);
      }
    );
  } finally {
    cleanupTempDir(homeDir);
    cleanupTempDir(workDir);
    cleanupTempDir(projectRoot);
  }
})) passed += 1; else failed += 1;

if (test('falls back to git root and computes project ids from sanitized remotes', () => {
  const homeDir = createTempDir('efd-observer-home-');
  const repoDir = createTempDir('efd-observer-repo-');

  try {
    initGitRepo(repoDir, 'https://user:secret@example.com/org/repo.git');
    const legacyId = crypto.createHash('sha256').update('https://example.com/org/repo.git').digest('hex').slice(0, 12);
    const legacyDir = path.join(homeDir, '.factory', 'homunculus', 'projects', legacyId);
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'observations.jsonl'), '{"legacy":true}\n', 'utf8');

    withEnv(
      {
        HOME: homeDir,
        FACTORY_PROJECT_DIR: path.join(homeDir, '.factory'),
        CLAUDE_PROJECT_DIR: undefined,
      },
      () => {
        const observer = loadObserverSessions();
        const context = observer.resolveProjectContext(repoDir);
        const expectedId = path.basename(repoDir);
        assert.strictEqual(context.projectId, expectedId);
        assert.strictEqual(fs.realpathSync(context.projectRoot), fs.realpathSync(repoDir));
        assert.strictEqual(context.isGlobal, false);
        assert.ok(fs.existsSync(path.join(context.projectDir, 'observations.jsonl')));
        assert.ok(!fs.existsSync(legacyDir), 'legacy hash-based project dir should be migrated');

        const registry = JSON.parse(fs.readFileSync(path.join(homeDir, '.factory', 'homunculus', 'projects.json'), 'utf8'));
        assert.strictEqual(registry[expectedId].remote, 'https://example.com/org/repo.git');
      }
    );
  } finally {
    cleanupTempDir(homeDir);
    cleanupTempDir(repoDir);
  }
})) passed += 1; else failed += 1;

if (test('migrates renamed basename storage when the old project root moved to a new name', () => {
  const homeDir = createTempDir('efd-observer-home-');
  const parentDir = createTempDir('efd-observer-parent-');
  const newProjectRoot = path.join(parentDir, 'renamed-project');
  const oldProjectRoot = path.join(parentDir, 'legacy-project');

  try {
    fs.mkdirSync(newProjectRoot, { recursive: true });

    const homunculusDir = path.join(homeDir, '.factory', 'homunculus');
    const legacyProjectDir = path.join(homunculusDir, 'projects', 'legacy-project');
    fs.mkdirSync(legacyProjectDir, { recursive: true });
    fs.writeFileSync(path.join(legacyProjectDir, 'observations.jsonl'), '{"legacy":true}\n', 'utf8');
    fs.writeFileSync(path.join(legacyProjectDir, 'project.json'), JSON.stringify({
      id: 'legacy-project',
      name: 'legacy-project',
      root: oldProjectRoot,
    }), 'utf8');
    fs.mkdirSync(homunculusDir, { recursive: true });
    fs.writeFileSync(
      path.join(homunculusDir, 'projects.json'),
      JSON.stringify({
        'legacy-project': {
          id: 'legacy-project',
          name: 'legacy-project',
          root: oldProjectRoot,
        },
      }),
      'utf8'
    );

    withEnv(
      {
        HOME: homeDir,
        CLAUDE_PROJECT_DIR: newProjectRoot,
      },
      () => {
        const observer = loadObserverSessions();
        const context = observer.resolveProjectContext(newProjectRoot);
        assert.strictEqual(context.projectId, 'renamed-project');
        assert.ok(fs.existsSync(path.join(context.projectDir, 'observations.jsonl')));
        assert.ok(!fs.existsSync(legacyProjectDir), 'renamed legacy project dir should be removed');

        const registry = JSON.parse(fs.readFileSync(path.join(homunculusDir, 'projects.json'), 'utf8'));
        assert.ok(registry['renamed-project'], 'registry should move to renamed basename');
        assert.ok(!registry['legacy-project'], 'old basename entry should be removed');
      }
    );
  } finally {
    cleanupTempDir(homeDir);
    cleanupTempDir(parentDir);
  }
})) passed += 1; else failed += 1;

if (test('suffixes basename project ids when the preferred folder belongs to another project', () => {
  const homeDir = createTempDir('efd-observer-home-');
  const parentA = createTempDir('efd-observer-parent-a-');
  const parentB = createTempDir('efd-observer-parent-b-');
  const repoA = path.join(parentA, 'shared-name');
  const repoB = path.join(parentB, 'shared-name');

  try {
    fs.mkdirSync(repoA, { recursive: true });
    fs.mkdirSync(repoB, { recursive: true });

    const existingProjectDir = path.join(homeDir, '.factory', 'homunculus', 'projects', 'shared-name');
    fs.mkdirSync(existingProjectDir, { recursive: true });
    fs.writeFileSync(path.join(existingProjectDir, 'project.json'), JSON.stringify({
      id: 'shared-name',
      name: 'shared-name',
      root: repoA,
    }), 'utf8');

    withEnv(
      {
        HOME: homeDir,
        FACTORY_PROJECT_DIR: path.join(homeDir, '.factory'),
        CLAUDE_PROJECT_DIR: repoB,
      },
      () => {
        const observer = loadObserverSessions();
        const context = observer.resolveProjectContext(repoB);
        assert.strictEqual(context.projectId, 'shared-name-2');
        assert.ok(fs.existsSync(path.join(homeDir, '.factory', 'homunculus', 'projects', 'shared-name-2', 'project.json')));
      }
    );
  } finally {
    cleanupTempDir(homeDir);
    cleanupTempDir(parentA);
    cleanupTempDir(parentB);
  }
})) passed += 1; else failed += 1;

if (test('does not auto-migrate ambiguous renamed basename candidates', () => {
  const homeDir = createTempDir('efd-observer-home-');
  const parentDir = createTempDir('efd-observer-parent-');
  const newProjectRoot = path.join(parentDir, 'new-name');
  const oldProjectA = path.join(parentDir, 'old-a');
  const oldProjectB = path.join(parentDir, 'old-b');

  try {
    fs.mkdirSync(newProjectRoot, { recursive: true });

    const homunculusDir = path.join(homeDir, '.factory', 'homunculus');
    const oldDirA = path.join(homunculusDir, 'projects', 'old-a');
    const oldDirB = path.join(homunculusDir, 'projects', 'old-b');
    fs.mkdirSync(oldDirA, { recursive: true });
    fs.mkdirSync(oldDirB, { recursive: true });
    fs.writeFileSync(path.join(oldDirA, 'project.json'), JSON.stringify({ id: 'old-a', name: 'old-a', root: oldProjectA }), 'utf8');
    fs.writeFileSync(path.join(oldDirB, 'project.json'), JSON.stringify({ id: 'old-b', name: 'old-b', root: oldProjectB }), 'utf8');
    fs.mkdirSync(homunculusDir, { recursive: true });
    fs.writeFileSync(path.join(homunculusDir, 'projects.json'), JSON.stringify({
      'old-a': { id: 'old-a', name: 'old-a', root: oldProjectA },
      'old-b': { id: 'old-b', name: 'old-b', root: oldProjectB },
    }), 'utf8');

    withEnv(
      {
        HOME: homeDir,
        CLAUDE_PROJECT_DIR: newProjectRoot,
      },
      () => {
        const observer = loadObserverSessions();
        const context = observer.resolveProjectContext(newProjectRoot);
        assert.strictEqual(context.projectId, 'new-name');
        assert.ok(fs.existsSync(path.join(homunculusDir, 'projects', 'new-name', 'project.json')));
        assert.ok(fs.existsSync(oldDirA), 'ambiguous old project A should not be auto-migrated');
        assert.ok(fs.existsSync(oldDirB), 'ambiguous old project B should not be auto-migrated');
      }
    );
  } finally {
    cleanupTempDir(homeDir);
    cleanupTempDir(parentDir);
  }
})) passed += 1; else failed += 1;

if (test('does not auto-migrate renamed basename storage while the old root still exists', () => {
  const homeDir = createTempDir('efd-observer-home-');
  const parentDir = createTempDir('efd-observer-parent-');
  const oldProjectRoot = path.join(parentDir, 'old-name');
  const newProjectRoot = path.join(parentDir, 'new-name');

  try {
    fs.mkdirSync(oldProjectRoot, { recursive: true });
    fs.mkdirSync(newProjectRoot, { recursive: true });

    const homunculusDir = path.join(homeDir, '.factory', 'homunculus');
    const oldProjectDir = path.join(homunculusDir, 'projects', 'old-name');
    fs.mkdirSync(oldProjectDir, { recursive: true });
    fs.writeFileSync(path.join(oldProjectDir, 'project.json'), JSON.stringify({
      id: 'old-name',
      name: 'old-name',
      root: oldProjectRoot,
    }), 'utf8');

    withEnv(
      {
        HOME: homeDir,
        CLAUDE_PROJECT_DIR: newProjectRoot,
      },
      () => {
        const observer = loadObserverSessions();
        const context = observer.resolveProjectContext(newProjectRoot);
        assert.strictEqual(context.projectId, 'new-name');
        assert.ok(fs.existsSync(oldProjectDir), 'existing old root should block auto-migration');
      }
    );
  } finally {
    cleanupTempDir(homeDir);
    cleanupTempDir(parentDir);
  }
})) passed += 1; else failed += 1;

if (test('does not auto-migrate renamed basename storage when remotes differ', () => {
  const homeDir = createTempDir('efd-observer-home-');
  const parentDir = createTempDir('efd-observer-parent-');
  const newProjectRoot = path.join(parentDir, 'new-name');
  const oldProjectRoot = path.join(parentDir, 'old-name');

  try {
    fs.mkdirSync(newProjectRoot, { recursive: true });
    initGitRepo(newProjectRoot, 'https://example.com/org/new-repo.git');

    const homunculusDir = path.join(homeDir, '.factory', 'homunculus');
    const oldProjectDir = path.join(homunculusDir, 'projects', 'old-name');
    fs.mkdirSync(oldProjectDir, { recursive: true });
    fs.writeFileSync(path.join(oldProjectDir, 'project.json'), JSON.stringify({
      id: 'old-name',
      name: 'old-name',
      root: oldProjectRoot,
      remote: 'https://example.com/org/other-repo.git',
    }), 'utf8');

    withEnv(
      {
        HOME: homeDir,
        CLAUDE_PROJECT_DIR: newProjectRoot,
      },
      () => {
        const observer = loadObserverSessions();
        const context = observer.resolveProjectContext(newProjectRoot);
        assert.strictEqual(context.projectId, 'new-name');
        assert.ok(fs.existsSync(oldProjectDir), 'remote mismatch should block auto-migration');
      }
    );
  } finally {
    cleanupTempDir(homeDir);
    cleanupTempDir(parentDir);
  }
})) passed += 1; else failed += 1;

if (test('stopObserverForContext handles missing, invalid, dead, failing, and live pids', () => {
  const projectDir = createTempDir('efd-observer-stop-');
  const context = { projectDir };
  const pidFile = path.join(projectDir, '.observer.pid');
  const counterFile = path.join(projectDir, '.observer-signal-counter');
  const originalKill = process.kill;

  try {
    const observer = loadObserverSessions();

    assert.strictEqual(observer.stopObserverForContext(context), false);

    fs.writeFileSync(pidFile, 'abc', 'utf8');
    assert.strictEqual(observer.stopObserverForContext(context), false);
    assert.ok(!fs.existsSync(pidFile));

    fs.writeFileSync(pidFile, '123', 'utf8');
    process.kill = (pid, signal) => {
      if (signal === 0) {
        throw new Error(`missing pid ${pid}`);
      }
      throw new Error('unexpected');
    };
    assert.strictEqual(observer.stopObserverForContext(context), false);
    assert.ok(!fs.existsSync(pidFile));

    fs.writeFileSync(pidFile, '456', 'utf8');
    process.kill = (pid, signal) => {
      if (signal === 0) {
        return undefined;
      }
      throw new Error(`cannot terminate ${pid}`);
    };
    assert.strictEqual(observer.stopObserverForContext(context), false);
    assert.ok(fs.existsSync(pidFile));

    fs.writeFileSync(counterFile, '1', 'utf8');
    process.kill = () => undefined;
    assert.strictEqual(observer.stopObserverForContext(context), true);
    assert.ok(!fs.existsSync(pidFile));
    assert.ok(!fs.existsSync(counterFile));
  } finally {
    process.kill = originalKill;
    cleanupTempDir(projectDir);
  }
})) passed += 1; else failed += 1;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
