"use strict";

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'ci', 'catalog.js');

function stripShebang(source) {
  return source.startsWith('#!') ? source.replace(/^#!.*\r?\n/, '') : source;
}

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function loadInternals(rootDir) {
  let source = stripShebang(fs.readFileSync(SCRIPT, 'utf8'));
  source = source.replace(/const ROOT = .*?;/, `const ROOT = ${JSON.stringify(rootDir)};`);
  source = source.replace(/const README_PATH = .*?;/, `const README_PATH = ${JSON.stringify(path.join(rootDir, 'README.md'))};`);
  source = source.replace(/const AGENTS_PATH = .*?;/, `const AGENTS_PATH = ${JSON.stringify(path.join(rootDir, 'AGENTS.md'))};`);
  source = source.replace(/const README_ZH_CN_PATH = .*?;/, `const README_ZH_CN_PATH = ${JSON.stringify(path.join(rootDir, 'README.zh-CN.md'))};`);
  source = source.replace(/const DOCS_ZH_CN_README_PATH = .*?;/, `const DOCS_ZH_CN_README_PATH = ${JSON.stringify(path.join(rootDir, 'docs', 'zh-CN', 'README.md'))};`);
  source = source.replace(/const DOCS_ZH_CN_AGENTS_PATH = .*?;/, `const DOCS_ZH_CN_AGENTS_PATH = ${JSON.stringify(path.join(rootDir, 'docs', 'zh-CN', 'AGENTS.md'))};`);
  source = source.replace(/const DOCS_PT_BR_README_PATH = .*?;/, `const DOCS_PT_BR_README_PATH = ${JSON.stringify(path.join(rootDir, 'docs', 'pt-BR', 'README.md'))};`);
  source = source.replace(/const DOCS_TR_README_PATH = .*?;/, `const DOCS_TR_README_PATH = ${JSON.stringify(path.join(rootDir, 'docs', 'tr', 'README.md'))};`);

  source = source.replace(
    /try \{\s*main\(\);\s*\} catch \(error\) \{\s*console\.error\(`ERROR: \$\{error\.message\}`\);\s*process\.exit\(1\);\s*\}\s*$/s,
    `module.exports = {
      normalizePathSegments,
      listMatchingFiles,
      buildCatalog,
      readFileOrThrow,
      writeFileOrThrow,
      parseZhRootReadmeExpectations,
      parseZhAgentsDocExpectations,
      syncEnglishAgents,
      syncZhRootReadme,
      syncZhDocsReadme,
      syncZhAgents,
      renderText,
      renderMarkdown,
      evaluateExpectations,
      formatExpectation
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
  const stdout = [];
  const stderr = [];
  console.log = (...args) => stdout.push(args.join(' '));
  console.error = (...args) => stderr.push(args.join(' '));
  try {
    fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  return { stdout, stderr };
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

console.log('\n=== Testing catalog.js extra coverage ===\n');

let passed = 0;
let failed = 0;

if (test('catalog internals cover file discovery, read/write errors, and zh parsers/syncs', () => {
  const rootDir = createTempDir('efd-catalog-extra-');
  try {
    fs.mkdirSync(path.join(rootDir, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'commands'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'skills', 'demo'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'skills', 'incomplete-skill'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'docs', 'zh-CN'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'agents', 'planner.md'), '# planner');
    fs.writeFileSync(path.join(rootDir, 'agents', 'notes.txt'), 'ignore me');
    fs.writeFileSync(path.join(rootDir, 'commands', 'plan.md'), '# plan');
    fs.writeFileSync(path.join(rootDir, 'commands', 'plan.txt'), 'ignore me');
    fs.writeFileSync(path.join(rootDir, 'skills', 'demo', 'SKILL.md'), '# skill');

    const internals = loadInternals(rootDir);
    assert.strictEqual(internals.normalizePathSegments(path.join('agents', 'planner.md')), 'agents/planner.md');
    assert.deepStrictEqual(internals.listMatchingFiles('agents', entry => entry.isFile() && entry.name.endsWith('.md')), ['agents/planner.md']);
    assert.deepStrictEqual(internals.listMatchingFiles('missing', entry => entry.isFile()), []);
    const catalog = internals.buildCatalog();
    assert.strictEqual(catalog.agents.count, 1);
    assert.strictEqual(catalog.commands.count, 1);
    assert.strictEqual(catalog.skills.count, 1);

    assert.throws(() => internals.readFileOrThrow(path.join(rootDir, 'missing.md')), /Failed to read/);
    const blockedDir = path.join(rootDir, 'blocked');
    fs.mkdirSync(blockedDir);
    assert.throws(() => internals.writeFileOrThrow(path.join(blockedDir, 'nested', 'file.md'), 'x'), /Failed to write/);

    const zhRootExpectations = internals.parseZhRootReadmeExpectations('你现在可以使用 3 个代理、4 个技能和 5 个命令。');
    assert.strictEqual(zhRootExpectations[0].expected, 3);
    assert.throws(() => internals.parseZhRootReadmeExpectations('缺少摘要'), /quick-start catalog summary/);

    const zhAgents = internals.parseZhAgentsDocExpectations('这是一个插件，提供 3 个专业代理、4+ 项技能、5 条命令。\n\nagents/ — 3 个专业子代理\nskills/ — 4+ 个工作流技能和领域知识\ncommands/ — 5 个斜杠命令\n');
    assert.strictEqual(zhAgents.find(item => item.category === 'skills' && item.source.includes('summary')).mode, 'minimum');
    assert.throws(
      () => internals.parseZhAgentsDocExpectations('这是一个插件，提供 3 个专业代理、4 项技能、5 条命令。'),
      /project structure is missing the agents entry/
    );

    const nextEnglishAgents = internals.syncEnglishAgents('providing 9 specialized agents, 9+ skills, 9 commands\n\nagents/ — 9 specialized subagents\nskills/ — 9+ workflow skills and domain knowledge\ncommands/ — 9 slash commands\n', {
      agents: { count: 3 },
      commands: { count: 2 },
      skills: { count: 5 },
    });
    assert.ok(nextEnglishAgents.includes('providing 3 specialized agents, 5+ skills, 2 commands'));
    assert.ok(nextEnglishAgents.includes('skills/ — 5+ workflow skills and domain knowledge'));

    const nextZhRoot = internals.syncZhRootReadme('你现在可以使用 9 个代理、9 个技能和 9 个命令。', {
      agents: { count: 3 },
      commands: { count: 2 },
      skills: { count: 5 },
    });
    assert.ok(nextZhRoot.includes('3 个代理、5 个技能和 2 个命令'));

    const nextZhDocs = internals.syncZhDocsReadme('你现在可以使用 9 个智能体、9 项技能和 9 个命令了。\n| 智能体 | PASS: 9 个 | Factory Droid |\n| 命令 | PASS: 9 个 | Factory Droid |\n| 技能 | PASS: 9 项 | Factory Droid |\n\n## Factory Droid 聚焦\n\n| 智能体 | 9 个 | Factory Droid |\n| 命令 | 9 个 | Factory Droid |\n| 技能 | 9 项 | Factory Droid |\n', {
      agents: { count: 3 },
      commands: { count: 2 },
      skills: { count: 5 },
    });
    assert.ok(nextZhDocs.includes('3 个智能体、5 项技能和 2 个命令'));

    const nextZhAgents = internals.syncZhAgents('提供 9 个专业代理、9+ 项技能、9 条命令。\n\nagents/ — 9 个专业子代理\nskills/ — 9+ 个工作流技能和领域知识\ncommands/ — 9 个斜杠命令\n', {
      agents: { count: 3 },
      commands: { count: 2 },
      skills: { count: 5 },
    });
    assert.ok(nextZhAgents.includes('提供 3 个专业代理、5+ 项技能、2 条命令'));
    assert.ok(nextZhAgents.includes('skills/ — 5+ 个工作流技能和领域知识'));
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('formatting and rendering helpers cover success and mismatch output branches', () => {
  const rootDir = createTempDir('efd-catalog-extra-');
  try {
    const internals = loadInternals(rootDir);
    const catalog = {
      agents: { count: 2, glob: 'agents/*.md' },
      commands: { count: 1, glob: 'commands/*.md' },
      skills: { count: 3, glob: 'skills/*/SKILL.md' },
    };
    const checks = internals.evaluateExpectations(catalog, [
      { category: 'agents', mode: 'exact', expected: 2, source: 'ok agents' },
      { category: 'skills', mode: 'minimum', expected: 2, source: 'ok skills' },
      { category: 'commands', mode: 'exact', expected: 9, source: 'bad commands' },
    ]);
    assert.ok(internals.formatExpectation(checks[0]).includes('= 2'));
    assert.ok(internals.formatExpectation(checks[1]).includes('>= 2'));

    let output = captureConsole(() => internals.renderText({ catalog, checks: checks.filter(check => check.ok) }));
    assert.ok(output.stdout.some(line => line.includes('Documentation counts match the repository catalog.')));

    output = captureConsole(() => internals.renderMarkdown({ catalog, checks }));
    assert.ok(output.stdout.some(line => line.includes('| Category | Count | Pattern |')));
    assert.ok(output.stdout.some(line => line.includes('bad commands')));
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
