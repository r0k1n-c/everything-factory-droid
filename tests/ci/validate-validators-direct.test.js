'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const AGENTS_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'ci', 'validate-agents.js');
const COMMANDS_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'ci', 'validate-commands.js');
const RULES_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'ci', 'validate-rules.js');
const SKILLS_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'ci', 'validate-skills.js');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function stripShebang(source) {
  return source.startsWith('#!') ? source.replace(/^#!.*\r?\n/, '') : source;
}

function compileValidator(scriptPath, replacements, exportCode, entryRegex) {
  let source = stripShebang(fs.readFileSync(scriptPath, 'utf8'));

  for (const [constant, value] of Object.entries(replacements)) {
    source = source.replace(new RegExp(`const ${constant} = .*?;`), `const ${constant} = ${JSON.stringify(value)};`);
  }

  source = source.replace(entryRegex, exportCode);

  const mod = new Module(scriptPath, module);
  mod.filename = scriptPath;
  mod.paths = Module._nodeModulePaths(path.dirname(scriptPath));
  mod._compile(source, scriptPath);
  return mod.exports;
}

function loadAgentsValidator(overrides = {}) {
  return compileValidator(
    AGENTS_SCRIPT,
    {
      AGENTS_DIR: overrides.AGENTS_DIR || path.join(os.tmpdir(), 'efd-missing-agents'),
    },
    'module.exports = { extractFrontmatter, validateAgents };\n',
    /validateAgents\(\);\s*$/
  );
}

function loadCommandsValidator(overrides = {}) {
  return compileValidator(
    COMMANDS_SCRIPT,
    {
      ROOT_DIR: overrides.ROOT_DIR || path.join(os.tmpdir(), 'efd-commands-root'),
      COMMANDS_DIR: overrides.COMMANDS_DIR || path.join(os.tmpdir(), 'efd-missing-commands'),
      AGENTS_DIR: overrides.AGENTS_DIR || path.join(os.tmpdir(), 'efd-missing-command-agents'),
      SKILLS_DIR: overrides.SKILLS_DIR || path.join(os.tmpdir(), 'efd-missing-command-skills'),
    },
    'module.exports = { validateCommands };\n',
    /validateCommands\(\);\s*$/
  );
}

function loadRulesValidator(overrides = {}) {
  return compileValidator(
    RULES_SCRIPT,
    {
      RULES_DIR: overrides.RULES_DIR || path.join(os.tmpdir(), 'efd-missing-rules'),
    },
    'module.exports = { collectRuleFiles, validateRules };\n',
    /validateRules\(\);\s*$/
  );
}

function loadSkillsValidator(overrides = {}) {
  return compileValidator(
    SKILLS_SCRIPT,
    {
      SKILLS_DIR: overrides.SKILLS_DIR || path.join(os.tmpdir(), 'efd-missing-skills'),
    },
    'module.exports = { validateSkills };\n',
    /validateSkills\(\);\s*$/
  );
}

function captureRun(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalExit = process.exit;
  const stdout = [];
  const stderr = [];
  const warnings = [];
  let exitCode = null;

  console.log = (...args) => stdout.push(args.join(' '));
  console.error = (...args) => stderr.push(args.join(' '));
  console.warn = (...args) => warnings.push(args.join(' '));
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
    console.warn = originalWarn;
    process.exit = originalExit;
  }

  return { exitCode, stdout, stderr, warnings };
}

