"use strict";

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'harness-audit.js');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function loadInternals() {
  let source = fs.readFileSync(SCRIPT, 'utf8');
  source = source.replace(
    /module\.exports = \{\s*buildReport,\s*parseArgs,\s*\};\s*$/s,
    `module.exports = {
      buildReport,
      parseArgs,
      __test: {
        normalizeScope,
        fileExists,
        readText,
        countFiles,
        safeRead,
        safeParseJson,
        hasFileWithExtension,
        detectTargetMode,
        findPluginInstall,
        getRepoChecks,
        getConsumerChecks,
        summarizeCategoryScores,
        printText,
        showHelp
      }
    };\n`
  );

  const mod = new Module(SCRIPT, module);
  mod.filename = SCRIPT;
  mod.paths = Module._nodeModulePaths(path.dirname(SCRIPT));
  mod._compile(source, SCRIPT);
  return mod.exports;
}

function captureConsole(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit;
  const stdout = [];
  const stderr = [];
  let exitCode = null;

  console.log = (...args) => stdout.push(args.join(' '));
  console.error = (...args) => stderr.push(args.join(' '));
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
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  }

  return { stdout, stderr, exitCode };
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

console.log('\n=== Testing harness-audit direct coverage ===\n');

const loaded = loadInternals();
const internals = loaded.__test;
let passed = 0;
let failed = 0;

if (test('parseArgs and normalizeScope cover help, flags, positional values, and invalid input', () => {
  const parsed = loaded.parseArgs(['node', 'script', 'hooks', '--format=json', '--root=/tmp/demo']);
  assert.strictEqual(parsed.scope, 'hooks');
  assert.strictEqual(parsed.format, 'json');
  assert.strictEqual(parsed.root, path.resolve('/tmp/demo'));

  const help = loaded.parseArgs(['node', 'script', '--help']);
  assert.strictEqual(help.help, true);
  assert.strictEqual(internals.normalizeScope('Repo'), 'repo');
  assert.throws(() => internals.normalizeScope('bogus'), /Invalid scope/);
  assert.throws(() => loaded.parseArgs(['node', 'script', '--format', 'yaml']), /Invalid format/);
  assert.throws(() => loaded.parseArgs(['node', 'script', '--wat']), /Unknown argument/);
})) passed++; else failed++;

