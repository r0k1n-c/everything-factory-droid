/**
 * Tests for scripts/install-plan.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'install-plan.js');
function run(args = [], options = {}) { try { const stdout = execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], cwd: options.cwd, timeout: 10000 }); return { code: 0, stdout, stderr: '' }; } catch (error) { return { code: error.status || 1, stdout: error.stdout || '', stderr: error.stderr || '' }; } }
function test(name, fn) { try { fn(); console.log(`  ✓ ${name}`); return true; } catch (error) { console.log(`  ✗ ${name}`); console.log(`    Error: ${error.message}`); return false; } }

console.log('\n=== Testing install-plan.js ===\n');
let passed = 0; let failed = 0;

if (test('shows help with no arguments', () => { const result = run(); assert.strictEqual(result.code, 0); assert.ok(result.stdout.includes('Inspect EFD selective-install manifests')); })) passed++; else failed++;
if (test('lists install profiles', () => { const result = run(['--list-profiles']); assert.strictEqual(result.code, 0); assert.ok(result.stdout.includes('core')); })) passed++; else failed++;
if (test('prints a plan for the factory-droid target', () => { const result = run(['--profile', 'core', '--target', 'factory-droid']); assert.strictEqual(result.code, 0); assert.ok(result.stdout.includes('Adapter: factory-droid-project')); })) passed++; else failed++;
if (test('loads planning intent from efd-install.json', () => { const configDir = path.join(__dirname, '..', 'fixtures', 'tmp-install-plan-config'); const configPath = path.join(configDir, 'efd-install.json'); try { fs.mkdirSync(configDir, { recursive: true }); fs.writeFileSync(configPath, JSON.stringify({ version: 1, target: 'factory-droid', profile: 'core' }, null, 2)); const result = run(['--config', configPath, '--json']); assert.strictEqual(result.code, 0); const parsed = JSON.parse(result.stdout); assert.strictEqual(parsed.target, 'factory-droid'); } finally { fs.rmSync(configDir, { recursive: true, force: true }); } })) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
