/**
 * Tests for Factory Droid project surfaces.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    failed += 1;
  }
}

console.log('\n=== Factory Droid surfaces ===\n');

const factoryDir = path.join(repoRoot, '.factory');
const droidsDir = path.join(factoryDir, 'droids');
const skillsDir = path.join(factoryDir, 'skills');
const commandsDir = path.join(factoryDir, 'commands');
const settingsPath = path.join(factoryDir, 'settings.json');

test('.factory directory exists', () => {
  assert.ok(fs.existsSync(factoryDir), 'Expected .factory to exist');
});

test('.factory/droids contains shared droids', () => {
  const expected = ['architect.md', 'planner.md', 'code-reviewer.md', 'security-reviewer.md', 'tdd-guide.md'];
  for (const file of expected) {
    assert.ok(fs.existsSync(path.join(droidsDir, file)), `Missing droid: ${file}`);
  }
});

test('.factory/skills mirrors root skills', () => {
  assert.ok(fs.existsSync(skillsDir), 'Expected .factory/skills to exist');
  assert.ok(fs.existsSync(path.join(skillsDir, 'verification-loop', 'SKILL.md')), 'Expected copied skill content');
});

test('.factory/commands mirrors root commands', () => {
  assert.ok(fs.existsSync(commandsDir), 'Expected .factory/commands to exist');
  assert.ok(fs.existsSync(path.join(commandsDir, 'plan.md')), 'Expected plan command');
});

test('.factory/settings.json contains hooks config', () => {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.ok(settings.hooks && typeof settings.hooks === 'object', 'Expected hooks object');
});

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