if (test('filesystem helpers cover missing files, nested counts, JSON parsing, and extension scans', () => {
  const rootDir = createTempDir('efd-harness-audit-direct-');
  try {
    fs.mkdirSync(path.join(rootDir, 'nested', 'deep'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'nested', 'file.test.js'), 'ok');
    fs.writeFileSync(path.join(rootDir, 'nested', 'deep', 'workflow.yml'), 'name: test');
    fs.writeFileSync(path.join(rootDir, 'data.json'), '{"ok":true}');
    fs.writeFileSync(path.join(rootDir, 'bad.json'), '{bad');

    assert.strictEqual(internals.fileExists(rootDir, 'nested/file.test.js'), true);
    assert.strictEqual(internals.fileExists(rootDir, 'missing.txt'), false);
    assert.strictEqual(internals.readText(rootDir, 'data.json'), '{"ok":true}');
    assert.strictEqual(internals.countFiles(rootDir, 'nested', '.js'), 1);
    assert.strictEqual(internals.countFiles(rootDir, 'missing', '.js'), 0);
    assert.strictEqual(internals.safeRead(rootDir, 'missing.txt'), '');
    assert.deepStrictEqual(internals.safeParseJson('{"ok":true}'), { ok: true });
    assert.strictEqual(internals.safeParseJson('{bad'), null);
    assert.strictEqual(internals.safeParseJson('  '), null);
    assert.strictEqual(internals.hasFileWithExtension(rootDir, '.github', '.yml'), false);
    assert.strictEqual(internals.hasFileWithExtension(rootDir, 'nested', ['.yaml', '.yml']), true);
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('detectTargetMode and findPluginInstall cover repo, consumer, direct, plugin, and cache installs', () => {
  const rootDir = createTempDir('efd-harness-audit-direct-');
  const previousHome = process.env.HOME;
  try {
    fs.writeFileSync(path.join(rootDir, 'package.json'), JSON.stringify({ name: 'efd-universal' }, null, 2));
    assert.strictEqual(internals.detectTargetMode(rootDir), 'repo');

    fs.writeFileSync(path.join(rootDir, 'package.json'), JSON.stringify({ name: 'consumer-app' }, null, 2));
    fs.mkdirSync(path.join(rootDir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, '.factory', 'droids'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'scripts', 'harness-audit.js'), '// audit');
    fs.writeFileSync(path.join(rootDir, '.factory', 'settings.json'), '{}');
    assert.strictEqual(internals.detectTargetMode(rootDir), 'repo');

    fs.rmSync(path.join(rootDir, 'scripts'), { recursive: true, force: true });
    fs.rmSync(path.join(rootDir, '.factory'), { recursive: true, force: true });
    fs.rmSync(path.join(rootDir, 'skills'), { recursive: true, force: true });
    assert.strictEqual(internals.detectTargetMode(rootDir), 'consumer');

    fs.mkdirSync(path.join(rootDir, '.factory', 'scripts', 'lib'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, '.factory', 'scripts', 'lib', 'utils.js'), '// direct');
    assert.strictEqual(internals.findPluginInstall(rootDir), path.join(rootDir, '.factory'));

    fs.rmSync(path.join(rootDir, '.factory'), { recursive: true, force: true });
    fs.mkdirSync(path.join(rootDir, '.factory', 'plugins', 'everything-factory-droid'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, '.factory', 'plugins', 'everything-factory-droid', 'plugin.json'), '{}');
    assert.ok(internals.findPluginInstall(rootDir).includes('everything-factory-droid/plugin.json'));

    fs.rmSync(path.join(rootDir, '.factory'), { recursive: true, force: true });
    process.env.HOME = rootDir;
    fs.mkdirSync(path.join(rootDir, '.factory', 'plugins', 'cache', 'everything-factory-droid', 'org', '1.0.0'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, '.factory', 'plugins', 'cache', 'everything-factory-droid', 'org', '1.0.0', 'plugin.json'), '{}');
    assert.ok(internals.findPluginInstall('/tmp/consumer').includes(path.join('cache', 'everything-factory-droid', 'org', '1.0.0', 'plugin.json')));
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('repo and consumer checks feed report scoring, printText, and help output branches', () => {
  const rootDir = createTempDir('efd-harness-audit-direct-');
  const previousHome = process.env.HOME;
  try {
    process.env.HOME = rootDir;
    fs.mkdirSync(path.join(rootDir, '.factory', 'plugins', 'everything-factory-droid'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, '.factory', 'plugins', 'everything-factory-droid', 'plugin.json'), '{}');
    fs.mkdirSync(path.join(rootDir, '.github', 'workflows'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'tests'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'hooks', 'memory-persistence'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'skills', 'continuous-learning-v2'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'skills', 'eval-harness'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'commands'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'scripts', 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'package.json'), JSON.stringify({ name: 'consumer-app', scripts: { test: 'node tests/app.test.js' } }, null, 2));
    fs.writeFileSync(path.join(rootDir, 'AGENTS.md'), '# instructions');
    fs.writeFileSync(path.join(rootDir, '.mcp.json'), '{}');
    fs.writeFileSync(path.join(rootDir, '.gitignore'), '.env\n');
    fs.writeFileSync(path.join(rootDir, '.factory', 'settings.json'), 'PreToolUse');
    fs.writeFileSync(path.join(rootDir, '.github', 'workflows', 'ci.yml'), 'name: ci');
    fs.writeFileSync(path.join(rootDir, 'tests', 'app.test.js'), 'ok');

    const consumerChecks = internals.getConsumerChecks(rootDir);
    assert.ok(consumerChecks.some(check => check.id === 'consumer-plugin-install' && check.pass));
    assert.ok(consumerChecks.some(check => check.id === 'consumer-ci-workflow' && check.pass));

    fs.writeFileSync(path.join(rootDir, 'hooks', 'hooks.json'), '{}');
    fs.writeFileSync(path.join(rootDir, 'scripts', 'doctor.js'), '// doctor');
    fs.writeFileSync(path.join(rootDir, 'scripts', 'harness-audit.js'), '// audit');
    fs.writeFileSync(path.join(rootDir, 'scripts', 'hooks', 'suggest-compact.js'), '// hook');
    fs.writeFileSync(path.join(rootDir, 'scripts', 'hooks', 'session-start.js'), '// hook');
    fs.writeFileSync(path.join(rootDir, 'scripts', 'hooks', 'session-end.js'), '// hook');
    fs.writeFileSync(path.join(rootDir, 'tests', 'run-all.js'), '// tests');
    fs.writeFileSync(path.join(rootDir, 'commands', 'model-route.md'), '# route');
    fs.writeFileSync(path.join(rootDir, 'commands', 'eval.md'), '# eval');
    fs.writeFileSync(path.join(rootDir, 'commands', 'verify.md'), '# verify');
    fs.writeFileSync(path.join(rootDir, 'commands', 'checkpoint.md'), '# checkpoint');
    fs.writeFileSync(path.join(rootDir, 'commands', 'security-scan.md'), '# scan');
    fs.writeFileSync(path.join(rootDir, 'skills', 'continuous-learning-v2', 'SKILL.md'), '# learn');
    fs.writeFileSync(path.join(rootDir, 'skills', 'eval-harness', 'SKILL.md'), '# eval');
    fs.writeFileSync(path.join(rootDir, 'agents', 'security-reviewer.md'), '# security');
    fs.writeFileSync(path.join(rootDir, 'docs', 'token-optimization.md'), '# tokens');

    const repoChecks = internals.getRepoChecks(rootDir);
    assert.ok(repoChecks.some(check => check.id === 'quality-doctor-script' && check.pass));
    assert.ok(repoChecks.some(check => check.id === 'security-agent' && check.pass));

    const report = loaded.buildReport('repo', { rootDir, targetMode: 'repo' });
    assert.strictEqual(report.scope, 'repo');
    assert.ok(report.max_score > 0);

    const summary = internals.summarizeCategoryScores([
      { category: 'Tool Coverage', points: 2, pass: true },
      { category: 'Tool Coverage', points: 2, pass: false },
    ]);
    assert.strictEqual(summary['Tool Coverage'].score, 5);
    assert.strictEqual(summary['Context Efficiency'].score, 0);

    let output = captureConsole(() => internals.printText({
      ...report,
      checks: [{ pass: false }, { pass: true }],
      top_actions: [{ category: 'Tool Coverage', action: 'Fix it', path: 'x' }],
    }));
    assert.ok(output.stdout.some(line => line.includes('Top 3 Actions:')));

    output = captureConsole(() => internals.showHelp(0));
    assert.strictEqual(output.exitCode, 0);
    assert.ok(output.stdout.some(line => line.includes('Usage: node scripts/harness-audit.js')));
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
    cleanup(rootDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
