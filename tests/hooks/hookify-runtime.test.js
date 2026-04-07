const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  buildContext,
  getProjectRoot,
  loadRules,
  matchesCondition,
  matchesRule,
  parseFrontmatter,
  run,
} = require('../../scripts/hooks/hookify-runtime');

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

function withProjectRules(ruleFiles, fn) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hookify-runtime-'));
  const factoryDir = path.join(projectRoot, '.factory');
  fs.mkdirSync(factoryDir, { recursive: true });

  for (const [name, content] of Object.entries(ruleFiles)) {
    fs.writeFileSync(path.join(factoryDir, name), content);
  }

  const previous = process.env.FACTORY_PROJECT_DIR;
  process.env.FACTORY_PROJECT_DIR = projectRoot;

  try {
    fn(projectRoot);
  } finally {
    if (previous === undefined) {
      delete process.env.FACTORY_PROJECT_DIR;
    } else {
      process.env.FACTORY_PROJECT_DIR = previous;
    }
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
}

function runTests() {
  console.log('\n=== Testing hookify-runtime.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('parseFrontmatter reads scalar fields and nested conditions', () => {
    const parsed = parseFrontmatter(`---\nname: warn-env\nenabled: true\nevent: file\naction: block\nconditions:\n  - field: file_path\n    operator: regex_match\n    pattern: \\.env$\n---\nDo not commit secrets.\n`);
    assert.strictEqual(parsed.attributes.name, 'warn-env');
    assert.strictEqual(parsed.attributes.enabled, true);
    assert.strictEqual(parsed.attributes.conditions[0].field, 'file_path');
    assert.strictEqual(parsed.body, 'Do not commit secrets.');
    assert.strictEqual(parseFrontmatter('no frontmatter here'), null);
  })) passed++; else failed++;

  if (test('buildContext maps prompt, bash, file, and stop payloads', () => {
    assert.deepStrictEqual(buildContext({ hook_event_name: 'UserPromptSubmit', user_prompt: 'hello' }).event, 'prompt');
    assert.deepStrictEqual(buildContext({ tool_name: 'Execute', tool_input: { command: 'npm test' } }).event, 'bash');
    assert.deepStrictEqual(buildContext({ tool_name: 'Edit', tool_input: { file_path: 'a.js', new_string: 'console.log(1)' } }).event, 'file');
    assert.deepStrictEqual(buildContext({ hook_event_name: 'Stop', transcript_path: '/tmp/t.json' }).event, 'stop');
  })) passed++; else failed++;

  if (test('matchesCondition and matchesRule support condition-based file rules', () => {
    const context = buildContext({ tool_name: 'Edit', tool_input: { file_path: '.env', content: 'API_KEY=1' } });
    assert.strictEqual(matchesCondition({ field: 'file_path', operator: 'regex_match', pattern: '\\.env$' }, context.fields), true);
    assert.strictEqual(matchesCondition({ field: 'content', operator: 'not_contains', pattern: 'SECRET2' }, context.fields), true);
    assert.strictEqual(matchesCondition({ field: 'content', operator: 'starts_with', pattern: 'API' }, context.fields), true);
    assert.strictEqual(matchesCondition({ field: 'content', operator: 'ends_with', pattern: '=1' }, context.fields), true);
    assert.strictEqual(matchesCondition({ field: 'content', operator: 'equals', pattern: 'API_KEY=1' }, context.fields), true);
    assert.strictEqual(matchesRule({
      enabled: true,
      event: 'file',
      action: 'block',
      pattern: '',
      conditions: [
        { field: 'file_path', operator: 'regex_match', pattern: '\\.env$' },
        { field: 'content', operator: 'contains', pattern: 'API_KEY' },
      ],
    }, context), true);
    assert.strictEqual(matchesRule({ enabled: true, event: 'all', action: 'warn', pattern: 'API_KEY', conditions: [] }, context), true);
    assert.strictEqual(matchesRule({ enabled: true, event: 'stop', action: 'warn', pattern: '', conditions: [] }, context), false);
    assert.strictEqual(matchesRule({ enabled: false, event: 'file', action: 'warn', pattern: 'API_KEY', conditions: [] }, context), false);
  })) passed++; else failed++;

  if (test('loadRules reads only valid hookify files and defaults missing fields', () => {
    withProjectRules({
      'hookify.simple.local.md': `---\nname: simple\nevent: stop\n---\nhi\n`,
      'hookify.invalid.local.md': 'not frontmatter',
      'notes.md': '# ignored\n',
    }, projectRoot => {
      const rules = loadRules(projectRoot);
      assert.strictEqual(rules.length, 1);
      assert.strictEqual(rules[0].action, 'warn');
      assert.strictEqual(rules[0].enabled, true);
    });
  })) passed++; else failed++;

  if (test('getProjectRoot prefers hook payload cwd over plugin-root env', () => {
    const original = process.env.FACTORY_PROJECT_DIR;
    process.env.FACTORY_PROJECT_DIR = '/plugin/root';
    try {
      assert.strictEqual(getProjectRoot({ cwd: '/workspace/app' }), '/workspace/app');
    } finally {
      if (original === undefined) {
        delete process.env.FACTORY_PROJECT_DIR;
      } else {
        process.env.FACTORY_PROJECT_DIR = original;
      }
    }
  })) passed++; else failed++;

  if (test('run warns for matching prompt rules and preserves stdout payload', () => {
    withProjectRules({
      'hookify.warn-tests.local.md': `---\nname: warn-tests\nenabled: true\nevent: prompt\npattern: test\n---\nRemember to add tests.\n`,
    }, projectRoot => {
      const raw = JSON.stringify({ hook_event_name: 'UserPromptSubmit', user_prompt: 'please test this change', cwd: projectRoot });
      const result = run(raw);
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(result.stdout, raw);
      assert.match(result.stderr, /Remember to add tests/);
    });
  })) passed++; else failed++;

  if (test('run blocks matching bash rules and ignores disabled or unrelated rules', () => {
    withProjectRules({
      'hookify.block-rm.local.md': `---\nname: block-rm\nenabled: true\nevent: bash\naction: block\npattern: rm\\s+-rf\n---\nDo not run destructive deletes.\n`,
      'hookify.disabled.local.md': `---\nname: disabled\nenabled: false\nevent: bash\naction: block\npattern: npm\n---\nDisabled.\n`,
    }, projectRoot => {
      const result = run(JSON.stringify({ tool_name: 'Execute', tool_input: { command: 'rm -rf tmp' }, cwd: projectRoot }));
      assert.strictEqual(result.exitCode, 2);
      assert.match(result.stderr, /Do not run destructive deletes/);
      assert.strictEqual(result.stdout, undefined);
    });
  })) passed++; else failed++;

  if (test('run handles stop rules and missing rule directories gracefully', () => {
    const raw = JSON.stringify({ hook_event_name: 'Stop', transcript_path: '/tmp/session.json' });
    const noRules = run(raw);
    assert.strictEqual(noRules.exitCode, 0);
    assert.strictEqual(noRules.stdout, raw);

    withProjectRules({
      'hookify.stop-reminder.local.md': `---\nname: stop-reminder\nenabled: true\nevent: stop\npattern: .*\n---\nRun validation before finishing.\n`,
    }, projectRoot => {
      const result = run(JSON.stringify({ hook_event_name: 'Stop', transcript_path: '/tmp/session.json', cwd: projectRoot }));
      assert.strictEqual(result.exitCode, 0);
      assert.match(result.stderr, /Run validation before finishing/);
    });
  })) passed++; else failed++;

  if (test('run handles object input, unknown events, and direct CLI execution', () => {
    const unknown = run({ hello: 'world' });
    assert.strictEqual(unknown.exitCode, 0);
    assert.strictEqual(unknown.stdout, JSON.stringify({ hello: 'world' }));

    withProjectRules({
      'hookify.cli.local.md': `---\nname: cli\nenabled: true\nevent: prompt\npattern: deploy\n---\nDouble-check deployment steps.\n`,
    }, projectRoot => {
      const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'hookify-runtime.js');
      const raw = JSON.stringify({ hook_event_name: 'UserPromptSubmit', user_prompt: 'deploy now', cwd: projectRoot });
      const result = spawnSync(process.execPath, [scriptPath], {
        input: raw,
        encoding: 'utf8',
        env: { ...process.env, FACTORY_PROJECT_DIR: projectRoot },
        cwd: projectRoot,
      });
      assert.strictEqual(result.status, 0);
      assert.strictEqual(result.stdout, raw);
      assert.match(result.stderr, /Double-check deployment steps/);
    });
  })) passed++; else failed++;

  if (test('run reads rules from input cwd even when plugin-root env is set', () => {
    const pluginRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hookify-plugin-'));
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hookify-project-'));
    fs.mkdirSync(path.join(projectRoot, '.factory'), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, '.factory', 'hookify.cwd.local.md'),
      `---\nname: cwd-rule\nenabled: true\nevent: prompt\npattern: release\n---\nUse the project-scoped rule.\n`
    );

    const previous = process.env.FACTORY_PROJECT_DIR;
    process.env.FACTORY_PROJECT_DIR = pluginRoot;
    try {
      const raw = JSON.stringify({ hook_event_name: 'UserPromptSubmit', user_prompt: 'release it', cwd: projectRoot });
      const result = run(raw);
      assert.strictEqual(result.exitCode, 0);
      assert.match(result.stderr, /project-scoped rule/);
    } finally {
      if (previous === undefined) {
        delete process.env.FACTORY_PROJECT_DIR;
      } else {
        process.env.FACTORY_PROJECT_DIR = previous;
      }
      fs.rmSync(pluginRoot, { recursive: true, force: true });
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
