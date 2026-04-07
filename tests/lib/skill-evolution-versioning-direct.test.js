'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const versioning = require('../../scripts/lib/skill-evolution/versioning');

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

function createSkill(skillRoot, skillName, content = '# Skill\n') {
  const skillDir = path.join(skillRoot, skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf8');
  return skillDir;
}

console.log('\n=== Testing skill-evolution versioning direct coverage ===\n');

let passed = 0;
let failed = 0;

if (test('versioning helpers cover missing skills, invalid log types, and log initialization', () => {
  const tempDir = createTempDir('efd-versioning-direct-');

  try {
    const missingSkillDir = path.join(tempDir, 'missing-skill');
    assert.throws(() => versioning.getVersionsDir(null), /skillPath is required/);
    assert.throws(() => versioning.ensureSkillVersioning(missingSkillDir), /Skill file not found/);
    assert.throws(() => versioning.getEvolutionLogPath(missingSkillDir, 'unknown'), /Unknown evolution log type/);
    assert.deepStrictEqual(versioning.listVersions(missingSkillDir), []);
    assert.strictEqual(versioning.getCurrentVersion(missingSkillDir), 0);

    const skillDir = createSkill(tempDir, 'alpha', '# Alpha\n');
    assert.strictEqual(versioning.getCurrentVersion(skillDir), 1);

    const initialized = versioning.ensureSkillVersioning(path.join(skillDir, 'SKILL.md'));
    assert.ok(fs.existsSync(initialized.versionsDir));
    assert.ok(fs.existsSync(initialized.evolutionDir));
    for (const logType of versioning.EVOLUTION_LOG_TYPES) {
      assert.ok(fs.existsSync(versioning.getEvolutionLogPath(skillDir, logType)));
    }
  } finally {
    cleanupTempDir(tempDir);
  }
})) passed += 1; else failed += 1;

if (test('createVersion, listVersions, and getEvolutionLog handle filtering and malformed JSONL rows', () => {
  const tempDir = createTempDir('efd-versioning-direct-');

  try {
    const skillDir = createSkill(tempDir, 'beta', '# Beta\n');
    versioning.ensureSkillVersioning(skillDir);

    fs.writeFileSync(path.join(versioning.getVersionsDir(skillDir), 'notes.txt'), 'ignore', 'utf8');

    const created = versioning.createVersion(skillDir, {
      timestamp: '2026-03-15T13:00:00.000Z',
      author: 'observer',
      reason: 'bootstrap',
    });
    assert.strictEqual(created.version, 1);
    assert.ok(created.path.endsWith('v1.md'));

    fs.writeFileSync(path.join(versioning.getVersionsDir(skillDir), 'v10.md'), '# v10\n', 'utf8');
    const versions = versioning.listVersions(skillDir);
    assert.deepStrictEqual(
      versions.map(entry => entry.version),
      [1, 10]
    );

    const amendmentsPath = versioning.getEvolutionLogPath(skillDir, 'amendments');
    fs.appendFileSync(amendmentsPath, '{bad-json}\n', 'utf8');
    const amendments = versioning.getEvolutionLog(skillDir, 'amendments');
    assert.strictEqual(amendments.length, 1);
    assert.strictEqual(amendments[0].event, 'snapshot');
  } finally {
    cleanupTempDir(tempDir);
  }
})) passed += 1; else failed += 1;

if (test('rollbackTo validates inputs, restores content, and records rollback history', () => {
  const tempDir = createTempDir('efd-versioning-direct-');

  try {
    const skillDir = createSkill(tempDir, 'gamma', '# Gamma v1\n');
    versioning.createVersion(skillDir, {
      timestamp: '2026-03-15T13:10:00.000Z',
      author: 'observer',
      reason: 'initial',
    });

    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Gamma v2\n', 'utf8');
    versioning.createVersion(skillDir, {
      timestamp: '2026-03-15T13:11:00.000Z',
      author: 'observer',
      reason: 'update',
    });

    assert.throws(() => versioning.rollbackTo(skillDir, '0'), /Invalid target version/);
    assert.throws(() => versioning.rollbackTo(skillDir, '99'), /Version not found/);

    const rollback = versioning.rollbackTo(skillDir, 1, {
      timestamp: '2026-03-15T13:12:00.000Z',
      author: 'reviewer',
    });

    assert.strictEqual(rollback.version, 3);
    assert.strictEqual(fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8'), '# Gamma v1\n');

    const amendments = versioning.getEvolutionLog(skillDir, 'amendments');
    const lastEntry = amendments[amendments.length - 1];
    assert.strictEqual(lastEntry.event, 'rollback');
    assert.strictEqual(lastEntry.source_version, 2);
    assert.strictEqual(lastEntry.target_version, 1);
    assert.strictEqual(lastEntry.author, 'reviewer');
  } finally {
    cleanupTempDir(tempDir);
  }
})) passed += 1; else failed += 1;

if (test('createVersion and rollbackTo apply default metadata when options are omitted', () => {
  const tempDir = createTempDir('efd-versioning-direct-');

  try {
    const skillDir = createSkill(tempDir, 'delta', '# Delta v1\n');
    const firstSnapshot = versioning.createVersion(skillDir);
    assert.strictEqual(firstSnapshot.version, 1);

    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Delta v2\n', 'utf8');
    const rollback = versioning.rollbackTo(skillDir, 1);
    assert.strictEqual(rollback.version, 2);

    const amendments = versioning.getEvolutionLog(skillDir, 'amendments');
    assert.strictEqual(amendments[0].reason, null);
    assert.strictEqual(amendments[0].author, null);
    assert.ok(typeof amendments[0].created_at === 'string' && amendments[0].created_at.length > 0);
    assert.strictEqual(amendments[amendments.length - 1].reason, null);
    assert.strictEqual(amendments[amendments.length - 1].author, null);
    assert.ok(typeof amendments[amendments.length - 1].created_at === 'string');
  } finally {
    cleanupTempDir(tempDir);
  }
})) passed += 1; else failed += 1;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
