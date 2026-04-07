'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'lib', 'install-lifecycle.js');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function loadInternals() {
  let source = fs.readFileSync(SCRIPT, 'utf8');
  source = source.replace(
    /module\.exports = \{\s*DEFAULT_REPO_ROOT,\s*buildDoctorReport,\s*discoverInstalledStates,\s*normalizeTargets,\s*repairInstalledStates,\s*uninstallInstalledStates,\s*\};\s*$/s,
    `module.exports = {
      DEFAULT_REPO_ROOT,
      buildDoctorReport,
      discoverInstalledStates,
      normalizeTargets,
      repairInstalledStates,
      uninstallInstalledStates,
      __test: {
        compareStringArrays,
        parseJsonLikeValue,
        getOperationTextContent,
        getOperationJsonPayload,
        getOperationPreviousContent,
        getOperationPreviousJson,
        deepMergeJson,
        jsonContainsSubset,
        deepRemoveJsonSubset,
        executeRepairOperation,
        executeUninstallOperation,
        inspectManagedOperation,
        summarizeManagedOperationHealth,
        determineStatus
      }
    };\n`
  );

  const mod = new Module(SCRIPT, module);
  mod.filename = SCRIPT;
  mod.paths = Module._nodeModulePaths(path.dirname(SCRIPT));
  mod._compile(source, SCRIPT);
  return mod.exports.__test;
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

const internals = loadInternals();

console.log('\n=== Testing install-lifecycle internals ===\n');

let passed = 0;
let failed = 0;

if (test('compareStringArrays and parseJsonLikeValue cover mismatch and parsing branches', () => {
  assert.strictEqual(internals.compareStringArrays(['a'], ['a']), true);
  assert.strictEqual(internals.compareStringArrays(['a'], ['b']), false);
  assert.strictEqual(internals.compareStringArrays(['a'], []), false);
  assert.deepStrictEqual(internals.parseJsonLikeValue('{"ok":true}', 'payload'), { ok: true });
  assert.deepStrictEqual(internals.parseJsonLikeValue(['a'], 'payload'), ['a']);
  assert.throws(() => internals.parseJsonLikeValue('{bad', 'payload'), /Invalid payload/);
  assert.throws(() => internals.parseJsonLikeValue(() => {}, 'payload'), /expected JSON-compatible data/);
})) passed++; else failed++;

if (test('operation content helpers cover candidate-key fallbacks', () => {
  assert.strictEqual(internals.getOperationTextContent({ templateOutput: 'rendered' }), 'rendered');
  assert.strictEqual(internals.getOperationTextContent({}), null);
  assert.deepStrictEqual(internals.getOperationJsonPayload({ kind: 'merge-json', value: '{"a":1}' }), { a: 1 });
  assert.strictEqual(internals.getOperationJsonPayload({ kind: 'merge-json' }), undefined);
  assert.strictEqual(internals.getOperationPreviousContent({ backupContent: 'old' }), 'old');
  assert.strictEqual(internals.getOperationPreviousContent({}), null);
  assert.deepStrictEqual(internals.getOperationPreviousJson({ kind: 'merge-json', originalValue: { a: 1 } }), { a: 1 });
  assert.strictEqual(internals.getOperationPreviousJson({ kind: 'merge-json' }), undefined);
})) passed++; else failed++;

