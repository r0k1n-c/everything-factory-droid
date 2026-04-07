#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const RULE_FILE_RE = /^hookify\..+\.local\.md$/;

function parseValue(value) {
  const trimmed = String(value || '').trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseFrontmatter(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  const data = {};
  let arrayKey = null;
  let currentItem = null;

  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;

    const topLevel = line.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
    if (topLevel) {
      const [, key, rawValue] = topLevel;
      if (rawValue === undefined) {
        data[key] = [];
        arrayKey = key;
        currentItem = null;
      } else {
        data[key] = parseValue(rawValue);
        arrayKey = null;
        currentItem = null;
      }
      continue;
    }

    const arrayStart = line.match(/^\s*-\s+([A-Za-z0-9_-]+):\s*(.*)$/);
    if (arrayStart && arrayKey) {
      currentItem = { [arrayStart[1]]: parseValue(arrayStart[2]) };
      data[arrayKey].push(currentItem);
      continue;
    }

    const nested = line.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nested && currentItem) {
      currentItem[nested[1]] = parseValue(nested[2]);
    }
  }

  return { attributes: data, body: match[2].trim() };
}

function getProjectRoot(input) {
  return input.cwd || process.cwd() || process.env.FACTORY_PROJECT_DIR || '';
}

function loadRules(projectRoot) {
  const rulesDir = path.join(projectRoot, '.factory');
  if (!fs.existsSync(rulesDir)) return [];

  return fs.readdirSync(rulesDir)
    .filter(name => RULE_FILE_RE.test(name))
    .map(name => {
      const filePath = path.join(rulesDir, name);
      const parsed = parseFrontmatter(fs.readFileSync(filePath, 'utf8'));
      if (!parsed) return null;

      return {
        filePath,
        name: parsed.attributes.name || name,
        enabled: parsed.attributes.enabled !== false,
        event: parsed.attributes.event || 'all',
        action: parsed.attributes.action || 'warn',
        pattern: parsed.attributes.pattern || '',
        conditions: Array.isArray(parsed.attributes.conditions) ? parsed.attributes.conditions : [],
        message: parsed.body,
      };
    })
    .filter(Boolean);
}

function buildContext(input) {
  const eventName = input.hook_event_name || input.hookEventName || input.hookSpecificOutput?.hookEventName || '';
  const toolName = String(input.tool_name || input.name || '');
  const toolInput = input.tool_input || {};

  if (eventName === 'UserPromptSubmit' || input.user_prompt || input.prompt) {
    const userPrompt = String(input.user_prompt || input.prompt || input.message || '');
    return { event: 'prompt', fields: { user_prompt: userPrompt }, defaultText: userPrompt };
  }

  if (toolName === 'Execute' || typeof toolInput.command === 'string') {
    const command = String(toolInput.command || '');
    return { event: 'bash', fields: { command }, defaultText: command };
  }

  if (/^(Edit|Create|MultiEdit|Write)$/.test(toolName)) {
    const filePath = String(toolInput.file_path || toolInput.file || '');
    const oldText = String(toolInput.old_string || '');
    const newText = toolInput.edits
      ? toolInput.edits.map(edit => edit.new_string || '').join('\n')
      : String(toolInput.new_string || toolInput.content || '');
    const content = newText || String(toolInput.content || '');
    return {
      event: 'file',
      fields: { file_path: filePath, old_text: oldText, new_text: newText, content },
      defaultText: [filePath, newText, oldText, content].filter(Boolean).join('\n'),
    };
  }

  if (eventName === 'Stop' || input.transcript_path) {
    return { event: 'stop', fields: {}, defaultText: String(input.stop_reason || 'stop') };
  }

  return null;
}

function matchesCondition(condition, fields) {
  const actual = String(fields[condition.field] || '');
  const expected = String(condition.pattern || '');

  switch (condition.operator) {
    case 'contains': return actual.includes(expected);
    case 'equals': return actual === expected;
    case 'not_contains': return !actual.includes(expected);
    case 'starts_with': return actual.startsWith(expected);
    case 'ends_with': return actual.endsWith(expected);
    case 'regex_match':
    default:
      return new RegExp(expected, 'm').test(actual);
  }
}

function matchesRule(rule, context) {
  if (!rule.enabled || (rule.event !== 'all' && rule.event !== context.event)) {
    return false;
  }

  if (rule.conditions.length > 0) {
    return rule.conditions.every(condition => matchesCondition(condition, context.fields));
  }

  if (!rule.pattern) {
    return context.event === 'stop';
  }

  return new RegExp(String(rule.pattern), 'm').test(context.defaultText);
}

function run(inputOrRaw) {
  const raw = typeof inputOrRaw === 'string' ? inputOrRaw : JSON.stringify(inputOrRaw || {});
  const input = raw.trim() ? JSON.parse(raw) : {};
  const context = buildContext(input);
  if (!context) {
    return { exitCode: 0, stdout: raw };
  }

  const matches = loadRules(getProjectRoot(input)).filter(rule => matchesRule(rule, context));
  if (matches.length === 0) {
    return { exitCode: 0, stdout: raw };
  }

  const stderr = matches
    .map(rule => `[Hookify] ${rule.name}: ${rule.message}`)
    .join('\n');
  const shouldBlock = matches.some(rule => rule.action === 'block');

  return shouldBlock
    ? { exitCode: 2, stderr }
    : { exitCode: 0, stderr, stdout: raw };
}

module.exports = {
  buildContext,
  getProjectRoot,
  loadRules,
  matchesCondition,
  matchesRule,
  parseFrontmatter,
  run,
};

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    raw += chunk;
  });
  process.stdin.on('end', () => {
    const result = run(raw);
    if (result.stderr) process.stderr.write(`${result.stderr}\n`);
    if (result.stdout) process.stdout.write(result.stdout);
    process.exit(result.exitCode || 0);
  });
}
