/**
 * Tests for ck path defaults
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

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

function initGitRepo(repoDir, remoteUrl) {
  let result = spawnSync('git', ['init'], {
    cwd: repoDir,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);

  result = spawnSync('git', ['remote', 'add', 'origin', remoteUrl], {
    cwd: repoDir,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
}

function runTests() {
  console.log('\n=== Testing ck path defaults ===\n');

  let passed = 0;
  let failed = 0;

  const repoRoot = path.resolve(__dirname, '..', '..');
  const sharedPath = path.join(repoRoot, 'skills', 'ck', 'commands', 'shared.mjs');
  const savePath = path.join(repoRoot, 'skills', 'ck', 'commands', 'save.mjs');
  const sessionStartPath = path.join(repoRoot, 'skills', 'ck', 'hooks', 'session-start.mjs');

  if (test('shared.mjs defaults ck storage paths to .factory', () => {
    const homeDir = createTempDir('ck-home-');

    try {
      const script = `
        const { pathToFileURL } = require('url');
        (async () => {
          const mod = await import(pathToFileURL(${JSON.stringify(sharedPath)}));
          process.stdout.write(JSON.stringify({
            ckHome: mod.CK_HOME,
            skillFile: mod.SKILL_FILE,
            nativeMemoryDir: mod.nativeMemoryDir('/tmp/demo-project')
          }));
        })().catch(error => {
          console.error(error.stack || error.message);
          process.exit(1);
        });
      `;
      const result = spawnSync('node', ['-e', script], {
        env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir },
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      const parsed = JSON.parse(result.stdout);
      assert.ok(parsed.ckHome.startsWith(path.join(homeDir, '.factory')), parsed.ckHome);
      assert.ok(parsed.ckHome.endsWith(path.join('.factory', 'ck')), parsed.ckHome);
      assert.ok(parsed.skillFile.endsWith(path.join('.factory', 'skills', 'ck', 'SKILL.md')), parsed.skillFile);
      assert.ok(parsed.nativeMemoryDir.includes(path.join('.factory', 'projects')), parsed.nativeMemoryDir);
      assert.ok(parsed.nativeMemoryDir.endsWith(path.join('.factory', 'projects', 'demo-project', 'memory')), parsed.nativeMemoryDir);
    } finally {
      cleanup(homeDir);
    }
  })) passed++; else failed++;

  if (test('shared.mjs migrates legacy encoded native memory dirs to basename dirs', () => {
    const homeDir = createTempDir('ck-migrate-home-');
    const legacyDir = path.join(homeDir, '.factory', 'projects', '-tmp-demo-project', 'memory');

    try {
      fs.mkdirSync(legacyDir, { recursive: true });
      fs.writeFileSync(path.join(legacyDir, 'legacy.md'), 'legacy memory', 'utf8');

      const script = `
        const { pathToFileURL } = require('url');
        (async () => {
          const mod = await import(pathToFileURL(${JSON.stringify(sharedPath)}));
          process.stdout.write(mod.nativeMemoryDir('/tmp/demo-project'));
        })().catch(error => {
          console.error(error.stack || error.message);
          process.exit(1);
        });
      `;
      const result = spawnSync('node', ['-e', script], {
        env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir },
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      const nativeMemoryDir = result.stdout.trim();
      assert.ok(nativeMemoryDir.endsWith(path.join('.factory', 'projects', 'demo-project', 'memory')), nativeMemoryDir);
      assert.ok(fs.existsSync(path.join(nativeMemoryDir, 'legacy.md')), 'legacy memory file should be migrated');
      assert.ok(!fs.existsSync(path.join(homeDir, '.factory', 'projects', '-tmp-demo-project')), 'legacy encoded dir should be removed');
    } finally {
      cleanup(homeDir);
    }
  })) passed++; else failed++;

  if (test('shared.mjs migrates renamed basename memory dirs to the current project name', () => {
    const homeDir = createTempDir('ck-rename-home-');
    const parentDir = createTempDir('ck-rename-parent-');
    const oldProjectRoot = path.join(parentDir, 'old-name');
    const newProjectRoot = path.join(parentDir, 'new-name');
    const legacyDir = path.join(homeDir, '.factory', 'projects', 'old-name', 'memory');
    const remoteUrl = 'https://example.com/demo-project.git';

    try {
      fs.mkdirSync(newProjectRoot, { recursive: true });
      initGitRepo(newProjectRoot, remoteUrl);
      fs.mkdirSync(legacyDir, { recursive: true });
      fs.writeFileSync(path.join(legacyDir, 'legacy.md'), 'legacy memory', 'utf8');
      fs.writeFileSync(
        path.join(homeDir, '.factory', 'projects', 'old-name', 'project.json'),
        JSON.stringify({
          id: 'old-name',
          name: 'old-name',
          root: oldProjectRoot,
          remote: remoteUrl,
        }, null, 2),
        'utf8'
      );

      const script = `
        const { pathToFileURL } = require('url');
        (async () => {
          const mod = await import(pathToFileURL(${JSON.stringify(sharedPath)}));
          process.stdout.write(mod.nativeMemoryDir(${JSON.stringify(newProjectRoot)}));
        })().catch(error => {
          console.error(error.stack || error.message);
          process.exit(1);
        });
      `;
      const result = spawnSync('node', ['-e', script], {
        env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir },
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      const nativeMemoryDir = result.stdout.trim();
      assert.ok(nativeMemoryDir.endsWith(path.join('.factory', 'projects', 'new-name', 'memory')), nativeMemoryDir);
      assert.ok(fs.existsSync(path.join(nativeMemoryDir, 'legacy.md')), 'renamed memory file should be migrated');
      assert.ok(!fs.existsSync(path.join(homeDir, '.factory', 'projects', 'old-name')), 'old basename dir should be removed');
    } finally {
      cleanup(homeDir);
      cleanup(parentDir);
    }
  })) passed++; else failed++;

  if (test('shared.mjs does not migrate unrelated sibling memory dirs without matching repo evidence', () => {
    const homeDir = createTempDir('ck-rename-negative-home-');
    const parentDir = createTempDir('ck-rename-negative-parent-');
    const oldProjectRoot = path.join(parentDir, 'old-name');
    const differentProjectRoot = path.join(parentDir, 'different-project');
    const legacyDir = path.join(homeDir, '.factory', 'projects', 'old-name', 'memory');

    try {
      fs.mkdirSync(differentProjectRoot, { recursive: true });
      fs.mkdirSync(legacyDir, { recursive: true });
      fs.writeFileSync(path.join(legacyDir, 'legacy.md'), 'legacy memory', 'utf8');
      fs.writeFileSync(
        path.join(homeDir, '.factory', 'projects', 'old-name', 'project.json'),
        JSON.stringify({
          id: 'old-name',
          name: 'old-name',
          root: oldProjectRoot,
          remote: 'https://example.com/demo-project.git',
        }, null, 2),
        'utf8'
      );

      const script = `
        const { pathToFileURL } = require('url');
        (async () => {
          const mod = await import(pathToFileURL(${JSON.stringify(sharedPath)}));
          process.stdout.write(mod.nativeMemoryDir(${JSON.stringify(differentProjectRoot)}));
        })().catch(error => {
          console.error(error.stack || error.message);
          process.exit(1);
        });
      `;
      const result = spawnSync('node', ['-e', script], {
        env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir },
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      const nativeMemoryDir = result.stdout.trim();
      assert.ok(nativeMemoryDir.endsWith(path.join('.factory', 'projects', 'different-project', 'memory')), nativeMemoryDir);
      assert.ok(fs.existsSync(path.join(legacyDir, 'legacy.md')), 'legacy memory should stay with old project');
      assert.ok(!fs.existsSync(path.join(homeDir, '.factory', 'projects', 'different-project', 'memory', 'legacy.md')), 'unrelated sibling should not inherit old memory');
    } finally {
      cleanup(homeDir);
      cleanup(parentDir);
    }
  })) passed++; else failed++;

  if (test('shared.mjs reuses native memory for case-only project path changes', () => {
    const homeDir = createTempDir('ck-case-memory-home-');
    const parentDir = createTempDir('ck-case-memory-parent-');
    const originalCaseRoot = path.join(parentDir, 'OldName');
    const lowerCaseRoot = path.join(parentDir, 'oldname');
    const storageDir = path.join(homeDir, '.factory', 'projects', 'OldName', 'memory');
    const remoteUrl = 'https://example.com/demo-project.git';

    try {
      fs.mkdirSync(originalCaseRoot, { recursive: true });
      if (!fs.existsSync(lowerCaseRoot)) {
        return;
      }
      initGitRepo(originalCaseRoot, remoteUrl);
      fs.mkdirSync(storageDir, { recursive: true });
      fs.writeFileSync(path.join(storageDir, 'legacy.md'), 'legacy memory', 'utf8');
      fs.writeFileSync(
        path.join(homeDir, '.factory', 'projects', 'OldName', 'project.json'),
        JSON.stringify({
          id: 'OldName',
          name: 'OldName',
          root: originalCaseRoot,
          remote: remoteUrl,
        }, null, 2),
        'utf8'
      );

      const script = `
        const { pathToFileURL } = require('url');
        (async () => {
          const mod = await import(pathToFileURL(${JSON.stringify(sharedPath)}));
          process.stdout.write(mod.nativeMemoryDir(${JSON.stringify(lowerCaseRoot)}));
        })().catch(error => {
          console.error(error.stack || error.message);
          process.exit(1);
        });
      `;
      const result = spawnSync('node', ['-e', script], {
        env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir },
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      const nativeMemoryDir = result.stdout.trim();
      assert.ok(nativeMemoryDir.endsWith(path.join('.factory', 'projects', 'OldName', 'memory')), nativeMemoryDir);
      assert.ok(!fs.existsSync(path.join(homeDir, '.factory', 'projects', 'oldname-2')), 'case-only rename should not allocate a suffixed project dir');
    } finally {
      cleanup(homeDir);
      cleanup(parentDir);
    }
  })) passed++; else failed++;

  if (test('session-start.mjs prefers AGENTS.md for goal mismatch detection', () => {
    const homeDir = createTempDir('ck-goal-home-');
    const projectDir = createTempDir('ck-goal-project-');
    const factoryCkDir = path.join(homeDir, '.factory', 'ck');
    const skillFile = path.join(homeDir, '.factory', 'skills', 'ck', 'SKILL.md');
    const contextDir = path.join(factoryCkDir, 'contexts', 'demo-project');

    try {
      fs.mkdirSync(contextDir, { recursive: true });
      fs.mkdirSync(path.dirname(skillFile), { recursive: true });
      fs.writeFileSync(skillFile, 'ck skill from factory path', 'utf8');
      fs.writeFileSync(path.join(factoryCkDir, 'projects.json'), JSON.stringify({
        [projectDir]: {
          name: 'demo-project',
          contextDir: 'demo-project'
        }
      }, null, 2), 'utf8');
      fs.writeFileSync(path.join(contextDir, 'context.json'), JSON.stringify({
        name: 'demo-project',
        goal: 'Canonical ck goal',
        createdAt: '2026-04-01',
        sessions: [
          {
            date: '2026-04-01',
            leftOff: 'left off here',
            nextSteps: ['next step']
          }
        ]
      }, null, 2), 'utf8');
      fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), '## Current Goal\nDifferent AGENTS goal\n', 'utf8');
      fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '## Current Goal\nLegacy CLAUDE goal\n', 'utf8');

      const result = spawnSync('node', [sessionStartPath], {
        cwd: projectDir,
        env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir, PWD: projectDir },
        input: JSON.stringify({ session_id: 'factory-session-5678' }),
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      const payload = JSON.parse(result.stdout);
      assert.ok(payload.additionalContext.includes('WARNING Goal mismatch'));
      assert.ok(payload.additionalContext.includes('AGENTS.md: "Different AGENTS goal"'));
      assert.ok(!payload.additionalContext.includes('CLAUDE.md: "Legacy CLAUDE goal"'));
    } finally {
      cleanup(homeDir);
      cleanup(projectDir);
    }
  })) passed++; else failed++;

  if (test('session-start.mjs reads skill and writes state under .factory', () => {
    const homeDir = createTempDir('ck-session-home-');
    const projectDir = createTempDir('ck-session-project-');
    const factoryCkDir = path.join(homeDir, '.factory', 'ck');
    const skillFile = path.join(homeDir, '.factory', 'skills', 'ck', 'SKILL.md');

    try {
      fs.mkdirSync(factoryCkDir, { recursive: true });
      fs.mkdirSync(path.dirname(skillFile), { recursive: true });
      fs.writeFileSync(skillFile, 'ck skill from factory path', 'utf8');

      const result = spawnSync('node', [sessionStartPath], {
        cwd: projectDir,
        env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir, PWD: projectDir },
        input: JSON.stringify({ session_id: 'factory-session-1234' }),
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      const payload = JSON.parse(result.stdout);
      assert.ok(payload.additionalContext.includes('ck skill from factory path'));

      const currentSessionPath = path.join(factoryCkDir, 'current-session.json');
      assert.ok(fs.existsSync(currentSessionPath), 'Expected current-session.json under .factory/ck');
      const saved = JSON.parse(fs.readFileSync(currentSessionPath, 'utf8'));
      assert.strictEqual(saved.sessionId, 'factory-session-1234');
    } finally {
      cleanup(homeDir);
      cleanup(projectDir);
    }
  })) passed++; else failed++;

  if (test('session-start.mjs loads renamed projects from migrated registration paths', () => {
    const homeDir = createTempDir('ck-session-rename-home-');
    const parentDir = createTempDir('ck-session-rename-parent-');
    const oldProjectRoot = path.join(parentDir, 'old-name');
    const newProjectRoot = path.join(parentDir, 'new-name');
    const factoryCkDir = path.join(homeDir, '.factory', 'ck');
    const contextDir = path.join(factoryCkDir, 'contexts', 'demo-project');
    const remoteUrl = 'https://example.com/demo-project.git';

    try {
      fs.mkdirSync(newProjectRoot, { recursive: true });
      initGitRepo(newProjectRoot, remoteUrl);
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(factoryCkDir, 'projects.json'), JSON.stringify({
        [oldProjectRoot]: {
          name: 'demo-project',
          contextDir: 'demo-project'
        }
      }, null, 2), 'utf8');
      fs.writeFileSync(path.join(contextDir, 'context.json'), JSON.stringify({
        name: 'demo-project',
        displayName: 'Demo Project',
        path: oldProjectRoot,
        repo: remoteUrl,
        goal: 'Ship rename migration',
        createdAt: '2026-04-01',
        sessions: [
          {
            date: '2026-04-01',
            leftOff: 'resume here',
            nextSteps: ['finish migration']
          }
        ]
      }, null, 2), 'utf8');

      const result = spawnSync('node', [sessionStartPath], {
        cwd: newProjectRoot,
        env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir, PWD: newProjectRoot },
        input: JSON.stringify({ session_id: 'factory-session-9012' }),
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      const payload = JSON.parse(result.stdout);
      assert.ok(payload.additionalContext.includes('Demo Project'));
      const projects = JSON.parse(fs.readFileSync(path.join(factoryCkDir, 'projects.json'), 'utf8'));
      assert.ok(projects[newProjectRoot], 'expected registration to move to renamed path');
      assert.ok(!projects[oldProjectRoot], 'old registration path should be removed');
      const context = JSON.parse(fs.readFileSync(path.join(contextDir, 'context.json'), 'utf8'));
      assert.strictEqual(context.path, newProjectRoot);
    } finally {
      cleanup(homeDir);
      cleanup(parentDir);
    }
  })) passed++; else failed++;

  if (test('save.mjs accepts renamed project registrations and updates projects.json', () => {
    const homeDir = createTempDir('ck-save-rename-home-');
    const parentDir = createTempDir('ck-save-rename-parent-');
    const oldProjectRoot = path.join(parentDir, 'old-name');
    const newProjectRoot = path.join(parentDir, 'new-name');
    const factoryCkDir = path.join(homeDir, '.factory', 'ck');
    const contextDir = path.join(factoryCkDir, 'contexts', 'demo-project');
    const remoteUrl = 'https://example.com/demo-project.git';

    try {
      fs.mkdirSync(newProjectRoot, { recursive: true });
      initGitRepo(newProjectRoot, remoteUrl);
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(factoryCkDir, 'projects.json'), JSON.stringify({
        [oldProjectRoot]: {
          name: 'demo-project',
          contextDir: 'demo-project',
          lastUpdated: '2026-04-01'
        }
      }, null, 2), 'utf8');
      fs.writeFileSync(path.join(contextDir, 'context.json'), JSON.stringify({
        version: 2,
        name: 'demo-project',
        displayName: 'Demo Project',
        path: oldProjectRoot,
        repo: remoteUrl,
        createdAt: '2026-04-01',
        sessions: []
      }, null, 2), 'utf8');
      fs.writeFileSync(path.join(factoryCkDir, 'current-session.json'), JSON.stringify({
        sessionId: 'factory-session-save'
      }, null, 2), 'utf8');

      const result = spawnSync('node', [savePath], {
        cwd: newProjectRoot,
        env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir, PWD: newProjectRoot },
        input: JSON.stringify({
          summary: 'Saved after rename',
          leftOff: 'continue here',
          nextSteps: ['verify rename'],
          decisions: [],
          blockers: []
        }),
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      assert.ok(result.stdout.includes('✓ Saved.'));
      const projects = JSON.parse(fs.readFileSync(path.join(factoryCkDir, 'projects.json'), 'utf8'));
      assert.ok(projects[newProjectRoot], 'expected registration to move to renamed path');
      assert.ok(!projects[oldProjectRoot], 'old registration path should be removed');
      const context = JSON.parse(fs.readFileSync(path.join(contextDir, 'context.json'), 'utf8'));
      assert.strictEqual(context.path, newProjectRoot);
      assert.strictEqual(context.sessions.length, 1);
      assert.strictEqual(context.sessions[0].id, 'factory-session-save');
    } finally {
      cleanup(homeDir);
      cleanup(parentDir);
    }
  })) passed++; else failed++;

  if (test('save.mjs does not migrate unrelated sibling registrations without matching repo evidence', () => {
    const homeDir = createTempDir('ck-save-no-rename-home-');
    const parentDir = createTempDir('ck-save-no-rename-parent-');
    const oldProjectRoot = path.join(parentDir, 'old-name');
    const differentProjectRoot = path.join(parentDir, 'different-project');
    const factoryCkDir = path.join(homeDir, '.factory', 'ck');
    const contextDir = path.join(factoryCkDir, 'contexts', 'demo-project');

    try {
      fs.mkdirSync(differentProjectRoot, { recursive: true });
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(factoryCkDir, 'projects.json'), JSON.stringify({
        [oldProjectRoot]: {
          name: 'demo-project',
          contextDir: 'demo-project',
          lastUpdated: '2026-04-01'
        }
      }, null, 2), 'utf8');
      fs.writeFileSync(path.join(contextDir, 'context.json'), JSON.stringify({
        version: 2,
        name: 'demo-project',
        displayName: 'Demo Project',
        path: oldProjectRoot,
        repo: 'https://example.com/demo-project.git',
        createdAt: '2026-04-01',
        sessions: []
      }, null, 2), 'utf8');

      const result = spawnSync('node', [savePath], {
        cwd: differentProjectRoot,
        env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir, PWD: differentProjectRoot },
        input: JSON.stringify({
          summary: 'Should not save',
          leftOff: 'n/a',
          nextSteps: [],
          decisions: [],
          blockers: []
        }),
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.strictEqual(result.status, 1, result.stderr || result.stdout);
      assert.ok(result.stdout.includes("This project isn't registered yet"));
      const projects = JSON.parse(fs.readFileSync(path.join(factoryCkDir, 'projects.json'), 'utf8'));
      assert.ok(projects[oldProjectRoot], 'original registration should remain');
      assert.ok(!projects[differentProjectRoot], 'unrelated sibling should not be auto-registered');
    } finally {
      cleanup(homeDir);
      cleanup(parentDir);
    }
  })) passed++; else failed++;

  if (test('session-start.mjs resolves case-only project path aliases', () => {
    const homeDir = createTempDir('ck-case-session-home-');
    const parentDir = createTempDir('ck-case-session-parent-');
    const originalCaseRoot = path.join(parentDir, 'OldName');
    const lowerCaseRoot = path.join(parentDir, 'oldname');
    const factoryCkDir = path.join(homeDir, '.factory', 'ck');
    const contextDir = path.join(factoryCkDir, 'contexts', 'demo-project');

    try {
      fs.mkdirSync(originalCaseRoot, { recursive: true });
      if (!fs.existsSync(lowerCaseRoot)) {
        return;
      }
      fs.mkdirSync(contextDir, { recursive: true });
      fs.writeFileSync(path.join(factoryCkDir, 'projects.json'), JSON.stringify({
        [originalCaseRoot]: {
          name: 'demo-project',
          contextDir: 'demo-project'
        }
      }, null, 2), 'utf8');
      fs.writeFileSync(path.join(contextDir, 'context.json'), JSON.stringify({
        version: 2,
        name: 'demo-project',
        displayName: 'Demo Project',
        path: originalCaseRoot,
        createdAt: '2026-04-01',
        sessions: []
      }, null, 2), 'utf8');

      const result = spawnSync('node', [sessionStartPath], {
        cwd: lowerCaseRoot,
        env: { ...process.env, HOME: homeDir, USERPROFILE: homeDir, PWD: lowerCaseRoot },
        input: JSON.stringify({ session_id: 'factory-session-case' }),
        encoding: 'utf8',
        timeout: 10000,
      });

      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      const projects = JSON.parse(fs.readFileSync(path.join(factoryCkDir, 'projects.json'), 'utf8'));
      assert.ok(projects[lowerCaseRoot], 'expected case-normalized registration key');
      assert.ok(!projects[originalCaseRoot], 'old-case registration key should be removed');
    } finally {
      cleanup(homeDir);
      cleanup(parentDir);
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