if (test('deepMergeJson, jsonContainsSubset, and deepRemoveJsonSubset cover nested/object/array branches', () => {
  assert.deepStrictEqual(
    internals.deepMergeJson({ a: { b: 1 }, keep: true }, { a: { c: 2 }, next: [1] }),
    { a: { b: 1, c: 2 }, keep: true, next: [1] }
  );
  assert.deepStrictEqual(internals.deepMergeJson([], { a: 1 }), { a: 1 });

  assert.strictEqual(internals.jsonContainsSubset({ a: { b: 1 }, c: [1, 2] }, { a: { b: 1 } }), true);
  assert.strictEqual(internals.jsonContainsSubset({ c: [1, 2] }, { c: [1, 9] }), false);
  assert.strictEqual(internals.jsonContainsSubset('x', 'x'), true);

  const removedObject = internals.deepRemoveJsonSubset(
    { a: { b: 1, c: 2 }, arr: [1, 2], keep: true },
    { a: { b: 1 }, arr: [1, 2] }
  );
  assert.deepStrictEqual(removedObject, { a: { c: 2 }, keep: true });
  assert.strictEqual(internals.deepRemoveJsonSubset([1, 2], [1, 2]).toString(), 'Symbol(json-remove)');
  assert.strictEqual(internals.deepRemoveJsonSubset('same', 'same').toString(), 'Symbol(json-remove)');
  assert.strictEqual(internals.deepRemoveJsonSubset({ keep: true }, { missing: 1 }).keep, true);
})) passed++; else failed++;

