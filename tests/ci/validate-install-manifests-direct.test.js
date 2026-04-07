"use strict";

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const Ajv = require('ajv');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'ci', 'validate-install-manifests.js');
const REPO_ROOT = path.join(__dirname, '..', '..');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function stripShebang(source) {
  return source.startsWith('#!') ? source.replace(/^#!.*\r?\n/, '') : source;
}

function loadValidator(overrides = {}) {
  let source = stripShebang(fs.readFileSync(SCRIPT, 'utf8'));
  const replacements = {
    REPO_ROOT: overrides.REPO_ROOT || path.join(os.tmpdir(), 'efd-validate-install-empty-root'),
    MODULES_MANIFEST_PATH: overrides.MODULES_MANIFEST_PATH || path.join(os.tmpdir(), 'efd-install-manifests', 'install-modules.json'),
    PROFILES_MANIFEST_PATH: overrides.PROFILES_MANIFEST_PATH || path.join(os.tmpdir(), 'efd-install-manifests', 'install-profiles.json'),
    COMPONENTS_MANIFEST_PATH: overrides.COMPONENTS_MANIFEST_PATH || path.join(os.tmpdir(), 'efd-install-manifests', 'install-components.json'),
    MODULES_SCHEMA_PATH: overrides.MODULES_SCHEMA_PATH || path.join(REPO_ROOT, 'schemas', 'install-modules.schema.json'),
    PROFILES_SCHEMA_PATH: overrides.PROFILES_SCHEMA_PATH || path.join(REPO_ROOT, 'schemas', 'install-profiles.schema.json'),
    COMPONENTS_SCHEMA_PATH: overrides.COMPONENTS_SCHEMA_PATH || path.join(REPO_ROOT, 'schemas', 'install-components.schema.json'),
  };

  for (const [constant, value] of Object.entries(replacements)) {
    source = source.replace(new RegExp(`const ${constant} = .*?;`), `const ${constant} = ${JSON.stringify(value)};`);
  }

  source = source.replace(
    /validateInstallManifests\(\);\s*$/,
    'module.exports = { readJson, normalizeRelativePath, validateSchema, validateInstallManifests };\n'
  );

  const mod = new Module(SCRIPT, module);
  mod.filename = SCRIPT;
  mod.paths = Module._nodeModulePaths(path.dirname(SCRIPT));
  mod._compile(source, SCRIPT);
  return mod.exports;
}

function captureRun(fn) {
  const originalError = console.error;
  const originalLog = console.log;
  const originalExit = process.exit;
  const stderr = [];
  const stdout = [];
  let exitCode = null;

  console.error = (...args) => stderr.push(args.join(' '));
  console.log = (...args) => stdout.push(args.join(' '));
  process.exit = code => {
    exitCode = code;
    throw new Error(`EXIT:${code}`);
  };

  try {
    fn();
  } catch (error) {
    if (!String(error.message).startsWith('EXIT:')) {
      throw error;
    }
  } finally {
    console.error = originalError;
    console.log = originalLog;
    process.exit = originalExit;
  }

  return { exitCode, stderr, stdout };
}

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

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeValidManifests(rootDir, options = {}) {
  const manifestsDir = path.join(rootDir, 'manifests');
  const rulesPath = path.join(rootDir, 'rules');
  const agentsPath = path.join(rootDir, 'agents');
  fs.mkdirSync(rulesPath, { recursive: true });
  fs.mkdirSync(agentsPath, { recursive: true });

  writeJson(path.join(manifestsDir, 'install-modules.json'), {
    version: 1,
    modules: options.modules || [
      { id: 'rules-core', kind: 'rules', description: 'Rules', paths: ['rules'], targets: ['factory-droid'], dependencies: [], defaultInstall: true, cost: 'light', stability: 'stable' },
      { id: 'agents-core', kind: 'agents', description: 'Agents', paths: ['agents'], targets: ['factory-droid'], dependencies: ['rules-core'], defaultInstall: true, cost: 'light', stability: 'stable' },
    ],
  });

  writeJson(path.join(manifestsDir, 'install-profiles.json'), {
    version: 1,
    profiles: options.profiles || {
      core: { description: 'Core', modules: ['rules-core'] },
      developer: { description: 'Developer', modules: ['rules-core', 'agents-core'] },
      security: { description: 'Security', modules: ['rules-core'] },
      research: { description: 'Research', modules: ['rules-core'] },
      full: { description: 'Full', modules: ['rules-core', 'agents-core'] },
    },
  });

  if (options.components !== false) {
    writeJson(path.join(manifestsDir, 'install-components.json'), {
      version: 1,
      components: options.components || [
        { id: 'baseline:core', family: 'baseline', description: 'Baseline', modules: ['rules-core'] },
        { id: 'capability:agents', family: 'capability', description: 'Agents', modules: ['agents-core'] },
      ],
    });
  }
}

console.log('\n=== Testing validate-install-manifests.js direct coverage ===\n');

let passed = 0;
let failed = 0;

if (test('readJson, normalizeRelativePath, and validateSchema cover success and error branches', () => {
  const tempDir = createTempDir('efd-validate-install-direct-');
  try {
    const jsonPath = path.join(tempDir, 'sample.json');
    const schemaPath = path.join(tempDir, 'schema.json');
    fs.writeFileSync(jsonPath, '{bad-json', 'utf8');
    writeJson(schemaPath, { type: 'object', required: ['name'], properties: { name: { type: 'string' } } });

    const validator = loadValidator();
    assert.throws(() => validator.readJson(jsonPath, 'sample.json'), /Invalid JSON in sample.json/);
    assert.strictEqual(validator.normalizeRelativePath('rules\\common/'), 'rules/common');

    const ajv = new Ajv({ allErrors: true });
    let stderr = [];
    const originalError = console.error;
    console.error = message => stderr.push(message);
    try {
      assert.strictEqual(validator.validateSchema(ajv, schemaPath, { name: 'ok' }, 'sample.json'), false);
      assert.strictEqual(validator.validateSchema(ajv, schemaPath, {}, 'sample.json'), true);
    } finally {
      console.error = originalError;
    }
    assert.ok(stderr.some(line => line.includes('sample.json schema')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateInstallManifests skips when required manifest files are missing', () => {
  const tempDir = createTempDir('efd-validate-install-direct-');
  try {
    const validator = loadValidator({
      REPO_ROOT: tempDir,
      MODULES_MANIFEST_PATH: path.join(tempDir, 'manifests', 'install-modules.json'),
      PROFILES_MANIFEST_PATH: path.join(tempDir, 'manifests', 'install-profiles.json'),
      COMPONENTS_MANIFEST_PATH: path.join(tempDir, 'manifests', 'install-components.json'),
    });
    const result = captureRun(() => validator.validateInstallManifests());
    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.stdout.some(line => line.includes('Install manifests not found')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateInstallManifests reports JSON load and schema failures', () => {
  const tempDir = createTempDir('efd-validate-install-direct-');
  try {
    const manifestsDir = path.join(tempDir, 'manifests');
    fs.mkdirSync(manifestsDir, { recursive: true });
    fs.writeFileSync(path.join(manifestsDir, 'install-modules.json'), '{bad-json', 'utf8');
    writeJson(path.join(manifestsDir, 'install-profiles.json'), { version: 1, profiles: {} });

    let validator = loadValidator({
      REPO_ROOT: tempDir,
      MODULES_MANIFEST_PATH: path.join(manifestsDir, 'install-modules.json'),
      PROFILES_MANIFEST_PATH: path.join(manifestsDir, 'install-profiles.json'),
      COMPONENTS_MANIFEST_PATH: path.join(manifestsDir, 'install-components.json'),
    });
    let result = captureRun(() => validator.validateInstallManifests());
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('Invalid JSON in install-modules.json')));

    writeValidManifests(tempDir, { components: false });
    writeJson(path.join(manifestsDir, 'install-modules.json'), { version: 1, modules: 'bad' });
    validator = loadValidator({
      REPO_ROOT: tempDir,
      MODULES_MANIFEST_PATH: path.join(manifestsDir, 'install-modules.json'),
      PROFILES_MANIFEST_PATH: path.join(manifestsDir, 'install-profiles.json'),
      COMPONENTS_MANIFEST_PATH: path.join(manifestsDir, 'install-components.json'),
    });
    result = captureRun(() => validator.validateInstallManifests());
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('install-modules.json schema')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateInstallManifests reports invalid components manifest schema', () => {
  const tempDir = createTempDir('efd-validate-install-direct-');
  try {
    writeValidManifests(tempDir);

    const manifestsDir = path.join(tempDir, 'manifests');
    writeJson(path.join(manifestsDir, 'install-components.json'), {
      version: 1,
      components: 'bad',
    });

    const validator = loadValidator({
      REPO_ROOT: tempDir,
      MODULES_MANIFEST_PATH: path.join(manifestsDir, 'install-modules.json'),
      PROFILES_MANIFEST_PATH: path.join(manifestsDir, 'install-profiles.json'),
      COMPONENTS_MANIFEST_PATH: path.join(manifestsDir, 'install-components.json'),
    });
    const result = captureRun(() => validator.validateInstallManifests());

    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('install-components.json schema')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateInstallManifests reports module, profile, and component relationship errors', () => {
  const tempDir = createTempDir('efd-validate-install-direct-');
  try {
    writeValidManifests(tempDir, {
      modules: [
        { id: 'rules-core', kind: 'rules', description: 'Rules', paths: ['missing-rules'], targets: ['factory-droid'], dependencies: ['unknown-module', 'rules-core'], defaultInstall: true, cost: 'light', stability: 'stable' },
        { id: 'rules-core', kind: 'rules', description: 'Duplicate Rules', paths: ['missing-rules'], targets: ['factory-droid'], dependencies: [], defaultInstall: true, cost: 'light', stability: 'stable' },
        { id: 'agents-core', kind: 'agents', description: 'Agents', paths: ['missing-agents'], targets: ['factory-droid'], dependencies: [], defaultInstall: true, cost: 'light', stability: 'stable' },
      ],
      profiles: {
        core: { description: 'Core', modules: ['rules-core', 'rules-core'] },
        developer: { description: 'Developer', modules: ['ghost-module'] },
        security: { description: 'Security', modules: ['rules-core'] },
        research: { description: 'Research', modules: ['rules-core'] },
        full: { description: 'Full', modules: ['rules-core'] },
      },
      components: [
        { id: 'lang:wrong', family: 'baseline', description: 'Wrong', modules: ['rules-core', 'rules-core'] },
        { id: 'lang:wrong', family: 'capability', description: 'Duplicate id', modules: ['ghost-module'] },
      ],
    });

    const manifestsDir = path.join(tempDir, 'manifests');
    const validator = loadValidator({
      REPO_ROOT: tempDir,
      MODULES_MANIFEST_PATH: path.join(manifestsDir, 'install-modules.json'),
      PROFILES_MANIFEST_PATH: path.join(manifestsDir, 'install-profiles.json'),
      COMPONENTS_MANIFEST_PATH: path.join(manifestsDir, 'install-components.json'),
    });
    const result = captureRun(() => validator.validateInstallManifests());

    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('Duplicate install module id: rules-core')));
    assert.ok(result.stderr.some(line => line.includes('depends on unknown module unknown-module')));
    assert.ok(result.stderr.some(line => line.includes('cannot depend on itself')));
    assert.ok(result.stderr.some(line => line.includes('references missing path: missing-rules')));
    assert.ok(result.stderr.some(line => line.includes('claimed by both rules-core and rules-core')));
    assert.ok(result.stderr.some(line => line.includes('Profile core contains duplicate module rules-core')));
    assert.ok(result.stderr.some(line => line.includes('Profile developer references unknown module ghost-module')));
    assert.ok(result.stderr.some(line => line.includes('full profile is missing module agents-core')));
    assert.ok(result.stderr.some(line => line.includes('Duplicate install component id: lang:wrong')));
    assert.ok(result.stderr.some(line => line.includes('does not match expected baseline prefix')));
    assert.ok(result.stderr.some(line => line.includes('references unknown module ghost-module')));
    assert.ok(result.stderr.some(line => line.includes('contains duplicate module rules-core')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateInstallManifests succeeds with valid manifests and no components manifest present', () => {
  const tempDir = createTempDir('efd-validate-install-direct-');
  try {
    writeValidManifests(tempDir, { components: false });
    const manifestsDir = path.join(tempDir, 'manifests');
    const validator = loadValidator({
      REPO_ROOT: tempDir,
      MODULES_MANIFEST_PATH: path.join(manifestsDir, 'install-modules.json'),
      PROFILES_MANIFEST_PATH: path.join(manifestsDir, 'install-profiles.json'),
      COMPONENTS_MANIFEST_PATH: path.join(manifestsDir, 'install-components.json'),
    });
    const result = captureRun(() => validator.validateInstallManifests());
    assert.strictEqual(result.exitCode, null);
    assert.ok(result.stdout.some(line => line.includes('Validated 2 install modules, 0 install components, and 5 profiles')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
