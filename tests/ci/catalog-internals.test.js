'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'ci', 'catalog.js');

function stripShebang(source) {
  return source.startsWith('#!') ? source.replace(/^#!.*\r?\n/, '') : source;
}

function loadCatalogInternals() {
  let source = stripShebang(fs.readFileSync(SCRIPT, 'utf8'));
  source = source.replace(
    /try \{\s*main\(\);\s*\} catch \(error\) \{\s*console\.error\(`ERROR: \$\{error\.message\}`\);\s*process\.exit\(1\);\s*\}\s*$/s,
    `module.exports = {
      replaceOrThrow,
      parseReadmeExpectations,
      parsePtBrReadmeExpectations,
      parseTrReadmeExpectations,
      parseAgentsDocExpectations,
      parseZhDocsReadmeExpectations,
      syncEnglishReadme,
      syncPtBrReadme,
      syncTrReadme,
      evaluateExpectations,
      formatExpectation,
      renderMarkdown,
      renderText
    };\n`
  );

  const mod = new Module(SCRIPT, module);
  mod.filename = SCRIPT;
  mod.paths = Module._nodeModulePaths(path.dirname(SCRIPT));
  mod._compile(source, SCRIPT);
  return mod.exports;
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

console.log('\n=== Testing catalog.js internals ===\n');

const catalogInternals = loadCatalogInternals();
let passed = 0;
let failed = 0;

if (test('replaceOrThrow throws when a marker is missing', () => {
  assert.throws(
    () => catalogInternals.replaceOrThrow('hello', /world/, 'x', 'README.md'),
    /README\.md is missing the expected catalog marker/
  );
})) passed++; else failed++;

if (test('parseReadmeExpectations and zh docs parsers reject missing rows', () => {
  assert.throws(
    () => catalogInternals.parseReadmeExpectations('Access to 1 agents, 1 skills, and 1 commands.'),
    /comparison table is missing the agents row/
  );
  assert.throws(
    () => catalogInternals.parseReadmeExpectations('| Agents | PASS: 1 agents | Factory Droid |'),
    /quick-start catalog summary/
  );
  assert.throws(
    () => catalogInternals.parseZhDocsReadmeExpectations('你现在可以使用 1 个智能体、1 项技能和 1 个命令了。'),
    /comparison table is missing the agents row/
  );
})) passed++; else failed++;

if (test('parseAgentsDocExpectations supports minimum skill counts and missing structure errors', () => {
  const expectations = catalogInternals.parseAgentsDocExpectations(
    'Repository providing 3 specialized agents, 7+ skills, 2 commands.\n\nagents/ — 3 specialized subagents\nskills/ — 7+ workflow skills and domain knowledge\ncommands/ — 2 slash commands\n'
  );
  const skillsSummary = expectations.find(item => item.source === 'AGENTS.md summary' && item.category === 'skills');
  const skillsStructure = expectations.find(item => item.source.includes('project structure') && item.category === 'skills');
  assert.strictEqual(skillsSummary.mode, 'minimum');
  assert.strictEqual(skillsStructure.mode, 'minimum');
  assert.throws(
    () => catalogInternals.parseAgentsDocExpectations('Repository providing 1 specialized agents, 1 skills, 1 commands.'),
    /project structure is missing the agents entry/
  );
})) passed++; else failed++;

if (test('pt-BR and tr parsers reject legacy or incomplete structure blocks', () => {
  assert.throws(
    () => catalogInternals.parsePtBrReadmeExpectations('Você agora tem acesso a 1 agentes, 1 skills e 1 comandos.\n|-- .claude-plugin/'),
    /missing the \.factory structure marker/
  );
  assert.throws(
    () => catalogInternals.parsePtBrReadmeExpectations('Você agora tem acesso a 1 agentes, 1 skills e 1 comandos.\n|-- .factory/'),
    /missing the agents structure row/
  );
  assert.throws(
    () => catalogInternals.parseTrReadmeExpectations('Artık 1 agent, 1 skill ve 1 command\'a erişiminiz var.\n|-- .factory/'),
    /missing the agents structure row/
  );
  assert.throws(
    () => catalogInternals.parsePtBrReadmeExpectations(
      'Você agora tem acesso a 1 agentes, 1 skills e 1 comandos.\n|-- .factory/\n|-- .claude-plugin/\n|-- agents/           # 1 subagentes'
    ),
    /still references the legacy \.claude-plugin layout/
  );
  assert.throws(
    () => catalogInternals.parseTrReadmeExpectations(
      'Artık 1 agent, 1 skill ve 1 command\'a erişiminiz var.\n|-- .factory/\n|-- .claude-plugin/\n|-- agents/           # Delegation için 1 özel subagent'
    ),
    /still references the legacy \.claude-plugin layout/
  );
})) passed++; else failed++;

if (test('syncEnglishReadme updates quick-start text and table counts', () => {
  const nextContent = catalogInternals.syncEnglishReadme(
    'You now have access to 9 agents, 9 skills, and 9 commands.\n| Agents | PASS: 9 agents |\n| Commands | PASS: 9 commands |\n| Skills | PASS: 9 skills |\n| Agents | 9 agents | Factory Droid |\n| Commands | 9 commands | Factory Droid |\n| Skills | 9 skills | Factory Droid |\n',
    { agents: { count: 3 }, commands: { count: 2 }, skills: { count: 5 } }
  );

  assert.ok(nextContent.includes('access to 3 agents, 5 skills, and 2 legacy command shims'));
  assert.ok(nextContent.includes('| Agents | PASS: 3 agents |'));
  assert.ok(nextContent.includes('| Commands | 2 commands | Factory Droid |'));
})) passed++; else failed++;

if (test('syncPtBrReadme and syncTrReadme migrate legacy structure blocks', () => {
  const ptBr = catalogInternals.syncPtBrReadme(
    [
      'Você agora tem acesso a 1 agentes, 1 skills e 1 comandos.',
      '```',
      'everything-factory-droid/',
      '|-- .claude-plugin/   # Plugin legado',
      '|   |-- plugin.json         # Metadados',
      '|   |-- marketplace.json    # Catálogo',
      '|',
      '|-- agents/           # 1 subagentes',
      '```'
    ].join('\n'),
    { agents: { count: 4 }, commands: { count: 2 }, skills: { count: 6 } }
  );
  const tr = catalogInternals.syncTrReadme(
    [
      'Artık 1 agent, 1 skill ve 1 command\'a erişiminiz var.',
      '```',
      'everything-factory-droid/',
      '|-- .claude-plugin/   # Eski plugin düzeni',
      '|   |-- plugin.json         # Metadata',
      '|   |-- marketplace.json    # Katalog',
      '|',
      '|-- agents/           # Delegation için 1 özel subagent',
      '```'
    ].join('\n'),
    { agents: { count: 5 }, commands: { count: 3 }, skills: { count: 7 } }
  );

  assert.ok(ptBr.includes('|-- .factory/'));
  assert.ok(!ptBr.includes('.claude-plugin'));
  assert.ok(ptBr.includes('# 4 subagentes'));
  assert.ok(tr.includes('|-- .factory/'));
  assert.ok(!tr.includes('.claude-plugin'));
  assert.ok(tr.includes('5 özel subagent'));
})) passed++; else failed++;

if (test('evaluateExpectations, formatExpectation, and renderers cover mismatch and success branches', () => {
  const result = {
    catalog: {
      agents: { count: 2, glob: 'agents/*.md' },
      commands: { count: 1, glob: 'commands/*.md' },
      skills: { count: 3, glob: 'skills/*/SKILL.md' }
    },
    checks: []
  };
  result.checks = catalogInternals.evaluateExpectations(result.catalog, [
    { category: 'agents', mode: 'exact', expected: 2, source: 'agents ok' },
    { category: 'skills', mode: 'minimum', expected: 2, source: 'skills ok' },
    { category: 'commands', mode: 'exact', expected: 9, source: 'commands mismatch' }
  ]);

  assert.strictEqual(result.checks[0].ok, true);
  assert.strictEqual(result.checks[1].ok, true);
  assert.strictEqual(result.checks[2].ok, false);
  assert.ok(catalogInternals.formatExpectation(result.checks[1]).includes('>= 2'));

  let output = captureConsole(() => catalogInternals.renderText(result));
  assert.ok(output.stderr.some(line => line.includes('Documentation count mismatches found')));
  output = captureConsole(() => catalogInternals.renderMarkdown({ ...result, checks: result.checks.filter(check => check.ok) }));
  assert.ok(output.stdout.some(line => line.includes('Documentation counts match the repository catalog.')));
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
