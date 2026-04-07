"use strict";

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const Module = require('module');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'mcp-health-check.js');
const REAL_HOME = os.homedir();

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function loadInternals() {
  let source = fs.readFileSync(SCRIPT, 'utf8');
  source = source.replace(
    /main\(\)\.catch\(error => \{[\s\S]*?\}\);\s*$/,
    `module.exports = {
      envNumber,
      stateFilePath,
      configPaths,
      readJsonFile,
      loadState,
      saveState,
      safeParse,
      extractMcpTarget,
      extractMcpTargetFromRaw,
      resolveServerConfig,
      markHealthy,
      markUnhealthy,
      failureSummary,
      detectFailureCode,
      requestHttp,
      probeCommandServer,
      probeServer,
      reconnectCommand,
      attemptReconnect,
      shouldFailOpen,
      emitLogs,
      handlePreToolUse,
      handlePostToolUseFailure,
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

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function withEnv(pairs, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(pairs)) {
    previous[key] = process.env[key];
    if (value === null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  const restore = () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };

  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.finally(restore);
    }
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

function writeConfig(configPath, body) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(body, null, 2));
}

function createHttpServer(statusCode, body = 'ok', delayMs = 0) {
  return new Promise(resolve => {
    const server = http.createServer((_, res) => {
      setTimeout(() => {
        res.statusCode = statusCode;
        res.end(body);
      }, delayMs);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function serverUrl(server) {
  const address = server.address();
  return `http://127.0.0.1:${address.port}/health`;
}

async function closeServer(server) {
  await new Promise(resolve => server.close(resolve));
}

console.log('\n=== Testing mcp-health-check direct coverage ===\n');

const internals = loadInternals();
let passed = 0;
let failed = 0;

(async () => {
  if (test('env, path, config, JSON, and target extraction helpers cover fallback branches', () => {
    const tempDir = createTempDir('efd-mcp-health-direct-');
    try {
      withEnv({ EFD_SAMPLE_NUMBER: '5' }, () => {
        assert.strictEqual(internals.envNumber('EFD_SAMPLE_NUMBER', 2), 5);
      });
      withEnv({ EFD_SAMPLE_NUMBER: '-1' }, () => {
        assert.strictEqual(internals.envNumber('EFD_SAMPLE_NUMBER', 2), 2);
      });

      const statePath = path.join(tempDir, 'state.json');
      withEnv({ EFD_MCP_HEALTH_STATE_PATH: statePath }, () => {
        assert.strictEqual(internals.stateFilePath(), statePath);
      });
      withEnv({ EFD_MCP_HEALTH_STATE_PATH: null }, () => {
        assert.ok(internals.stateFilePath().startsWith(path.join(REAL_HOME, '.factory')));
      });

      const configA = path.join(tempDir, 'a.json');
      const configB = path.join(tempDir, 'b.json');
      withEnv({ EFD_MCP_CONFIG_PATH: [configA, configB].join(path.delimiter) }, () => {
        assert.deepStrictEqual(internals.configPaths(), [configA, configB]);
      });

      fs.writeFileSync(configA, '{bad', 'utf8');
      assert.strictEqual(internals.readJsonFile(configA), null);
      assert.deepStrictEqual(internals.loadState(configA), { version: 1, servers: {} });
      writeConfig(configA, { version: 1, servers: [] });
      assert.deepStrictEqual(internals.loadState(configA), { version: 1, servers: {} });

      const saved = path.join(tempDir, 'nested', 'state.json');
      internals.saveState(saved, { version: 1, servers: { demo: { status: 'healthy' } } });
      assert.deepStrictEqual(JSON.parse(fs.readFileSync(saved, 'utf8')).servers.demo, { status: 'healthy' });
      assert.deepStrictEqual(internals.safeParse('{"ok":true}'), { ok: true });
      assert.deepStrictEqual(internals.safeParse('{bad'), {});
      assert.deepStrictEqual(internals.safeParse('  '), {});

      assert.deepStrictEqual(internals.extractMcpTarget({ server: 'demo', tool: 'search', tool_name: 'ignored' }), { server: 'demo', tool: 'search' });
      assert.deepStrictEqual(internals.extractMcpTarget({ tool_name: 'mcp__demo__search__web' }), { server: 'demo', tool: 'search__web' });
      assert.strictEqual(internals.extractMcpTarget({ tool_name: 'Read' }), null);
      assert.deepStrictEqual(internals.extractMcpTargetFromRaw('{"tool_name":"mcp__demo__search","server":"demo"}'), { server: 'demo', tool: 'mcp__demo__search' });
    } finally {
      cleanup(tempDir);
    }
  })) passed++; else failed++;

  if (await asyncTest('server resolution, state transitions, summary parsing, and probe helpers cover success and failure branches', async () => {
    const tempDir = createTempDir('efd-mcp-health-direct-');
    const healthyServer = await createHttpServer(200, 'ok');
    const slowServer = await createHttpServer(200, 'slow', 50);
    const unavailableServer = await createHttpServer(503, 'down');

    try {
      const configPath = path.join(tempDir, 'settings.json');
      writeConfig(configPath, {
        mcpServers: {
          healthy: { type: 'http', url: serverUrl(healthyServer), headers: { Authorization: 'token' } },
          unavailable: { url: serverUrl(unavailableServer) },
          commandy: { command: process.execPath, args: ['-e', 'setTimeout(() => {}, 200)'] },
          bad: { type: 'weird' },
        }
      });

      withEnv({ EFD_MCP_CONFIG_PATH: configPath }, () => {
        const resolved = internals.resolveServerConfig('healthy');
        assert.strictEqual(resolved.source, configPath);
        assert.strictEqual(resolved.config.headers.Authorization, 'token');
        assert.strictEqual(internals.resolveServerConfig('missing'), null);
      });

      const state = { servers: {} };
      internals.markHealthy(state, 'healthy', 1000, { source: configPath });
      assert.strictEqual(state.servers.healthy.status, 'healthy');
      assert.strictEqual(state.servers.healthy.source, configPath);
      internals.markUnhealthy(state, 'healthy', 2000, 503, 'service unavailable');
      assert.strictEqual(state.servers.healthy.status, 'unhealthy');
      assert.strictEqual(state.servers.healthy.failureCount, 1);
      assert.strictEqual(state.servers.healthy.lastFailureCode, 503);

      const summary = internals.failureSummary({ error: '401 forbidden', tool_output: { stderr: 'socket hang up' }, tool_input: { error: 'fallback' } });
      assert.ok(summary.includes('401 forbidden'));
      assert.strictEqual(internals.detectFailureCode(summary), 401);
      assert.strictEqual(internals.detectFailureCode('connection reset by peer'), 'transport');
      assert.strictEqual(internals.detectFailureCode('all good'), null);

      const okResult = await internals.requestHttp(serverUrl(healthyServer), {}, 200);
      assert.strictEqual(okResult.ok, true);
      const timeoutResult = await internals.requestHttp(serverUrl(slowServer), {}, 1);
      assert.strictEqual(timeoutResult.ok, false);

      await withEnv({ EFD_MCP_HEALTH_TIMEOUT_MS: '20' }, async () => {
        const probeOk = await internals.probeCommandServer('cmd', { command: process.execPath, args: ['-e', 'setTimeout(() => {}, 200)'] });
        assert.strictEqual(probeOk.ok, true);
      });
      const probeFail = await internals.probeCommandServer('cmd', { command: process.execPath, args: ['-e', 'process.stderr.write("boom"); process.exit(3);'] });
      assert.strictEqual(probeFail.ok, false);
      assert.ok(probeFail.reason.includes('boom'));

      await withEnv({ EFD_MCP_HEALTH_TIMEOUT_MS: '50' }, async () => {
        const httpProbe = await internals.probeServer('healthy', { config: { url: serverUrl(healthyServer) }, source: configPath });
        assert.strictEqual(httpProbe.ok, true);
        const reconnectProbe = await internals.probeServer('unavailable', { config: { url: serverUrl(unavailableServer) }, source: configPath });
        assert.strictEqual(reconnectProbe.failureCode, 503);
        const commandProbe = await internals.probeServer('commandy', { config: { command: process.execPath, args: ['-e', 'setTimeout(() => {}, 200)'] }, source: configPath });
        assert.strictEqual(commandProbe.ok, true);
        const unsupported = await internals.probeServer('bad', { config: { type: 'weird' }, source: configPath });
        assert.strictEqual(unsupported.ok, false);
      });
    } finally {
      await closeServer(healthyServer);
      await closeServer(slowServer);
      await closeServer(unavailableServer);
      cleanup(tempDir);
    }
  })) passed++; else failed++;

  if (await asyncTest('reconnect and high-level handlers cover retry, fail-open, restore, and post-failure branches', async () => {
    const tempDir = createTempDir('efd-mcp-health-direct-');
    const healthyServer = await createHttpServer(200, 'ok');
    const slowServer = await createHttpServer(200, 'slow', 50);
    const unavailableServer = await createHttpServer(503, 'down');
    const statePath = path.join(tempDir, 'state.json');
    const configPath = path.join(tempDir, 'settings.json');

    try {
      writeConfig(configPath, {
        mcpServers: {
          healthy: { url: serverUrl(healthyServer) },
          unavailable: { url: serverUrl(unavailableServer) },
        }
      });

      withEnv({ EFD_MCP_RECONNECT_COMMAND: '', EFD_MCP_CONFIG_PATH: configPath }, () => {
        assert.strictEqual(internals.reconnectCommand('healthy'), null);
      });
      withEnv({ EFD_MCP_RECONNECT_COMMAND: 'echo reconnect {server}', EFD_MCP_CONFIG_PATH: configPath }, () => {
        assert.strictEqual(internals.reconnectCommand('healthy'), 'echo reconnect healthy');
      });
      withEnv({ EFD_MCP_RECONNECT_COMMAND: '', EFD_MCP_RECONNECT_HEALTHY: 'echo specific', EFD_MCP_CONFIG_PATH: configPath }, () => {
        assert.strictEqual(internals.reconnectCommand('healthy'), 'echo specific');
      });

      withEnv({ EFD_MCP_RECONNECT_COMMAND: '' }, () => {
        assert.deepStrictEqual(internals.attemptReconnect('healthy'), { attempted: false, success: false, reason: 'no reconnect command configured' });
      });
      withEnv({ EFD_MCP_RECONNECT_COMMAND: 'exit 1' }, () => {
        const failedReconnect = internals.attemptReconnect('healthy');
        assert.strictEqual(failedReconnect.attempted, true);
        assert.strictEqual(failedReconnect.success, false);
      });
      withEnv({ EFD_MCP_RECONNECT_COMMAND: 'true' }, () => {
        const successReconnect = internals.attemptReconnect('healthy');
        assert.strictEqual(successReconnect.success, true);
      });

      withEnv({ EFD_MCP_HEALTH_FAIL_OPEN: 'yes' }, () => {
        assert.strictEqual(internals.shouldFailOpen(), true);
      });
      withEnv({ EFD_MCP_HEALTH_FAIL_OPEN: 'no' }, () => {
        assert.strictEqual(internals.shouldFailOpen(), false);
      });

      const logs = [];
      const originalWrite = process.stderr.write;
      process.stderr.write = chunk => logs.push(String(chunk));
      try {
        internals.emitLogs(['one', 'two']);
      } finally {
        process.stderr.write = originalWrite;
      }
      assert.ok(logs.join('').includes('one'));

      fs.writeFileSync(statePath, JSON.stringify({ version: 1, servers: { healthy: { status: 'healthy', expiresAt: Date.now() + 10000 } } }, null, 2));
      let result = await withEnv({ EFD_MCP_CONFIG_PATH: configPath }, () => internals.handlePreToolUse('{}', {}, { server: 'healthy', tool: 'search' }, statePath, Date.now()));
      assert.strictEqual(result.exitCode, 0);

      fs.writeFileSync(statePath, JSON.stringify({ version: 1, servers: { unavailable: { status: 'unhealthy', nextRetryAt: Date.now() + 10000 } } }, null, 2));
      result = await withEnv({ EFD_MCP_HEALTH_FAIL_OPEN: 'no', EFD_MCP_CONFIG_PATH: configPath }, () => internals.handlePreToolUse('{}', {}, { server: 'unavailable', tool: 'search' }, statePath, Date.now()));
      assert.strictEqual(result.exitCode, 2);
      result = await withEnv({ EFD_MCP_HEALTH_FAIL_OPEN: 'yes', EFD_MCP_CONFIG_PATH: configPath }, () => internals.handlePreToolUse('{}', {}, { server: 'unavailable', tool: 'search' }, statePath, Date.now()));
      assert.strictEqual(result.exitCode, 0);

      fs.writeFileSync(statePath, JSON.stringify({ version: 1, servers: {} }, null, 2));
      result = await withEnv({ EFD_MCP_CONFIG_PATH: path.join(tempDir, 'missing.json') }, () => internals.handlePreToolUse('{}', {}, { server: 'missing', tool: 'search' }, statePath, Date.now()));
      assert.strictEqual(result.exitCode, 0);

      result = await withEnv({ EFD_MCP_CONFIG_PATH: configPath }, () => internals.handlePreToolUse('{}', {}, { server: 'healthy', tool: 'search' }, statePath, Date.now()));
      assert.strictEqual(result.exitCode, 0);
      assert.strictEqual(JSON.parse(fs.readFileSync(statePath, 'utf8')).servers.healthy.status, 'healthy');

      result = await withEnv({ EFD_MCP_RECONNECT_COMMAND: '', EFD_MCP_HEALTH_FAIL_OPEN: 'no', EFD_MCP_CONFIG_PATH: configPath }, () => internals.handlePreToolUse('{}', {}, { server: 'unavailable', tool: 'search' }, statePath, Date.now()));
      assert.strictEqual(result.exitCode, 2);
      assert.strictEqual(JSON.parse(fs.readFileSync(statePath, 'utf8')).servers.unavailable.status, 'unhealthy');

      result = await withEnv({ EFD_MCP_CONFIG_PATH: configPath }, () => internals.handlePostToolUseFailure('{}', { error: 'All good' }, { server: 'healthy', tool: 'search' }, statePath, Date.now()));
      assert.strictEqual(result.exitCode, 0);

      result = await withEnv({ EFD_MCP_RECONNECT_COMMAND: '', EFD_MCP_CONFIG_PATH: configPath }, () => internals.handlePostToolUseFailure('{}', { error: '503 service unavailable' }, { server: 'unavailable', tool: 'search' }, statePath, Date.now()));
      assert.ok(result.logs.some(line => line.includes('reconnect skipped')));

      result = await withEnv({ EFD_MCP_RECONNECT_COMMAND: 'true', EFD_MCP_CONFIG_PATH: configPath }, () => internals.handlePostToolUseFailure('{}', { error: '503 service unavailable' }, { server: 'healthy', tool: 'search' }, statePath, Date.now()));
      assert.ok(result.logs.some(line => line.includes('connection restored')));
    } finally {
      await closeServer(healthyServer);
      await closeServer(slowServer);
      await closeServer(unavailableServer);
      cleanup(tempDir);
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(error => {
  console.log(`  ✗ unexpected failure`);
  console.log(`    Error: ${error.message}`);
  process.exit(1);
});