function withPatchedFs(methodName, replacement, fn) {
  const original = fs[methodName];
  fs[methodName] = replacement;
  try {
    return fn();
  } finally {
    fs[methodName] = original;
  }
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

console.log('\n=== Testing direct coverage for simple CI validators ===\n');

let passed = 0;
let failed = 0;

console.log('validate-agents.js:');

if (test('extractFrontmatter handles BOM, CRLF, colons, and malformed lines', () => {
  const validator = loadAgentsValidator();
  const frontmatter = validator.extractFrontmatter('\uFEFF---\r\nmodel: sonnet\r\ntools: Read, Write\r\ndescription: Check: colon values\r\n:ignored\r\n---\r\n# Agent');
  assert.deepStrictEqual(frontmatter, {
    model: 'sonnet',
    tools: 'Read, Write',
    description: 'Check: colon values',
  });
  assert.strictEqual(validator.extractFrontmatter('# Missing frontmatter'), null);
})) passed++; else failed++;

if (test('validateAgents exits 0 when the agents directory is missing', () => {
  const validator = loadAgentsValidator({
    AGENTS_DIR: path.join(os.tmpdir(), `efd-no-agents-${Date.now()}`),
  });
  const result = captureRun(() => validator.validateAgents());
  assert.strictEqual(result.exitCode, 0);
  assert.ok(result.stdout.some(line => line.includes('No agents directory found')));
})) passed++; else failed++;

if (test('validateAgents reports read errors, missing frontmatter, required fields, and invalid models', () => {
  const tempDir = createTempDir('efd-validate-agents-direct-');

  try {
    const brokenPath = path.join(tempDir, 'broken.md');
    fs.writeFileSync(path.join(tempDir, 'missing-frontmatter.md'), '# Agent without frontmatter');
    fs.writeFileSync(path.join(tempDir, 'missing-fields.md'), '---\nmodel:   \ntools:\n---\n# Missing fields');
    fs.writeFileSync(path.join(tempDir, 'invalid-model.md'), '---\nmodel: gpt-4\ntools: Read\n---\n# Invalid model');
    fs.writeFileSync(path.join(tempDir, 'valid.md'), '---\nmodel: sonnet\ntools: Read\n---\n# Valid agent');
    fs.writeFileSync(brokenPath, '---\nmodel: sonnet\ntools: Read\n---\n# Broken read');

    const validator = loadAgentsValidator({ AGENTS_DIR: tempDir });
    const originalReadFileSync = fs.readFileSync;
    const result = withPatchedFs('readFileSync', function patchedReadFileSync(filePath, ...args) {
      if (filePath === brokenPath) {
        throw new Error('EACCES: permission denied');
      }
      return originalReadFileSync.call(fs, filePath, ...args);
    }, () => captureRun(() => validator.validateAgents()));

    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('broken.md - EACCES: permission denied')));
    assert.ok(result.stderr.some(line => line.includes('missing-frontmatter.md - Missing frontmatter')));
    assert.ok(result.stderr.some(line => line.includes('missing-fields.md - Missing required field: model')));
    assert.ok(result.stderr.some(line => line.includes('missing-fields.md - Missing required field: tools')));
    assert.ok(result.stderr.some(line => line.includes("invalid-model.md - Invalid model 'gpt-4'")));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateAgents succeeds for shorthand and explicit valid agent files', () => {
  const tempDir = createTempDir('efd-validate-agents-direct-');

  try {
    fs.writeFileSync(path.join(tempDir, 'planner.md'), '---\nmodel: haiku\ntools: Read, Write\n---\n# Planner');
    fs.writeFileSync(path.join(tempDir, 'reviewer.md'), '---\nmodel: claude-opus-4-6\ntools: Read\n---\n# Reviewer');

    const validator = loadAgentsValidator({ AGENTS_DIR: tempDir });
    const result = captureRun(() => validator.validateAgents());

    assert.strictEqual(result.exitCode, null);
    assert.ok(result.stdout.some(line => line.includes('Validated 2 agent files')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

console.log('\nvalidate-commands.js:');

if (test('validateCommands exits 0 when the commands directory is missing', () => {
  const validator = loadCommandsValidator({
    COMMANDS_DIR: path.join(os.tmpdir(), `efd-no-commands-${Date.now()}`),
  });
  const result = captureRun(() => validator.validateCommands());
  assert.strictEqual(result.exitCode, 0);
  assert.ok(result.stdout.some(line => line.includes('No commands directory found')));
})) passed++; else failed++;

if (test('validateCommands succeeds when agent and skill directories are absent', () => {
  const tempDir = createTempDir('efd-validate-commands-direct-');

  try {
    const commandsDir = path.join(tempDir, 'commands');
    fs.mkdirSync(commandsDir, { recursive: true });
    fs.writeFileSync(path.join(commandsDir, 'build.md'), '# Build\nRun build.');

    const validator = loadCommandsValidator({
      ROOT_DIR: tempDir,
      COMMANDS_DIR: commandsDir,
      AGENTS_DIR: path.join(tempDir, 'missing-agents'),
      SKILLS_DIR: path.join(tempDir, 'missing-skills'),
    });
    const result = captureRun(() => validator.validateCommands());

    assert.strictEqual(result.exitCode, null);
    assert.ok(result.stdout.some(line => line.includes('Validated 1 command files')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateCommands covers warning-only success paths, reserved skill roots, and unreadable skill entries', () => {
  const tempDir = createTempDir('efd-validate-commands-direct-');

  try {
    const commandsDir = path.join(tempDir, 'commands');
    const agentsDir = path.join(tempDir, 'agents');
    const skillsDir = path.join(tempDir, 'skills');
    fs.mkdirSync(commandsDir, { recursive: true });
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.mkdirSync(path.join(skillsDir, 'existing-skill'), { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'existing-skill', 'SKILL.md'), '# Skill');
    fs.writeFileSync(path.join(agentsDir, 'planner.md'), '---\nmodel: sonnet\ntools: Read\n---\n# Planner');
    fs.writeFileSync(path.join(agentsDir, 'code-reviewer.md'), '---\nmodel: sonnet\ntools: Read\n---\n# Reviewer');
    fs.writeFileSync(path.join(commandsDir, 'review.md'), '# Review\nReview it.');
    fs.writeFileSync(
      path.join(commandsDir, 'deploy.md'),
      [
        '# Deploy',
        'Run `/review` after deployment.',
        'Use agents/planner.md before handoff.',
        'See skills/existing-skill/ for the supported flow.',
        'See skills/unknown-skill/ for a local-only example.',
        'See skills/learned/ and skills/imported/ for reserved roots.',
        'Creates: `/future-command` and `/another-future-command`',
        'planner -> code-reviewer',
      ].join('\n')
    );
    fs.symlinkSync(path.join(skillsDir, 'does-not-exist'), path.join(skillsDir, 'broken-link'));

    const validator = loadCommandsValidator({
      ROOT_DIR: tempDir,
      COMMANDS_DIR: commandsDir,
      AGENTS_DIR: agentsDir,
      SKILLS_DIR: skillsDir,
    });
    const result = captureRun(() => validator.validateCommands());

    assert.strictEqual(result.exitCode, null);
    assert.ok(result.warnings.some(line => line.includes('skills/unknown-skill/')));
    assert.ok(!result.warnings.some(line => line.includes('skills/learned/')));
    assert.ok(!result.warnings.some(line => line.includes('skills/imported/')));
    assert.ok(result.stdout.some(line => line.includes('Validated 2 command files (1 warnings)')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateCommands reports read errors, empty files, broken refs, and workflow errors', () => {
  const tempDir = createTempDir('efd-validate-commands-direct-');

  try {
    const commandsDir = path.join(tempDir, 'commands');
    const agentsDir = path.join(tempDir, 'agents');
    const skillsDir = path.join(tempDir, 'skills');
    const brokenPath = path.join(commandsDir, 'broken-read.md');
    fs.mkdirSync(commandsDir, { recursive: true });
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'planner.md'), '---\nmodel: sonnet\ntools: Read\n---\n# Planner');
    fs.writeFileSync(path.join(commandsDir, 'empty.md'), '   \n');
    fs.writeFileSync(
      path.join(commandsDir, 'bad-refs.md'),
      [
        '# Broken refs',
        'Run `/ghost-command` immediately.',
        'Use agents/missing-agent.md before the next step.',
        'See skills/missing-skill/ for details.',
        'planner -> ghost-agent',
      ].join('\n')
    );
    fs.writeFileSync(brokenPath, '# Broken read');

    const validator = loadCommandsValidator({
      ROOT_DIR: tempDir,
      COMMANDS_DIR: commandsDir,
      AGENTS_DIR: agentsDir,
      SKILLS_DIR: skillsDir,
    });
    const originalReadFileSync = fs.readFileSync;
    const result = withPatchedFs('readFileSync', function patchedReadFileSync(filePath, ...args) {
      if (filePath === brokenPath) {
        throw new Error('EIO: unable to read file');
      }
      return originalReadFileSync.call(fs, filePath, ...args);
    }, () => captureRun(() => validator.validateCommands()));

    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('broken-read.md - EIO: unable to read file')));
    assert.ok(result.stderr.some(line => line.includes('empty.md - Empty command file')));
    assert.ok(result.stderr.some(line => line.includes('non-existent command /ghost-command')));
    assert.ok(result.stderr.some(line => line.includes('agents/missing-agent.md')));
    assert.ok(result.stderr.some(line => line.includes('workflow references non-existent agent "ghost-agent"')));
    assert.ok(result.warnings.some(line => line.includes('skills/missing-skill/')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

console.log('\nvalidate-rules.js:');

if (test('collectRuleFiles handles recursion, ignored files, and unreadable directories', () => {
  const tempDir = createTempDir('efd-validate-rules-direct-');

  try {
    fs.mkdirSync(path.join(tempDir, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'top.md'), '# Top rule');
    fs.writeFileSync(path.join(tempDir, 'notes.txt'), 'ignore');
    fs.writeFileSync(path.join(tempDir, 'nested', 'inner.md'), '# Inner rule');

    const validator = loadRulesValidator({ RULES_DIR: tempDir });
    assert.deepStrictEqual(validator.collectRuleFiles(path.join(tempDir, 'missing')), []);

    const files = validator.collectRuleFiles(tempDir).sort();
    assert.deepStrictEqual(files, ['nested/inner.md', 'top.md']);
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateRules exits 0 when the rules directory is missing', () => {
  const validator = loadRulesValidator({
    RULES_DIR: path.join(os.tmpdir(), `efd-no-rules-${Date.now()}`),
  });
  const result = captureRun(() => validator.validateRules());
  assert.strictEqual(result.exitCode, 0);
  assert.ok(result.stdout.some(line => line.includes('No rules directory found')));
})) passed++; else failed++;

if (test('validateRules skips entries that stop being files and succeeds on valid markdown', () => {
  const tempDir = createTempDir('efd-validate-rules-direct-');

  try {
    const ghostPath = path.join(tempDir, 'ghost.md');
    const realPath = path.join(tempDir, 'real.md');
    fs.writeFileSync(ghostPath, '# Ghost');
    fs.writeFileSync(realPath, '# Real');

    const validator = loadRulesValidator({ RULES_DIR: tempDir });
    const originalStatSync = fs.statSync;
    const result = withPatchedFs('statSync', function patchedStatSync(filePath, ...args) {
      if (filePath === ghostPath) {
        return { isFile: () => false };
      }
      return originalStatSync.call(fs, filePath, ...args);
    }, () => captureRun(() => validator.validateRules()));

    assert.strictEqual(result.exitCode, null);
    assert.ok(result.stdout.some(line => line.includes('Validated 1 rule files')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateRules reports empty files and read errors', () => {
  const tempDir = createTempDir('efd-validate-rules-direct-');

  try {
    const brokenPath = path.join(tempDir, 'broken.md');
    fs.writeFileSync(path.join(tempDir, 'empty.md'), '   \n');
    fs.writeFileSync(brokenPath, '# Broken');

    const validator = loadRulesValidator({ RULES_DIR: tempDir });
    const originalReadFileSync = fs.readFileSync;
    const result = withPatchedFs('readFileSync', function patchedReadFileSync(filePath, ...args) {
      if (filePath === brokenPath) {
        throw new Error('EACCES: blocked');
      }
      return originalReadFileSync.call(fs, filePath, ...args);
    }, () => captureRun(() => validator.validateRules()));

    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('empty.md - Empty rule file')));
    assert.ok(result.stderr.some(line => line.includes('broken.md - EACCES: blocked')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

console.log('\nvalidate-skills.js:');

if (test('validateSkills exits 0 when the curated skills directory is missing', () => {
  const validator = loadSkillsValidator({
    SKILLS_DIR: path.join(os.tmpdir(), `efd-no-skills-${Date.now()}`),
  });
  const result = captureRun(() => validator.validateSkills());
  assert.strictEqual(result.exitCode, 0);
  assert.ok(result.stdout.some(line => line.includes('No curated skills directory')));
})) passed++; else failed++;

if (test('validateSkills ignores non-directory entries and succeeds for valid skill folders', () => {
  const tempDir = createTempDir('efd-validate-skills-direct-');

  try {
    fs.mkdirSync(path.join(tempDir, 'good-skill'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'good-skill', 'SKILL.md'), '# Good skill');
    fs.writeFileSync(path.join(tempDir, 'notes.md'), '# Ignore me');

    const validator = loadSkillsValidator({ SKILLS_DIR: tempDir });
    const result = captureRun(() => validator.validateSkills());

    assert.strictEqual(result.exitCode, null);
    assert.ok(result.stdout.some(line => line.includes('Validated 1 skill directories')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

if (test('validateSkills reports missing SKILL.md, read errors, and empty skill files', () => {
  const tempDir = createTempDir('efd-validate-skills-direct-');

  try {
    const brokenPath = path.join(tempDir, 'broken-skill', 'SKILL.md');
    fs.mkdirSync(path.join(tempDir, 'missing-skill'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'empty-skill'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'broken-skill'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'empty-skill', 'SKILL.md'), '   \n');
    fs.writeFileSync(brokenPath, '# Broken skill');

    const validator = loadSkillsValidator({ SKILLS_DIR: tempDir });
    const originalReadFileSync = fs.readFileSync;
    const result = withPatchedFs('readFileSync', function patchedReadFileSync(filePath, ...args) {
      if (filePath === brokenPath) {
        throw new Error('EACCES: blocked');
      }
      return originalReadFileSync.call(fs, filePath, ...args);
    }, () => captureRun(() => validator.validateSkills()));

    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.some(line => line.includes('missing-skill/ - Missing SKILL.md')));
    assert.ok(result.stderr.some(line => line.includes('empty-skill/SKILL.md - Empty file')));
    assert.ok(result.stderr.some(line => line.includes('broken-skill/SKILL.md - EACCES: blocked')));
  } finally {
    cleanup(tempDir);
  }
})) passed++; else failed++;

console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
