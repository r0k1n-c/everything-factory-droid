'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const provenance = require('../../scripts/lib/skill-evolution/provenance');

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

console.log('\n=== Testing skill-evolution provenance direct coverage ===\n');

let passed = 0;
let failed = 0;

if (test('classifies curated, learned, imported, and unknown skill roots', () => {
  const repoRoot = createTempDir('efd-provenance-repo-');
  const homeDir = createTempDir('efd-provenance-home-');
  const originalHomedir = os.homedir;

  try {
    os.homedir = () => homeDir;
    const curatedSkill = path.join(repoRoot, 'skills', 'curated-skill', 'SKILL.md');
    const learnedSkill = path.join(homeDir, '.factory', 'skills', 'learned', 'learned-skill', 'SKILL.md');
    const importedSkill = path.join(homeDir, '.factory', 'skills', 'imported', 'imported-skill', 'SKILL.md');
    const unknownSkill = path.join(repoRoot, 'scratch', 'other-skill', 'SKILL.md');

    assert.strictEqual(provenance.classifySkillPath(curatedSkill, { repoRoot, homeDir }), provenance.SKILL_TYPES.CURATED);
    assert.strictEqual(provenance.classifySkillPath(learnedSkill, { repoRoot, homeDir }), provenance.SKILL_TYPES.LEARNED);
    assert.strictEqual(provenance.classifySkillPath(importedSkill, { repoRoot, homeDir }), provenance.SKILL_TYPES.IMPORTED);
    assert.strictEqual(provenance.classifySkillPath(unknownSkill, { repoRoot, homeDir }), provenance.SKILL_TYPES.UNKNOWN);
    assert.strictEqual(provenance.requiresProvenance(curatedSkill, { repoRoot, homeDir }), false);
    assert.strictEqual(provenance.requiresProvenance(importedSkill, { repoRoot, homeDir }), true);
    assert.strictEqual(
      provenance.getSkillRoots({ repoRoot }).learned,
      path.join(homeDir, '.factory', 'skills', 'learned')
    );
  } finally {
    os.homedir = originalHomedir;
    cleanupTempDir(repoRoot);
    cleanupTempDir(homeDir);
  }
})) passed += 1; else failed += 1;

if (test('validateProvenance and readProvenance cover missing, invalid, and required branches', () => {
  const repoRoot = createTempDir('efd-provenance-repo-');
  const homeDir = createTempDir('efd-provenance-home-');
  const curatedSkillDir = path.join(repoRoot, 'skills', 'curated-skill');
  const learnedSkillDir = path.join(homeDir, '.factory', 'skills', 'learned', 'alpha');

  try {
    assert.throws(() => provenance.classifySkillPath(null, { repoRoot, homeDir }), /skillPath is required/);
    fs.mkdirSync(curatedSkillDir, { recursive: true });
    fs.mkdirSync(learnedSkillDir, { recursive: true });
    assert.strictEqual(provenance.readProvenance(curatedSkillDir, { repoRoot, homeDir, required: false }), null);
    assert.throws(
      () => provenance.readProvenance(learnedSkillDir, { repoRoot, homeDir, required: true }),
      /Missing provenance metadata/
    );

    assert.deepStrictEqual(provenance.validateProvenance(null), {
      valid: false,
      errors: ['provenance record must be an object'],
    });

    const invalid = provenance.validateProvenance({
      source: '',
      created_at: 'nope',
      confidence: 2,
      author: '',
    });
    assert.strictEqual(invalid.valid, false);
    assert.ok(invalid.errors.includes('source is required'));
    assert.ok(invalid.errors.includes('created_at must be an ISO timestamp'));
    assert.ok(invalid.errors.includes('confidence must be between 0 and 1'));
    assert.ok(invalid.errors.includes('author is required'));
    assert.strictEqual(provenance.validateProvenance({
      source: 'observer://ok',
      created_at: '   ',
      confidence: Number.NaN,
      author: 'observer',
    }).valid, false);

    const record = {
      source: 'observer://session/123',
      created_at: '2026-03-15T13:20:00.000Z',
      confidence: 0.9,
      author: 'observer',
    };
    fs.writeFileSync(
      provenance.getProvenancePath(learnedSkillDir),
      JSON.stringify(record, null, 2),
      'utf8'
    );
    assert.deepStrictEqual(provenance.readProvenance(learnedSkillDir, { repoRoot, homeDir }), record);
  } finally {
    cleanupTempDir(repoRoot);
    cleanupTempDir(homeDir);
  }
})) passed += 1; else failed += 1;

if (test('writeProvenance rejects curated skills and persists learned skill metadata', () => {
  const repoRoot = createTempDir('efd-provenance-repo-');
  const homeDir = createTempDir('efd-provenance-home-');
  const curatedSkillDir = path.join(repoRoot, 'skills', 'curated-skill');
  const learnedSkillDir = path.join(homeDir, '.factory', 'skills', 'learned', 'beta');

  try {
    fs.mkdirSync(curatedSkillDir, { recursive: true });
    fs.mkdirSync(learnedSkillDir, { recursive: true });

    const record = {
      source: 'import://bundle',
      created_at: '2026-03-15T13:25:00.000Z',
      confidence: 0.5,
      author: 'importer',
    };

    assert.throws(
      () => provenance.writeProvenance(curatedSkillDir, record, { repoRoot, homeDir }),
      /only required for learned or imported skills/
    );
    assert.throws(
      () => provenance.writeProvenance(learnedSkillDir, { ...record, confidence: 'bad' }, { repoRoot, homeDir }),
      /Invalid provenance metadata/
    );

    const written = provenance.writeProvenance(learnedSkillDir, record, { repoRoot, homeDir });
    assert.strictEqual(written.path, provenance.getProvenancePath(learnedSkillDir));
    assert.deepStrictEqual(written.record, record);
    assert.deepStrictEqual(provenance.readProvenance(learnedSkillDir, { repoRoot, homeDir, required: true }), record);
  } finally {
    cleanupTempDir(repoRoot);
    cleanupTempDir(homeDir);
  }
})) passed += 1; else failed += 1;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
