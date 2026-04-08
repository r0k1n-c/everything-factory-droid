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
const settingsPath = path.join(factoryDir, 'settings.json');
const packageManagerPath = path.join(factoryDir, 'package-manager.json');
const identityPath = path.join(factoryDir, 'identity.json');
const guardrailsPath = path.join(factoryDir, 'rules', 'efd-guardrails.md');

test('.factory directory exists', () => {
  assert.ok(fs.existsSync(factoryDir), 'Expected .factory to exist');
});

test('.factory/settings.json stores project-level config instead of mirrored hooks', () => {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.strictEqual(settings.model, 'claude-sonnet-4-6');
  assert.strictEqual(settings.alwaysThinkingEnabled, true);
  assert.ok(Array.isArray(settings.disabledMcpServers), 'Expected disabledMcpServers array');
  assert.ok(!Object.prototype.hasOwnProperty.call(settings, 'hooks'), 'Did not expect repo-local hooks duplication');
});

test('.factory/package-manager.json declares the repo package manager', () => {
  const packageManager = JSON.parse(fs.readFileSync(packageManagerPath, 'utf8'));
  assert.strictEqual(packageManager.packageManager, 'yarn');
});

test('.factory/identity.json exists', () => {
  const identity = JSON.parse(fs.readFileSync(identityPath, 'utf8'));
  assert.strictEqual(identity.project, 'everything-factory-droid');
});

test('.factory/rules/efd-guardrails.md exists', () => {
  assert.ok(fs.existsSync(guardrailsPath), 'Expected repo-local guardrails file');
});

test('.factory does not mirror reusable droids, skills, or commands', () => {
  assert.ok(!fs.existsSync(path.join(factoryDir, 'droids')), 'Did not expect .factory/droids mirror');
  assert.ok(!fs.existsSync(path.join(factoryDir, 'skills')), 'Did not expect .factory/skills mirror');
  assert.ok(!fs.existsSync(path.join(factoryDir, 'commands')), 'Did not expect .factory/commands mirror');
});

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
