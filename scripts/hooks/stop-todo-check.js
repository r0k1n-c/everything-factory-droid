#!/usr/bin/env node
'use strict';

/**
 * Stop hook: remind the agent to close in_progress todo items.
 *
 * Parses the session transcript to find the last TodoWrite call. If the last
 * call left items in [in_progress] state and no [pending] items remain (i.e.
 * only the final step is unfinished), AND the agent did not call TodoWrite
 * during this response turn, it returns exit code 2 so the agent gets one
 * chance to mark completed items before its response is finalized.
 *
 * Targets the common pattern where the agent finishes the last step (e.g.
 * "语法验证") but forgets to call TodoWrite and the plan UI stays at ●.
 */

const fs = require('fs');

const TODO_IN_PROGRESS_RE = /\[in_progress\]/i;
const TODO_PENDING_RE = /\[pending\]/i;
const TODO_LINE_RE = /^\d+\.\s+\[(?:completed|in_progress|pending)\]/im;

const MAX_STDIN = 1024 * 1024;

/**
 * Parse a TodoWrite todos string and return status flags.
 * @param {string} todosStr
 * @returns {{ hasInProgress: boolean, hasPending: boolean, count: number }}
 */
function parseTodos(todosStr) {
  const lines = String(todosStr || '')
    .split('\n')
    .filter(line => TODO_LINE_RE.test(line));
  return {
    hasInProgress: lines.some(l => TODO_IN_PROGRESS_RE.test(l)),
    hasPending: lines.some(l => TODO_PENDING_RE.test(l)),
    count: lines.length,
  };
}

/**
 * Extract all TodoWrite calls from the transcript.
 * Each call is tagged with whether it occurred in the current turn (after the
 * last user message).
 *
 * @param {string} transcriptPath
 * @returns {Array<{ todos: string, isCurrentTurn: boolean }>}
 */
function extractTodoWriteCalls(transcriptPath) {
  const content = fs.readFileSync(transcriptPath, 'utf8');
  const lines = content.split('\n').filter(Boolean);

  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip unparseable lines
    }
  }

  // Locate the LAST user message to identify the current turn boundary.
  let lastUserMessageIndex = -1;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const isUser =
      e.type === 'user' ||
      e.role === 'user' ||
      (e.type === 'message' && e.message?.role === 'user');
    if (isUser) lastUserMessageIndex = i;
  }

  const calls = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const isCurrentTurn = i > lastUserMessageIndex;

    // Factory Droid JSONL format: assistant message with content blocks
    if (e.type === 'assistant' && Array.isArray(e.message?.content)) {
      for (const block of e.message.content) {
        if (block.type === 'tool_use' && block.name === 'TodoWrite') {
          calls.push({ todos: String(block.input?.todos ?? ''), isCurrentTurn });
        }
      }
    }

    // Flat tool_use entry format
    const toolName = e.tool_name || e.name || '';
    if (toolName === 'TodoWrite') {
      const todos = e.tool_input?.todos ?? e.input?.todos ?? '';
      calls.push({ todos: String(todos), isCurrentTurn });
    }
  }

  return calls;
}

/**
 * @param {string|object} rawInput - Hook stdin (JSON string or parsed object)
 * @returns {{ exitCode: number, stdout: string, stderr: string }}
 */
function run(rawInput) {
  const raw = typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput || {});

  let transcriptPath = null;
  try {
    const input = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
    transcriptPath = input.transcript_path;
  } catch {
    return { exitCode: 0, stdout: raw, stderr: '' };
  }

  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return { exitCode: 0, stdout: raw, stderr: '' };
  }

  let calls;
  try {
    calls = extractTodoWriteCalls(transcriptPath);
  } catch {
    return { exitCode: 0, stdout: raw, stderr: '' };
  }

  if (calls.length === 0) {
    return { exitCode: 0, stdout: raw, stderr: '' };
  }

  // If the agent already called TodoWrite during this turn, it is actively
  // managing its todo list — no reminder needed.
  const calledThisTurn = calls.some(c => c.isCurrentTurn);
  if (calledThisTurn) {
    return { exitCode: 0, stdout: raw, stderr: '' };
  }

  const last = calls[calls.length - 1];
  const { hasInProgress, hasPending } = parseTodos(last.todos);

  // Only intervene when the todo list has in_progress items but NO pending items.
  // This precisely matches "final step was not closed": all earlier steps are
  // completed, only the last step remains in_progress.
  if (hasInProgress && !hasPending) {
    const msg =
      '[TodoCheck] Your todo list has [in_progress] items but you did not call TodoWrite this turn. ' +
      'If your work is complete, call TodoWrite now to mark all finished items as [completed] before responding.';
    return { exitCode: 2, stdout: raw, stderr: msg };
  }

  return { exitCode: 0, stdout: raw, stderr: '' };
}

module.exports = { run, parseTodos, extractTodoWriteCalls };

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (raw.length < MAX_STDIN) raw += chunk.substring(0, MAX_STDIN - raw.length);
  });
  process.stdin.on('end', () => {
    const result = run(raw);
    if (result.stderr) process.stderr.write(`${result.stderr}\n`);
    if (result.stdout && result.stdout !== raw) process.stdout.write(result.stdout);
    process.exit(result.exitCode || 0);
  });
}
