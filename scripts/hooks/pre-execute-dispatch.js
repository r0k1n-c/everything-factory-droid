#!/usr/bin/env node
'use strict';

/**
 * PreToolUse Execute hook dispatcher.
 *
 * Consolidates the plugin's Execute-specific PreToolUse hooks into a single
 * command so Droid's transcript UI shows one entry instead of three separate
 * "everything-factory-droid" lines for every Execute call.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { isHookEnabled } = require('../lib/hook-flags');

const MAX_STDIN = 1024 * 1024;

const PRE_EXECUTE_PIPELINE = [
  { id: 'pre:execute:hookify', profiles: 'standard,strict', relativePath: 'scripts/hooks/hookify-runtime.js' },
  { id: 'pre:execute:auto-tmux-dev', profiles: null, relativePath: 'scripts/hooks/auto-tmux-dev.js' },
  { id: 'pre:execute:commit-quality', profiles: 'strict', relativePath: 'scripts/hooks/pre-bash-commit-quality.js' },
];

function normalizeStructuredResult(rawInput, output) {
  if (typeof output === 'string' || Buffer.isBuffer(output)) {
    const text = String(output);
    return { exitCode: 0, stdout: text && text !== rawInput ? text : '', stderr: '' };
  }

  if (output && typeof output === 'object') {
    const stdout = Object.prototype.hasOwnProperty.call(output, 'stdout')
      ? String(output.stdout ?? '')
      : '';

    return {
      exitCode: Number.isInteger(output.exitCode) ? output.exitCode : 0,
      stdout: stdout && stdout !== rawInput ? stdout : '',
      stderr: typeof output.stderr === 'string' ? output.stderr : '',
    };
  }

  return { exitCode: 0, stdout: '', stderr: '' };
}

function runHookScript(scriptPath, rawInput) {
  let hookModule = null;

  try {
    const source = fs.readFileSync(scriptPath, 'utf8');
    const hasRunExport = /\bmodule\.exports\b/.test(source) && /\brun\b/.test(source);
    if (hasRunExport) {
      hookModule = require(scriptPath);
    }
  } catch (_error) {
    hookModule = null;
  }

  if (hookModule && typeof hookModule.run === 'function') {
    try {
      return normalizeStructuredResult(rawInput, hookModule.run(rawInput, { truncated: false, maxStdin: MAX_STDIN }));
    } catch (error) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `[Hook] pre-execute-dispatch error in ${path.basename(scriptPath)}: ${error.message}`,
      };
    }
  }

  const result = spawnSync(process.execPath, [scriptPath], {
    input: rawInput,
    encoding: 'utf8',
    env: {
      ...process.env,
      EFD_HOOK_INPUT_TRUNCATED: '0',
      EFD_HOOK_INPUT_MAX_BYTES: String(MAX_STDIN),
    },
    cwd: process.cwd(),
    timeout: 10000,
  });

  const stdout = typeof result.stdout === 'string' && result.stdout !== rawInput
    ? result.stdout
    : '';
  let stderr = typeof result.stderr === 'string' ? result.stderr : '';

  if (result.error || result.signal || result.status === null) {
    const detail = result.error
      ? result.error.message
      : result.signal
        ? `terminated by signal ${result.signal}`
        : 'missing exit status';
    stderr = stderr
      ? `${stderr}\n[Hook] pre-execute-dispatch error in ${path.basename(scriptPath)}: ${detail}`
      : `[Hook] pre-execute-dispatch error in ${path.basename(scriptPath)}: ${detail}`;
    return { exitCode: 1, stdout, stderr };
  }

  return {
    exitCode: Number.isInteger(result.status) ? result.status : 0,
    stdout,
    stderr,
  };
}

function appendMessage(buffer, message) {
  const text = String(message || '').trim();
  if (!text) return buffer;
  return buffer ? `${buffer}\n${text}` : text;
}

function run(rawInput) {
  const raw = typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput || {});
  let stderr = '';
  let stdout = '';

  for (const hook of PRE_EXECUTE_PIPELINE) {
    if (hook.profiles !== null && !isHookEnabled(hook.id, { profiles: hook.profiles })) {
      continue;
    }

    const scriptPath = path.resolve(__dirname, '..', '..', hook.relativePath);
    const result = runHookScript(scriptPath, raw);

    stderr = appendMessage(stderr, result.stderr);
    if (!stdout && result.stdout) {
      stdout = result.stdout;
    }

    if (result.exitCode === 2) {
      return { exitCode: 2, stdout: stdout || raw, stderr };
    }
  }

  return { exitCode: 0, stdout: stdout || raw, stderr };
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (raw.length < MAX_STDIN) {
      const remaining = MAX_STDIN - raw.length;
      raw += chunk.substring(0, remaining);
    }
  });
  process.stdin.on('end', () => {
    const result = run(raw);
    if (result.stderr) {
      process.stderr.write(result.stderr.endsWith('\n') ? result.stderr : `${result.stderr}\n`);
    }
    if (result.stdout && result.stdout !== raw) {
      process.stdout.write(result.stdout);
    }
    process.exit(Number.isInteger(result.exitCode) ? result.exitCode : 0);
  });
}

module.exports = { PRE_EXECUTE_PIPELINE, normalizeStructuredResult, run, runHookScript };
