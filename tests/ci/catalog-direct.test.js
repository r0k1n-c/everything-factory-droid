/**
 * Direct coverage tests for scripts/ci/catalog.js.
 * Compiles the real source under its original filename so c8 attributes
 * execution to the actual validator file instead of a temp wrapper path.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'ci', 'catalog.js');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function stripShebang(source) {
  return source.startsWith('#!') ? source.replace(/^#!.*\r?\n/, '') : source;
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

function writeCatalogFixture(rootDir, counts = {}, options = {}) {
  const catalog = {
    agents: counts.agents ?? 1,
    commands: counts.commands ?? 1,
    skills: counts.skills ?? 1,
  };

  const docsCounts = {
    readmeAgents: options.readmeAgents ?? catalog.agents,
    readmeCommands: options.readmeCommands ?? catalog.commands,
    readmeSkills: options.readmeSkills ?? catalog.skills,
    parityAgents: options.parityAgents ?? catalog.agents,
    parityCommands: options.parityCommands ?? catalog.commands,
    paritySkills: options.paritySkills ?? catalog.skills,
  };

  fs.mkdirSync(path.join(rootDir, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'commands'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'skills', 'demo-skill'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'docs', 'zh-CN'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'docs', 'pt-BR'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'docs', 'tr'), { recursive: true });

  fs.writeFileSync(path.join(rootDir, 'agents', 'demo.md'), '---\nmodel: sonnet\ntools: Read\n---\n');
  fs.writeFileSync(path.join(rootDir, 'commands', 'demo.md'), '# demo\n');
  fs.writeFileSync(path.join(rootDir, 'skills', 'demo-skill', 'SKILL.md'), '# demo skill\n');

  fs.writeFileSync(
    path.join(rootDir, 'README.md'),
    `You now have access to ${docsCounts.readmeAgents} agents, ${docsCounts.readmeSkills} skills, and ${docsCounts.readmeCommands} commands.\n\n| Category | Count | Platform |\n| --- | --- | --- |\n| Agents | PASS: ${docsCounts.readmeAgents} agents | Factory Droid |\n| Commands | PASS: ${docsCounts.readmeCommands} commands | Factory Droid |\n| Skills | PASS: ${docsCounts.readmeSkills} skills | Factory Droid |\n\n| Category | Count | Platform |\n| --- | --- | --- |\n| Agents | ${docsCounts.parityAgents} agents | Factory Droid |\n| Commands | ${docsCounts.parityCommands} commands | Factory Droid |\n| Skills | ${docsCounts.paritySkills} skills | Factory Droid |\n`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(rootDir, 'AGENTS.md'),
    `Repository providing ${catalog.agents} specialized agents, ${catalog.skills}+ skills, ${catalog.commands} commands.\n\nagents/ — ${catalog.agents} specialized subagents\nskills/ — ${catalog.skills}+ workflow skills and domain knowledge\ncommands/ — ${catalog.commands} slash commands\n`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(rootDir, 'README.zh-CN.md'),
    `你现在可以使用 ${catalog.agents} 个代理、${catalog.skills} 个技能和 ${catalog.commands} 个命令。\n`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(rootDir, 'docs', 'zh-CN', 'README.md'),
    `你现在可以使用 ${catalog.agents} 个智能体、${catalog.skills} 项技能和 ${catalog.commands} 个命令了。\n\n| 类别 | 数量 | 平台 |\n| --- | --- | --- |\n| 智能体 | PASS: ${catalog.agents} 个 | Factory Droid |\n| 命令 | PASS: ${catalog.commands} 个 | Factory Droid |\n| 技能 | PASS: ${catalog.skills} 项 | Factory Droid |\n\n| 类别 | 数量 | 平台 |\n| --- | --- | --- |\n| 智能体 | ${catalog.agents} 个 | Factory Droid |\n| 命令 | ${catalog.commands} 个 | Factory Droid |\n| 技能 | ${catalog.skills} 项 | Factory Droid |\n`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(rootDir, 'docs', 'zh-CN', 'AGENTS.md'),
    `本仓库提供 ${catalog.agents} 个专业代理、${catalog.skills}+ 项技能、${catalog.commands} 条命令。\n\nagents/ — ${catalog.agents} 个专业子代理\nskills/ — ${catalog.skills}+ 个工作流技能和领域知识\ncommands/ — ${catalog.commands} 个斜杠命令\n`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(rootDir, 'docs', 'pt-BR', 'README.md'),
    `Você agora tem acesso a ${catalog.agents} agentes, ${catalog.skills} skills e ${catalog.commands} comandos.\n\`\`\`\neverything-factory-droid/\n|-- .factory/         # Espelhos e configurações voltados ao Factory Droid\n|   |-- droids/             # Definições de droids convertidas\n|   |-- skills/             # Espelhos de skills para Factory Droid\n|   |-- commands/           # Espelhos de commands para Factory Droid\n|   |-- settings.json       # Configurações de projeto do Factory Droid\n|\n|-- agents/           # ${catalog.agents} subagentes especializados\n\`\`\`\n`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(rootDir, 'docs', 'tr', 'README.md'),
    `Artık ${catalog.agents} agent, ${catalog.skills} skill ve ${catalog.commands} command'a erişiminiz var.\n\`\`\`\neverything-factory-droid/\n|-- .factory/         # Factory Droid aynaları ve ayarları\n|   |-- droids/             # Dönüştürülmüş droid tanımları\n|   |-- skills/             # Factory Droid skill aynaları\n|   |-- commands/           # Factory Droid command aynaları\n|   |-- settings.json       # Proje düzeyi Factory Droid ayarları\n|\n|-- agents/           # Delegation için ${catalog.agents} özel subagent\n\`\`\`\n`,
    'utf8'
  );
}

function runCatalog(rootDir, args = ['--text']) {
  let source = stripShebang(fs.readFileSync(SCRIPT, 'utf8'));
  const argvPreamble = args.map(arg => `process.argv.push(${JSON.stringify(arg)});`).join('\n');
  source = `${argvPreamble}\n${source}`;

  const replacements = {
    ROOT: rootDir,
    README_PATH: path.join(rootDir, 'README.md'),
    AGENTS_PATH: path.join(rootDir, 'AGENTS.md'),
    README_ZH_CN_PATH: path.join(rootDir, 'README.zh-CN.md'),
    DOCS_ZH_CN_README_PATH: path.join(rootDir, 'docs', 'zh-CN', 'README.md'),
    DOCS_ZH_CN_AGENTS_PATH: path.join(rootDir, 'docs', 'zh-CN', 'AGENTS.md'),
    DOCS_PT_BR_README_PATH: path.join(rootDir, 'docs', 'pt-BR', 'README.md'),
    DOCS_TR_README_PATH: path.join(rootDir, 'docs', 'tr', 'README.md'),
  };

  for (const [constant, value] of Object.entries(replacements)) {
    source = source.replace(new RegExp(`const ${constant} = .*?;`), `const ${constant} = ${JSON.stringify(value)};`);
  }

  const harnessPath = path.join(rootDir, `.tmp-catalog-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
  const wrapper = [
    'const Module = require(\'module\');',
    'const path = require(\'path\');',
    `const source = ${JSON.stringify(source)};`,
    `const filename = ${JSON.stringify(SCRIPT)};`,
    'const mod = new Module(filename, module);',
    'mod.filename = filename;',
    'mod.paths = Module._nodeModulePaths(path.dirname(filename));',
    'mod._compile(source, filename);',
  ].join('\n');

  try {
    fs.writeFileSync(harnessPath, wrapper, 'utf8');
    const stdout = execFileSync('node', [harnessPath], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: rootDir,
      timeout: 10000,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      code: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    };
  } finally {
    try {
      fs.unlinkSync(harnessPath);
    } catch {
      // ignore
    }
  }
}

console.log('\n=== Testing catalog.js direct coverage ===\n');

let passed = 0;
let failed = 0;

if (test('passes when tracked docs match the catalog', () => {
  const rootDir = createTempDir('efd-catalog-direct-');

  try {
    writeCatalogFixture(rootDir);
    const result = runCatalog(rootDir);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('Documentation counts match'), result.stdout);
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('emits json output by default when no explicit output mode is passed', () => {
  const rootDir = createTempDir('efd-catalog-direct-');

  try {
    writeCatalogFixture(rootDir);
    const result = runCatalog(rootDir, []);
    assert.strictEqual(result.code, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.strictEqual(parsed.catalog.agents.count, 1);
    assert.strictEqual(parsed.catalog.commands.count, 1);
    assert.strictEqual(parsed.catalog.skills.count, 1);
    assert.ok(parsed.checks.every(check => check.ok), result.stdout);
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('fails when the parity table drifts from the catalog', () => {
  const rootDir = createTempDir('efd-catalog-direct-');

  try {
    writeCatalogFixture(rootDir, {}, { parityAgents: 9 });
    const result = runCatalog(rootDir);
    assert.strictEqual(result.code, 1, result.stderr);
    assert.ok(result.stderr.includes('README.md parity table'), result.stderr);
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('renders markdown mismatch output with --md', () => {
  const rootDir = createTempDir('efd-catalog-direct-');

  try {
    writeCatalogFixture(rootDir, {}, { parityCommands: 9 });
    const result = runCatalog(rootDir, ['--md']);
    assert.strictEqual(result.code, 1, result.stderr);
    assert.ok(result.stdout.includes('# EFD Catalog Verification'), result.stdout);
    assert.ok(result.stdout.includes('## Mismatches'), result.stdout);
    assert.ok(result.stdout.includes('README.md parity table'), result.stdout);
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('renders markdown success output when counts already match', () => {
  const rootDir = createTempDir('efd-catalog-direct-');

  try {
    writeCatalogFixture(rootDir);
    const result = runCatalog(rootDir, ['--md']);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('# EFD Catalog Verification'), result.stdout);
    assert.ok(result.stdout.includes('Documentation counts match the repository catalog.'), result.stdout);
    assert.ok(!result.stdout.includes('## Mismatches'), result.stdout);
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('write mode syncs mismatched counts back to the tracked docs', () => {
  const rootDir = createTempDir('efd-catalog-direct-');

  try {
    writeCatalogFixture(rootDir, {}, {
      readmeAgents: 9,
      readmeCommands: 9,
      readmeSkills: 9,
      parityAgents: 9,
      parityCommands: 9,
      paritySkills: 9,
    });
    const result = runCatalog(rootDir, ['--write', '--text']);
    assert.strictEqual(result.code, 0, result.stderr);
    const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
    assert.ok(readme.includes('1 agents, 1 skills, and 1 legacy command shims'), readme);
    assert.ok(readme.includes('| Agents | PASS: 1 agents | Factory Droid |'), readme);
    assert.ok(readme.includes('| Agents | 1 agents | Factory Droid |'), readme);
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('write mode succeeds without rewriting files that are already in sync', () => {
  const rootDir = createTempDir('efd-catalog-direct-');
  const trackedDocs = [
    'README.md',
    'AGENTS.md',
    'README.zh-CN.md',
    path.join('docs', 'zh-CN', 'README.md'),
    path.join('docs', 'zh-CN', 'AGENTS.md'),
    path.join('docs', 'pt-BR', 'README.md'),
    path.join('docs', 'tr', 'README.md'),
  ];

  try {
    writeCatalogFixture(rootDir);
    let result = runCatalog(rootDir, ['--write', '--text']);
    assert.strictEqual(result.code, 0, result.stderr);

    for (const relativePath of trackedDocs) {
      fs.chmodSync(path.join(rootDir, relativePath), 0o444);
    }

    result = runCatalog(rootDir, ['--write', '--text']);
    assert.strictEqual(result.code, 0, result.stderr);
    assert.ok(result.stdout.includes('Documentation counts match the repository catalog.'), result.stdout);
  } finally {
    for (const relativePath of trackedDocs) {
      const filePath = path.join(rootDir, relativePath);
      if (fs.existsSync(filePath)) {
        fs.chmodSync(filePath, 0o644);
      }
    }
    cleanup(rootDir);
  }
})) passed++; else failed++;

if (test('write mode reports sync errors through the top-level catch handler', () => {
  const rootDir = createTempDir('efd-catalog-direct-');

  try {
    writeCatalogFixture(rootDir);
    fs.writeFileSync(
      path.join(rootDir, 'docs', 'pt-BR', 'README.md'),
      'Você agora tem acesso a 1 agentes, 1 skills e 1 comandos.\n```text\n|-- agents/           # 1 subagentes\n```',
      'utf8'
    );

    const result = runCatalog(rootDir, ['--write', '--text']);
    assert.strictEqual(result.code, 1, result.stderr);
    assert.ok(result.stderr.includes('ERROR: docs/pt-BR/README.md is missing the expected .factory structure marker'), result.stderr);
  } finally {
    cleanup(rootDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
