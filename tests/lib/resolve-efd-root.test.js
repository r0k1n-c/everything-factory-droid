/**
 * Tests for scripts/lib/resolve-efd-root.js
 *
 * Covers the EFD root resolution fallback chain:
 *   1. FACTORY_PROJECT_DIR env var
 *   2. Standard install (~/.factory/)
 *   3. Exact legacy plugin roots under ~/.factory/plugins/
 *   4. Plugin cache auto-detection
 *   5. Fallback to ~/.factory/
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveEfdRoot, INLINE_RESOLVE } = require('../../scripts/lib/resolve-efd-root');

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (error) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'efd-root-test-'));
}

function setupStandardInstall(homeDir) {
  const factoryDir = path.join(homeDir, '.factory');
  const scriptDir = path.join(factoryDir, 'scripts', 'lib');
  fs.mkdirSync(scriptDir, { recursive: true });
  fs.writeFileSync(path.join(scriptDir, 'utils.js'), '// stub');
  return factoryDir;
}

function setupLegacyPluginInstall(homeDir, segments) {
  const legacyDir = path.join(homeDir, '.factory', 'plugins', ...segments);
  const scriptDir = path.join(legacyDir, 'scripts', 'lib');
  fs.mkdirSync(scriptDir, { recursive: true });
  fs.writeFileSync(path.join(scriptDir, 'utils.js'), '// stub');
  return legacyDir;
}
function setupPluginCache(homeDir, orgName, version) {
  const cacheDir = path.join(
    homeDir, '.factory', 'plugins', 'cache',
    'everything-factory-droid', orgName, version
  );
  const scriptDir = path.join(cacheDir, 'scripts', 'lib');
  fs.mkdirSync(scriptDir, { recursive: true });
  fs.writeFileSync(path.join(scriptDir, 'utils.js'), '// stub');
  return cacheDir;
}

function runTests() {
  console.log('\n=== Testing resolve-efd-root.js ===\n');

  let passed = 0;
  let failed = 0;

  // ─── Env Var Priority ───

  if (test('returns FACTORY_PROJECT_DIR when set', () => {
    const result = resolveEfdRoot({ envRoot: '/custom/plugin/root' });
    assert.strictEqual(result, '/custom/plugin/root');
  })) passed++; else failed++;

  if (test('trims whitespace from FACTORY_PROJECT_DIR', () => {
    const result = resolveEfdRoot({ envRoot: '  /trimmed/root  ' });
    assert.strictEqual(result, '/trimmed/root');
  })) passed++; else failed++;

  if (test('skips empty FACTORY_PROJECT_DIR', () => {
    const homeDir = createTempDir();
    try {
      setupStandardInstall(homeDir);
      const result = resolveEfdRoot({ envRoot: '', homeDir });
      assert.strictEqual(result, path.join(homeDir, '.factory'));
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('skips whitespace-only FACTORY_PROJECT_DIR', () => {
    const homeDir = createTempDir();
    try {
      setupStandardInstall(homeDir);
      const result = resolveEfdRoot({ envRoot: '   ', homeDir });
      assert.strictEqual(result, path.join(homeDir, '.factory'));
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  // ─── Standard Install ───

  if (test('finds standard install at ~/.factory/', () => {
    const homeDir = createTempDir();
    try {
      setupStandardInstall(homeDir);
      const result = resolveEfdRoot({ envRoot: '', homeDir });
      assert.strictEqual(result, path.join(homeDir, '.factory'));
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('finds exact legacy plugin install at ~/.factory/plugins/everything-factory-droid', () => {
    const homeDir = createTempDir();
    try {
      const expected = setupLegacyPluginInstall(homeDir, ['everything-factory-droid']);
      const result = resolveEfdRoot({ envRoot: '', homeDir });
      assert.strictEqual(result, expected);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('finds exact legacy plugin install at ~/.factory/plugins/everything-factory-droid@everything-factory-droid', () => {
    const homeDir = createTempDir();
    try {
      const expected = setupLegacyPluginInstall(homeDir, ['everything-factory-droid@everything-factory-droid']);
      const result = resolveEfdRoot({ envRoot: '', homeDir });
      assert.strictEqual(result, expected);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('finds marketplace legacy plugin install at ~/.factory/plugins/marketplace/everything-factory-droid', () => {
    const homeDir = createTempDir();
    try {
      const expected = setupLegacyPluginInstall(homeDir, ['marketplace', 'everything-factory-droid']);
      const result = resolveEfdRoot({ envRoot: '', homeDir });
      assert.strictEqual(result, expected);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('prefers exact legacy plugin install over plugin cache', () => {
    const homeDir = createTempDir();
    try {
      const expected = setupLegacyPluginInstall(homeDir, ['marketplace', 'everything-factory-droid']);
      setupPluginCache(homeDir, 'everything-factory-droid', '1.8.0');
      const result = resolveEfdRoot({ envRoot: '', homeDir });
      assert.strictEqual(result, expected);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;
  // ─── Plugin Cache Auto-Detection ───

  if (test('discovers plugin root from cache directory', () => {
    const homeDir = createTempDir();
    try {
      const expected = setupPluginCache(homeDir, 'everything-factory-droid', '1.8.0');
      const result = resolveEfdRoot({ envRoot: '', homeDir });
      assert.strictEqual(result, expected);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('prefers standard install over plugin cache', () => {
    const homeDir = createTempDir();
    try {
      const factoryDir = setupStandardInstall(homeDir);
      setupPluginCache(homeDir, 'everything-factory-droid', '1.8.0');
      const result = resolveEfdRoot({ envRoot: '', homeDir });
      assert.strictEqual(result, factoryDir,
        'Standard install should take precedence over plugin cache');
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('handles multiple versions in plugin cache', () => {
    const homeDir = createTempDir();
    try {
      setupPluginCache(homeDir, 'everything-factory-droid', '1.7.0');
      const expected = setupPluginCache(homeDir, 'everything-factory-droid', '1.8.0');
      const result = resolveEfdRoot({ envRoot: '', homeDir });
      // Should find one of them (either is valid)
      assert.ok(
        result === expected ||
        result === path.join(homeDir, '.factory', 'plugins', 'cache', 'everything-factory-droid', 'everything-factory-droid', '1.7.0'),
        'Should resolve to a valid plugin cache directory'
      );
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  // ─── Fallback ───

  if (test('falls back to ~/.factory/ when nothing is found', () => {
    const homeDir = createTempDir();
    try {
      // Create ~/.factory but don't put scripts there
      fs.mkdirSync(path.join(homeDir, '.factory'), { recursive: true });
      const result = resolveEfdRoot({ envRoot: '', homeDir });
      assert.strictEqual(result, path.join(homeDir, '.factory'));
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('falls back gracefully when ~/.factory/ does not exist', () => {
    const homeDir = createTempDir();
    try {
      const result = resolveEfdRoot({ envRoot: '', homeDir });
      assert.strictEqual(result, path.join(homeDir, '.factory'));
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  // ─── Custom Probe ───

  if (test('supports custom probe path', () => {
    const homeDir = createTempDir();
    try {
      const factoryDir = path.join(homeDir, '.factory');
      fs.mkdirSync(path.join(factoryDir, 'custom'), { recursive: true });
      fs.writeFileSync(path.join(factoryDir, 'custom', 'marker.js'), '// probe');
      const result = resolveEfdRoot({
        envRoot: '',
        homeDir,
        probe: path.join('custom', 'marker.js'),
      });
      assert.strictEqual(result, factoryDir);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  // ─── INLINE_RESOLVE ───

  if (test('INLINE_RESOLVE is a non-empty string', () => {
    assert.ok(typeof INLINE_RESOLVE === 'string');
    assert.ok(INLINE_RESOLVE.length > 50, 'Should be a substantial inline expression');
  })) passed++; else failed++;

  if (test('INLINE_RESOLVE returns FACTORY_PROJECT_DIR when set', () => {
    const { execFileSync } = require('child_process');
    const result = execFileSync('node', [
      '-e', `console.log(${INLINE_RESOLVE})`,
    ], {
      env: { ...process.env, FACTORY_PROJECT_DIR: '/inline/test/root' },
      encoding: 'utf8',
    }).trim();
    assert.strictEqual(result, '/inline/test/root');
  })) passed++; else failed++;

  if (test('INLINE_RESOLVE discovers exact legacy plugin root when env var is unset', () => {
    const homeDir = createTempDir();
    try {
      const expected = setupLegacyPluginInstall(homeDir, ['marketplace', 'everything-factory-droid']);
      const { execFileSync } = require('child_process');
      const result = execFileSync('node', [
        '-e', `console.log(${INLINE_RESOLVE})`,
      ], {
        env: { PATH: process.env.PATH, HOME: homeDir, USERPROFILE: homeDir },
        encoding: 'utf8',
      }).trim();
      assert.strictEqual(result, expected);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;
  if (test('INLINE_RESOLVE discovers plugin cache when env var is unset', () => {
    const homeDir = createTempDir();
    try {
      const expected = setupPluginCache(homeDir, 'everything-factory-droid', '1.9.0');
      const { execFileSync } = require('child_process');
      const result = execFileSync('node', [
        '-e', `console.log(${INLINE_RESOLVE})`,
      ], {
        env: { PATH: process.env.PATH, HOME: homeDir, USERPROFILE: homeDir },
        encoding: 'utf8',
      }).trim();
      assert.strictEqual(result, expected);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('INLINE_RESOLVE falls back to ~/.factory/ when nothing found', () => {
    const homeDir = createTempDir();
    try {
      const { execFileSync } = require('child_process');
      const result = execFileSync('node', [
        '-e', `console.log(${INLINE_RESOLVE})`,
      ], {
        env: { PATH: process.env.PATH, HOME: homeDir, USERPROFILE: homeDir },
        encoding: 'utf8',
      }).trim();
      assert.strictEqual(result, path.join(homeDir, '.factory'));
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