if (test('executeRepairOperation covers copy, template, merge, remove, and unsupported branches', () => {
  const tempDir = createTempDir('efd-install-lifecycle-direct-');

  try {
    const repoRoot = path.join(tempDir, 'repo');
    const projectRoot = path.join(tempDir, 'project');
    fs.mkdirSync(repoRoot, { recursive: true });
    fs.mkdirSync(projectRoot, { recursive: true });

    const copySource = path.join(repoRoot, 'rules', 'test.md');
    const copyDest = path.join(projectRoot, 'rules', 'test.md');
    fs.mkdirSync(path.dirname(copySource), { recursive: true });
    fs.writeFileSync(copySource, 'source\n', 'utf8');

    internals.executeRepairOperation(repoRoot, {
      kind: 'copy-file',
      sourceRelativePath: 'rules/test.md',
      destinationPath: copyDest
    });
    assert.strictEqual(fs.readFileSync(copyDest, 'utf8'), 'source\n');
    assert.throws(
      () => internals.executeRepairOperation(repoRoot, { kind: 'copy-file', sourceRelativePath: 'missing.md', destinationPath: copyDest }),
      /Missing source file for repair/
    );

    const templateDest = path.join(projectRoot, 'template.txt');
    internals.executeRepairOperation(repoRoot, {
      kind: 'render-template',
      templateOutput: 'rendered content',
      destinationPath: templateDest
    });
    assert.strictEqual(fs.readFileSync(templateDest, 'utf8'), 'rendered content');
    assert.throws(
      () => internals.executeRepairOperation(repoRoot, { kind: 'render-template', destinationPath: templateDest }),
      /Missing rendered content for repair/
    );

    const mergeDest = path.join(projectRoot, 'config.json');
    fs.writeFileSync(mergeDest, JSON.stringify({ keep: true, nested: { a: 1 } }, null, 2));
    internals.executeRepairOperation(repoRoot, {
      kind: 'merge-json',
      payload: { nested: { b: 2 }, added: true },
      destinationPath: mergeDest
    });
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(mergeDest, 'utf8')), {
      keep: true,
      nested: { a: 1, b: 2 },
      added: true
    });
    assert.throws(
      () => internals.executeRepairOperation(repoRoot, { kind: 'merge-json', destinationPath: mergeDest }),
      /Missing merge payload for repair/
    );

    const removeDest = path.join(projectRoot, 'remove-me.txt');
    fs.writeFileSync(removeDest, 'bye', 'utf8');
    internals.executeRepairOperation(repoRoot, { kind: 'remove', destinationPath: removeDest });
    assert.ok(!fs.existsSync(removeDest));
    internals.executeRepairOperation(repoRoot, { kind: 'remove', destinationPath: removeDest });

    assert.throws(
      () => internals.executeRepairOperation(repoRoot, { kind: 'mystery', destinationPath: removeDest }),
      /Unsupported repair operation kind/
    );
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('executeUninstallOperation covers restore, prune, noop, and unsupported branches', () => {
  const tempDir = createTempDir('efd-install-lifecycle-direct-');

  try {
    const existingFile = path.join(tempDir, 'existing.txt');
    fs.writeFileSync(existingFile, 'current', 'utf8');
    let outcome = internals.executeUninstallOperation({ kind: 'copy-file', destinationPath: existingFile });
    assert.deepStrictEqual(outcome.removedPaths, [existingFile]);
    outcome = internals.executeUninstallOperation({ kind: 'copy-file', destinationPath: existingFile });
    assert.deepStrictEqual(outcome.removedPaths, []);

    const templateFile = path.join(tempDir, 'template.txt');
    fs.writeFileSync(templateFile, 'managed', 'utf8');
    outcome = internals.executeUninstallOperation({ kind: 'render-template', destinationPath: templateFile, previousContent: 'original' });
    assert.strictEqual(fs.readFileSync(templateFile, 'utf8'), 'original');
    outcome = internals.executeUninstallOperation({ kind: 'render-template', destinationPath: templateFile, previousJson: { restored: true } });
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(templateFile, 'utf8')), { restored: true });
    fs.rmSync(templateFile, { force: true });
    outcome = internals.executeUninstallOperation({ kind: 'render-template', destinationPath: templateFile });
    assert.deepStrictEqual(outcome.removedPaths, []);
    fs.writeFileSync(templateFile, 'managed', 'utf8');
    outcome = internals.executeUninstallOperation({ kind: 'render-template', destinationPath: templateFile });
    assert.deepStrictEqual(outcome.removedPaths, [templateFile]);

    const mergeFile = path.join(tempDir, 'merge.json');
    fs.writeFileSync(mergeFile, JSON.stringify({ keep: true, remove: true, nested: { remove: true } }, null, 2));
    outcome = internals.executeUninstallOperation({ kind: 'merge-json', destinationPath: mergeFile, previousContent: '{"restored":"text"}' });
    assert.deepStrictEqual(outcome.removedPaths, []);
    assert.strictEqual(fs.readFileSync(mergeFile, 'utf8'), '{"restored":"text"}');
    outcome = internals.executeUninstallOperation({ kind: 'merge-json', destinationPath: mergeFile, previousJson: { restored: 'json' } });
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(mergeFile, 'utf8')), { restored: 'json' });
    fs.writeFileSync(mergeFile, JSON.stringify({ remove: true }, null, 2));
    outcome = internals.executeUninstallOperation({ kind: 'merge-json', destinationPath: mergeFile, payload: { remove: true } });
    assert.deepStrictEqual(outcome.removedPaths, [mergeFile]);
    fs.writeFileSync(mergeFile, JSON.stringify({ keep: true, remove: true }, null, 2));
    outcome = internals.executeUninstallOperation({ kind: 'merge-json', destinationPath: mergeFile, payload: { remove: true } });
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(mergeFile, 'utf8')), { keep: true });
    assert.throws(
      () => internals.executeUninstallOperation({ kind: 'merge-json', destinationPath: mergeFile }),
      /Missing merge payload for uninstall/
    );

    const removedFile = path.join(tempDir, 'removed.txt');
    outcome = internals.executeUninstallOperation({ kind: 'remove', destinationPath: removedFile, previousContent: 'restore me' });
    assert.strictEqual(fs.readFileSync(removedFile, 'utf8'), 'restore me');
    outcome = internals.executeUninstallOperation({ kind: 'remove', destinationPath: path.join(tempDir, 'removed.json'), previousJson: { ok: true } });
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(tempDir, 'removed.json'), 'utf8')), { ok: true });
    outcome = internals.executeUninstallOperation({ kind: 'remove', destinationPath: path.join(tempDir, 'noop.txt') });
    assert.deepStrictEqual(outcome.removedPaths, []);

    assert.throws(
      () => internals.executeUninstallOperation({ kind: 'mystery', destinationPath: 'x' }),
      /Unsupported uninstall operation kind/
    );
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('inspectManagedOperation and summarizeManagedOperationHealth cover status branches', () => {
  const tempDir = createTempDir('efd-install-lifecycle-direct-');

  try {
    const repoRoot = path.join(tempDir, 'repo');
    const projectRoot = path.join(tempDir, 'project');
    fs.mkdirSync(repoRoot, { recursive: true });
    fs.mkdirSync(projectRoot, { recursive: true });

    const sourceFile = path.join(repoRoot, 'rules', 'rule.md');
    const managedFile = path.join(projectRoot, 'rules', 'rule.md');
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    fs.mkdirSync(path.dirname(managedFile), { recursive: true });
    fs.writeFileSync(sourceFile, 'expected', 'utf8');

    assert.strictEqual(internals.inspectManagedOperation(repoRoot, {}).status, 'invalid-destination');
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'remove', destinationPath: managedFile }).status, 'ok');
    fs.writeFileSync(managedFile, 'unexpected', 'utf8');
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'remove', destinationPath: managedFile }).status, 'drifted');
    fs.rmSync(managedFile, { force: true });
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'copy-file', destinationPath: managedFile, sourceRelativePath: 'rules/rule.md' }).status, 'missing');
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'copy-file', destinationPath: managedFile, sourceRelativePath: 'missing.md' }).status, 'missing');
    fs.writeFileSync(managedFile, 'different', 'utf8');
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'copy-file', destinationPath: managedFile, sourceRelativePath: 'rules/rule.md' }).status, 'drifted');
    fs.writeFileSync(managedFile, 'expected', 'utf8');
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'copy-file', destinationPath: managedFile, sourceRelativePath: 'rules/rule.md' }).status, 'ok');

    const templateFile = path.join(projectRoot, 'template.txt');
    fs.writeFileSync(templateFile, 'wrong', 'utf8');
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'render-template', destinationPath: templateFile }).status, 'unverified');
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'render-template', destinationPath: templateFile, renderedContent: 'expected' }).status, 'drifted');
    fs.writeFileSync(templateFile, 'expected', 'utf8');
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'render-template', destinationPath: templateFile, renderedContent: 'expected' }).status, 'ok');

    const mergeFile = path.join(projectRoot, 'merge.json');
    fs.writeFileSync(mergeFile, '{"bad-json"', 'utf8');
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'merge-json', destinationPath: mergeFile, payload: { ok: true } }).status, 'drifted');
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'merge-json', destinationPath: mergeFile }).status, 'unverified');
    fs.writeFileSync(mergeFile, JSON.stringify({ ok: true, nested: { keep: true } }, null, 2));
    assert.strictEqual(internals.inspectManagedOperation(repoRoot, { kind: 'merge-json', destinationPath: mergeFile, payload: { ok: true } }).status, 'ok');

    const missingSourceDest = path.join(projectRoot, 'missing-source.txt');
    fs.writeFileSync(missingSourceDest, 'present', 'utf8');
    const unverifiedFile = path.join(projectRoot, 'unverified-template.txt');
    fs.writeFileSync(unverifiedFile, 'present', 'utf8');

    const health = internals.summarizeManagedOperationHealth(repoRoot, [
      { kind: 'copy-file', destinationPath: path.join(projectRoot, 'missing.txt'), sourceRelativePath: 'rules/rule.md' },
      { kind: 'copy-file', destinationPath: managedFile, sourceRelativePath: 'rules/rule.md' },
      { kind: 'remove', destinationPath: mergeFile },
      { kind: 'render-template', destinationPath: path.join(projectRoot, 'new-template.txt') },
      { kind: 'copy-file', destinationPath: missingSourceDest, sourceRelativePath: 'missing.md' },
      { kind: 'render-template', destinationPath: unverifiedFile }
    ]);
    assert.strictEqual(health.missing.length, 2);
    assert.strictEqual(health.drifted.length, 1);
    assert.strictEqual(health.unverified.length, 1);
    assert.strictEqual(health.missingSource.length, 1);
    assert.strictEqual(internals.determineStatus([]), 'ok');
    assert.strictEqual(internals.determineStatus([{ severity: 'warning' }]), 'warning');
    assert.strictEqual(internals.determineStatus([{ severity: 'error' }]), 'error');
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
